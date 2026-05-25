"use client";

import { useMemo, useState } from "react";
import type { Person, Relationship, TreeLayer } from "@/lib/types";
import { RELATIONSHIP_STYLE } from "@/lib/types";
import PersonNode from "./PersonNode";
import LayerToggle from "./LayerToggle";
import PersonProfile from "./PersonProfile";
import { getRelationshipIcon } from "@/components/icons";

type Dict = {
  layers: { title: string; men: string; women: string; spouses: string; milk: string; extended: string };
  focus: { title: string; hint: string; clear: string };
  relations: Record<string, string>;
  add: { title: string; choose: string; save: string; cancel: string };
};

type Props = {
  people: Person[];
  relationships: Relationship[];
  locale: "ar" | "en";
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

export default function TreeCanvas({ people, relationships, locale, treeDict, personDict }: Props) {
  const [active, setActive] = useState<Record<TreeLayer, boolean>>({
    men: true, women: true, spouses: true, milk: true, extended: true
  });
  const [focusId, setFocusId] = useState<string | null>(null);

  const toggle = (k: TreeLayer) =>
    setActive((s) => ({ ...s, [k]: !s[k] }));

  const peopleById = useMemo(() => new Map(people.map((p) => [p.id, p])), [people]);

  // Decide if person should be visible based on layers
  const isVisible = (p: Person) => {
    const layer = personLayer(p);
    if (!active[layer]) return false;
    return true;
  };

  // Group all visible people by generation for the layered view
  const generations = useMemo(() => {
    const map = new Map<number, Person[]>();
    for (const p of people) {
      const g = p.generation ?? 0;
      if (!map.has(g)) map.set(g, []);
      map.get(g)!.push(p);
    }
    return Array.from(map.entries()).sort((a, b) => a[0] - b[0]);
  }, [people]);

  // Build the focus view: center person + its direct relationships
  const focus = focusId ? peopleById.get(focusId) : null;
  const focusRels = useMemo(() => {
    if (!focus) return [];
    return relationships
      .filter((r) => r.fromId === focus.id || r.toId === focus.id)
      .filter((r) => {
        // Hide milk-relationship edges when milk layer is off
        if (r.type === "milk_sibling_of" && !active.milk) return false;
        // Hide extended edges when extended layer is off
        if (["uncle_paternal_of","uncle_maternal_of","aunt_paternal_of","aunt_maternal_of","cousin_of"].includes(r.type) && !active.extended) return false;
        return true;
      })
      .map((r) => {
        const otherId = r.fromId === focus.id ? r.toId : r.fromId;
        return { r, other: peopleById.get(otherId)! };
      })
      .filter((x) => x.other);
  }, [focus, relationships, peopleById, active]);

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <LayerToggle active={active} onToggle={toggle} labels={treeDict.layers} />
        <div className="rounded-2xl border border-sand-200 bg-white/80 p-4 text-sm shadow-soft">
          <div className="font-medium text-sand-800">{treeDict.focus.title}</div>
          <p className="mt-1 text-xs text-sand-600">{treeDict.focus.hint}</p>
          {focus && (
            <button
              onClick={() => setFocusId(null)}
              className="mt-2 rounded-full bg-sand-700 px-3 py-1 text-xs text-white hover:bg-sand-800"
            >
              {treeDict.focus.clear}
            </button>
          )}
        </div>
      </div>

      {/* Tree view: focus mode OR layered view */}
      {focus ? (
        <FocusView
          center={focus}
          rels={focusRels}
          locale={locale}
          onSelect={(id) => setFocusId(id)}
        />
      ) : (
        <LayeredView
          generations={generations}
          locale={locale}
          active={active}
          isVisible={isVisible}
          onSelect={(id) => setFocusId(id)}
        />
      )}

      {/* Legend */}
      <Legend treeDict={treeDict} />

      {/* Profile modal — appears when a person is focused */}
      {focus && (
        <PersonProfile
          person={focus}
          people={people}
          relationships={relationships}
          locale={locale}
          dict={personDict}
          relationLabels={{ ...treeDict.relations }}
          onClose={() => setFocusId(null)}
          onSelect={(id) => setFocusId(id)}
          onAddRelative={(type) => {
            alert(
              (locale === "ar" ? "إضافة " : "Add ") +
              (treeDict.relations[type] ?? type) +
              (locale === "ar" ? " — قيد التطوير (يتطلب Supabase)" : " — coming soon (requires Supabase)")
            );
          }}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

function LayeredView({
  generations, locale, active, isVisible, onSelect
}: {
  generations: [number, Person[]][];
  locale: "ar" | "en";
  active: Record<TreeLayer, boolean>;
  isVisible: (p: Person) => boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="overflow-hidden rounded-3xl border border-sand-200 bg-white/70 p-4 shadow-soft sm:p-6">
      <div className="grain absolute inset-0 -z-10 opacity-40" aria-hidden />
      <div className="space-y-6">
        {generations.map(([gen, members]) => (
          <div key={gen}>
            <div className="mb-2 flex items-center gap-2">
              <span className="rounded-full bg-sand-700 px-2.5 py-0.5 text-xs font-medium text-white">
                {locale === "ar" ? `الجيل ${gen}` : `Gen ${gen}`}
              </span>
              <span className="h-px flex-1 bg-sand-200" />
              <span className="text-xs text-sand-500">{members.filter(isVisible).length} / {members.length}</span>
            </div>
            <div className="flex flex-wrap gap-2 animate-float-in">
              {members.map((p) => {
                const layer = personLayer(p);
                const visible = active[layer];
                // Women dimmed when their layer is off (visual cue from spec)
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
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

function FocusView({
  center, rels, locale, onSelect
}: {
  center: Person;
  rels: { r: Relationship; other: Person }[];
  locale: "ar" | "en";
  onSelect: (id: string) => void;
}) {
  // Layout: arrange related people in a circle around the center.
  const W = 760;
  const H = 520;
  const cx = W / 2;
  const cy = H / 2;
  const radius = Math.min(W, H) * 0.36;

  // Group rels for stable angular slots
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
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="block w-full"
          aria-label="Family relationships"
        >
          {/* Edges */}
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
                {/* Icon in the middle of the edge */}
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

          {/* Center node */}
          <foreignObject x={cx - 90} y={cy - 30} width={180} height={60}>
            <button
              onClick={() => {}}
              className="grid w-full place-items-center rounded-full border-2 border-sand-700 bg-white px-4 py-2 text-center font-display text-base text-sand-900 shadow-lg animate-pulse-soft"
            >
              {locale === "ar" ? center.nameAr : (center.nameEn || center.nameAr)}
            </button>
          </foreignObject>

          {/* Outer nodes */}
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

function Legend({ treeDict }: { treeDict: Dict }) {
  const entries = [
    { type: "parent_of" as const,         label: treeDict.relations.father },
    { type: "spouse_of" as const,         label: treeDict.relations.spouse },
    { type: "sibling_of" as const,        label: treeDict.relations.brother },
    { type: "milk_sibling_of" as const,   label: treeDict.relations.milk },
    { type: "uncle_paternal_of" as const, label: treeDict.relations.uncleP },
    { type: "cousin_of" as const,         label: treeDict.relations.cousin }
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
