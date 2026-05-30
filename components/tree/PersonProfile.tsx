"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import type { Person, Relationship } from "@/lib/types";
import { CloseIcon, PlusIcon, FocusIcon, ChevronIcon, EditIcon, getRelationshipIcon } from "@/components/icons";
import { computeRelationshipsFor, labelForRel, siblingOrderCompare, styleForRel } from "@/lib/relationships";
import EditPersonForm from "./EditPersonForm";
import { getDictionary } from "@/lib/i18n/dictionaries";

type RelativeKey =
  | "father" | "mother"
  | "son" | "daughter"
  | "brother" | "sister"
  | "spouse" | "milk"
  | "uncleP" | "uncleM"
  | "auntP" | "auntM";

type Props = {
  person: Person;
  people: Person[];
  relationships: Relationship[];
  locale: "ar" | "en";
  isEditor: boolean;
  dict: {
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
    phone: string;
    email: string;
    website: string;
    contact: string;
  };
  relationLabels: Record<string, string>;
  addDict: {
    title: string;
    save: string;
    cancel: string;
    nameArLabel: string;
    nameEnLabel: string;
    saving: string;
    notEditor: string;
    forPerson: string;
    modeNew: string;
    modeExisting: string;
    pickExisting: string;
    pickExistingHint: string;
    autoSpouseHint: string;
    duplicateError: string;
    siblingsStepTitle: string;
    siblingsStepHint: string;
    skip: string;
    noSiblings: string;
    placeholderFather: string;
    placeholderMother: string;
    placeholderSpouse: string;
    linkStep: {
      titleSiblings: string;  hintSiblings: string;  emptySiblings: string;
      titleChildren: string;  hintChildren: string;  emptyChildren: string;
      titleParents: string;   hintParents: string;   emptyParents: string;
      titleSpouses: string;   hintSpouses: string;   emptySpouses: string;
      alsoSetMother: string;
      alsoSetFather: string;
    };
  };
  focusOnLabel: string;
  onClose: () => void;
  /** Temporarily hide the panel without dropping the selection. The parent
   *  surfaces a small "show panel" chip while hidden so the user can bring
   *  it back. Optional — falls back to onClose if not provided. */
  onHide?: () => void;
  onSelect: (id: string) => void;
  onFocus: () => void;
  onRequestAdd: (key: RelativeKey) => void;
};

const ADD_OPTIONS: RelativeKey[] = [
  "father", "mother", "son", "daughter",
  "brother", "sister", "spouse", "milk",
  "uncleP", "uncleM", "auntP", "auntM",
];

