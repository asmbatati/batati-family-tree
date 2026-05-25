import { notFound } from "next/navigation";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { isLocale, type Locale } from "@/lib/i18n/config";

export default async function AboutPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  if (!isLocale(rawLocale)) notFound();
  const locale = rawLocale as Locale;
  const t = getDictionary(locale);

  const sections = [
    { title: t.about.rootsTitle,   body: t.about.rootsBody },
    { title: t.about.virtuesTitle, body: t.about.virtuesBody },
    { title: t.about.lineageTitle, body: t.about.lineageBody },
    { title: t.about.historyTitle, body: t.about.historyBody }
  ];

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <h1 className="font-display text-3xl text-sand-900 sm:text-4xl">{t.about.title}</h1>
      <div className="mt-8 space-y-8">
        {sections.map((s) => (
          <article key={s.title} className="rounded-2xl border border-sand-200 bg-white/80 p-6 shadow-soft">
            <h2 className="font-display text-xl text-sand-800">{s.title}</h2>
            <p className="mt-2 leading-relaxed text-sand-700">{s.body}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
