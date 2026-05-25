import Link from "next/link";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { notFound } from "next/navigation";

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  if (!isLocale(rawLocale)) notFound();
  const locale = rawLocale as Locale;
  const t = getDictionary(locale);

  const cards = [
    { href: "/about",    ...t.home.cards.about,    accent: "from-sand-200 to-sand-100" },
    { href: "/tree",     ...t.home.cards.tree,     accent: "from-amber-200 to-sand-100" },
    { href: "/sources",  ...t.home.cards.sources,  accent: "from-emerald-100 to-sand-100" },
    { href: "/events",   ...t.home.cards.events,   accent: "from-rose-100 to-sand-100" },
    { href: "/insights", ...t.home.cards.insights, accent: "from-sky-100 to-sand-100" }
  ];

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="grain absolute inset-0 opacity-50" aria-hidden />
        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full bg-sand-100 px-3 py-1 text-xs font-medium text-sand-700">
              <span className="h-1.5 w-1.5 rounded-full bg-sand-500" />
              {t.brand.tagline}
            </span>
            <h1 className="mt-4 font-display text-4xl leading-tight text-sand-900 sm:text-6xl">
              {t.home.heroTitle}
            </h1>
            <p className="mt-4 text-lg text-sand-700">{t.home.heroSubtitle}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href={`/${locale}/tree`}
                className="rounded-full bg-sand-700 px-5 py-2.5 text-sm font-medium text-white shadow-soft hover:bg-sand-800"
              >
                {t.home.ctaTree}
              </Link>
              <Link
                href={`/${locale}/about`}
                className="rounded-full border border-sand-300 bg-white/70 px-5 py-2.5 text-sm font-medium text-sand-800 hover:bg-white"
              >
                {t.home.ctaAbout}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Cards */}
      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6">
        <h2 className="mb-6 font-display text-2xl text-sand-900">{t.home.sectionsTitle}</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((c) => (
            <Link
              key={c.href}
              href={`/${locale}${c.href}`}
              className={`group relative overflow-hidden rounded-2xl border border-sand-200 bg-gradient-to-br ${c.accent} p-6 shadow-soft transition hover:-translate-y-0.5 hover:shadow-lg`}
            >
              <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/40 blur-2xl" aria-hidden />
              <h3 className="font-display text-xl text-sand-900">{c.title}</h3>
              <p className="mt-2 text-sm text-sand-700">{c.desc}</p>
              <span className="mt-4 inline-block text-sm font-medium text-sand-800 group-hover:translate-x-0.5">
                →
              </span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
