"use client";

import { useMemo, useState } from "react";
import type { Person, Relationship } from "@/lib/types";
import {
  buildRelationshipGraph,
  buildPatrilineMap,
  lineageName,
  shortestPath,
  styleForRel,
  labelForRel,
  type PathStep,
} from "@/lib/relationships";
import { getRelationshipIcon, SearchIcon, CloseIcon } from "@/components/icons";

type Dict = {
  person1: string;
  person2: string;
  pickPerson: string;
  pickAnother: string;
  sameWarning: string;
  noPath: string;
  pathFound: string;
  steps: string;
  via: string;
};

type Props = {
  people: Person[];
  relationships: Relationship[];
  locale: "ar" | "en";
  dict: Dict;
  relationLabels: Record<string, string>;
};

export default function RelateExplorer({ people, relationships, locale, dict, relationLabels }: Props) {
  const [aId, setAId] = useState<string | null>(null);
  const [bId, setBId] = useState<string | null>(null);

  const peopleById = useMemo(() => new Map(people.map((p) => [p.id, p])), [people]);
  const graph = useMemo(() => buildRelationshipGraph(relationships), [relationships]);
  const patriline = useMemo(() => buildPatrilineMap(people, relationships), [people, relationships]);
  const lineageOf = (p: Person) => lineageName(p, peopleById, patriline, locale, 4);

  const a = aId ? peopleById.get(aId) ?? null : null;
  const b = bId ? peopleById.get(bId) ?? null : null;

  const path = useMemo<PathStep[] | null>(() => {
    if (!a || !b || a.id === b.id) return null;
    return shortestPath(graph, a.id, b.id);
  }, [a, b, graph]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <PersonPicker
          label={dict.person1}
          placeholder={dict.pickPerson}
          selected={a}
          people={people}
          locale={locale}
          excludeId={bId}
          onSelect={setAId}
          onClear={() => setAId(null)}
          lineageOf={lineageOf}
        />
        <PersonPicker
          label={dict.person2}
          placeholder={dict.pickPerson}
          selected={b}
          people={people}
          locale={locale}
          excludeId={aId}
          onSelect={setBId}
          onClear={() => setBId(null)}
          lineageOf={lineageOf}
        />
      </div>

      {a && b && a.id === b.id && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {dict.sameWarning}
        </div>
      )}

      {a && b && a.id !== b.id && path === null && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
          {dict.noPath}
        </div>
      )}

      {a && b && path && path.length > 1 && (
        <ChainView
          path={path}
          peopleById={peopleById}
          locale={locale}
          dict={dict}
          relationLabels={relationLabels}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

function PersonPicker({
  label,
  placeholder,
  selected,
  people,
  locale,
  excludeId,
  onSelect,
  onClear,
  lineageOf,
}: {
  label: string;
  placeholder: string;
  selected: Person | null;
  people: Person[];
  locale: "ar" | "en";
  excludeId: string | null;
  onSelect: (id: string) => void;
  onClear: () => void;
  lineageOf: (p: Person) => string;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const matches = useMemo(() => {
    const q = query.trim();
    if (!q) return [];
    const lower = q.toLowerCase();
    return people
      .filter((p) => p.id !== excludeId)
      .filter((p) => {
        const chain = lineageOf(p);
        return (
          chain.includes(q) ||
          chain.toLowerCase().includes(lower) ||
          p.nameAr.includes(q) ||
          (p.nameEn?.toLowerCase().includes(lower) ?? false)
        );
      })
      .slice(0, 30);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [people, query, excludeId]);

  return (
    <div className="rounded-2xl border border-sand-200 bg-white/80 p-4 shadow-soft">
      <div className="mb-2 text-xs font-medium uppercase tracking-wide text-sand-600">{label}</div>

      {selected ? (
        <div className="flex items-center justify-between gap-2 rounded-xl border border-sand-200 bg-sand-50 px-3 py-2">
          <div className="min-w-0">
            <div className="truncate font-display text-base text-sand-900" title={lineageOf(selected)}>
              {lineageOf(selected)}
            </div>
            {selected.generation !== undefined && (
              <div className="text-xs text-sand-600">G{selected.generation}</div>
            )}
          </div>
          <button
            onClick={onClear}
            className="grid h-8 w-8 place-items-center rounded-full text-sand-500 hover:bg-sand-100"
            aria-label="Clear"
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute top-1/2 start-3 h-4 w-4 -translate-y-1/2 text-sand-500" />
          <input
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            placeholder={placeholder}
            className="w-full rounded-xl border border-sand-200 bg-white py-2 ps-9 pe-3 text-sm outline-none focus:border-sand-400 focus:ring-2 focus:ring-sand-200"
          />
          {open && matches.length > 0 && (
            <ul className="absolute z-20 mt-1 max-h-72 w-full overflow-y-auto rounded-xl border border-sand-200 bg-white py-1 shadow-lg">
              {matches.map((p) => {
                const chain = lineageOf(p);
                return (
                  <li key={p.id}>
                    <button
                      onMouseDown={(ev) => ev.preventDefault()}
                      onClick={() => { onSelect(p.id); setQuery(""); setOpen(false); }}
                      className="flex w-full items-center justify-between gap-3 px-3 py-1.5 text-start text-sm hover:bg-sand-100"
                      title={chain}
                    >
                      <span className="truncate">{chain}</span>
                      {p.generation !== undefined && (
                        <span className="shrink-0 text-[10px] text-sand-500">G{p.generation}</span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

function ChainView({
  path,
  peopleById,
  locale,
  dict,
  relationLabels,
}: {
  path: PathStep[];
  peopleById: Map<string, Person>;
  locale: "ar" | "en";
  dict: Dict;
  relationLabels: Record<string, string>;
}) {
  const steps = path.length - 1; // edges, not nodes

  return (
    <div className="rounded-3xl border border-sand-200 bg-white/70 p-4 shadow-soft sm:p-6">
      <div className="mb-4 text-sm text-sand-700">
        {dict.pathFound} <span className="font-display text-lg text-sand-900">{steps}</span> {dict.steps}
      </div>

      <ol className="flex flex-wrap items-stretch gap-y-3">
        {path.map((step, idx) => {
          const p = peopleById.get(step.id);
          if (!p) return null;
          const name = locale === "ar" ? p.nameAr : (p.nameEn || p.nameAr);
          const isFirst = idx === 0;
          const isLast = idx === path.length - 1;

          // The edge label connects the previous step to THIS step.
          // From the perspective of the PREVIOUS person, what is THIS person?
          // step.via has fromId/toId; the previous person was at step[idx-1].
          let edgeLabel = "";
          let edgeStyle: { color: string; icon: string } | null = null;
          if (step.via && idx > 0) {
            const prevId = path[idx - 1].id;
            const isFrom = step.via.fromId === prevId;
            const prevPerson = peopleById.get(prevId)!;
            edgeStyle = styleForRel(step.via.type, isFrom);
            // "what is this person to the previous one"
            edgeLabel = labelForRel(step.via.type, isFrom, p, relationLabels);
            void prevPerson; // (kept for clarity / future use)
          }

          return (
            <li key={`${step.id}-${idx}`} className="flex items-center gap-2">
              {!isFirst && edgeStyle && (
                <span
                  className="inline-flex items-center gap-1 rounded-full border bg-white px-2 py-0.5 text-[11px]"
                  style={{ color: edgeStyle.color, borderColor: edgeStyle.color + "55" }}
                  title={edgeLabel}
                >
                  {getRelationshipIcon(edgeStyle.icon, "h-3 w-3")}
                  <span>{edgeLabel}</span>
                </span>
              )}
              <div
                className={
                  "rounded-2xl border px-3 py-2 text-sm shadow-soft " +
                  (isFirst || isLast
                    ? "border-sand-400 bg-sand-700 text-white"
                    : "border-sand-200 bg-white text-sand-900")
                }
              >
                <div className="font-display">{name}</div>
                {p.generation !== undefined && (
                  <div className={"text-[10px] " + (isFirst || isLast ? "text-sand-200" : "text-sand-500")}>
                    G{p.generation}
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
