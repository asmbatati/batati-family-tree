"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import type { Person, RelationshipType, Gender } from "@/lib/types";
import type { Relationship } from "@/lib/types";
import { buildPatrilineMap, lineageName } from "@/lib/relationships";
import { CloseIcon, SearchIcon } from "@/components/icons";

type RelativeKey =
  | "father" | "mother"
  | "son" | "daughter"
  | "brother" | "sister"
  | "spouse" | "milk"
  | "uncleP" | "uncleM"
  | "auntP" | "auntM";

type Meta = {
  type: RelationshipType;
  gender: Gender;
  generation: number;
  fromIsCurrent: boolean; // true: from = current, to = new
};

function metaFor(key: RelativeKey, current: Person): Meta {
  const gen = current.generation ?? 0;
  switch (key) {
    case "father":   return { type: "parent_of",         gender: "male",   generation: gen - 1, fromIsCurrent: false };
    case "mother":   return { type: "parent_of",         gender: "female", generation: gen - 1, fromIsCurrent: false };
    case "son":      return { type: "parent_of",         gender: "male",   generation: gen + 1, fromIsCurrent: true  };
    case "daughter": return { type: "parent_of",         gender: "female", generation: gen + 1, fromIsCurrent: true  };
    case "brother":  return { type: "sibling_of",        gender: "male",   generation: gen,     fromIsCurrent: true  };
    case "sister":   return { type: "sibling_of",        gender: "female", generation: gen,     fromIsCurrent: true  };
    case "spouse":   return { type: "spouse_of",         gender: current.gender === "male" ? "female" : "male", generation: gen, fromIsCurrent: true };
    case "milk":     return { type: "milk_sibling_of",   gender: current.gender, generation: gen, fromIsCurrent: true };
    case "uncleP":   return { type: "uncle_paternal_of", gender: "male",   generation: gen - 1, fromIsCurrent: false };
    case "uncleM":   return { type: "uncle_maternal_of", gender: "male",   generation: gen - 1, fromIsCurrent: false };
    case "auntP":    return { type: "aunt_paternal_of",  gender: "female", generation: gen - 1, fromIsCurrent: false };
    case "auntM":    return { type: "aunt_maternal_of",  gender: "female", generation: gen - 1, fromIsCurrent: false };
  }
}

type Mode = "new" | "existing";

type Props = {
  relativeKey: RelativeKey;
  currentPerson: Person;
  people: Person[];
  relationships: Relationship[];
  locale: "ar" | "en";
  relationLabel: string;
  dict: {
    title: string;
    save: string;
    cancel: string;
    nameArLabel: string;
    nameEnLabel: string;
    saving: string;
    forPerson: string;
    close: string;
    modeNew: string;
    modeExisting: string;
    pickExisting: string;
    pickExistingHint: string;
    autoSpouseHint: string;
    duplicateError: string;
    skip: string;
    linkStep: {
      titleSiblings: string;  hintSiblings: string;  emptySiblings: string;
      titleChildren: string;  hintChildren: string;  emptyChildren: string;
      titleParents: string;   hintParents: string;   emptyParents: string;
      titleSpouses: string;   hintSpouses: string;   emptySpouses: string;
      alsoSetMother: string;
      alsoSetFather: string;
    };
  };
  onClose: () => void;
};

type Step = "primary" | "linkOthers";
type LinkCategory = "siblings" | "children" | "parents" | "spouses";
type LinkDirection = "newIsParent" | "candidateIsParent";

/**
 * Decide the follow-up step after primary insert:
 *  - father/mother → "which of my siblings share this new parent?" (newIsParent)
 *  - spouse        → "which of my children share this new spouse?"  (newIsParent)
 *  - brother/sister → "which of my parents are also this sibling's?" (candidateIsParent)
 *  - son/daughter  → "which spouse is this child's other parent?"    (candidateIsParent)
 *  - milk / uncle / aunt → no follow-up (return null)
 */
