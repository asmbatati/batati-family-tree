"use client";

import { useMemo, useState, useEffect } from "react";
import type { Person, Relationship } from "@/lib/types";
import { ChevronIcon } from "@/components/icons";

type Props = {
  people: Person[];
  relationships: Relationship[];
  locale: "ar" | "en";
  selectedId: string | null;
  searchQuery: string;
  onSelect: (id: string) => void;
};

type Maps = {
  byId: Map<string, Person>;
  children: Map<string, string[]>; // parentId -> child ids
  roots: Person[];
  parentOf: Map<string, string>; // childId -> parentId
};

function buildMaps(people: Person[], relationships: Relationship[]): Maps {
  const byId = new Map(people.map((p) => [p.id, p]));
  const children = new Map<string, string[]>();
  const parentOf = new Map<string, string>();
  // First-encountered parent wins, so a child with multiple `parent_of` rows
  // (e.g. both mother and father) is rendered exactly once in the tree.
  for (const r of relationships) {
    if (r.type !== "parent_of") continue;
    if (parentOf.has(r.toId)) continue;
    parentOf.set(r.toId, r.fromId);
    const list = children.get(r.fromId) ?? [];
    list.push(r.toId);
    children.set(r.fromId, list);
  }
  // Sort children by generation then name for stable ordering
  for (const [k, v] of children) {
    v.sort((a, b) => {
      const pa = byId.get(a), pb = byId.get(b);
      const ga = pa?.generation ?? 0, gb = pb?.generation ?? 0;
      if (ga !== gb) return ga - gb;
      return (pa?.nameAr ?? "").localeCompare(pb?.nameAr ?? "");
    });
    children.set(k, v);
  }
  const roots = people.filter((p) => !parentOf.has(p.id));
  return { byId, children, roots, parentOf };
}

