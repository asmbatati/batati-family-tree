"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";

type Props = {
  locale: "ar" | "en";
  isEditor: boolean;
};

/**
 * Inline form for suggesting / posting an event. Non-editors write
 * `status='pending'` and the row only shows up publicly after an editor
 * approves it via the moderation queue. Editors get `status='approved'`
 * directly. RLS enforces both paths.
 */
export default function SuggestEventForm({ locale, isEditor }: Props) {
  const router = useRouter();
  const ar = locale === "ar";
  const [open, setOpen] = useState(false);
  const [titleAr, setTitleAr] = useState("");
  const [titleEn, setTitleEn] = useState("");
  const [type, setType] = useState("gathering");
  const [date, setDate] = useState("");
  const [loc, setLoc] = useState("");
  const [descAr, setDescAr] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (!titleAr.trim() || !date) {
      setError(ar ? "العنوان والتاريخ مطلوبان." : "Title and date are required.");
      return;
    }
    setSubmitting(true);
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) { setError(ar ? "Supabase غير مهيأ." : "Supabase not configured."); setSubmitting(false); return; }
    const sb = createBrowserClient(url, key);
    const { data: u } = await sb.auth.getUser();
    if (!u.user) { setError(ar ? "غير مصرّح." : "Not authenticated."); setSubmitting(false); return; }
    const { error: err } = await sb.from("events").insert({
      type,
      title_ar: titleAr.trim(),
      title_en: titleEn.trim() || null,
      date,
      location: loc.trim() || null,
      description_ar: descAr.trim() || null,
      submitted_by: u.user.id,
      status: isEditor ? "approved" : "pending",
    });
    setSubmitting(false);
    if (err) { setError(err.message); return; }
    setDone(true);
    router.refresh();
    setTimeout(() => { setDone(false); setOpen(false); setTitleAr(""); setTitleEn(""); setDate(""); setLoc(""); setDescAr(""); }, 1800);
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-800 shadow-soft hover:bg-emerald-100"
      >
        {isEditor
          ? (ar ? "نشر حدث جديد" : "Post new event")
          : (ar ? "اقترح حدثاً" : "Suggest an event")}
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-2xl border border-sand-200 bg-white p-4 shadow-soft">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-sand-900">
          {isEditor
            ? (ar ? "نشر حدث جديد" : "Post new event")
            : (ar ? "اقتراح حدث جديد" : "Suggest a new event")}
        </h3>
        <button type="button" onClick={() => setOpen(false)} className="text-xs text-sand-500 hover:text-sand-700">
          {ar ? "إغلاق" : "Close"}
        </button>
      </div>
      {!isEditor && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-2 text-[11px] text-amber-900">
          {ar
            ? "سيتم إرسال هذا الاقتراح إلى المسؤول للموافقة قبل النشر."
            : "This will be sent to the admin for approval before it goes public."}
        </div>
      )}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <label className="text-xs">
          <span className="text-sand-700">{ar ? "النوع" : "Type"}</span>
          <select value={type} onChange={(e) => setType(e.target.value)} className="mt-0.5 w-full rounded-xl border border-sand-200 bg-white px-2 py-1.5 text-sm">
            <option value="wedding">{ar ? "زواج" : "Wedding"}</option>
            <option value="birth">{ar ? "ميلاد" : "Birth"}</option>
            <option value="death">{ar ? "وفاة" : "Death"}</option>
            <option value="gathering">{ar ? "لقاء/تجمع" : "Gathering"}</option>
            <option value="other">{ar ? "أخرى" : "Other"}</option>
          </select>
        </label>
        <label className="text-xs">
          <span className="text-sand-700">{ar ? "التاريخ" : "Date"} *</span>
          <input type="date" required value={date} onChange={(e) => setDate(e.target.value)} className="mt-0.5 w-full rounded-xl border border-sand-200 bg-white px-2 py-1.5 text-sm" />
        </label>
        <label className="text-xs sm:col-span-2">
          <span className="text-sand-700">{ar ? "العنوان بالعربي" : "Title (Arabic)"} *</span>
          <input type="text" required value={titleAr} onChange={(e) => setTitleAr(e.target.value)} className="mt-0.5 w-full rounded-xl border border-sand-200 bg-white px-2 py-1.5 text-sm" />
        </label>
        <label className="text-xs sm:col-span-2">
          <span className="text-sand-700">{ar ? "العنوان بالإنجليزي" : "Title (English)"}</span>
          <input type="text" value={titleEn} onChange={(e) => setTitleEn(e.target.value)} className="mt-0.5 w-full rounded-xl border border-sand-200 bg-white px-2 py-1.5 text-sm" />
        </label>
        <label className="text-xs sm:col-span-2">
          <span className="text-sand-700">{ar ? "المكان" : "Location"}</span>
          <input type="text" value={loc} onChange={(e) => setLoc(e.target.value)} className="mt-0.5 w-full rounded-xl border border-sand-200 bg-white px-2 py-1.5 text-sm" />
        </label>
        <label className="text-xs sm:col-span-2">
          <span className="text-sand-700">{ar ? "الوصف" : "Description"}</span>
          <textarea rows={2} value={descAr} onChange={(e) => setDescAr(e.target.value)} className="mt-0.5 w-full resize-y rounded-xl border border-sand-200 bg-white px-2 py-1.5 text-sm" />
        </label>
      </div>
      {error && <div className="rounded-xl border border-rose-200 bg-rose-50 p-2 text-xs text-rose-900">{error}</div>}
      {done && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-2 text-xs text-emerald-900">
          {isEditor ? (ar ? "تم النشر." : "Posted.") : (ar ? "تم الإرسال للمراجعة." : "Sent for review.")}
        </div>
      )}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={submitting || !titleAr.trim() || !date}
          className="rounded-full bg-emerald-700 px-4 py-1.5 text-sm font-medium text-white shadow-soft hover:bg-emerald-800 disabled:bg-emerald-300"
        >
          {submitting
            ? (ar ? "جارٍ..." : "Submitting…")
            : isEditor
              ? (ar ? "نشر" : "Post")
              : (ar ? "إرسال للمراجعة" : "Submit for review")}
        </button>
      </div>
    </form>
  );
}
