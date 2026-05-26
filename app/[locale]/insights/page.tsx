import { notFound } from "next/navigation";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { loadTree } from "@/lib/data/loadTree";
import type { Person, Relationship } from "@/lib/types";

const YEARS_PER_GEN = 25;
const PRESENT_YEAR = 2025;

function nameOf(p: Person | undefined, locale: Locale): string {
  if (!p) return "—";
  return locale === "ar" ? p.nameAr : (p.nameEn || p.nameAr);
}

type Stats = {
  totalPeople: number;
  totalRels: number;
  totalMale: number;
  totalFemale: number;
  avgChildren: number;
  largestFamily: { parent?: Person; count: number };
  topName?: { name: string; count: number };
  topDual?: { name: string; count: number };
  rarestNamesCount: number;
  mostConnected?: Person;
  oldest?: Person;
  deepestGen: number;
  genTable: { gen: number; count: number; males: number; females: number }[];
};

function computeStats(people: Person[], relationships: Relationship[]): Stats {
  const peopleById = new Map(people.map((p) => [p.id, p]));

  const totalPeople = people.length;
  const totalRels = relationships.length;
  const totalMale = people.filter((p) => p.gender === "male").length;
  const totalFemale = people.filter((p) => p.gender === "female").length;

  const childCount = new Map<string, number>();
  for (const r of relationships) {
    if (r.type !== "parent_of") continue;
    childCount.set(r.fromId, (childCount.get(r.fromId) ?? 0) + 1);
  }
  const avgChildren =
    childCount.size === 0 ? 0 : [...childCount.values()].reduce((a, b) => a + b, 0) / childCount.size;

  const largestEntry = [...childCount.entries()].sort((a, b) => b[1] - a[1])[0];
  const largestFamily = largestEntry
    ? { parent: peopleById.get(largestEntry[0]), count: largestEntry[1] }
    : { count: 0 };

  // Top single name
  const nameCounts = new Map<string, number>();
  for (const p of people) nameCounts.set(p.nameAr, (nameCounts.get(p.nameAr) ?? 0) + 1);
  const nameSorted = [...nameCounts.entries()].sort((a, b) => b[1] - a[1]);
  const topName = nameSorted[0] ? { name: nameSorted[0][0], count: nameSorted[0][1] } : undefined;
  const rarestNamesCount = nameSorted.filter(([, c]) => c === 1).length;

  // Top dual name (child + parent)
  const dualCounts = new Map<string, number>();
  for (const r of relationships) {
    if (r.type !== "parent_of") continue;
    const parent = peopleById.get(r.fromId);
    const child = peopleById.get(r.toId);
    if (!parent || !child) continue;
    const dual = `${child.nameAr} بن ${parent.nameAr}`;
    dualCounts.set(dual, (dualCounts.get(dual) ?? 0) + 1);
  }
  const dualSorted = [...dualCounts.entries()].sort((a, b) => b[1] - a[1]);
  const topDual = dualSorted[0] ? { name: dualSorted[0][0], count: dualSorted[0][1] } : undefined;

  // Most connected
  const connections = new Map<string, number>();
  for (const r of relationships) {
    connections.set(r.fromId, (connections.get(r.fromId) ?? 0) + 1);
    connections.set(r.toId, (connections.get(r.toId) ?? 0) + 1);
  }
  const mostConnectedEntry = [...connections.entries()].sort((a, b) => b[1] - a[1])[0];
  const mostConnected = mostConnectedEntry ? peopleById.get(mostConnectedEntry[0]) : undefined;

  // Oldest by birthYear (may be undefined if no one has a birthYear)
  const withBirth = people.filter((p) => typeof p.birthYear === "number");
  const oldest = withBirth.length
    ? withBirth.sort((a, b) => (a.birthYear! - b.birthYear!))[0]
    : undefined;

  // Generation table
  const byGen = new Map<number, { count: number; males: number; females: number }>();
  for (const p of people) {
    const g = p.generation ?? 0;
    const row = byGen.get(g) ?? { count: 0, males: 0, females: 0 };
    row.count++;
    if (p.gender === "male") row.males++;
    else if (p.gender === "female") row.females++;
    byGen.set(g, row);
  }
  const genTable = [...byGen.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([gen, v]) => ({ gen, ...v }));
  const deepestGen = genTable.length ? genTable[genTable.length - 1].gen : 0;

  return {
    totalPeople, totalRels, totalMale, totalFemale,
    avgChildren, largestFamily,
    topName, topDual, rarestNamesCount,
    mostConnected, oldest,
    deepestGen, genTable,
  };
}