export default function CollapsibleTree({
  people,
  relationships,
  locale,
  selectedId,
  searchQuery,
  onSelect,
}: Props) {
  const maps = useMemo(() => buildMaps(people, relationships), [people, relationships]);

  // Default-expanded set: just the roots and their direct children (depth ≤ 1).
  const initialExpanded = useMemo(() => {
    const s = new Set<string>();
    for (const r of maps.roots) s.add(r.id);
    return s;
  }, [maps.roots]);

  const [expanded, setExpanded] = useState<Set<string>>(initialExpanded);

  // Compute the set of ids that should be expanded to reveal a search match.
  // Each matching person's full ancestor chain is added to `expanded`.
  const matchedIds = useMemo(() => {
    const q = searchQuery.trim();
    if (!q) return null;
    const lower = q.toLowerCase();
    const matches = new Set<string>();
    for (const p of people) {
      const nameAr = p.nameAr || "";
      const nameEn = p.nameEn || "";
      if (nameAr.includes(q) || nameEn.toLowerCase().includes(lower)) {
        matches.add(p.id);
      }
    }
    return matches;
  }, [searchQuery, people]);

  useEffect(() => {
    if (!matchedIds || matchedIds.size === 0) return;
    setExpanded((prev) => {
      const next = new Set(prev);
      for (const id of matchedIds) {
        let cur: string | undefined = maps.parentOf.get(id);
        while (cur) {
          next.add(cur);
          cur = maps.parentOf.get(cur);
        }
      }
      return next;
    });
  }, [matchedIds, maps.parentOf]);

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const expandAll = () => {
    const all = new Set<string>();
    for (const p of people) if ((maps.children.get(p.id) ?? []).length > 0) all.add(p.id);
    setExpanded(all);
  };

  const collapseAll = () => setExpanded(new Set(maps.roots.map((r) => r.id)));

  return (
    <div className="overflow-hidden rounded-3xl border border-sand-200 bg-white/70 shadow-soft">
      <div className="flex items-center justify-between border-b border-sand-100 px-4 py-2 text-xs text-sand-600">
        <span>
          {people.length.toLocaleString(locale === "ar" ? "ar-EG" : "en-US")} ·{" "}
          {locale === "ar" ? "اضغط على السهم للتوسيع، وعلى الاسم لفتح البروفايل" : "Click ▾ to expand, name to open profile"}
        </span>
        <div className="flex gap-2">
          <button onClick={expandAll} className="rounded-full px-2 py-0.5 hover:bg-sand-100">
            {locale === "ar" ? "توسيع" : "Expand"}
          </button>
          <button onClick={collapseAll} className="rounded-full px-2 py-0.5 hover:bg-sand-100">
            {locale === "ar" ? "طيّ" : "Collapse"}
          </button>
        </div>
      </div>
      <div className="max-h-[70vh] overflow-y-auto px-2 py-3 sm:px-4">
        {maps.roots.map((root) => (
          <TreeNode
            key={root.id}
            person={root}
            depth={0}
            maps={maps}
            expanded={expanded}
            toggle={toggle}
            locale={locale}
            selectedId={selectedId}
            matchedIds={matchedIds}
            onSelect={onSelect}
          />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

function TreeNode({
  person,
  depth,
  maps,
  expanded,
  toggle,
  locale,
  selectedId,
  matchedIds,
  onSelect,
}: {
  person: Person;
  depth: number;
  maps: Maps;
  expanded: Set<string>;
  toggle: (id: string) => void;
  locale: "ar" | "en";
  selectedId: string | null;
  matchedIds: Set<string> | null;
  onSelect: (id: string) => void;
}) {
  const childIds = maps.children.get(person.id) ?? [];
  const hasChildren = childIds.length > 0;
  const isExpanded = expanded.has(person.id);
  const isSelected = selectedId === person.id;
  const isMatch = matchedIds?.has(person.id) ?? false;
  const name = locale === "ar" ? person.nameAr : (person.nameEn || person.nameAr);
  const isMale = person.gender === "male";

  return (
    <div>
      <div
        className={
          "group flex items-center gap-1.5 rounded-lg px-1.5 py-1 text-sm transition " +
          (isSelected ? "bg-sand-100 ring-1 ring-sand-300" : "hover:bg-sand-50")
        }
        style={{ paddingInlineStart: `${depth * 18 + 6}px` }}
      >
        {hasChildren ? (
          <button
            onClick={() => toggle(person.id)}
            aria-label={isExpanded ? "Collapse" : "Expand"}
            className="grid h-5 w-5 shrink-0 place-items-center rounded text-sand-500 hover:bg-sand-200 hover:text-sand-800"
          >
            <ChevronIcon className={"h-3.5 w-3.5 transition-transform " + (isExpanded ? "" : locale === "ar" ? "rotate-90" : "-rotate-90")} />
          </button>
        ) : (
          <span className="grid h-5 w-5 shrink-0 place-items-center">
            <span className={"h-1.5 w-1.5 rounded-full " + (isMale ? "bg-sand-400" : "bg-rose-400")} />
          </span>
        )}
        <button
          onClick={() => onSelect(person.id)}
          className={
            "flex flex-1 items-center gap-2 truncate rounded px-2 py-0.5 text-start " +
            (isMatch ? "bg-amber-100 font-semibold text-amber-900" : "text-sand-800")
          }
        >
          <span className="truncate">{name}</span>
          {hasChildren && (
            <span className="ms-1 rounded-full bg-sand-200 px-1.5 py-0 text-[10px] text-sand-700">
              {childIds.length}
            </span>
          )}
          {person.generation !== undefined && (
            <span className="ms-auto rounded-full bg-sand-50 px-1.5 py-0 text-[10px] text-sand-500">
              G{person.generation}
            </span>
          )}
        </button>
      </div>
      {isExpanded && hasChildren && (
        <div className="border-s border-dashed border-sand-200" style={{ marginInlineStart: `${depth * 18 + 14}px` }}>
          {childIds.map((cid) => {
            const child = maps.byId.get(cid);
            if (!child) return null;
            return (
              <TreeNode
                key={cid}
                person={child}
                depth={depth + 1}
                maps={maps}
                expanded={expanded}
                toggle={toggle}
                locale={locale}
                selectedId={selectedId}
                matchedIds={matchedIds}
                onSelect={onSelect}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
