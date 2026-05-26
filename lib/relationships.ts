import type { Person, Relationship, RelationshipType } from "./types";
import { RELATIONSHIP_STYLE } from "./types";

export type RelationshipEntry = {
  r: Relationship;
  other: Person;
  isFrom: boolean;
  /** True when this entry was derived (e.g. siblings via shared parent) and
   *  doesn't correspond to a row in `public.relationships`. */
  synthetic?: boolean;
};

/**
 * Direction-aware relationship style. The base `RELATIONSHIP_STYLE` map gives
 * one color/icon per type, but parent_of in particular needs different visuals
 * for "this is my parent" vs "this is my child".
 */
export function styleForRel(type: RelationshipType, isFrom: boolean) {
  if (type === "parent_of") {
    return isFrom
      ? { color: "#2e7d4f", icon: "child",  labelKey: "tree.relations.son" }      // I'm parent → other is child
      : { color: "#1b4965", icon: "branch", labelKey: "tree.relations.father" };  // I'm child → other is parent
  }
  return RELATIONSHIP_STYLE[type];
}

/**
 * Pick the right localized label for a relationship row, given which side of
 * it the current person is on and the other person's gender.
 *
 * Direction matters: `parent_of(A,B)` means A is parent of B — so if I'm A
 * (`isFrom=true`), B is my child; if I'm B, A is my parent.
 */
export function labelForRel(
  type: RelationshipType,
  isFrom: boolean,
  other: Person,
  labels: Record<string, string>,
): string {
  switch (type) {
    case "parent_of":
      if (isFrom) return other.gender === "female" ? labels.daughter : labels.son;
      return other.gender === "female" ? labels.mother : labels.father;
    case "spouse_of":         return labels.spouse;
    case "sibling_of":        return other.gender === "female" ? labels.sister : labels.brother;
    case "milk_sibling_of":   return labels.milk;
    case "uncle_paternal_of": return labels.uncleP;
    case "uncle_maternal_of": return labels.uncleM;
    case "aunt_paternal_of":  return labels.auntP;
    case "aunt_maternal_of":  return labels.auntM;
    case "cousin_of":         return labels.cousin;
    case "guardian_of":       return labels.father;
    case "other":
    default:                  return type;
  }
}

/**
 * Lower number = higher in a relationships list. Used to group parents above,
 * spouses next, then siblings, then children, then distant relations.
 */
export function relationshipSortKey(type: RelationshipType, isFrom: boolean): number {
  if (type === "parent_of") return isFrom ? 40 : 10;
  if (type === "spouse_of") return 20;
  if (type === "sibling_of" || type === "milk_sibling_of") return 30;
  return 50;
}

/**
 * Sort comparator for siblings (or any same-generation peer group):
 *   1. Explicit `birthOrder` ascending (oldest first; null sorts last).
 *   2. `birthYear` ascending as fallback.
 *   3. Arabic name alphabetical.
 *
 * Used wherever children of a parent are listed — CollapsibleTree, FocusView,
 * PersonProfile relationships, etc.
 */
export function siblingOrderCompare(a: Person, b: Person): number {
  const ao = a.birthOrder ?? null;
  const bo = b.birthOrder ?? null;
  if (ao !== null && bo !== null) {
    if (ao !== bo) return ao - bo;
  } else if (ao !== null) {
    return -1;
  } else if (bo !== null) {
    return 1;
  }
  const ay = a.birthYear ?? null;
  const by = b.birthYear ?? null;
  if (ay !== null && by !== null && ay !== by) return ay - by;
  return (a.nameAr ?? "").localeCompare(b.nameAr ?? "");
}

/**
 * Build the full list of relationships for `person`:
 *   1. Direct rows from the relationships table involving `person`.
 *   2. Implicit siblings: anyone sharing a parent with `person` that isn't
 *      already linked by an explicit sibling_of/milk_sibling_of row. These
 *      are returned with `synthetic: true` and an id like `_sib_<otherId>`.
 *
 * Results are sorted by `relationshipSortKey`, then generation, then name.
 */
