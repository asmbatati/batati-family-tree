"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import type { Gender } from "@/lib/types";
import { CloseIcon } from "@/components/icons";

type Props = {
  locale: "ar" | "en";
  onClose: () => void;
};

/**
 * Standalone "add person" modal — does NOT require a centered person, does NOT
 * create any relationship rows. Just inserts a row in `public.people`. The
 * editor can wire the person into the tree afterward from the side panel.
 */
export default function AddPersonForm({ locale, onClose }: Props) {
  const router = useRouter();
  const ar = locale === "ar";

  const [nameAr, setNameAr] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [gender, setGender] = useState<Gender>("male");
  const [generation, setGeneration] = useState<string>("");
  const [birthYear, setBirthYear] = useState<string>("");
  // Default to the locale-appropriate "Al-Batati" spelling. Editors only need
  // to type if the new person is NOT Al-Batati (e.g. an in-law).
  const [family, setFamily] = useState<string>(ar ? "البطاطي" : "Al-Batati");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (!nameAr.trim()) {
      setError(ar ? "الاسم بالعربي مطلوب." : "Arabic name is required.");
      return;
    }
    setSubmitting(true);
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) {
      setError(ar ? "Supabase غير مهيأ." : "Supabase not configured.");
      setSubmitting(false);
      return;
    }
    const sb = createBrowserClient(url, key);
    // Split the single locale-aware "family" input into the two DB columns.
    // Canonical Al-Batati input keeps both column defaults; any other value is
    // mirrored to both columns (the user can split ar/en spellings later via
    // the Edit form).
    const fam = family.trim();
    const isDefaultBatati =
      fam === "" || fam === "البطاطي" || fam.toLowerCase() === "al-batati" || fam.toLowerCase() === "albatati";
    const familyArVal = isDefaultBatati ? "البطاطي" : fam;
    const familyEnVal = isDefaultBatati ? "Al-Batati" : fam;
    const payload: Record<string, unknown> = {
      name_ar: nameAr.trim(),
      name_en: nameEn.trim() || null,
      gender,
      status: "unknown",
      family_ar: familyArVal,
      family_en: familyEnVal,
    };
    if (generation.trim()) {
      const g = parseInt(generation, 10);
      if (!Number.isNaN(g)) payload.generation = g;
    }
    if (birthYear.trim()) {
      const y = parseInt(birthYear, 10);
      if (!Number.isNaN(y)) payload.birth_year = y;
    }
    const { error: e1 } = await sb.from("people").insert(payload);
    setSubmitting(false);
    if (e1) {
      setError(e1.message);
      return;
    }
    // router.refresh() is unreliable in Next 16 dev mode — a full reload
    // guarantees the new person shows up in subsequent picker lists.
    window.location.reload();
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/40 px-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <form
        onSubmit={onSubmit}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-xl text-sand-900">
              {ar ? "إضافة شخص جديد" : "Add new person"}
            </h2>
            <div className="mt-0.5 text-xs text-sand-600">
              {ar
                ? "سيُضاف هذا الشخص دون أي روابط. اربطه لاحقاً من بروفايله."
                : "The person will be added with no relationships. Link them from their profile afterward."}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-full text-sand-600 hover:bg-sand-100"
            aria-label={ar ? "إغلاق" : "Close"}
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 space-y-3">
          <div>
            <label className="block text-sm font-medium text-sand-700">
              {ar ? "الاسم بالعربي" : "Name (Arabic)"} *
            </label>
            <input
              type="text"
              required
              value={nameAr}
              onChange={(e) => setNameAr(e.target.value)}
              className="mt-1 w-full rounded-xl border border-sand-200 bg-white px-3 py-2 text-sm outline-none focus:border-sand-400 focus:ring-2 focus:ring-sand-200"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-sand-700">
              {ar ? "الاسم بالإنجليزي" : "Name (English)"}
            </label>
            <input
              type="text"
              value={nameEn}
              onChange={(e) => setNameEn(e.target.value)}
              className="mt-1 w-full rounded-xl border border-sand-200 bg-white px-3 py-2 text-sm outline-none focus:border-sand-400 focus:ring-2 focus:ring-sand-200"
            />
          </div>

          <div>
            <div className="text-sm font-medium text-sand-700">
              {ar ? "الجنس" : "Gender"} *
            </div>
            <div className="mt-1 inline-flex rounded-full border border-sand-200 bg-white p-1 text-sm">
              <button
                type="button"
                onClick={() => setGender("male")}
                className={"rounded-full px-3 py-1 " + (gender === "male" ? "bg-sand-700 text-white" : "text-sand-700 hover:bg-sand-100")}
              >
                {ar ? "ذكر" : "Male"}
              </button>
              <button
                type="button"
                onClick={() => setGender("female")}
                className={"rounded-full px-3 py-1 " + (gender === "female" ? "bg-rose-700 text-white" : "text-rose-700 hover:bg-rose-50")}
              >
                {ar ? "أنثى" : "Female"}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-sand-700">
              {ar ? "اسم العائلة" : "Family name"}
            </label>
            <input
              type="text"
              value={family}
              onChange={(e) => setFamily(e.target.value)}
              placeholder={ar ? "البطاطي" : "Al-Batati"}
              className="mt-1 w-full rounded-xl border border-sand-200 bg-white px-3 py-2 text-sm outline-none focus:border-sand-400 focus:ring-2 focus:ring-sand-200"
            />
            <div className="mt-1 text-[11px] text-sand-500">
              {ar
                ? "الافتراضي «البطاطي». غيّره فقط إذا كان الشخص من عائلة أخرى (نسيبًا/صهرًا)."
                : "Defaults to Al-Batati. Override only when the person is from another family (an in-law)."}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-sand-700">
                {ar ? "الجيل" : "Generation"}
              </label>
              <input
                type="number"
                value={generation}
                onChange={(e) => setGeneration(e.target.value)}
                placeholder={ar ? "اختياري" : "Optional"}
                className="mt-1 w-full rounded-xl border border-sand-200 bg-white px-3 py-2 text-sm outline-none focus:border-sand-400 focus:ring-2 focus:ring-sand-200"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-sand-700">
                {ar ? "سنة الميلاد" : "Birth year"}
              </label>
              <input
                type="number"
                value={birthYear}
                onChange={(e) => setBirthYear(e.target.value)}
                placeholder={ar ? "اختياري" : "Optional"}
                className="mt-1 w-full rounded-xl border border-sand-200 bg-white px-3 py-2 text-sm outline-none focus:border-sand-400 focus:ring-2 focus:ring-sand-200"
              />
            </div>
          </div>
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
            {ar ? "إلغاء" : "Cancel"}
          </button>
          <button
            type="submit"
            disabled={submitting || !nameAr.trim()}
            className="rounded-full bg-sand-700 px-4 py-2 text-sm font-medium text-white shadow-soft hover:bg-sand-800 disabled:cursor-not-allowed disabled:bg-sand-300"
          >
            {submitting ? (ar ? "جارٍ الحفظ..." : "Saving...") : (ar ? "حفظ" : "Save")}
          </button>
        </div>
      </form>
    </div>
  );
}