function timeframeFor(gen: number, deepestGen: number): string {
  const center = PRESENT_YEAR - (deepestGen - gen) * YEARS_PER_GEN;
  const half = Math.floor(YEARS_PER_GEN / 2);
  return `~${center - half}–${center + half}`;
}

export default async function InsightsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  if (!isLocale(rawLocale)) notFound();
  const locale = rawLocale as Locale;
  const t = getDictionary(locale);

  // Unmasked load: stats are aggregate so we want real names for counts.
  // Female names in the "top name" card are common Arabic names (محمد, etc.)
  // and the page surfaces only counts of names, not individual identities.
  const { people, relationships } = await loadTree();
  const s = computeStats(people, relationships);

  const num = (n: number) => n.toLocaleString(locale === "ar" ? "ar-EG" : "en-US");

  const cards: { label: string; value: string; sub?: string }[] = [
    { label: t.insights.cards.totalPeople, value: num(s.totalPeople) },
    { label: t.insights.cards.totalMale,   value: num(s.totalMale) },
    { label: t.insights.cards.totalFemale, value: num(s.totalFemale) },
    { label: t.insights.cards.totalRelationships, value: num(s.totalRels) },
    { label: t.insights.cards.avgChildren, value: s.avgChildren.toFixed(1) },
    {
      label: t.insights.cards.largestFamily,
      value: nameOf(s.largestFamily.parent, locale),
      sub: `${num(s.largestFamily.count)} ${t.insights.children}`,
    },
    {
      label: t.insights.cards.topName,
      value: s.topName?.name ?? "—",
      sub: s.topName ? `${num(s.topName.count)}${t.insights.timesUsed}` : undefined,
    },
    {
      label: t.insights.cards.topDualName,
      value: s.topDual?.name ?? "—",
      sub: s.topDual ? `${num(s.topDual.count)}${t.insights.timesUsed}` : undefined,
    },
    { label: t.insights.cards.namesOnce, value: num(s.rarestNamesCount) },
    {
      label: t.insights.cards.mostConnected,
      value: nameOf(s.mostConnected, locale),
    },
    { label: t.insights.cards.deepestGen, value: `G${s.deepestGen}` },
    ...(s.oldest
      ? [{ label: t.insights.cards.oldestLiving, value: nameOf(s.oldest, locale), sub: String(s.oldest.birthYear) }]
      : []),
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <h1 className="font-display text-3xl text-sand-900 sm:text-4xl">{t.insights.title}</h1>
      <p className="mt-2 text-sand-700">{t.insights.subtitle}</p>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <div key={c.label} className="rounded-2xl border border-sand-200 bg-white/80 p-5 shadow-soft">
            <div className="text-xs uppercase tracking-wide text-sand-600">{c.label}</div>
            <div className="mt-2 truncate font-display text-2xl text-sand-900" title={c.value}>{c.value}</div>
            {c.sub && <div className="mt-1 text-xs text-sand-600">{c.sub}</div>}
          </div>
        ))}
      </div>

      <section className="mt-12">
        <h2 className="font-display text-xl text-sand-900">{t.insights.byGeneration.title}</h2>
        <p className="mt-1 text-xs text-sand-600">{t.insights.byGeneration.note}</p>

        <div className="mt-4 overflow-hidden rounded-2xl border border-sand-200 bg-white/80 shadow-soft">
          <table className="w-full text-sm">
            <thead className="bg-sand-100 text-sand-700">
              <tr>
                <th className="px-4 py-2 text-start font-medium">{t.insights.byGeneration.gen}</th>
                <th className="px-4 py-2 text-start font-medium">{t.insights.byGeneration.count}</th>
                <th className="px-4 py-2 text-start font-medium">{t.insights.byGeneration.males}</th>
                <th className="px-4 py-2 text-start font-medium">{t.insights.byGeneration.females}</th>
                <th className="px-4 py-2 text-start font-medium">{t.insights.byGeneration.timeframe}</th>
              </tr>
            </thead>
            <tbody>
              {s.genTable.map((row) => (
                <tr key={row.gen} className="border-t border-sand-200/60">
                  <td className="px-4 py-2 text-sand-900">G{row.gen}</td>
                  <td className="px-4 py-2 text-sand-800">{num(row.count)}</td>
                  <td className="px-4 py-2 text-sand-700">{num(row.males)}</td>
                  <td className="px-4 py-2 text-sand-700">{num(row.females)}</td>
                  <td className="px-4 py-2 text-sand-600">{timeframeFor(row.gen, s.deepestGen)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
