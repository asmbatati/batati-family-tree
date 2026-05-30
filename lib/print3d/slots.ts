import type { Person, Relationship } from "@/lib/types";
import { siblingOrderCompare } from "@/lib/relationships";
import type { Slot } from "./types";

/**
 * Build the slot list for the 3D-print model.
 *
 * Per the user's spec, this includes ONLY the centred person, their spouse(s),
 * and their direct children — NOT parents or siblings. The order returned is
 * `[center, ...spouses, ...children]` so the themes can rely on the first
 * (1 + spouseCount) slots being the "couple band".
 *
 * Children are sorted by `siblingOrderCompare` (explicit birth_order →
 * birth_year → name) so the printed model mirrors the editor's chosen order.
 */
export function buildSlots(
  center: Person,
  relationships: Relationship[],
  people: Person[],
): Slot[] {
  const byId = new Map(people.map((p) => [p.id, p]));

  const spouseIds = new Set<string>();
  const childIds: string[] = [];
  for (const r of relationships) {
    if (r.type === "spouse_of") {
      if (r.fromId === center.id) spouseIds.add(r.toId);
      if (r.toId === center.id) spouseIds.add(r.fromId);
    } else if (r.type === "parent_of") {
      if (r.fromId === center.id) childIds.push(r.toId);
    }
  }

  const spouses: Person[] = [...spouseIds]
    .map((id) => byId.get(id))
    .filter((p): p is Person => !!p);

  const children: Person[] = childIds
    .map((id) => byId.get(id))
    .filter((p): p is Person => !!p)
    .sort(siblingOrderCompare);

  // Cap the totals to keep the printed piece a sensible size on a typical FDM bed.
  const cappedSpouses = spouses.slice(0, 4);
  const cappedChildren = children.slice(0, 12);

  const slots: Slot[] = [];
  slots.push({ person: center, role: "center", index: 0 });
  cappedSpouses.forEach((p, i) => slots.push({ person: p, role: "spouse", index: i }));
  cappedChildren.forEach((p, i) => slots.push({ person: p, role: "child", index: i }));
  return slots;
}

/** Pretty-pick the display name for a slot in the current locale. */
export function slotLabel(slot: Slot, locale: "ar" | "en"): string {
  const p = slot.person;
  return locale === "ar" ? p.nameAr : (p.nameEn || p.nameAr);
}
