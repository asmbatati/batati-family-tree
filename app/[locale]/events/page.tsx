import { notFound } from "next/navigation";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { seedEvents } from "@/lib/data/seed";

const TYPE_COLORS: Record<string, string> = {
  wedding: "bg-amber-100 text-amber-800",
  birth: "bg-emerald-100 text-emerald-800",
  death: "bg-zinc-200 text-zinc-700",
  gathering: "bg-sky-100 text-sky-800",
  other: "bg-sand-100 text-sand-700"
};

export default async function EventsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  if (!isLocale(rawLocale)) notFound();
  const locale = rawLocale as Locale;
  const t = getDictionary(locale);

  const now = new Date().toISOString().slice(0, 10);
  const upcoming = seedEvents.filter((e) => e.date >= now).sort((a, b) => a.date.localeCompare(b.date));
  const past     = seedEvents.filter((e) => e.date <  now).sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <h1 className="font-display text-3xl text-sand-900 sm:text-4xl">{t.events.title}</h1>
      <p className="mt-2 text-sand-700">{t.events.subtitle}</p>

      <Section title={t.events.upcoming} events={upcoming} locale={locale} typeLabels={t.events.types} />
      <Section title={t.events.past}     events={past}     locale={locale} typeLabels={t.events.types} />
    </div>
  );
}

function Section({
  title, events, locale, typeLabels
}: {
  title: string;
  events: typeof seedEvents;
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
