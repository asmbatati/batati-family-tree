"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import type { Person, Gender, PersonStatus } from "@/lib/types";
import { CloseIcon } from "@/components/icons";

type Dict = {
  title: string;
  sectionIdentity: string;
  sectionDates: string;
  sectionContact: string;
  sectionBio: string;
  sectionFamily: string;
  titleAr: string;
  titleEn: string;
  gender: string;
  male: string;
  female: string;
  status: string;
  statusLiving: string;
  statusDeceased: string;
  statusUnknown: string;
  birthYear: string;
  deathYear: string;
  birthOrder: string;
  generation: string;
  location: string;
  occupationAr: string;
  occupationEn: string;
  bioAr: string;
  bioEn: string;
  familyAr: string;
  familyEn: string;
  photoUrl: string;
  nameArLabel: string;
  nameEnLabel: string;
  phone: string;
  email: string;
  website: string;
  save: string;
  cancel: string;
  saving: string;
  saveError: string;
  close: string;
};

type Props = {
  person: Person;
  locale: "ar" | "en";
  dict: Dict;
  onClose: () => void;
};

type FormState = {
  name_ar: string;
  name_en: string;
  title_ar: string;
  title_en: string;
  gender: Gender;
  status: PersonStatus;
  birth_year: string;
  death_year: string;
  birth_order: string;
  generation: string;
  location: string;
  occupation_ar: string;
  occupation_en: string;
  bio_ar: string;
  bio_en: string;
  family_ar: string;
  family_en: string;
  photo_url: string;
  phone: string;
  email: string;
  website: string;
};

function fromPerson(p: Person): FormState {
  return {
    name_ar: p.nameAr ?? "",
    name_en: p.nameEn ?? "",
    title_ar: p.titleAr ?? "",
    title_en: p.titleEn ?? "",
    gender: p.gender,
    status: p.status,
    birth_year: p.birthYear != null ? String(p.birthYear) : "",
    death_year: p.deathYear != null ? String(p.deathYear) : "",
    birth_order: p.birthOrder != null ? String(p.birthOrder) : "",
    generation: p.generation != null ? String(p.generation) : "",
    location: p.location ?? "",
    occupation_ar: p.occupationAr ?? "",
    occupation_en: p.occupationEn ?? "",
    bio_ar: p.bioAr ?? "",
    bio_en: p.bioEn ?? "",
    family_ar: p.familyAr ?? "",
    family_en: p.familyEn ?? "",
    photo_url: p.photoUrl ?? "",
    phone: p.phone ?? "",
    email: p.email ?? "",
    website: p.website ?? "",
  };
}

/** Convert form strings → DB payload, leaving blanks as null. */
function toPayload(s: FormState) {
  const intOrNull = (v: string) => {
    const n = Number(v);
    return v.trim() === "" || Number.isNaN(n) ? null : Math.trunc(n);
  };
  const strOrNull = (v: string) => (v.trim() === "" ? null : v.trim());
  return {
    name_ar:       s.name_ar.trim() || null,
    name_en:       strOrNull(s.name_en),
    title_ar:      strOrNull(s.title_ar),
    title_en:      strOrNull(s.title_en),
    gender:        s.gender,
    status:        s.status,
    birth_year:    intOrNull(s.birth_year),
    death_year:    intOrNull(s.death_year),
    birth_order:   intOrNull(s.birth_order),
    generation:    intOrNull(s.generation),
    location:      strOrNull(s.location),
    occupation_ar: strOrNull(s.occupation_ar),
    occupation_en: strOrNull(s.occupation_en),
    bio_ar:        strOrNull(s.bio_ar),
    bio_en:        strOrNull(s.bio_en),
    family_ar:     strOrNull(s.family_ar),
    family_en:     strOrNull(s.family_en),
    photo_url:     strOrNull(s.photo_url),
    phone:         strOrNull(s.phone),
    email:         strOrNull(s.email),
    website:       strOrNull(s.website),
    updated_at:    new Date().toISOString(),
  };
}

