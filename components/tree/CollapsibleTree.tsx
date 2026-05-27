"use client";

import { useMemo, useState, useEffect } from "react";
import type { Person, Relationship } from "@/lib/types";
import { siblingOrderCompare } from "@/lib/relationships";
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

const PRIMARY_FAMILY = "البطاطي";

function familyKey(p: Person, locale: "ar" | "en"): string {
  const fam = (locale === "ar" ? p.familyAr : (p.familyEn || p.familyAr))?.trim();
  if (fam) return fam;
  // Fall back to Arabic family if we're rendering English but only Arabic exists.
  const fallback = p.familyAr?.trim();
  if (fallback) return fallback;
  return locale === "ar" ? "غير محدد" : "Unspecified";
}

function buildMaps(people: Person[], relationships: Relationship[]): Maps {
  const byId = new Map(people.map((p) => [p.id, p]));
  const visible = new Set(byId.keys());
  const children = new Map<string, string[]>();
  const parentOf = new Map<string, string>();
  // First-encountered visible parent wins, so a child with multiple `parent_of`
  // rows (e.g. both mother and father — or a hidden mother under the
  // female-visibility RLS) is rendered exactly once, under whichever parent
  // the viewer can see.
  for (const r of relationships) {
    if (r.type !== "parent_of") continue;
    if (!visible.has(r.fromId) || !visible.has(r.toId)) continue;
    if (parentOf.has(r.toId)) continue;
    parentOf.set(r.toId, r.fromId);
    const list = children.get(r.fromId) ?? [];
    list.push(r.toId);
    children.set(r.fromId, list);
  }
  // Sort children by explicit birthOrder (then year, then name) so the tree
  // reflects oldest-to-youngest sibling order set by editors.
  for (const [k, v] of children) {
    v.sort((a, b) => {
      const pa = byId.get(a), pb = byId.get(b);
      if (!pa || !pb) return 0;
      return siblingOrderCompare(pa, pb);
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
  // Group by family name. The primary family (البطاطي) always renders first;
  // other families follow in descending count order. Each family has its own
  // window/section and only sees parent_of edges that stay inside that family
  // — so an in-law mother whose children carry the husband's surname doesn't
  // pull her children's branch into her family's window.
  const familyGroups = useMemo(() => {
    const map = new Map<string, Person[]>();
    for (const p of people) {
      const fam = familyKey(p, locale);
      const list = map.get(fam);
      if (list) list.push(p);
      else map.set(fam, [p]);
    }
    return [...map.entries()].sort((a, b) => {
      // Always put البطاطي / Al-Batati first regardless of count.
      const aPrimary = a[0] === PRIMARY_FAMILY || a[0].toLowerCase() === "al-batati";
      const bPrimary = b[0] === PRIMARY_FAMILY || b[0].toLowerCase() === "al-batati";
      if (aPrimary && !bPrimary) return -1;
      if (bPrimary && !aPrimary) return 1;
      return b[1].length - a[1].length;
    });
  }, [people, locale]);

  // Per-family Maps. Each family's `buildMaps` only sees its own members, so
  // cross-family parent_of edges are ignored and intra-family hierarchy stays
  // intact.
  const familyMaps = useMemo(() => {
    const m = new Map<string, Maps>();
    for (const [fam, members] of familyGroups) {
      m.set(fam, buildMaps(members, relationships));
    }
    return m;
  }, [familyGroups, relationships]);

  // Default-expanded set: all family roots (so each family's top level is
  // visible the moment its window is opened).
  const initialExpanded = useMemo(() => {
    const s = new Set<string>();
    for (const fmaps of familyMaps.values()) {
      for (const r of fmaps.roots) s.add(r.id);
    }
    return s;
  }, [familyMaps]);

  const [expanded, setExpanded] = useState<Set<string>>(initialExpanded);

  // Compute the set of ids that should be expanded to reveal a search match.
  // Each matching person's full ancestor chain (within their family) is added.
  const { matchedIds, matchedFamilies } = useMemo(() => {
    const q = searchQuery.trim();
    if (!q) return { matchedIds: null as Set<string> | null, matchedFamilies: new Set<string>() };
    const lower = q.toLowerCase();
    const ids = new Set<string>();
    const fams = new Set<string>();
    for (const p of people) {
      const nameAr = p.nameAr || "";
      const nameEn = p.nameEn || "";
      if (nameAr.includes(q) || nameEn.toLowerCase().includes(lower)) {
        ids.add(p.id);
        fams.add(familyKey(p, locale));
      }
    }
    return { matchedIds: ids, matchedFamilies: fams };
  }, [searchQuery, people, locale]);

  useEffect(() => {
    if (!matchedIds || matchedIds.size === 0) return;
    setExpanded((prev) => {
      const next = new Set(prev);
      // Walk ancestor chain in every family map (a match belongs to one family).
      for (const id of matchedIds) {
        for (const fmaps of familyMaps.values()) {
          let cur: string | undefined = fmaps.parentOf.get(id);
          while (cur) {
            next.add(cur);
            cur = fmaps.parentOf.get(cur);
          }
        }
      }
      return next;
    });
  }, [matchedIds, familyMaps]);

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const expandAll = () => {
    const all = new Set<string>();
    for (const fmaps of familyMaps.values()) {
      for (const id of fmaps.byId.keys()) {
        if ((fmaps.children.get(id) ?? []).length > 0) all.add(id);
      }
    }
    setExpanded(all);
  };
  const collapseAll = () => {
    const s = new Set<string>();
    for (const fmaps of familyMaps.values()) for (const r of fmaps.roots) s.add(r.id);
    setExpanded(s);
  };

  // Family window open/close state. Defaults: the first family (always البطاطي
  // when present, otherwise the largest) is open; everything else closed. The
  // user's manual toggles override these defaults; a search match force-opens
  // every family that contains a match.
  const [familyOverride, setFamilyOverride] = useState<Record<string, boolean>>({});
  const isFamilyOpen = (family: string, index: number): boolean => {
    if (matchedFamilies.has(family)) return true;
    if (family in familyOverride) return familyOverride[family];
    return index === 0;
  };

  const total = people.length;
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between rounded-2xl border border-sand-200 bg-white/70 px-4 py-2 text-xs text-sand-600 shadow-soft">
        <span>
          {total.toLocaleString(locale === "ar" ? "ar-EG" : "en-US")} ·{" "}
          {familyGroups.length}{" "}
          {locale === "ar" ? "عائلة" : familyGroups.length === 1 ? "family" : "families"} ·{" "}
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

      {familyGroups.map(([family, members], index) => {
        const fmaps = familyMaps.get(family);
        if (!fmaps) return null;
        const open = isFamilyOpen(family, index);
        const isPrimary = family === PRIMARY_FAMILY || family.toLowerCase() === "al-batati";
        return (
          <details
            key={family}
            open={open}
            onToggle={(e) => {
              const nowOpen = e.currentTarget.open;
              // If the open state agrees with the default, drop the override
              // (keeps the state object small + lets the default kick back in).
              setFamilyOverride((prev) => ({ ...prev, [family]: nowOpen }));
            }}
            className={
              "group overflow-hidden rounded-3xl border bg-white/70 shadow-soft " +
              (isPrimary ? "border-sand-300" : "border-sand-200")
            }
          >
            <summary
              className={
                "flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 transition " +
                (isPrimary ? "bg-sand-100/60" : "bg-white/70 hover:bg-sand-50")
              }
            >
              <div className="flex items-center gap-2">
                <ChevronIcon
                  className={
                    "h-4 w-4 shrink-0 text-sand-500 transition-transform " +
                    (open ? "" : locale === "ar" ? "rotate-90" : "-rotate-90")
                  }
                />
                <span className={"font-display " + (isPrimary ? "text-base text-sand-900" : "text-sm text-sand-800")}>
                  {family}
                </span>
                {isPrimary && (
                  <span className="rounded-full bg-sand-700 px-2 py-0.5 text-[10px] font-medium text-white">
                    {locale === "ar" ? "العائلة الرئيسية" : "primary"}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-[11px] tabular-nums text-sand-600">
                <span>{members.length.toLocaleString(locale === "ar" ? "ar-EG" : "en-US")}</span>
                <span className="text-sand-400">·</span>
                <span>
                  {fmaps.roots.length} {locale === "ar" ? "جذور" : fmaps.roots.length === 1 ? "root" : "roots"}
                </span>
              </div>
            </summary>
            <div className="max-h-[60vh] overflow-y-auto border-t border-sand-100 px-2 py-3 sm:px-4">
              {fmaps.roots.length === 0 ? (
                <div className="rounded-xl border border-dashed border-sand-200 p-4 text-center text-xs text-sand-500">
                  {locale === "ar" ? "لا يوجد أفراد في هذه العائلة." : "No members in this family."}
                </div>
              ) : (
                fmaps.roots.map((root) => (
                  <TreeNode
                    key={root.id}
                    person={root}
                    depth={0}
                    maps={fmaps}
                    expanded={expanded}
                    toggle={toggle}
                    locale={locale}
                    selectedId={selectedId}
                    matchedIds={matchedIds}
                    onSelect={onSelect}
                  />
                ))
              )}
            </div>
          </details>
        );
      })}
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
