"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import type { Person, RelationshipType, Gender } from "@/lib/types";
import { CloseIcon } from "@/components/icons";

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

type Props = {
  relativeKey: RelativeKey;
  currentPerson: Person;
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
  };
  onClose: () => void;
};

export default function AddRelativeForm({ relativeKey, currentPerson, locale, relationLabel, dict, onClose }: Props) {
  const router = useRouter();
  const meta = metaFor(relativeKey, currentPerson);
  const [nameAr, setNameAr] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const currentName = locale === "ar" ? currentPerson.nameAr : (currentPerson.nameEn || currentPerson.nameAr);

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

    const fromId = meta.fromIsCurrent ? currentPerson.id : newPerson.id;
    const toId   = meta.fromIsCurrent ? newPerson.id     : currentPerson.id;

    const { error: e2 } = await sb.from("relationships").insert({
      type: meta.type,
      from_id: fromId,
      to_id: toId,
    });

    if (e2) {
      setError(e2.message);
      setSubmitting(false);
      return;
    }

    router.refresh();
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/40 px-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-xl text-sand-900">
              {dict.title} {relationLabel}
            </h2>
            <div className="mt-0.5 text-xs text-sand-600">
              {dict.forPerson} <span className="font-medium text-sand-800">{currentName}</span>
              {" · G"}{meta.generation}
            </div>
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

        {error && (
          <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">
            {error}
          </div>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-full border border-sand-200 bg-white px-4 py-2 text-sm text-sand-700 hover:bg-sand-100 disabled:opacity-50"
          >
            {dict.cancel}
          </button>
          <button
            type="submit"
            disabled={submitting || !nameAr.trim()}
            className="rounded-full bg-sand-700 px-4 py-2 text-sm font-medium text-white shadow-soft hover:bg-sand-800 disabled:cursor-not-allowed disabled:bg-sand-300"
          >
            {submitting ? dict.saving : dict.save}
          </button>
        </div>
      </form>
    </div>
  );
}