export default function EditPersonForm({ person, locale, dict, onClose }: Props) {
  const router = useRouter();
  const [state, setState] = useState<FormState>(() => fromPerson(person));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setState((s) => ({ ...s, [key]: value }));
  }

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
    const { error: err } = await sb
      .from("people")
      .update(toPayload(state))
      .eq("id", person.id);

    if (err) {
      setError(`${dict.saveError}: ${err.message}`);
      setSubmitting(false);
      return;
    }

    router.refresh();
    onClose();
  }

  const inputCls =
    "mt-1 w-full rounded-xl border border-sand-200 bg-white px-3 py-2 text-sm text-sand-900 outline-none focus:border-sand-400 focus:ring-2 focus:ring-sand-200 disabled:bg-sand-50";
  const labelCls = "block text-xs font-medium text-sand-700";

  return (
    <div
      className="fixed inset-0 z-[60] grid place-items-center bg-black/40 px-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-3xl bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-sand-100 px-6 py-4">
          <h2 className="font-display text-xl text-sand-900">{dict.title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-full text-sand-600 hover:bg-sand-100"
            aria-label={dict.close}
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {/* Identity */}
          <Section title={dict.sectionIdentity}>
            <Two>
              <Field label={dict.nameArLabel} required>
                <input className={inputCls} required value={state.name_ar} onChange={(e) => update("name_ar", e.target.value)} disabled={submitting} />
              </Field>
              <Field label={dict.nameEnLabel}>
                <input className={inputCls} value={state.name_en} onChange={(e) => update("name_en", e.target.value)} disabled={submitting} />
              </Field>
              <Field label={dict.titleAr}>
                <input className={inputCls} value={state.title_ar} onChange={(e) => update("title_ar", e.target.value)} disabled={submitting} />
              </Field>
              <Field label={dict.titleEn}>
                <input className={inputCls} value={state.title_en} onChange={(e) => update("title_en", e.target.value)} disabled={submitting} />
              </Field>
              <Field label={dict.gender}>
                <select className={inputCls} value={state.gender} onChange={(e) => update("gender", e.target.value as Gender)} disabled={submitting}>
                  <option value="male">{dict.male}</option>
                  <option value="female">{dict.female}</option>
                </select>
              </Field>
              <Field label={dict.status}>
                <select className={inputCls} value={state.status} onChange={(e) => update("status", e.target.value as PersonStatus)} disabled={submitting}>
                  <option value="living">{dict.statusLiving}</option>
                  <option value="deceased">{dict.statusDeceased}</option>
                  <option value="unknown">{dict.statusUnknown}</option>
                </select>
              </Field>
            </Two>
          </Section>

          {/* Dates & order */}
          <Section title={dict.sectionDates}>
            <Two>
              <Field label={dict.birthYear}>
                <input className={inputCls} type="number" inputMode="numeric" value={state.birth_year} onChange={(e) => update("birth_year", e.target.value)} disabled={submitting} />
              </Field>
              <Field label={dict.deathYear}>
                <input className={inputCls} type="number" inputMode="numeric" value={state.death_year} onChange={(e) => update("death_year", e.target.value)} disabled={submitting} />
              </Field>
              <Field label={dict.birthOrder}>
                <input className={inputCls} type="number" inputMode="numeric" value={state.birth_order} onChange={(e) => update("birth_order", e.target.value)} disabled={submitting} />
              </Field>
              <Field label={dict.generation}>
                <input className={inputCls} type="number" inputMode="numeric" value={state.generation} onChange={(e) => update("generation", e.target.value)} disabled={submitting} />
              </Field>
            </Two>
          </Section>

          {/* Contact */}
          <Section title={dict.sectionContact}>
            <Two>
              <Field label={dict.location}>
                <input className={inputCls} value={state.location} onChange={(e) => update("location", e.target.value)} disabled={submitting} />
              </Field>
              <Field label={dict.phone}>
                <input className={inputCls} type="tel" value={state.phone} onChange={(e) => update("phone", e.target.value)} disabled={submitting} />
              </Field>
              <Field label={dict.email}>
                <input className={inputCls} type="email" value={state.email} onChange={(e) => update("email", e.target.value)} disabled={submitting} />
              </Field>
              <Field label={dict.website}>
                <input className={inputCls} type="url" placeholder="https://…" value={state.website} onChange={(e) => update("website", e.target.value)} disabled={submitting} />
              </Field>
            </Two>
          </Section>

          {/* Bio */}
          <Section title={dict.sectionBio}>
            <Two>
              <Field label={dict.occupationAr}>
                <input className={inputCls} value={state.occupation_ar} onChange={(e) => update("occupation_ar", e.target.value)} disabled={submitting} />
              </Field>
              <Field label={dict.occupationEn}>
                <input className={inputCls} value={state.occupation_en} onChange={(e) => update("occupation_en", e.target.value)} disabled={submitting} />
              </Field>
            </Two>
            <div className="mt-3 space-y-3">
              <Field label={dict.bioAr}>
                <textarea className={inputCls + " resize-y"} rows={3} value={state.bio_ar} onChange={(e) => update("bio_ar", e.target.value)} disabled={submitting} />
              </Field>
              <Field label={dict.bioEn}>
                <textarea className={inputCls + " resize-y"} rows={3} value={state.bio_en} onChange={(e) => update("bio_en", e.target.value)} disabled={submitting} />
              </Field>
              <Field label={dict.photoUrl}>
                <input className={inputCls} type="url" placeholder="https://…" value={state.photo_url} onChange={(e) => update("photo_url", e.target.value)} disabled={submitting} />
              </Field>
            </div>
          </Section>

          {/* Family */}
          <Section title={dict.sectionFamily}>
            <Two>
              <Field label={dict.familyAr}>
                <input className={inputCls} value={state.family_ar} onChange={(e) => update("family_ar", e.target.value)} disabled={submitting} />
              </Field>
              <Field label={dict.familyEn}>
                <input className={inputCls} value={state.family_en} onChange={(e) => update("family_en", e.target.value)} disabled={submitting} />
              </Field>
            </Two>
          </Section>

          {error && (
            <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">
              {error}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-sand-100 px-6 py-3">
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
            disabled={submitting || !state.name_ar.trim()}
            className="rounded-full bg-sand-700 px-4 py-2 text-sm font-medium text-white shadow-soft hover:bg-sand-800 disabled:cursor-not-allowed disabled:bg-sand-300"
          >
            {submitting ? dict.saving : dict.save}
          </button>
        </div>
      </form>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-4 first:mt-0">
      <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-sand-600">{title}</h3>
      <div className="rounded-2xl border border-sand-200 bg-white p-3 shadow-soft">
        {children}
      </div>
    </section>
  );
}

function Two({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{children}</div>;
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-sand-700">
        {label}{required && <span className="text-rose-500"> *</span>}
      </span>
      {children}
    </label>
  );
}