export function computeRelationshipsFor(
  person: Person,
  peopleById: Map<string, Person>,
  relationships: Relationship[],
): RelationshipEntry[] {
  const direct: RelationshipEntry[] = [];
  for (const r of relationships) {
    const isFrom = r.fromId === person.id;
    const isTo = r.toId === person.id;
    if (!isFrom && !isTo) continue;
    const otherId = isFrom ? r.toId : r.fromId;
    const other = peopleById.get(otherId);
    if (!other) continue;
    direct.push({ r, other, isFrom });
  }

  const parentIds: string[] = [];
  for (const r of relationships) {
    if (r.type === "parent_of" && r.toId === person.id) parentIds.push(r.fromId);
  }

  const alreadyLinked = new Set<string>();
  for (const d of direct) {
    if (d.r.type === "sibling_of" || d.r.type === "milk_sibling_of") {
      alreadyLinked.add(d.other.id);
    }
  }

  const implicit: RelationshipEntry[] = [];
  const seen = new Set<string>();
  for (const parentId of parentIds) {
    for (const r of relationships) {
      if (r.type !== "parent_of") continue;
      if (r.fromId !== parentId) continue;
      if (r.toId === person.id) continue;
      if (alreadyLinked.has(r.toId) || seen.has(r.toId)) continue;
      const other = peopleById.get(r.toId);
      if (!other) continue;
      seen.add(r.toId);
      implicit.push({
        r: { id: `_sib_${other.id}`, type: "sibling_of", fromId: person.id, toId: other.id },
        other,
        isFrom: true,
        synthetic: true,
      });
    }
  }

  const all = [...direct, ...implicit];
  all.sort((a, b) => {
    const ka = relationshipSortKey(a.r.type, a.isFrom);
    const kb = relationshipSortKey(b.r.type, b.isFrom);
    if (ka !== kb) return ka - kb;
    // Same relationship category → use the sibling/peer comparator (birth
    // order → birth year → name).
    return siblingOrderCompare(a.other, b.other);
  });
  return all;
}

// ---------------------------------------------------------------------------
// Lineage naming: show "name بن father بن grandfather بن great-grandfather"
// so people with common first names are distinguishable in pickers.
// ---------------------------------------------------------------------------

/**
 * Build a child → father map. Prefers male parents when a child has multiple
 * `parent_of` rows; falls back to the first parent seen if no male exists.
 * Result is stable and cheap to look up.
 */
export function buildPatrilineMap(
  people: Person[],
  relationships: Relationship[],
): Map<string, string> {
  const peopleById = new Map(people.map((p) => [p.id, p]));
  const map = new Map<string, string>();
  for (const r of relationships) {
    if (r.type !== "parent_of") continue;
    const parent = peopleById.get(r.fromId);
    if (!parent) continue;
    const existing = map.get(r.toId);
    if (!existing) {
      map.set(r.toId, r.fromId);
      continue;
    }
    // Upgrade: prefer a male parent over a previously-recorded female one.
    const existingPerson = peopleById.get(existing);
    if (existingPerson && existingPerson.gender === "female" && parent.gender === "male") {
      map.set(r.toId, r.fromId);
    }
  }
  return map;
}

/**
 * "احمد بن محمد بن عبدالله بن ناصر" — the person plus up to `depth - 1`
 * ancestors via the patriline map. Always emitted with Arabic connectors
 * (`بن` after a male, `بنت` after a female), because mixing an English
 * separator with Arabic names produces bidirectional rendering bugs.
 *
 * `maxDepth` is the total number of names in the chain (1 = name only, 4 =
 * name + up to 3 grandfathers).
 */
