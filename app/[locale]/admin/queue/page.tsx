import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { getViewerContext } from "@/lib/auth";
import { getServerSupabase } from "@/lib/supabase/server";
import { loadTree } from "@/lib/data/loadTree";
import QueueActions from "@/components/admin/QueueActions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PendingRow = {
  id: string;
  submitted_by: string;
  entity_type: "person" | "relationship" | "event";
  operation: "insert" | "update" | "delete";
  target_id: string | null;
  payload: Record<string, unknown> | null;
  original_payload: Record<string, unknown> | null;
  note: string | null;
  status: "pending" | "approved" | "rejected";
  review_note: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  submitted_at: string;
};

export default async function AdminQueuePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ filter?: string }>;
}) {
  const { locale: rawLocale } = await params;
  if (!isLocale(rawLocale)) notFound();
  const locale = rawLocale as Locale;
  const ar = locale === "ar";

  const viewer = await getViewerContext();
  if (!viewer.user) redirect(`/${locale}/login`);
  if (!viewer.isEditor) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <h1 className="font-display text-2xl text-sand-900">
          {ar ? "غير مصرّح" : "Not authorized"}
        </h1>
        <p className="mt-2 text-sand-700">
          {ar
            ? "هذه الصفحة لمسؤولي تحرير الشجرة فقط."
            : "This page is for tree editors only."}
        </p>
      </div>
    );
  }

  const sp = await searchParams;
  const filter = sp.filter === "approved" ? "approved" : sp.filter === "rejected" ? "rejected" : "pending";

  const sb = await getServerSupabase();
  let rows: PendingRow[] = [];
  if (sb) {
    const { data } = await sb
      .from("pending_edits")
      .select("*")
      .eq("status", filter)
      .order("submitted_at", { ascending: false })
      .limit(100);
    if (data) rows = data as PendingRow[];
  }

  // Look up names for `target_id` so the queue is readable. (Loads the full
  // tree, but admin volume is low so it's fine.)
  const { people } = await loadTree();
  const peopleById = new Map(people.map((p) => [p.id, p]));

  // Submitter emails — we can read user_people for editors.
  const submitterIds = [...new Set(rows.map((r) => r.submitted_by))];
  const submitterEmail = new Map<string, string>();
  if (sb && submitterIds.length > 0) {
    const { data: claims } = await sb
      .from("user_people")
      .select("user_id, person_id")
      .in("user_id", submitterIds);
    if (claims) {
      for (const c of claims as { user_id: string; person_id: string | null }[]) {
        if (c.person_id) {
          const p = peopleById.get(c.person_id);
          if (p) submitterEmail.set(c.user_id, ar ? p.nameAr : (p.nameEn || p.nameAr));
        }
      }
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-3xl text-sand-900 sm:text-4xl">
            {ar ? "قائمة المراجعة" : "Moderation queue"}
          </h1>
          <p className="mt-1 text-sm text-sand-700">
            {ar
              ? "الاقتراحات المُرسلة من المستخدمين بانتظار موافقتك."
              : "Proposed edits submitted by users awaiting your review."}
          </p>
        </div>
        <nav className="inline-flex rounded-full border border-sand-200 bg-white p-1 text-xs">
          {(["pending", "approved", "rejected"] as const).map((f) => (
            <Link
              key={f}
              href={`/${locale}/admin/queue?filter=${f}`}
              className={
                "rounded-full px-3 py-1 " +
                (f === filter ? "bg-sand-700 text-white" : "text-sand-700 hover:bg-sand-100")
              }
            >
              {f === "pending"  ? (ar ? "قيد المراجعة" : "Pending")
                : f === "approved" ? (ar ? "مقبولة" : "Approved")
                                  : (ar ? "مرفوضة" : "Rejected")}
            </Link>
          ))}
        </nav>
      </header>

      <section className="mt-6 space-y-3">
        {rows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-sand-200 bg-white/60 p-8 text-center text-sm text-sand-500">
            {ar ? "لا توجد عناصر في هذه القائمة." : "Nothing in this list."}
          </div>
        ) : (
          rows.map((r) => {
            const target = r.target_id ? peopleById.get(r.target_id) : undefined;
            const targetName = target ? (ar ? target.nameAr : (target.nameEn || target.nameAr)) : null;
            return (
              <article key={r.id} className="rounded-2xl border border-sand-200 bg-white p-5 shadow-soft">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs">
                    <OpPill op={r.operation} entity={r.entity_type} ar={ar} />
                    <span className="text-sand-600">
                      {new Date(r.submitted_at).toLocaleString(ar ? "ar" : "en")}
                    </span>
                  </div>
                  <div className="text-xs text-sand-600">
                    {ar ? "من" : "By"}{" "}
                    <span className="font-medium text-sand-900">
                      {submitterEmail.get(r.submitted_by) ?? (ar ? "مستخدم" : "user")}
                    </span>
                  </div>
                </div>

                {targetName && (
                  <div className="mt-2 text-sm text-sand-800">
                    {ar ? "يستهدف" : "Targets"}:{" "}
                    <span className="font-medium">{targetName}</span>
                  </div>
                )}

                {r.note && (
                  <div className="mt-2 rounded-xl bg-sand-50 px-3 py-2 text-xs text-sand-700">
                    <span className="font-medium">{ar ? "ملاحظة المُرسِل" : "Submitter note"}: </span>
                    {r.note}
                  </div>
                )}

                {r.payload && Object.keys(r.payload).length > 0 && (
                  <details className="mt-3 rounded-xl border border-sand-100 bg-white">
                    <summary className="cursor-pointer list-none px-3 py-2 text-xs text-sand-700">
                      {ar ? "إظهار القيم المقترحة" : "Show proposed values"}
                    </summary>
                    <pre className="overflow-x-auto border-t border-sand-100 bg-sand-50 px-3 py-2 text-[11px] text-sand-800">
                      {JSON.stringify(r.payload, null, 2)}
                    </pre>
                  </details>
                )}

                {r.original_payload && Object.keys(r.original_payload).length > 0 && (
                  <details className="mt-2 rounded-xl border border-sand-100 bg-white">
                    <summary className="cursor-pointer list-none px-3 py-2 text-xs text-sand-700">
                      {ar ? "القيم الأصلية" : "Original values"}
                    </summary>
                    <pre className="overflow-x-auto border-t border-sand-100 bg-sand-50 px-3 py-2 text-[11px] text-sand-600">
                      {JSON.stringify(r.original_payload, null, 2)}
                    </pre>
                  </details>
                )}

                {r.review_note && (
                  <div className="mt-3 rounded-xl border border-sand-200 bg-sand-50 px-3 py-2 text-xs text-sand-700">
                    <span className="font-medium">{ar ? "ملاحظة المراجع" : "Reviewer note"}: </span>
                    {r.review_note}
                  </div>
                )}

                {r.status === "pending" && (
                  <QueueActions
                    editId={r.id}
                    locale={locale}
                  />
                )}
              </article>
            );
          })
        )}
      </section>
    </div>
  );
}

function OpPill({ op, entity, ar }: { op: string; entity: string; ar: boolean }) {
  const opStyle =
    op === "insert" ? "bg-emerald-100 text-emerald-800"
      : op === "update" ? "bg-amber-100 text-amber-900"
      : "bg-rose-100 text-rose-800";
  const opLabel =
    op === "insert" ? (ar ? "إضافة" : "Add")
      : op === "update" ? (ar ? "تعديل" : "Edit")
      : (ar ? "حذف" : "Delete");
  const entLabel =
    entity === "person" ? (ar ? "شخص" : "person")
      : entity === "relationship" ? (ar ? "رابط" : "relationship")
      : (ar ? "حدث" : "event");
  return (
    <span className={"rounded-full px-2 py-0.5 text-[11px] font-medium " + opStyle}>
      {opLabel} · {entLabel}
    </span>
  );
}
