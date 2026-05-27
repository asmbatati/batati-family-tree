import { notFound } from "next/navigation";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { getViewerContext } from "@/lib/auth";
import { getServerSupabase } from "@/lib/supabase/server";
import { seedEvents } from "@/lib/data/seed";
import SuggestEventForm from "@/components/events/SuggestEventForm";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const TYPE_COLORS: Record<string, string> = {
  wedding: "bg-amber-100 text-amber-800",
  birth: "bg-emerald-100 text-emerald-800",
  death: "bg-zinc-200 text-zinc-700",
  gathering: "bg-sky-100 text-sky-800",
  other: "bg-sand-100 text-sand-700"
};

type EventRow = {
  id: string;
  type: string;
  title_ar: string;
  title_en: string | null;
  date: string;
  location: string | null;
  description_ar: string | null;
  description_en: string | null;
  status: string | null;
  submitted_by: string | null;
};

type UnifiedEvent = {
  id: string;
  type: string;
  titleAr: string;
  titleEn?: string;
  date: string;
  location?: string;
  descriptionAr?: string;
  descriptionEn?: string;
  status?: string;
  submittedBy?: string;
};

export default async function EventsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  if (!isLocale(rawLocale)) notFound();
  const locale = rawLocale as Locale;
  const t = getDictionary(locale);
  const ar = locale === "ar";

  const viewer = await getViewerContext();
  const sb = await getServerSupabase();

  // Load from Supabase, fall back to seed when not configured / empty / failing.
  let events: UnifiedEvent[] = [];
  if (sb) {
    const { data, error } = await sb
      .from("events")
      .select("*")
      .order("date", { ascending: false })
      .limit(500);
    if (!error && data && data.length > 0) {
      events = (data as EventRow[]).map((r) => ({
        id: r.id,
        type: r.type,
        titleAr: r.title_ar,
        titleEn: r.title_en ?? undefined,
        date: r.date,
        location: r.location ?? undefined,
        descriptionAr: r.description_ar ?? undefined,
        descriptionEn: r.description_en ?? undefined,
        status: r.status ?? "approved",
        submittedBy: r.submitted_by ?? undefined,
      }));
    }
  }
  if (events.length === 0) {
    events = seedEvents.map((e) => ({ ...e, status: "approved" }));
  }

  const now = new Date().toISOString().slice(0, 10);
  const approved = events.filter((e) => e.status === "approved" || !e.status);
  const upcoming = approved.filter((e) => e.date >= now).sort((a, b) => a.date.localeCompare(b.date));
  const past     = approved.filter((e) => e.date <  now).sort((a, b) => b.date.localeCompare(a.date));
  const myPending = viewer.user
    ? events.filter((e) => e.status === "pending" && e.submittedBy === viewer.user?.id)
    : [];

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <h1 className="font-display text-3xl text-sand-900 sm:text-4xl">{t.events.title}</h1>
          <p className="mt-2 text-sand-700">{t.events.subtitle}</p>
        </div>
        {viewer.user && (
          <SuggestEventForm locale={locale} isEditor={viewer.isEditor} />
        )}
      </div>

      {myPending.length > 0 && (
        <section className="mt-8 rounded-2xl border border-amber-200 bg-amber-50/50 p-4">
          <h2 className="text-sm font-medium text-amber-900">
            {ar ? "اقتراحاتي قيد المراجعة" : "My pending suggestions"}
          </h2>
          <ul className="mt-2 space-y-1.5">
            {myPending.map((e) => (
              <li key={e.id} className="flex items-center justify-between gap-2 rounded-xl bg-white px-3 py-2 text-xs">
                <div>
                  <span className="font-medium text-sand-900">
                    {ar ? e.titleAr : (e.titleEn || e.titleAr)}
                  </span>
                  <span className="ms-2 text-sand-500">· {e.date}</span>
                </div>
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] text-amber-900">
                  {ar ? "قيد المراجعة" : "pending"}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <Section title={t.events.upcoming} events={upcoming} locale={locale} typeLabels={t.events.types} />
      <Section title={t.events.past}     events={past}     locale={locale} typeLabels={t.events.types} />
    </div>
  );
}

function Section({
  title, events, locale, typeLabels
}: {
  title: string;
  events: UnifiedEvent[];
  locale: Locale;
  typeLabels: Record<string, string>;
}) {
  if (events.length === 0) return null;
  return (
    <section className="mt-10">
      <h2 className="font-display text-xl text-sand-800">{title}</h2>
      <ul className="mt-4 space-y-3">
        {events.map((e) => (
          <li key={e.id} className="flex items-start gap-3 rounded-2xl border border-sand-200 bg-white/80 p-4 shadow-soft">
            <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs ${TYPE_COLORS[e.type] ?? TYPE_COLORS.other}`}>
              {typeLabels[e.type as keyof typeof typeLabels] ?? typeLabels.other}
            </span>
            <div className="flex-1">
              <div className="font-medium text-sand-900">
                {locale === "ar" ? e.titleAr : (e.titleEn || e.titleAr)}
              </div>
              <div className="text-xs text-sand-600">
                {e.date} {e.location ? `· ${e.location}` : ""}
              </div>
              {(e.descriptionAr || e.descriptionEn) && (
                <p className="mt-1 text-sm text-sand-700">
                  {locale === "ar" ? e.descriptionAr : (e.descriptionEn || e.descriptionAr)}
                </p>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