export function lineageName(
  person: Person,
  peopleById: Map<string, Person>,
  patrilineMap: Map<string, string>,
  locale: "ar" | "en",
  maxDepth = 4,
): string {
  const chain: Person[] = [];
  let cur: string | undefined = person.id;
  const seen = new Set<string>(); // cycle guard
  for (let i = 0; i < maxDepth && cur; i++) {
    if (seen.has(cur)) break;
    seen.add(cur);
    const p = peopleById.get(cur);
    if (!p) break;
    chain.push(p);
    cur = patrilineMap.get(cur);
  }

  let out = "";
  for (let i = 0; i < chain.length; i++) {
    const p = chain[i];
    out += locale === "ar" ? p.nameAr : (p.nameEn || p.nameAr);
    if (i < chain.length - 1) {
      // The connector reflects THIS person's gender ("X is the son/daughter of Y").
      out += p.gender === "female" ? " بنت " : " بن ";
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Graph utilities for the "relate" feature: pick two people, show the
// shortest chain of relationships connecting them.
// ---------------------------------------------------------------------------

export type Edge = { to: string; via: Relationship };
export type PathStep = { id: string; via?: Relationship };

/**
 * Build a bidirectional adjacency map for path-finding. Every
 * `parent_of`/`spouse_of`/`sibling_of`/`milk_sibling_of`/uncle/aunt/cousin
 * row becomes a two-way edge. Additionally, every pair of children of the
 * same parent gets a synthetic `sibling_of` edge so the BFS sees implicit
 * sibling links (the imported seed only has `parent_of` rows).
 */
export function buildRelationshipGraph(relationships: Relationship[]): Map<string, Edge[]> {
  const adj = new Map<string, Edge[]>();
  const add = (a: string, b: string, via: Relationship) => {
    const list = adj.get(a) ?? [];
    list.push({ to: b, via });
    adj.set(a, list);
  };

  for (const r of relationships) {
    add(r.fromId, r.toId, r);
    add(r.toId, r.fromId, r);
  }

  // Implicit siblings: children of the same parent are siblings.
  const childrenByParent = new Map<string, string[]>();
  for (const r of relationships) {
    if (r.type !== "parent_of") continue;
    const arr = childrenByParent.get(r.fromId) ?? [];
    arr.push(r.toId);
    childrenByParent.set(r.fromId, arr);
  }
  for (const children of childrenByParent.values()) {
    for (let i = 0; i < children.length; i++) {
      for (let j = i + 1; j < children.length; j++) {
        const synth: Relationship = {
          id: `_sib_${children[i]}_${children[j]}`,
          type: "sibling_of",
          fromId: children[i],
          toId: children[j],
        };
        add(children[i], children[j], synth);
        add(children[j], children[i], synth);
      }
    }
  }

  return adj;
}

/**
 * BFS shortest path. Returns the list of steps from `fromId` to `toId`
 * (inclusive of both endpoints), or `null` if no path exists. Each step
 * after the first carries the `via` relationship that connects it to the
 * previous step.
 */
export function shortestPath(
  graph: Map<string, Edge[]>,
  fromId: string,
  toId: string,
): PathStep[] | null {
  if (fromId === toId) return [{ id: fromId }];

  const visited = new Set<string>([fromId]);
  // `prev[id]` = { from: parentInBfsTree, via: edge }
  const prev = new Map<string, { from: string; via: Relationship }>();
  const queue: string[] = [fromId];

  while (queue.length) {
    const cur = queue.shift()!;
    if (cur === toId) break;
    for (const { to, via } of graph.get(cur) ?? []) {
      if (visited.has(to)) continue;
      visited.add(to);
      prev.set(to, { from: cur, via });
      queue.push(to);
    }
  }

  if (!visited.has(toId)) return null;

  // Reconstruct the path.
  const path: PathStep[] = [];
  let cur: string | undefined = toId;
  while (cur) {
    const p = prev.get(cur);
    path.unshift({ id: cur, via: p?.via });
    cur = p?.from;
  }
  return path;
}