function linkConfigFor(relativeKey: RelativeKey): { category: LinkCategory; direction: LinkDirection } | null {
  switch (relativeKey) {
    case "father":
    case "mother":   return { category: "siblings", direction: "newIsParent" };
    case "spouse":   return { category: "children", direction: "newIsParent" };
    case "brother":
    case "sister":   return { category: "parents",  direction: "candidateIsParent" };
    case "son":
    case "daughter": return { category: "spouses",  direction: "candidateIsParent" };
    default:         return null;
  }
}

export default function AddRelativeForm({
  relativeKey,
  currentPerson,
  people,
  relationships,
  locale,
  relationLabel,
  dict,
  onClose,
}: Props) {
  const router = useRouter();
  const meta = metaFor(relativeKey, currentPerson);
  const [step, setStep] = useState<Step>("primary");
  const [mode, setMode] = useState<Mode>("new");
  const [nameAr, setNameAr] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [pickedId, setPickedId] = useState<string | null>(null);
  const [pickQuery, setPickQuery] = useState("");
  const [pickOpen, setPickOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newParentId, setNewParentId] = useState<string | null>(null);
  const [newParentName, setNewParentName] = useState<string>("");
  const [siblingChoices, setSiblingChoices] = useState<Set<string>>(new Set());
  // "Also set the other parent" inline picker — only used when adding a
  // father or mother. Lets the editor specify both parents in one flow.
  const [otherParentMode, setOtherParentMode] = useState<"none" | "existing" | "new">("none");
  const [otherParentId, setOtherParentId] = useState<string | null>(null);
  const [otherParentQuery, setOtherParentQuery] = useState("");
  const [otherParentOpen, setOtherParentOpen] = useState(false);
  const [otherParentNewName, setOtherParentNewName] = useState("");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const currentName = locale === "ar" ? currentPerson.nameAr : (currentPerson.nameEn || currentPerson.nameAr);
  const isParentAdd = relativeKey === "father" || relativeKey === "mother";

  const peopleById = useMemo(() => new Map(people.map((p) => [p.id, p])), [people]);
  const patriline = useMemo(() => buildPatrilineMap(people, relationships), [people, relationships]);
  const lineageOf = (p: Person) => lineageName(p, peopleById, patriline, locale, 4);

  // For "existing" picker — filter to candidates that aren't the current person.
  // Match against the full lineage chain so users can disambiguate by ancestor.
  const candidates = useMemo(() => {
    const q = pickQuery.trim();
    const base = people.filter((p) => p.id !== currentPerson.id);
    if (!q) return base.slice(0, 50);
    const lower = q.toLowerCase();
    return base
      .filter((p) => {
        const chain = lineageOf(p);
        return (
          chain.includes(q) ||
          chain.toLowerCase().includes(lower) ||
          p.nameAr.includes(q) ||
          (p.nameEn?.toLowerCase().includes(lower) ?? false)
        );
      })
      .slice(0, 50);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [people, pickQuery, currentPerson.id, patriline, locale]);

  const pickedPerson = pickedId ? people.find((p) => p.id === pickedId) ?? null : null;

  const linkConfig = linkConfigFor(relativeKey);

  // Candidates for the link-others step. Computed lazily based on the link
  // category for this relative type.
  const linkCandidates = useMemo<Person[]>(() => {
    if (!linkConfig) return [];
    const byId = new Map(people.map((p) => [p.id, p]));

    if (linkConfig.category === "siblings") {
      // Anyone sharing at least one parent with the current person.
      const myParentIds = relationships
        .filter((r) => r.type === "parent_of" && r.toId === currentPerson.id)
        .map((r) => r.fromId);
      const ids = new Set<string>();
      for (const pid of myParentIds) {
        for (const r of relationships) {
          if (r.type !== "parent_of") continue;
          if (r.fromId !== pid) continue;
          if (r.toId === currentPerson.id) continue;
          ids.add(r.toId);
        }
      }
      return [...ids].map((id) => byId.get(id)).filter((p): p is Person => !!p);
    }

    if (linkConfig.category === "children") {
      const ids = new Set(
        relationships
          .filter((r) => r.type === "parent_of" && r.fromId === currentPerson.id)
          .map((r) => r.toId),
      );
      return [...ids].map((id) => byId.get(id)).filter((p): p is Person => !!p);
    }

    if (linkConfig.category === "parents") {
      const ids = new Set(
        relationships
          .filter((r) => r.type === "parent_of" && r.toId === currentPerson.id)
          .map((r) => r.fromId),
      );
      return [...ids].map((id) => byId.get(id)).filter((p): p is Person => !!p);
    }

    // spouses
    const ids = new Set(
      relationships
        .filter((r) => r.type === "spouse_of" && (r.fromId === currentPerson.id || r.toId === currentPerson.id))
        .map((r) => (r.fromId === currentPerson.id ? r.toId : r.fromId)),
    );
    return [...ids].map((id) => byId.get(id)).filter((p): p is Person => !!p);
  }, [linkConfig, relationships, currentPerson.id, people]);

  // Title / hint / empty text for the link-others step, selected by category.
  const linkTexts = useMemo(() => {
    if (!linkConfig) return null;
    const ls = dict.linkStep;
    switch (linkConfig.category) {
      case "siblings": return { title: ls.titleSiblings, hint: ls.hintSiblings, empty: ls.emptySiblings };
      case "children": return { title: ls.titleChildren, hint: ls.hintChildren, empty: ls.emptyChildren };
      case "parents":  return { title: ls.titleParents,  hint: ls.hintParents,  empty: ls.emptyParents };
      case "spouses":  return { title: ls.titleSpouses,  hint: ls.hintSpouses,  empty: ls.emptySpouses };
    }
  }, [linkConfig, dict.linkStep]);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) {
      setError("Supabase not configured.");
      setSubmitting(false);
      return;
    }

    const sb = createBrowserClient(url, key);

    // Step 1: resolve the other person's id.
    let otherId: string;
    if (mode === "new") {
      const { data: newPerson, error: e1 } = await sb
        .from("people")
        .insert({
          name_ar: nameAr.trim(),
          name_en: nameEn.trim() || null,
          gender: meta.gender,
          generation: meta.generation,
          status: "unknown",
          family_ar: "البطاطي",
          family_en: "Al-Batati",
        })
        .select("id")
        .single();
      if (e1 || !newPerson) {
        setError(e1?.message ?? "Insert failed.");
        setSubmitting(false);
        return;
      }
      otherId = newPerson.id;
    } else {
      if (!pickedId) {
        setError(dict.pickExistingHint);
        setSubmitting(false);
        return;
      }
      otherId = pickedId;
    }

    // Step 2: insert the primary relationship.
    const fromId = meta.fromIsCurrent ? currentPerson.id : otherId;
    const toId   = meta.fromIsCurrent ? otherId           : currentPerson.id;
    const { error: e2 } = await sb.from("relationships").insert({
      type: meta.type,
      from_id: fromId,
      to_id: toId,
    });
    if (e2 && !isDuplicateKeyError(e2)) {
      setError(e2.message);
      setSubmitting(false);
      return;
    }
    if (e2 && isDuplicateKeyError(e2)) {
      // Surface friendly message but only when this was the *new* path; an
      // editor explicitly picking an existing person and getting "exists"
      // is informative. For "new" mode we still proceed to auto-spouse so
      // partially-completed inserts don't strand the user.
      setError(dict.duplicateError);
    }

    // Step 3: auto-link mother ↔ father as spouses when applicable.
    if (isParentAdd) {
      const otherParentGender: Gender = relativeKey === "mother" ? "male" : "female";
      const peopleByIdLocal = new Map(people.map((p) => [p.id, p]));
      const existingOther = relationships
        .filter((r) => r.type === "parent_of" && r.toId === currentPerson.id)
        .map((r) => peopleByIdLocal.get(r.fromId))
        .find((p) => p && p.gender === otherParentGender && p.id !== otherId);

      if (existingOther) {
        // Best-effort: ignore duplicate-key errors silently — the spouse
        // link might already exist from a prior operation.
        await sb.from("relationships").insert({
          type: "spouse_of",
          from_id: existingOther.id,
          to_id: otherId,
        });
      }
    }

    // Step 4: if this relative type has a link-others follow-up (siblings,
    // children, parents, or spouses) and there are candidates to link, switch
    // to that step instead of closing.
    if (linkConfig && linkCandidates.length > 0) {
      const otherPerson = people.find((p) => p.id === otherId);
      const otherName = otherPerson
        ? (locale === "ar" ? otherPerson.nameAr : (otherPerson.nameEn || otherPerson.nameAr))
        : (mode === "new" ? nameAr.trim() : "");
      setNewParentId(otherId);
      setNewParentName(otherName);
      setSubmitting(false);
      setStep("linkOthers");
      return;
    }

    router.refresh();
    onClose();
  }

  async function submitLinkOthers() {
    if (!linkConfig || !newParentId) {
      router.refresh();
      onClose();
      return;
    }
    setSubmitting(true);

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) {
      setSubmitting(false);
      onClose();
      return;
    }
    const sb = createBrowserClient(url, key);

    // Pre-compute the set of (type, from, to) triples that already exist in
    // the DB snapshot, so we can drop any duplicate inserts before they hit
    // PostgREST. Works even when the unique constraint isn't applied yet.
    const existingPairs = new Set(
      relationships.map((r) => `${r.type}|${r.fromId}|${r.toId}`),
    );
    const isDup = (type: string, fromId: string, toId: string) =>
      existingPairs.has(`${type}|${fromId}|${toId}`);

    const toInsert: { type: "parent_of" | "spouse_of"; from_id: string; to_id: string }[] = [];

    // 1) "Also set other parent" inline picker (father/mother adds only).
    if (isParentAdd && otherParentMode !== "none") {
      let otherId: string | null = null;
      if (otherParentMode === "existing" && otherParentId) {
        otherId = otherParentId;
      } else if (otherParentMode === "new" && otherParentNewName.trim()) {
        const otherGender: Gender = relativeKey === "father" ? "female" : "male";
        const { data: newP, error: e0 } = await sb
          .from("people")
          .insert({
            name_ar: otherParentNewName.trim(),
            gender: otherGender,
            generation: meta.generation,
            status: "unknown",
            family_ar: "البطاطي",
            family_en: "Al-Batati",
          })
          .select("id")
          .single();
        if (!e0 && newP) otherId = newP.id;
      }
      if (otherId) {
        // parent_of(otherParent → currentPerson)
        if (!isDup("parent_of", otherId, currentPerson.id)) {
          toInsert.push({ type: "parent_of", from_id: otherId, to_id: currentPerson.id });
        }
        // spouse_of(newParent ↔ otherParent) — dedupe both directions
        if (!isDup("spouse_of", newParentId, otherId) && !isDup("spouse_of", otherId, newParentId)) {
          toInsert.push({ type: "spouse_of", from_id: newParentId, to_id: otherId });
        }
      }
    }

    // 2) Sibling/children/parents/spouses linkage.
    for (const candidateId of siblingChoices) {
      const fromId = linkConfig.direction === "newIsParent" ? newParentId  : candidateId;
      const toId   = linkConfig.direction === "newIsParent" ? candidateId  : newParentId;
      if (isDup("parent_of", fromId, toId)) continue;
      toInsert.push({ type: "parent_of", from_id: fromId, to_id: toId });
    }

    if (toInsert.length > 0) {
      // Best-effort: ignore the few duplicate-key errors that may slip past
      // our snapshot check if other clients are racing us.
      await sb.from("relationships").insert(toInsert);
    }

    router.refresh();
    onClose();
  }

  function isDuplicateKeyError(err: { code?: string; message?: string }): boolean {
    if (err.code === "23505") return true;
    return /duplicate key|already exists/i.test(err.message ?? "");
  }

  const canSubmit =
    mode === "new"
      ? nameAr.trim().length > 0
      : pickedId !== null;

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/40 px-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <form
        onSubmit={(e) => {
          if (step === "primary") return submit(e);
          e.preventDefault();
          return submitLinkOthers();
        }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            {step === "primary" ? (
              <>
                <h2 className="font-display text-xl text-sand-900">
                  {dict.title} {relationLabel}
                </h2>
                <div className="mt-0.5 text-xs text-sand-600">
                  {dict.forPerson} <span className="font-medium text-sand-800">{currentName}</span>
                  {" · G"}{meta.generation}
                </div>
              </>
            ) : (
              <>
                <h2 className="font-display text-xl text-sand-900">
                  {linkTexts?.title}
                </h2>
                <div className="mt-0.5 text-xs text-sand-600">
                  {linkTexts?.hint}
                </div>
                {newParentName && (
                  <div className="mt-1 text-xs text-sand-700">
                    <span className="font-medium">{newParentName}</span>
                  </div>
                )}
              </>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-full text-sand-600 hover:bg-sand-100"
            aria-label={dict.close}
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        {step === "linkOthers" ? (
          <div className="mt-4 space-y-4">
            {/* "Also set the other parent" — only for father/mother adds. */}
            {isParentAdd && (() => {
              const oppositeIsExisting = otherParentMode === "existing";
              const oppositeIsNew = otherParentMode === "new";
              const oppositePicked = otherParentId
                ? people.find((p) => p.id === otherParentId) ?? null
                : null;
              const oppositeCandidates = (() => {
                const q = otherParentQuery.trim();
                const targetGender: Gender = relativeKey === "father" ? "female" : "male";
                const base = people.filter((p) => p.id !== currentPerson.id && p.gender === targetGender);
                if (!q) return base.slice(0, 30);
                const lower = q.toLowerCase();
                return base
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
              })();
              return (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3">
                  <div className="text-xs font-medium text-emerald-900">
                    {relativeKey === "father" ? dict.linkStep.alsoSetMother : dict.linkStep.alsoSetFather}
                  </div>
                  <div className="mt-2 inline-flex rounded-full border border-sand-200 bg-white p-1 text-xs">
                    <button
                      type="button"
                      onClick={() => setOtherParentMode("none")}
                      className={"rounded-full px-3 py-1 " + (otherParentMode === "none" ? "bg-sand-700 text-white" : "text-sand-700 hover:bg-sand-100")}
                    >
                      —
                    </button>
                    <button
                      type="button"
                      onClick={() => setOtherParentMode("new")}
                      className={"rounded-full px-3 py-1 " + (oppositeIsNew ? "bg-sand-700 text-white" : "text-sand-700 hover:bg-sand-100")}
                    >
                      {dict.modeNew}
                    </button>
                    <button
                      type="button"
                      onClick={() => setOtherParentMode("existing")}
                      className={"rounded-full px-3 py-1 " + (oppositeIsExisting ? "bg-sand-700 text-white" : "text-sand-700 hover:bg-sand-100")}
                    >
                      {dict.modeExisting}
                    </button>
                  </div>
                  {oppositeIsNew && (
                    <input
                      type="text"
                      value={otherParentNewName}
                      onChange={(e) => setOtherParentNewName(e.target.value)}
                      placeholder={dict.nameArLabel}
                      className="mt-2 w-full rounded-xl border border-sand-200 bg-white px-3 py-2 text-sm outline-none focus:border-sand-400 focus:ring-2 focus:ring-sand-200"
                    />
                  )}
                  {oppositeIsExisting && (
                    <div className="relative mt-2">
                      {oppositePicked ? (
                        <div className="flex items-center justify-between gap-2 rounded-xl border border-sand-200 bg-white px-3 py-2">
                          <div className="truncate text-sm text-sand-900" title={lineageOf(oppositePicked)}>
                            {lineageOf(oppositePicked)}
                          </div>
                          <button
                            type="button"
                            onClick={() => { setOtherParentId(null); setOtherParentQuery(""); }}
                            className="grid h-6 w-6 place-items-center rounded-full text-sand-500 hover:bg-sand-100"
                            aria-label={dict.close}
                          >
                            <CloseIcon className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <SearchIcon className="pointer-events-none absolute top-1/2 start-3 h-4 w-4 -translate-y-1/2 text-sand-500" />
                          <input
                            type="text"
                            value={otherParentQuery}
                            onChange={(e) => { setOtherParentQuery(e.target.value); setOtherParentOpen(true); }}
                            onFocus={() => setOtherParentOpen(true)}
                            onBlur={() => setTimeout(() => setOtherParentOpen(false), 150)}
                            placeholder={dict.pickExisting}
                            className="w-full rounded-xl border border-sand-200 bg-white py-2 ps-9 pe-3 text-sm outline-none focus:border-sand-400 focus:ring-2 focus:ring-sand-200"
                          />
                          {otherParentOpen && oppositeCandidates.length > 0 && (
                            <ul className="absolute z-30 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-sand-200 bg-white py-1 shadow-lg">
                              {oppositeCandidates.map((p) => (
                                <li key={p.id}>
                                  <button
                                    type="button"
                                    onMouseDown={(ev) => ev.preventDefault()}
                                    onClick={() => { setOtherParentId(p.id); setOtherParentQuery(""); setOtherParentOpen(false); }}
                                    className="flex w-full items-center justify-between gap-2 px-3 py-1.5 text-start text-sm hover:bg-sand-100"
                                    title={lineageOf(p)}
                                  >
                                    <span className="truncate">{lineageOf(p)}</span>
                                    {p.generation !== undefined && (
                                      <span className="shrink-0 text-[10px] text-sand-500">G{p.generation}</span>
                                    )}
                                  </button>
                                </li>
                              ))}
                            </ul>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })()}

            {linkCandidates.length === 0 ? (
              <div className="rounded-xl border border-sand-200 bg-sand-50 px-3 py-2 text-sm text-sand-600">
                {linkTexts?.empty}
              </div>
            ) : (
              <ul className="max-h-60 space-y-1 overflow-y-auto">
                {linkCandidates.map((s) => {
                  const checked = siblingChoices.has(s.id);
                  return (
                    <li key={s.id}>
                      <label className="flex w-full cursor-pointer items-center gap-2 rounded-xl border border-sand-200 bg-white px-3 py-2 text-sm hover:bg-sand-50">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            const next = new Set(siblingChoices);
                            if (e.target.checked) next.add(s.id);
                            else next.delete(s.id);
                            setSiblingChoices(next);
                          }}
                          className="h-4 w-4 rounded border-sand-300 text-sand-700"
                        />
                        <span className="flex-1 truncate">
                          {locale === "ar" ? s.nameAr : (s.nameEn || s.nameAr)}
                        </span>
                        {s.generation !== undefined && (
                          <span className="text-[10px] text-sand-500">G{s.generation}</span>
                        )}
                      </label>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        ) : null}

        {step === "primary" ? <>
        {/* Mode switch */}
        <div className="mt-4 inline-flex rounded-full border border-sand-200 bg-sand-50 p-1 text-xs">
          <button
            type="button"
            onClick={() => setMode("new")}
            className={
              "rounded-full px-3 py-1 transition " +
              (mode === "new" ? "bg-sand-700 text-white shadow" : "text-sand-700 hover:bg-sand-100")
            }
          >
            {dict.modeNew}
          </button>
          <button
            type="button"
            onClick={() => setMode("existing")}
            className={
              "rounded-full px-3 py-1 transition " +
              (mode === "existing" ? "bg-sand-700 text-white shadow" : "text-sand-700 hover:bg-sand-100")
            }
          >
            {dict.modeExisting}
          </button>
        </div>

        {/* Mode-specific body */}
        {mode === "new" ? (
          <div className="mt-4 space-y-3">
            <label className="block">
              <span className="text-xs font-medium text-sand-700">{dict.nameArLabel}</span>
              <input
                type="text"
                required
                autoFocus
                value={nameAr}
                onChange={(e) => setNameAr(e.target.value)}
                disabled={submitting}
                className="mt-1 w-full rounded-xl border border-sand-200 bg-white px-3 py-2 text-sm text-sand-900 outline-none focus:border-sand-400 focus:ring-2 focus:ring-sand-200 disabled:bg-sand-50"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-sand-700">{dict.nameEnLabel}</span>
              <input
                type="text"
                value={nameEn}
                onChange={(e) => setNameEn(e.target.value)}
                disabled={submitting}
                className="mt-1 w-full rounded-xl border border-sand-200 bg-white px-3 py-2 text-sm text-sand-900 outline-none focus:border-sand-400 focus:ring-2 focus:ring-sand-200 disabled:bg-sand-50"
              />
            </label>
          </div>
        ) : (
          <div className="mt-4">
            <div className="mb-2 text-xs text-sand-600">{dict.pickExistingHint}</div>
            {pickedPerson ? (
              <div className="flex items-center justify-between gap-2 rounded-xl border border-sand-200 bg-sand-50 px-3 py-2">
                <div className="min-w-0">
                  <div className="truncate font-medium text-sand-900" title={lineageOf(pickedPerson)}>
                    {lineageOf(pickedPerson)}
                  </div>
                  {pickedPerson.generation !== undefined && (
                    <div className="text-[10px] text-sand-500">G{pickedPerson.generation}</div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => { setPickedId(null); setPickQuery(""); }}
                  className="grid h-7 w-7 place-items-center rounded-full text-sand-500 hover:bg-sand-100"
                  aria-label={dict.close}
                >
                  <CloseIcon className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="relative">
                <SearchIcon className="pointer-events-none absolute top-1/2 start-3 h-4 w-4 -translate-y-1/2 text-sand-500" />
                <input
                  type="text"
                  value={pickQuery}
                  onChange={(e) => { setPickQuery(e.target.value); setPickOpen(true); }}
                  onFocus={() => setPickOpen(true)}
                  onBlur={() => setTimeout(() => setPickOpen(false), 150)}
                  placeholder={dict.pickExisting}
                  disabled={submitting}
                  className="w-full rounded-xl border border-sand-200 bg-white py-2 ps-9 pe-3 text-sm outline-none focus:border-sand-400 focus:ring-2 focus:ring-sand-200 disabled:bg-sand-50"
                />
                {pickOpen && candidates.length > 0 && (
                  <ul className="absolute z-30 mt-1 max-h-72 w-full overflow-y-auto rounded-xl border border-sand-200 bg-white py-1 shadow-lg">
                    {candidates.map((p) => {
                      const chain = lineageOf(p);
                      return (
                        <li key={p.id}>
                          <button
                            type="button"
                            onMouseDown={(ev) => ev.preventDefault()}
                            onClick={() => { setPickedId(p.id); setPickQuery(""); setPickOpen(false); }}
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
        )}

        {isParentAdd && (
          <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
            {dict.autoSpouseHint}
          </div>
        )}
        </> : null}

        {error && (
          <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">
            {error}
          </div>
        )}

        <div className="mt-5 flex justify-end gap-2">
          {step === "linkOthers" && (
            <button
              type="button"
              onClick={() => { router.refresh(); onClose(); }}
              disabled={submitting}
              className="rounded-full border border-sand-200 bg-white px-4 py-2 text-sm text-sand-700 hover:bg-sand-100 disabled:opacity-50"
            >
              {dict.skip}
            </button>
          )}
          {step === "primary" && (
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-full border border-sand-200 bg-white px-4 py-2 text-sm text-sand-700 hover:bg-sand-100 disabled:opacity-50"
            >
              {dict.cancel}
            </button>
          )}
          <button
            type="submit"
            disabled={submitting || (step === "primary" && !canSubmit)}
            className="rounded-full bg-sand-700 px-4 py-2 text-sm font-medium text-white shadow-soft hover:bg-sand-800 disabled:cursor-not-allowed disabled:bg-sand-300"
          >
            {submitting ? dict.saving : dict.save}
          </button>
        </div>
      </form>
    </div>
  );
}
