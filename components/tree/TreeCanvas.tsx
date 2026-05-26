"use client";

import { useMemo, useState } from "react";
import type { Person, Relationship, TreeLayer } from "@/lib/types";
import { RELATIONSHIP_STYLE } from "@/lib/types";
import PersonNode from "./PersonNode";
import LayerToggle from "./LayerToggle";
import PersonProfile from "./PersonProfile";
import CollapsibleTree from "./CollapsibleTree";
import ViewModeToggle, { type ViewMode } from "./ViewModeToggle";
import TreeSearch from "./TreeSearch";
import { getRelationshipIcon } from "@/components/icons";

type Dict = {
  layers: { title: string; men: string; women: string; spouses: string; milk: string; extended: string };
  focus: { title: string; hint: string; clear: string };
  views: { tree: string; focus: string; layers: string; focusEmpty: string };
  search: { placeholder: string; noResults: string; results: string };
  actions: { expandAll: string; collapseAll: string; focusOn: string };
  relations: Record<string, string>;
  add: {
    title: string;
    choose: string;
    save: string;
    cancel: string;
    nameArLabel: string;
    nameEnLabel: string;
    saving: string;
    notEditor: string;
    forPerson: string;
  };
};

type Props = {
  people: Person[];
  relationships: Relationship[];
  locale: "ar" | "en";
  isEditor: boolean;
  treeDict: Dict;
  personDict: {
    profile: string;
    born: string;
    died: string;
    location: string;
    occupation: string;
    bio: string;
    relationships: string;
    addRelative: string;
    edit: string;
    close: string;
  };
};

/** Decide which layer a person belongs to (for visibility filtering). */
function personLayer(p: Person): TreeLayer {
  if (p.externalFamilyId) return "spouses";
  return p.gender === "male" ? "men" : "women";
}

