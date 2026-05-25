import { notFound } from "next/navigation";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { seedPeople, seedRelationships } from "@/lib/data/seed";

export default async function InsightsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  if (!isLocale(rawLocale)) notFound();
  const locale = rawLocale as Locale;
  const t = getDictionary(locale);

  // Compute simple statistics from the seed dataset
  const totalPeople = seedPeople.length;
  const totalRels = seedRelationships.length;

  // Average children per parent
  const childrenByParent = new Map<string, number>();
  for (const r of seedRelationships) {
    if (r.type === "parent_of") {
      childrenByParent.set(r.fromId, (childrenByParent.get(r.fromId) ?? 0) + 1);
    }
  }
  const avgChildren =
    childrenByParent.size === 0
      ? 0
      : Array.from(childrenByParent.values()).reduce((a, b) => a + b, 0) / childrenByParent.size;

  // Oldest person (by birth year)
  const oldest = seedPeople
    .filter((p) => p.birthYear)
    .sort((a, b) => (a.birthYear! - b.birthYear!))[0];

  // Most connected person (by relationship count)
  const counts = new Map<string, number>();
  for (const r of seedRelationships) {
    counts.set(r.fromId, (counts.get(r.fromId) ?? 0) + 1);
    counts.set(r.toId,   (counts.get(r.toId)   ?? 0) + 1);
  }
  const mostConnectedId = Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0];
  const mostConnected = seedPeople.find((p) => p.id === mostConnectedId);

  const cards = [
    { label: t.insights.cards.totalPeople,        value: totalPeople },
    { label: t.insights.cards.totalRelationships, value: totalRels },
    { label: t.insights.cards.avgChildren,        value: avgChildren.toFixed(1) },
    { label: t.insights.cards.oldestLiving,       value: oldest ? (locale === "ar" ? oldest.nameAr : (oldest.nameEn || oldest.nameAr)) : "—" },
    { label: t.insights.cards.mostConnected,      value: mostConnected ? (locale === "ar" ? mostConnected.nameAr : (mostConnected.nameEn || mostConnected.nameAr)) : "—" }
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <h1 className="font-display text-3xl text-sand-900 sm:text-4xl">{t.insights.title}</h1>
      <p className="mt-2 text-sand-700">{t.insights.subtitle}</p>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <div key={c.label} className="rounded-2xl border border-sand-200 bg-white/80 p-5 shadow-soft">
            <div className="text-xs uppercase tracking-wide text-sand-600">{c.label}</div>
            <div className="mt-2 font-display text-3xl text-sand-900">{c.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