export default function PersonProfile({
  person, people, relationships, locale, isEditor, dict, relationLabels, addDict, focusOnLabel, onClose, onHide, onSelect, onFocus, onRequestAdd
}: Props) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [reorderingId, setReorderingId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const editDict = getDictionary(locale).editPerson;

  // Build the sorted sibling list (this person + siblings, in current order)
  // so the up/down arrows know what's adjacent for swaps.
  const orderedSiblingsForPerson = useMemo(() => {
    const peopleById = new Map(people.map((p) => [p.id, p]));
    const parentIds = relationships
      .filter((r) => r.type === "parent_of" && r.toId === person.id)
      .map((r) => r.fromId);
    const ids = new Set<string>([person.id]);
    for (const pid of parentIds) {
      for (const r of relationships) {
        if (r.type !== "parent_of") continue;
        if (r.fromId !== pid) continue;
        ids.add(r.toId);
      }
    }
    const list: Person[] = [];
    for (const id of ids) {
      const p = peopleById.get(id);
      if (p) list.push(p);
    }
    list.sort(siblingOrderCompare);
    return list;
  }, [person.id, people, relationships]);

  // Spouse rows in current marriage-order. Includes both directions; sort key
  // is `marriageOrder` (rows missing it come last in row-id order).
  const orderedSpousesForPerson = useMemo(() => {
    const rows: { rel: Relationship; spouse: Person }[] = [];
    const peopleById = new Map(people.map((p) => [p.id, p]));
    for (const r of relationships) {
      if (r.type !== "spouse_of") continue;
      let spouse: Person | undefined;
      if (r.fromId === person.id) spouse = peopleById.get(r.toId);
      else if (r.toId === person.id) spouse = peopleById.get(r.fromId);
      if (spouse) rows.push({ rel: r, spouse });
    }
    rows.sort((a, b) => {
      const ao = a.rel.marriageOrder ?? null;
      const bo = b.rel.marriageOrder ?? null;
      if (ao != null && bo != null) return ao - bo;
      if (ao != null) return -1;
      if (bo != null) return 1;
      return a.rel.id.localeCompare(b.rel.id);
    });
    return rows;
  }, [person.id, people, relationships]);

  async function moveSibling(siblingId: string, direction: "up" | "down") {
    const idx = orderedSiblingsForPerson.findIndex((p) => p.id === siblingId);
    if (idx < 0) return;
    const newIdx = direction === "up" ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= orderedSiblingsForPerson.length) return;

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) {
      window.alert(locale === "ar" ? "Supabase غير مهيأ." : "Supabase not configured.");
      return;
    }

    setReorderingId(siblingId);
    // Swap the two positions in the local copy, then re-number 1..n and push
    // every sibling row with its new birth_order in parallel.
    const swapped = [...orderedSiblingsForPerson];
    [swapped[idx], swapped[newIdx]] = [swapped[newIdx], swapped[idx]];

    const sb = createBrowserClient(url, key);
    const results = await Promise.all(
      swapped.map((p, i) =>
        sb.from("people").update({ birth_order: i + 1 }).eq("id", p.id),
      ),
    );
    setReorderingId(null);
    const firstErr = results.find((r) => r.error)?.error;
    if (firstErr) {
      window.alert(
        (locale === "ar" ? "فشل التحديث: " : "Update failed: ") + firstErr.message,
      );
      return;
    }
    router.refresh();
  }

  async function moveSpouse(spouseRelId: string, direction: "up" | "down") {
    const idx = orderedSpousesForPerson.findIndex((s) => s.rel.id === spouseRelId);
    if (idx < 0) return;
    const newIdx = direction === "up" ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= orderedSpousesForPerson.length) return;

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) {
      window.alert(locale === "ar" ? "Supabase غير مهيأ." : "Supabase not configured.");
      return;
    }

    setReorderingId(spouseRelId);
    const swapped = [...orderedSpousesForPerson];
    [swapped[idx], swapped[newIdx]] = [swapped[newIdx], swapped[idx]];

    const sb = createBrowserClient(url, key);
    const results = await Promise.all(
      swapped.map((s, i) =>
        sb.from("relationships").update({ marriage_order: i + 1 }).eq("id", s.rel.id),
      ),
    );
    setReorderingId(null);
    const firstErr = results.find((r) => r.error)?.error;
    if (firstErr) {
      window.alert(
        (locale === "ar" ? "فشل التحديث: " : "Update failed: ") + firstErr.message,
      );
      return;
    }
    router.refresh();
  }

  async function deleteRelationship(relId: string, label: string) {
    const message =
      locale === "ar"
        ? `حذف الرابط "${label}"؟ لا يمكن التراجع عن هذا الإجراء.`
        : `Delete the "${label}" relationship? This cannot be undone.`;
    if (!window.confirm(message)) return;

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) {
      window.alert(locale === "ar" ? "Supabase غير مهيأ." : "Supabase not configured.");
      return;
    }

    setDeletingId(relId);
    const sb = createBrowserClient(url, key);
    const { error } = await sb.from("relationships").delete().eq("id", relId);
    setDeletingId(null);

    if (error) {
      window.alert(
        (locale === "ar" ? "فشل الحذف: " : "Delete failed: ") + error.message,
      );
      return;
    }
    router.refresh();
  }
  const peopleById = useMemo(() => new Map(people.map((p) => [p.id, p])), [people]);

  const personRels = useMemo(
    () => computeRelationshipsFor(person, peopleById, relationships),
    [person, peopleById, relationships],
  );

  const name = locale === "ar" ? person.nameAr : (person.nameEn || person.nameAr);
  const family = locale === "ar" ? person.familyAr : (person.familyEn || person.familyAr);

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <aside
      role="dialog"
      aria-label={dict.profile}
      className="fixed inset-y-0 end-0 z-30 flex w-full flex-col bg-white shadow-2xl sm:w-[420px] sm:border-s sm:border-sand-200"
    >
      <div className="flex items-center justify-between gap-2 border-b border-sand-100 px-5 py-3">
        <div className="flex items-center gap-2">
          <button
            onClick={onFocus}
            className="inline-flex items-center gap-1.5 rounded-full bg-sand-100 px-3 py-1 text-xs font-medium text-sand-700 hover:bg-sand-200"
          >
            <FocusIcon className="h-3.5 w-3.5" />
            {focusOnLabel}
          </button>
          {isEditor && (
            <button
              onClick={() => setEditing(true)}
              className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-800 shadow-soft hover:bg-emerald-100"
            >
              <EditIcon className="h-3.5 w-3.5" />
              {dict.edit}
            </button>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {onHide && (
            <button
              onClick={onHide}
              className="inline-flex items-center gap-1 rounded-full border border-sand-300 bg-white px-2.5 py-1 text-[11px] font-medium text-sand-700 shadow-soft hover:bg-sand-50"
              aria-label={locale === "ar" ? "إخفاء اللوحة" : "Hide panel"}
              title={locale === "ar" ? "إخفاء اللوحة (دون فقد التحديد)" : "Hide the panel (keeps the selection)"}
            >
              {/* Chevron pointing toward the panel's edge: in LTR that's →, in RTL ← */}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={"h-3 w-3 " + (locale === "ar" ? "" : "rotate-180")} aria-hidden="true">
                <polyline points="15 18 9 12 15 6" />
              </svg>
              {locale === "ar" ? "إخفاء" : "Hide"}
            </button>
          )}
          <button
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-full text-sand-600 hover:bg-sand-100"
            aria-label={dict.close}
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-6">
        <div className="flex items-start gap-4">
          <div className={"grid h-14 w-14 place-items-center rounded-full text-white font-display text-xl " + (person.gender === "male" ? "bg-gradient-to-br from-sand-500 to-sand-700" : "bg-gradient-to-br from-rose-400 to-rose-600")}>
            {name.charAt(0)}
          </div>
          <div className="flex-1">
            <h2 className="font-display text-2xl text-sand-900">{name}</h2>
            <div className="text-sm text-sand-600">
              {family ? family : ""}
              {person.generation !== undefined && (
                <span className="ms-2 inline-flex rounded-full bg-sand-100 px-2 py-0.5 text-[11px] text-sand-700">
                  G{person.generation}
                </span>
              )}
            </div>
          </div>
          {isEditor && (
            <button
              onClick={() => setEditing(true)}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-800 shadow-soft hover:bg-emerald-100"
            >
              <EditIcon className="h-4 w-4" />
              {dict.edit}
            </button>
          )}
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
          {person.birthYear && (
            <div>
              <dt className="text-xs text-sand-600">{dict.born}</dt>
              <dd className="text-sand-900">{person.birthYear}</dd>
            </div>
          )}
          {person.deathYear && (
            <div>
              <dt className="text-xs text-sand-600">{dict.died}</dt>
              <dd className="text-sand-900">{person.deathYear}</dd>
            </div>
          )}
          {person.location && (
            <div>
              <dt className="text-xs text-sand-600">{dict.location}</dt>
              <dd className="text-sand-900">{person.location}</dd>
            </div>
          )}
          {(person.occupationAr || person.occupationEn) && (
            <div>
              <dt className="text-xs text-sand-600">{dict.occupation}</dt>
              <dd className="text-sand-900">
                {locale === "ar" ? person.occupationAr : (person.occupationEn || person.occupationAr)}
              </dd>
            </div>
          )}
          {person.phone && (
            <div>
              <dt className="text-xs text-sand-600">{dict.phone}</dt>
              <dd className="text-sand-900"><a href={`tel:${person.phone}`} className="hover:underline">{person.phone}</a></dd>
            </div>
          )}
          {person.email && (
            <div>
              <dt className="text-xs text-sand-600">{dict.email}</dt>
              <dd className="truncate text-sand-900"><a href={`mailto:${person.email}`} className="hover:underline">{person.email}</a></dd>
            </div>
          )}
          {person.website && (
            <div className="col-span-2">
              <dt className="text-xs text-sand-600">{dict.website}</dt>
              <dd className="truncate text-sand-900">
                <a href={person.website} target="_blank" rel="noopener noreferrer" className="hover:underline">
                  {person.website}
                </a>
              </dd>
            </div>
          )}
        </dl>

        {(person.bioAr || person.bioEn) && (
          <div className="mt-4 rounded-xl bg-sand-50 p-3 text-sm text-sand-800">
            <div className="mb-1 text-xs font-medium text-sand-600">{dict.bio}</div>
            <p>{locale === "ar" ? person.bioAr : (person.bioEn || person.bioAr)}</p>
          </div>
        )}

        {/* Relationships list */}
        <div className="mt-5">
          <h3 className="text-sm font-medium text-sand-700">{dict.relationships} ({personRels.length})</h3>
          <ul className="mt-2 max-h-48 space-y-1.5 overflow-y-auto pe-1">
            {personRels.map(({ r, other, isFrom, synthetic }) => {
              const style = styleForRel(r.type, isFrom);
              const otherName = locale === "ar" ? other.nameAr : (other.nameEn || other.nameAr);
              const label = labelForRel(r.type, isFrom, other, relationLabels);
              const canDelete = isEditor && !synthetic;
              const isDeleting = deletingId === r.id;
              const isSiblingRow = r.type === "sibling_of" || r.type === "milk_sibling_of";
              const isSpouseRow = r.type === "spouse_of";
              const sibIdx = isSiblingRow ? orderedSiblingsForPerson.findIndex((p) => p.id === other.id) : -1;
              const spouseIdx = isSpouseRow ? orderedSpousesForPerson.findIndex((s) => s.rel.id === r.id) : -1;
              const canMoveUp =
                isEditor && (
                  (isSiblingRow && sibIdx > 0) ||
                  (isSpouseRow && spouseIdx > 0)
                );
              const canMoveDown =
                isEditor && (
                  (isSiblingRow && sibIdx >= 0 && sibIdx < orderedSiblingsForPerson.length - 1) ||
                  (isSpouseRow && spouseIdx >= 0 && spouseIdx < orderedSpousesForPerson.length - 1)
                );
              const isReorderingThis = reorderingId === other.id || reorderingId === r.id;
              const onMove = (dir: "up" | "down") => {
                if (isSpouseRow) moveSpouse(r.id, dir);
                else moveSibling(other.id, dir);
              };
              const olderLabel = isSpouseRow
                ? (locale === "ar" ? "زواج سابق" : "Earlier marriage")
                : (locale === "ar" ? "أقدم" : "Older");
              const youngerLabel = isSpouseRow
                ? (locale === "ar" ? "زواج لاحق" : "Later marriage")
                : (locale === "ar" ? "أصغر" : "Younger");
              return (
                <li key={r.id} className="flex items-center gap-2 rounded-lg border border-sand-100 bg-white px-3 py-1.5 text-sm">
                  <span
                    aria-hidden
                    className="inline-flex h-5 w-5 items-center justify-center rounded-full"
                    style={{ color: style.color, backgroundColor: style.color + "22" }}
                  >
                    {getRelationshipIcon(style.icon, "h-3.5 w-3.5")}
                  </span>
                  <span className="text-sand-600 text-xs">{label}</span>
                  <button
                    onClick={() => onSelect(other.id)}
                    className="ms-auto rounded-full px-2 py-0.5 text-sand-900 hover:bg-sand-100"
                  >
                    {otherName} →
                  </button>
                  {(canMoveUp || canMoveDown) && (
                    <div className="flex shrink-0 flex-col gap-px">
                      <button
                        type="button"
                        onClick={() => onMove("up")}
                        disabled={!canMoveUp || isReorderingThis}
                        className="grid h-3 w-5 place-items-center rounded text-sand-500 hover:bg-sand-100 hover:text-sand-800 disabled:opacity-30 disabled:hover:bg-transparent"
                        aria-label={olderLabel}
                        title={olderLabel}
                      >
                        <ChevronIcon className="h-3 w-3 rotate-180" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onMove("down")}
                        disabled={!canMoveDown || isReorderingThis}
                        className="grid h-3 w-5 place-items-center rounded text-sand-500 hover:bg-sand-100 hover:text-sand-800 disabled:opacity-30 disabled:hover:bg-transparent"
                        aria-label={youngerLabel}
                        title={youngerLabel}
                      >
                        <ChevronIcon className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                  {canDelete && (
                    <button
                      onClick={() => deleteRelationship(r.id, `${label} → ${otherName}`)}
                      disabled={isDeleting}
                      className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-rose-500 hover:bg-rose-50 disabled:opacity-50"
                      aria-label={locale === "ar" ? "حذف" : "Delete"}
                      title={locale === "ar" ? "حذف الرابط" : "Delete relationship"}
                    >
                      {isDeleting ? <span className="text-[10px]">…</span> : <CloseIcon className="h-3.5 w-3.5" />}
                    </button>
                  )}
                </li>
              );
            })}
            {personRels.length === 0 && (
              <li className="text-xs text-sand-500">—</li>
            )}
          </ul>
        </div>

        {/* Add-relative quick buttons (editors only) */}
        <div className="mt-5">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-sand-700">
            <PlusIcon className="h-4 w-4" /> {dict.addRelative}
          </div>
          {isEditor ? (
            <div className="flex flex-wrap gap-1.5">
              {ADD_OPTIONS.map((k) => (
                <button
                  key={k}
                  onClick={() => onRequestAdd(k)}
                  className="inline-flex items-center gap-1 rounded-full border border-sand-200 bg-white px-2.5 py-1 text-xs text-sand-700 hover:bg-sand-50"
                >
                  <PlusIcon className="h-3 w-3" />
                  {relationLabels[k] ?? k}
                </button>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-sand-200 bg-sand-50 px-3 py-2 text-xs text-sand-700">
              {addDict.notEditor}
            </div>
          )}
        </div>
      </div>

      {editing && (
        <EditPersonForm
          person={person}
          locale={locale}
          dict={{
            ...editDict,
            location: dict.location,
            phone: dict.phone,
            email: dict.email,
            website: dict.website,
            nameArLabel: addDict.nameArLabel,
            nameEnLabel: addDict.nameEnLabel,
            close: dict.close,
          }}
          onClose={() => setEditing(false)}
          onDeleted={() => {
            // Person is gone — close the side panel too, so the parent (TreeCanvas)
            // can clear `selectedId`. router.refresh() has already been called
            // inside EditPersonForm.
            setEditing(false);
            onClose();
          }}
        />
      )}
    </aside>
  );
}
