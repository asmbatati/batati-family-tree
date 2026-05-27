"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import type { Person, Relationship, Gender } from "@/lib/types";
import { buildPatrilineMap, lineageName } from "@/lib/relationships";
import { CloseIcon, SearchIcon } from "@/components/icons";

type Props = {
  locale: "ar" | "en";
  people: Person[];
  relationships: Relationship[];
  /** Only used to seed the new-person form. Not a hard requirement. */
  userEmail: string | null;
};

/**
 * Shown once after a successful magic-link login when the user has no
 * `user_people` row yet. Lets them either:
 *   1. Search the existing tree and pick "this is me" (link).
 *   2. Create a new pending person row + link to it (still needs editor
 *      approval to attach into the tree).
 *   3. Skip for now.
 *
 * Direct-writes the `user_people` row (RLS lets users write their own).
 * For new-person creation by a non-editor, writes to `pending_edits`.
 */
// sessionStorage key used to remember that the user dismissed the welcome
// modal during this session. Prevents the modal from popping back up on
// every navigation (which is exacerbated by `router.refresh()` re-mounting
// the layout — that re-mounts this modal too, and `useState(true)` would
// otherwise reset `open` to true on every nav).
const DISMISS_KEY = "batati-welcome-dismissed";

export default function WelcomeClaim({ locale, people, relationships, userEmail }: Props) {
  const router = useRouter();
  const ar = locale === "ar";
  // Start closed; the effect below opens us iff the session hasn't dismissed.
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"choose" | "search" | "create">("choose");
  const [pickQuery, setPickQuery] = useState("");
  const [pickedId, setPickedId] = useState<string | null>(null);
  const [nameAr, setNameAr] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [gender, setGender] = useState<Gender>("male");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const peopleById = useMemo(() => new Map(people.map((p) => [p.id, p])), [people]);
  const patriline = useMemo(
    () => buildPatrilineMap(people, relationships),
    [people, relationships],
  );
  const lineageOf = (p: Person) => lineageName(p, peopleById, patriline, locale, 4);

  const matches = useMemo(() => {
    const q = pickQuery.trim();
    if (!q) return people.slice(0, 25);
    const lower = q.toLowerCase();
    return people
      .filter((p) => {
        const chain = lineageOf(p);
        return (
          chain.includes(q) ||
          chain.toLowerCase().includes(lower) ||
          p.nameAr.includes(q) ||
          (p.nameEn?.toLowerCase().includes(lower) ?? false)
        );
      })
      .slice(0, 25);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [people, pickQuery, locale]);

  // Open on first mount unless the session-flag says we've been dismissed.
  useEffect(() => {
    try {
      const dismissed = sessionStorage.getItem(DISMISS_KEY) === "1";
      if (!dismissed) setOpen(true);
    } catch {
      setOpen(true);
    }
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") dismiss(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function dismiss() {
    try { sessionStorage.setItem(DISMISS_KEY, "1"); } catch { /* ignore */ }
    setOpen(false);
  }

  if (!open) return null;

  function getClient() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) return null;
    return createBrowserClient(url, key);
  }

  async function linkExisting() {
    setError(null);
    if (!pickedId) {
      setError(ar ? "اختر اسماً من القائمة." : "Pick a name from the list first.");
      return;
    }
    const sb = getClient();
    if (!sb) { setError(ar ? "Supabase غير مهيأ." : "Supabase not configured."); return; }
    setSubmitting(true);
    const { data: u } = await sb.auth.getUser();
    if (!u.user) { setError(ar ? "غير مصرّح." : "Not authenticated."); setSubmitting(false); return; }
    const { error: e } = await sb
      .from("user_people")
      .upsert({ user_id: u.user.id, person_id: pickedId }, { onConflict: "user_id" });
    setSubmitting(false);
    if (e) { setError(e.message); return; }
    router.refresh();
    dismiss();
  }

  async function createNewPending() {
    setError(null);
    if (!nameAr.trim()) {
      setError(ar ? "الاسم بالعربي مطلوب." : "Arabic name is required.");
      return;
    }
    const sb = getClient();
    if (!sb) { setError(ar ? "Supabase غير مهيأ." : "Supabase not configured."); return; }
    setSubmitting(true);
    const { data: u } = await sb.auth.getUser();
    if (!u.user) { setError(ar ? "غير مصرّح." : "Not authenticated."); setSubmitting(false); return; }
    // Submit a pending_edits row asking the editor to insert this new person.
    // We don't directly insert into `people` because non-editor RLS blocks it.
    const { error: e } = await sb.from("pending_edits").insert({
      submitted_by: u.user.id,
      entity_type: "person",
      operation: "insert",
      target_id: null,
      payload: {
        name_ar: nameAr.trim(),
        name_en: nameEn.trim() || null,
        gender,
        status: "unknown",
        family_ar: "البطاطي",
        family_en: "Al-Batati",
      },
      note: ar
        ? `طلب انضمام جديد من ${userEmail ?? "مستخدم"}.`
        : `New-member self-claim from ${userEmail ?? "user"}.`,
    });
    setSubmitting(false);
    if (e) { setError(e.message); return; }
    router.refresh();
    dismiss();
  }

  const pickedPerson = pickedId ? peopleById.get(pickedId) : null;

  return (
    <div
      className="fixed inset-0 z-[70] grid place-items-center bg-black/50 px-4"
      onClick={dismiss}
      role="dialog"
      aria-modal="true"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between">
          <div>
            <h2 className="font-display text-xl text-sand-900">
              {ar ? "أهلاً بك في موقع العائلة" : "Welcome to the family site"}
            </h2>
            <p className="mt-0.5 text-xs text-sand-600">
              {ar
                ? "اربط حسابك بشخصك في الشجرة لرؤية لوحتك الشخصية وعائلتك."
                : "Link your account to your record in the tree to see your dashboard and relatives."}
            </p>
          </div>
          <button
            type="button"
            onClick={dismiss}
            className="grid h-8 w-8 place-items-center rounded-full text-sand-500 hover:bg-sand-100"
            aria-label={ar ? "إغلاق" : "Close"}
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        {mode === "choose" && (
          <div className="mt-5 grid grid-cols-1 gap-2">
            <button
              type="button"
              onClick={() => setMode("search")}
              className="rounded-2xl border border-sand-300 bg-white px-4 py-3 text-start hover:bg-sand-50"
            >
              <div className="text-sm font-medium text-sand-900">
                {ar ? "أنا موجود في الشجرة — ابحث عن اسمي" : "I'm already in the tree — search for me"}
              </div>
              <div className="mt-1 text-xs text-sand-600">
                {ar ? "اختر اسمك من قاعدة البيانات الحالية." : "Pick yourself from the existing database."}
              </div>
            </button>
            <button
              type="button"
              onClick={() => setMode("create")}
              className="rounded-2xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-start hover:bg-emerald-100"
            >
              <div className="text-sm font-medium text-emerald-900">
                {ar ? "أنا لست مضافاً بعد — قدّم طلب إنضمام" : "I'm not in the tree yet — submit a join request"}
              </div>
              <div className="mt-1 text-xs text-emerald-800">
                {ar
                  ? "يُرسل طلبك إلى المسؤول للمراجعة والموافقة."
                  : "Your entry will be sent to the admin for approval before showing up in the tree."}
              </div>
            </button>
            <button
              type="button"
              onClick={dismiss}
              className="rounded-full px-4 py-2 text-center text-xs text-sand-600 hover:bg-sand-100"
            >
              {ar ? "تخطّي الآن" : "Skip for now"}
            </button>
          </div>
        )}

        {mode === "search" && (
          <div className="mt-4 space-y-3">
            {pickedPerson ? (
              <div className="flex items-center justify-between gap-2 rounded-xl border border-sand-200 bg-sand-50 px-3 py-2">
                <div className="min-w-0">
                  <div className="truncate font-medium text-sand-900">{lineageOf(pickedPerson)}</div>
                  {pickedPerson.generation !== undefined && (
                    <div className="text-[10px] text-sand-500">G{pickedPerson.generation}</div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => { setPickedId(null); setPickQuery(""); }}
                  className="grid h-6 w-6 place-items-center rounded-full text-sand-500 hover:bg-sand-100"
                  aria-label={ar ? "إلغاء" : "Clear"}
                >
                  <CloseIcon className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <>
                <div className="relative">
                  <SearchIcon className="pointer-events-none absolute top-1/2 start-3 h-4 w-4 -translate-y-1/2 text-sand-500" />
                  <input
                    type="text"
                    value={pickQuery}
                    onChange={(e) => setPickQuery(e.target.value)}
                    placeholder={ar ? "ابحث باسمك أو سلسلة النسب…" : "Search by name or lineage…"}
                    className="w-full rounded-xl border border-sand-200 bg-white py-2 ps-9 pe-3 text-sm outline-none focus:border-sand-400 focus:ring-2 focus:ring-sand-200"
                  />
                </div>
                <ul className="max-h-56 overflow-y-auto rounded-xl border border-sand-100 bg-white">
                  {matches.length === 0 ? (
                    <li className="px-3 py-2 text-xs text-sand-500">{ar ? "لا نتائج" : "No results"}</li>
                  ) : (
                    matches.map((p) => (
                      <li key={p.id}>
                        <button
                          type="button"
                          onClick={() => setPickedId(p.id)}
                          className="flex w-full items-center justify-between gap-2 px-3 py-1.5 text-start text-sm hover:bg-sand-50"
                        >
                          <span className="truncate text-sand-800">{lineageOf(p)}</span>
                          {p.generation !== undefined && (
                            <span className="shrink-0 text-[10px] text-sand-500">G{p.generation}</span>
                          )}
                        </button>
                      </li>
                    ))
                  )}
                </ul>
              </>
            )}
            <div className="flex items-center justify-between gap-2">
              <button type="button" onClick={() => setMode("choose")} className="rounded-full px-3 py-1 text-xs text-sand-600 hover:bg-sand-100">
                ← {ar ? "رجوع" : "Back"}
              </button>
              <button
                type="button"
                onClick={linkExisting}
                disabled={!pickedId || submitting}
                className="rounded-full bg-sand-700 px-4 py-2 text-sm font-medium text-white shadow-soft hover:bg-sand-800 disabled:bg-sand-300"
              >
                {submitting ? (ar ? "جارٍ..." : "Linking…") : (ar ? "اربط حسابي" : "Link my account")}
              </button>
            </div>
          </div>
        )}

        {mode === "create" && (
          <div className="mt-4 space-y-3">
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
              {ar
                ? "ستذهب هذه المعلومات إلى قائمة المراجعة. سيراها المسؤول قبل ظهور اسمك في الشجرة."
                : "Your information will be queued for the admin to review before appearing in the tree."}
            </div>
            <label className="block">
              <span className="block text-xs font-medium text-sand-700">{ar ? "الاسم بالعربي" : "Name (Arabic)"} *</span>
              <input
                type="text"
                required
                value={nameAr}
                onChange={(e) => setNameAr(e.target.value)}
                className="mt-1 w-full rounded-xl border border-sand-200 bg-white px-3 py-2 text-sm outline-none focus:border-sand-400 focus:ring-2 focus:ring-sand-200"
              />
            </label>
            <label className="block">
              <span className="block text-xs font-medium text-sand-700">{ar ? "الاسم بالإنجليزي" : "Name (English)"}</span>
              <input
                type="text"
                value={nameEn}
                onChange={(e) => setNameEn(e.target.value)}
                className="mt-1 w-full rounded-xl border border-sand-200 bg-white px-3 py-2 text-sm outline-none focus:border-sand-400 focus:ring-2 focus:ring-sand-200"
              />
            </label>
            <div>
              <span className="block text-xs font-medium text-sand-700">{ar ? "الجنس" : "Gender"}</span>
              <div className="mt-1 inline-flex rounded-full border border-sand-200 bg-white p-1 text-sm">
                <button type="button" onClick={() => setGender("male")} className={"rounded-full px-3 py-1 " + (gender === "male" ? "bg-sand-700 text-white" : "text-sand-700 hover:bg-sand-100")}>
                  {ar ? "ذكر" : "Male"}
                </button>
                <button type="button" onClick={() => setGender("female")} className={"rounded-full px-3 py-1 " + (gender === "female" ? "bg-rose-700 text-white" : "text-rose-700 hover:bg-rose-50")}>
                  {ar ? "أنثى" : "Female"}
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between gap-2">
              <button type="button" onClick={() => setMode("choose")} className="rounded-full px-3 py-1 text-xs text-sand-600 hover:bg-sand-100">
                ← {ar ? "رجوع" : "Back"}
              </button>
              <button
                type="button"
                onClick={createNewPending}
                disabled={!nameAr.trim() || submitting}
                className="rounded-full bg-emerald-700 px-4 py-2 text-sm font-medium text-white shadow-soft hover:bg-emerald-800 disabled:bg-emerald-300"
              >
                {submitting ? (ar ? "جارٍ الإرسال..." : "Submitting…") : (ar ? "أرسل للموافقة" : "Submit for approval")}
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