export default function TreeCanvas({ people, relationships, locale, isEditor, treeDict, personDict }: Props) {
  const [viewMode, setViewMode] = useState<ViewMode>("tree");
  const [active, setActive] = useState<Record<TreeLayer, boolean>>({
    men: true, women: true, spouses: true, milk: true, extended: true,
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const toggle = (k: TreeLayer) => setActive((s) => ({ ...s, [k]: !s[k] }));

  const peopleById = useMemo(() => new Map(people.map((p) => [p.id, p])), [people]);
  const selected = selectedId ? peopleById.get(selectedId) ?? null : null;

  // Search results (used by TreeSearch counter; CollapsibleTree does its own matching).
  const searchMatches = useMemo(() => {
    const q = search.trim();
    if (!q) return [];
    const lower = q.toLowerCase();
    return people.filter(
      (p) => p.nameAr.includes(q) || (p.nameEn?.toLowerCase().includes(lower) ?? false),
    );
  }, [search, people]);

  const isVisible = (p: Person) => active[personLayer(p)];

  const generations = useMemo(() => {
    const map = new Map<number, Person[]>();
    for (const p of people) {
      const g = p.generation ?? 0;
      if (!map.has(g)) map.set(g, []);
      map.get(g)!.push(p);
    }
    return Array.from(map.entries()).sort((a, b) => a[0] - b[0]);
  }, [people]);

  // Build focus-view relationships when a person is selected.
  const focusRels = useMemo(() => {
    if (!selected) return [];
    return relationships
      .filter((r) => r.fromId === selected.id || r.toId === selected.id)
      .filter((r) => {
        if (r.type === "milk_sibling_of" && !active.milk) return false;
        if (["uncle_paternal_of", "uncle_maternal_of", "aunt_paternal_of", "aunt_maternal_of", "cousin_of"].includes(r.type) && !active.extended) return false;
        return true;
      })
      .map((r) => {
        const otherId = r.fromId === selected.id ? r.toId : r.fromId;
        return { r, other: peopleById.get(otherId)! };
      })
      .filter((x) => x.other);
  }, [selected, relationships, peopleById, active]);

  return (
    <div className="space-y-6">
      {/* Top controls: view toggle + search */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <ViewModeToggle
          mode={viewMode}
          onChange={setViewMode}
          labels={treeDict.views}
          focusDisabled={!selected}
        />
        <TreeSearch
          value={search}
          onChange={setSearch}
          placeholder={treeDict.search.placeholder}
          resultsCount={search ? searchMatches.length : undefined}
          resultsLabel={treeDict.search.results}
          noResultsLabel={treeDict.search.noResults}
        />
      </div>

      {/* Layered-view chrome: layer toggles only shown in layers mode */}
      {viewMode === "layers" && (
        <LayerToggle active={active} onToggle={toggle} labels={treeDict.layers} />
      )}

      {/* Main view */}
      {viewMode === "tree" && (
        <CollapsibleTree
          people={people}
          relationships={relationships}
          locale={locale}
          selectedId={selectedId}
          searchQuery={search}
          onSelect={setSelectedId}
        />
      )}

      {viewMode === "focus" && (
        selected ? (
          <FocusView center={selected} rels={focusRels} locale={locale} onSelect={setSelectedId} />
        ) : (
          <EmptyFocus message={treeDict.views.focusEmpty} />
        )
      )}

      {viewMode === "layers" && (
        <LayeredView
          generations={generations}
          locale={locale}
          active={active}
          isVisible={isVisible}
          onSelect={setSelectedId}
        />
      )}

      {/* Legend — shown in focus view since that's where colors mean the most */}
      {viewMode === "focus" && selected && <Legend treeDict={treeDict} />}

      {/* Profile side panel */}
      {selected && (
        <PersonProfile
          person={selected}
          people={people}
          relationships={relationships}
          locale={locale}
          isEditor={isEditor}
          dict={personDict}
          relationLabels={treeDict.relations}
          addDict={treeDict.add}
          focusOnLabel={treeDict.actions.focusOn}
          onClose={() => setSelectedId(null)}
          onSelect={(id) => setSelectedId(id)}
          onFocus={() => setViewMode("focus")}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

function LayeredView({
  generations, locale, active, isVisible, onSelect,
}: {
  generations: [number, Person[]][];
  locale: "ar" | "en";
  active: Record<TreeLayer, boolean>;
  isVisible: (p: Person) => boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="overflow-hidden rounded-3xl border border-sand-200 bg-white/70 p-4 shadow-soft sm:p-6">
      <div className="space-y-6">
        {generations.map(([gen, members]) => {
          const visibleMembers = members.filter(isVisible);
          return (
            <div key={gen}>
              <div className="mb-2 flex items-center gap-2">
                <span className="rounded-full bg-sand-700 px-2.5 py-0.5 text-xs font-medium text-white">
                  {locale === "ar" ? `الجيل ${gen}` : `Gen ${gen}`}
                </span>
                <span className="h-px flex-1 bg-sand-200" />
                <span className="text-xs text-sand-500">{visibleMembers.length} / {members.length}</span>
              </div>
              <div className="flex max-h-[200px] flex-wrap gap-2 overflow-y-auto">
                {members.map((p) => {
                  const layer = personLayer(p);
                  const visible = active[layer];
                  return (
                    <PersonNode
                      key={p.id}
                      person={p}
                      locale={locale}
                      layer={layer}
                      active={false}
                      faded={!visible}
                      onClick={() => onSelect(p.id)}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

function FocusView({
  center, rels, locale, onSelect,
}: {
  center: Person;
  rels: { r: Relationship; other: Person }[];
  locale: "ar" | "en";
  onSelect: (id: string) => void;
}) {
  const W = 760;
  const H = 520;
  const cx = W / 2;
  const cy = H / 2;
  const radius = Math.min(W, H) * 0.36;

  const slots = rels.length;
  const items = rels.map((item, i) => {
    const angle = (-Math.PI / 2) + (2 * Math.PI * i) / Math.max(slots, 1);
    const x = cx + radius * Math.cos(angle);
    const y = cy + radius * Math.sin(angle);
    return { ...item, x, y };
  });

  return (
    <div className="overflow-hidden rounded-3xl border border-sand-200 bg-white/70 p-4 shadow-soft sm:p-6">
      <div className="relative mx-auto" style={{ width: W, maxWidth: "100%" }}>
        <svg viewBox={`0 0 ${W} ${H}`} className="block w-full" aria-label="Family relationships">
          {items.map(({ r, x, y }) => {
            const style = RELATIONSHIP_STYLE[r.type];
            return (
              <g key={r.id}>
                <line
                  x1={cx} y1={cy} x2={x} y2={y}
                  stroke={style.color}
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeDasharray={r.type === "milk_sibling_of" ? "6 4" : undefined}
                  opacity={0.85}
                />
                <foreignObject x={(cx + x) / 2 - 14} y={(cy + y) / 2 - 14} width={28} height={28}>
                  <div
                    className="grid h-7 w-7 place-items-center rounded-full border bg-white shadow-soft"
                    style={{ color: style.color, borderColor: style.color + "55" }}
                  >
                    {getRelationshipIcon(style.icon, "h-3.5 w-3.5")}
                  </div>
                </foreignObject>
              </g>
            );
          })}

          <foreignObject x={cx - 90} y={cy - 30} width={180} height={60}>
            <button
              onClick={() => onSelect(center.id)}
              className="grid w-full place-items-center rounded-full border-2 border-sand-700 bg-white px-4 py-2 text-center font-display text-base text-sand-900 shadow-lg animate-pulse-soft"
            >
              {locale === "ar" ? center.nameAr : (center.nameEn || center.nameAr)}
            </button>
          </foreignObject>

          {items.map(({ r, other, x, y }) => {
            const layer = personLayer(other);
            const colorBg =
              layer === "men" ? "#fbf7f0" :
              layer === "women" ? "#fff1f2" :
              layer === "spouses" ? "#fff7e6" :
              "#f8fafc";
            const colorBorder =
              layer === "men" ? "#dcbb7c" :
              layer === "women" ? "#fda4af" :
              layer === "spouses" ? "#fbbf24" :
              "#e5e7eb";
            const w = 150;
            const h = 36;
            return (
              <foreignObject key={"node-" + r.id} x={x - w / 2} y={y - h / 2} width={w} height={h}>
                <button
                  onClick={() => onSelect(other.id)}
                  className="block w-full truncate rounded-full border px-3 py-1.5 text-xs font-medium hover:scale-[1.02] transition shadow-soft"
                  style={{ background: colorBg, borderColor: colorBorder, color: "#3b2a10" }}
                  title={locale === "ar" ? other.nameAr : other.nameEn}
                >
                  {locale === "ar" ? other.nameAr : (other.nameEn || other.nameAr)}
                  {other.externalFamilyId && (
                    <span className="ms-1 rounded bg-white/70 px-1 text-[9px] text-sand-700">↗</span>
                  )}
                </button>
              </foreignObject>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

function EmptyFocus({ message }: { message: string }) {
  return (
    <div className="grid place-items-center rounded-3xl border border-dashed border-sand-300 bg-white/50 px-6 py-16 text-center text-sand-600">
      {message}
    </div>
  );
}

// ---------------------------------------------------------------------------

function Legend({ treeDict }: { treeDict: Dict }) {
  const entries = [
    { type: "parent_of" as const,         label: treeDict.relations.father },
    { type: "spouse_of" as const,         label: treeDict.relations.spouse },
    { type: "sibling_of" as const,        label: treeDict.relations.brother },
    { type: "milk_sibling_of" as const,   label: treeDict.relations.milk },
    { type: "uncle_paternal_of" as const, label: treeDict.relations.uncleP },
    { type: "cousin_of" as const,         label: treeDict.relations.cousin },
  ];
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-sand-200 bg-white/70 p-3 text-xs">
      {entries.map((e) => {
        const s = RELATIONSHIP_STYLE[e.type];
        return (
          <span key={e.type} className="inline-flex items-center gap-1.5">
            <span
              className="grid h-5 w-5 place-items-center rounded-full"
              style={{ color: s.color, background: s.color + "22" }}
            >
              {getRelationshipIcon(s.icon, "h-3 w-3")}
            </span>
            <span className="text-sand-700">{e.label}</span>
          </span>
        );
      })}
    </div>
  );
}
