import { notFound } from "next/navigation";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { seedSources } from "@/lib/data/seed";

export default async function SourcesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  if (!isLocale(rawLocale)) notFound();
  const locale = rawLocale as Locale;
  const t = getDictionary(locale);

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <h1 className="font-display text-3xl text-sand-900 sm:text-4xl">{t.sources.title}</h1>
      <p className="mt-2 text-sand-700">{t.sources.subtitle}</p>

      <div className="mt-8 overflow-hidden rounded-2xl border border-sand-200 bg-white/80 shadow-soft">
        <table className="w-full text-sm">
          <thead className="bg-sand-100 text-sand-700">
            <tr>
              <th className="px-4 py-3 text-start font-medium">{t.sources.columns.title}</th>
              <th className="px-4 py-3 text-start font-medium">{t.sources.columns.author}</th>
              <th className="px-4 py-3 text-start font-medium">{t.sources.columns.year}</th>
              <th className="px-4 py-3 text-start font-medium">{t.sources.columns.type}</th>
              <th className="px-4 py-3 text-start font-medium">{t.sources.columns.link}</th>
            </tr>
          </thead>
          <tbody>
            {seedSources.map((s) => (
              <tr key={s.id} className="border-t border-sand-200/60">
                <td className="px-4 py-3 text-sand-900">{locale === "ar" ? s.titleAr : (s.titleEn || s.titleAr)}</td>
                <td className="px-4 py-3 text-sand-700">{s.author ?? "—"}</td>
                <td className="px-4 py-3 text-sand-700">{s.year ?? "—"}</td>
                <td className="px-4 py-3 text-sand-700">{s.type}</td>
                <td className="px-4 py-3">
                  {s.url ? (
                    <a className="text-sand-700 underline hover:text-sand-900" href={s.url} target="_blank" rel="noreferrer">↗</a>
                  ) : (
                    <span className="text-sand-400">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
