import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { getViewerContext } from "@/lib/auth";
import { loadTree } from "@/lib/data/loadTree";
import { computeRelationshipsFor, labelForRel, lineageName, buildPatrilineMap } from "@/lib/relationships";
import { getServerSupabase } from "@/lib/supabase/server";
import { getDictionary } from "@/lib/i18n/dictionaries";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function MePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  if (!isLocale(rawLocale)) notFound();
  const locale = rawLocale as Locale;
  const t = getDictionary(locale);
  const ar = locale === "ar";

  const viewer = await getViewerContext();
  if (!viewer.user) {
    redirect(`/${locale}/login`);
  }
  if (!viewer.claimedPersonId) {
    // No claim yet — bounce to the home page; the layout will show the welcome
    // modal automatically.
    redirect(`/${locale}`);
  }

  const { people, relationships } = await loadTree();
  const peopleById = new Map(people.map((p) => [p.id, p]));
  const me = peopleById.get(viewer.claimedPersonId);

  // If the claimed person row has been deleted, send them home and let them
  // re-claim via the welcome modal.
  if (!me) {
    redirect(`/${locale}`);
  }

  const rels = computeRelationshipsFor(me, peopleById, relationships);
  const patriline = buildPatrilineMap(people, relationships);
  const lineage = lineageName(me, peopleById, patriline, locale, 6);

  // Group relationships by kind for the summary card.
  const byKind = {
    parent: [] as typeof rels,
    child: [] as typeof rels,
    spouse: [] as typeof rels,
    sibling: [] as typeof rels,
    other: [] as typeof rels,
  };
  for (const r of rels) {
    if (r.r.type === "parent_of") (r.isFrom ? byKind.child : byKind.parent).push(r);
    else if (r.r.type === "spouse_of") byKind.spouse.push(r);
    else if (r.r.type === "sibling_of" || r.r.type === "milk_sibling_of") byKind.sibling.push(r);
    else byKind.other.push(r);
  }

  // Pending edits the user has submitted (their own queue).
  const sb = await getServerSupabase();
  let pendingMine: { id: string; entity_type: string; operation: string; status: string; submitted_at: string }[] = [];
  if (sb) {
    const { data } = await sb
      .from("pending_edits")
      .select("id,entity_type,operation,status,submitted_at")
      .eq("submitted_by", viewer.user.id)
      .order("submitted_at", { ascending: false })
      .limit(20);
    if (data) pendingMine = data as typeof pendingMine;
  }
  const pendingOpen = pendingMine.filter((p) => p.status === "pending").length;

  // Compute descendants count (just direct + grandchildren is enough for the
  // dashboard card — full descendants tree is on the Descendants view).
  const childIds = new Set(
    relationships.filter((r) => r.type === "parent_of" && r.fromId === me.id).map((r) => r.toId),
  );
  const grandchildIds = new Set<string>();
  for (const cid of childIds) {
    for (const r of relationships) {
      if (r.type === "parent_of" && r.fromId === cid) grandchildIds.add(r.toId);
    }
  }

  const name = ar ? me.nameAr : (me.nameEn || me.nameAr);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <header className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-xs uppercase tracking-wide text-sand-600">
            {ar ? "لوحتي" : "My dashboard"}
          </div>
          <h1 className="font-display text-3xl text-sand-900 sm:text-4xl">{name}</h1>
          <div className="mt-0.5 text-sm text-sand-600" title={lineage}>{lineage}</div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/${locale}/tree`}
            className="rounded-full border border-sand-200 bg-white px-3 py-1.5 text-xs text-sand-700 hover:bg-sand-50"
          >
            {ar ? "افتح الشجرة" : "Open tree"}
          </Link>
          <Link
            href={`/${locale}/relate`}
            className="rounded-full border border-sand-200 bg-white px-3 py-1.5 text-xs text-sand-700 hover:bg-sand-50"
          >
            {ar ? "علاقتي بشخص" : "Find relation to…"}
          </Link>
        </div>
      </header>

      {/* — KPI cards — */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card label={ar ? "الجيل" : "Generation"} value={me.generation != null ? `G${me.generation}` : "—"} />
        <Card label={ar ? "الإخوة" : "Siblings"} value={String(byKind.sibling.length)} />
        <Card label={ar ? "الأبناء" : "Children"} value={String(childIds.size)} />
        <Card label={ar ? "الأحفاد" : "Grandchildren"} value={String(grandchildIds.size)} />
      </section>

      {/* — Immediate relatives — */}
      <section className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <RelativesCard
          title={ar ? "الوالدان" : "Parents"}
          rels={byKind.parent}
          locale={locale}
          relationLabels={t.tree.relations}
          emptyMessage={ar ? "غير مسجّلين." : "Not recorded."}
        />
        <RelativesCard
          title={ar ? "الزوج/الزوجة" : "Spouse(s)"}
          rels={byKind.spouse}
          locale={locale}
          relationLabels={t.tree.relations}
          emptyMessage={ar ? "غير مسجّل." : "Not recorded."}
        />
        <RelativesCard
          title={ar ? "الإخوة" : "Siblings"}
          rels={byKind.sibling}
          locale={locale}
          relationLabels={t.tree.relations}
          emptyMessage={ar ? "غير مسجّلين." : "Not recorded."}
        />
        <RelativesCard
          title={ar ? "الأبناء" : "Children"}
          rels={byKind.child}
          locale={locale}
          relationLabels={t.tree.relations}
          emptyMessage={ar ? "غير مسجّلين." : "Not recorded."}
        />
      </section>

      {/* — My pending submissions — */}
      <section className="mt-8 rounded-2xl border border-sand-200 bg-white/80 p-5 shadow-soft">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg text-sand-900">
            {ar ? "اقتراحاتي قيد المراجعة" : "My pending suggestions"}
          </h2>
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-900">
            {pendingOpen} {ar ? "قيد المراجعة" : "open"}
          </span>
        </div>
        {pendingMine.length === 0 ? (
          <p className="mt-3 text-xs text-sand-500">
            {ar ? "لم تقدم أي اقتراح بعد." : "You haven't submitted any suggestions yet."}
          </p>
        ) : (
          <ul className="mt-3 space-y-1.5">
            {pendingMine.map((row) => (
              <li
                key={row.id}
                className="flex items-center justify-between rounded-xl border border-sand-100 bg-white px-3 py-2 text-xs"
              >
                <div className="text-sand-800">
                  <span className="font-medium">{row.operation}</span>
                  <span className="mx-1 text-sand-400">·</span>
                  <span>{row.entity_type}</span>
                </div>
                <div className="flex items-center gap-2 text-sand-600">
                  <span>{new Date(row.submitted_at).toLocaleDateString(ar ? "ar" : "en")}</span>
                  <StatusPill status={row.status} ar={ar} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-sand-200 bg-white/80 p-4 shadow-soft">
      <div className="text-[11px] uppercase tracking-wide text-sand-600">{label}</div>
      <div className="mt-1 font-display text-2xl text-sand-900">{value}</div>
    </div>
  );
}

function StatusPill({ status, ar }: { status: string; ar: boolean }) {
  const style =
    status === "approved"
      ? "bg-emerald-100 text-emerald-800"
      : status === "rejected"
        ? "bg-rose-100 text-rose-800"
        : "bg-amber-100 text-amber-900";
  const label =
    status === "approved" ? (ar ? "مقبول" : "approved")
      : status === "rejected" ? (ar ? "مرفوض" : "rejected")
      : (ar ? "قيد المراجعة" : "pending");
  return <span className={"rounded-full px-2 py-0.5 text-[10px] font-medium " + style}>{label}</span>;
}

function RelativesCard({
  title,
  rels,
  locale,
  relationLabels,
  emptyMessage,
}: {
  title: string;
  rels: ReturnType<typeof computeRelationshipsFor>;
  locale: Locale;
  relationLabels: Record<string, string>;
  emptyMessage: string;
}) {
  return (
    <div className="rounded-2xl border border-sand-200 bg-white/80 p-5 shadow-soft">
      <h3 className="font-display text-sand-900">{title}</h3>
      {rels.length === 0 ? (
        <p className="mt-2 text-xs text-sand-500">{emptyMessage}</p>
      ) : (
        <ul className="mt-3 space-y-1.5">
          {rels.map(({ r, other, isFrom }) => {
            const name = locale === "ar" ? other.nameAr : (other.nameEn || other.nameAr);
            const label = labelForRel(r.type, isFrom, other, relationLabels);
            return (
              <li key={r.id || other.id} className="flex items-center justify-between gap-2 rounded-xl border border-sand-100 bg-white px-3 py-2 text-sm">
                <span className="truncate text-sand-800">{name}</span>
                <span className="text-[11px] text-sand-500">{label}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
