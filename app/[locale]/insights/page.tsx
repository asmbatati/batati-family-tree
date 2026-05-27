import { notFound } from "next/navigation";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { loadTree } from "@/lib/data/loadTree";
import type { Person, Relationship } from "@/lib/types";
import TimeMachine from "@/components/insights/TimeMachine";

// Always re-render on every request so the stats reflect live DB state.
export const dynamic = "force-dynamic";
export const revalidate = 0;

const YEARS_PER_GEN = 25;
const PRESENT_YEAR = 2025;

function nameOf(p: Person | undefined, locale: Locale): string {
  if (!p) return "—";
  return locale === "ar" ? p.nameAr : (p.nameEn || p.nameAr);
}

// --- types -----------------------------------------------------------------

type MarriagePair = { a: Person; b: Person };

type Stats = {
  totalPeople: number;
  totalRels: number;
  totalMale: number;
  totalFemale: number;
  avgChildren: number;
  largestFamily: { parent?: Person; count: number };
  topName?: { name: string; count: number };
  topDual?: { name: string; count: number };
  topNames: { name: string; count: number }[];
  rarestNamesCount: number;
  mostConnected?: Person;
  oldest?: Person;
  deepestGen: number;
  genTable: { gen: number; count: number; males: number; females: number }[];
  familySizeBuckets: { size: number; count: number }[];
  inLawFamilies: { family: string; count: number }[];
  inLawPairs: { batati: Person; inLaw: Person; family: string }[];
  milkSiblingPairs: number;
  milkSiblingExamples: { aName: string; bName: string }[];
  milkSiblingList: MarriagePair[];
  multiSpouseCount: number;
  multiSpouseTop: { person: Person; count: number }[];
  cousinMarriages: number;             // 1st cousins
  cousinMarriagePairs: MarriagePair[];
  secondCousinMarriages: number;
  secondCousinPairs: MarriagePair[];
  greatUncleMarriages: number;
  greatUnclePairs: MarriagePair[];
  statusBreakdown: { living: number; deceased: number; unknown: number };
  topLocations: { location: string; count: number }[];
  cityHits: { city: string; count: number; x: number; y: number }[];
  totalSpouseLinks: number;
  endogamyRate: number;
  nameMatrix: { names: string[]; gens: number[]; matrix: number[][] };
  // Range metadata (always derived from FULL data, not filtered).
  minGenAll: number;
  maxGenAll: number;
};

// --- helpers ---------------------------------------------------------------

function ancestorsAtLevel(personId: string, level: number, parentsOf: Map<string, string[]>): Set<string> {
  let current = new Set([personId]);
  for (let i = 0; i < level; i++) {
    const next = new Set<string>();
    for (const id of current) {
      const parents = parentsOf.get(id) ?? [];
      for (const p of parents) next.add(p);
    }
    current = next;
  }
  return current;
}

type MarriageRelation = "first_cousin" | "second_cousin" | "great_uncle" | "other";

function classifyMarriage(aId: string, bId: string, parentsOf: Map<string, string[]>): MarriageRelation {
  // Ancestor sets at each level.
  const aP = ancestorsAtLevel(aId, 1, parentsOf);
  const bP = ancestorsAtLevel(bId, 1, parentsOf);
  const aGP = ancestorsAtLevel(aId, 2, parentsOf);
  const bGP = ancestorsAtLevel(bId, 2, parentsOf);

  // First cousin = share grandparent.
  for (const g of aGP) if (bGP.has(g)) return "first_cousin";

  // Great-uncle/aunt marriage = one's grandparent is the other's parent.
  for (const g of aGP) if (bP.has(g)) return "great_uncle";
  for (const g of bGP) if (aP.has(g)) return "great_uncle";

  // Second cousin = share great-grandparent (but didn't match first cousin or great-uncle above).
  const aGGP = ancestorsAtLevel(aId, 3, parentsOf);
  const bGGP = ancestorsAtLevel(bId, 3, parentsOf);
  for (const g of aGGP) if (bGGP.has(g)) return "second_cousin";

  return "other";
}

// City coordinate lookup (rough Arabian-Peninsula layout in a 100×130 viewBox).
const CITY_COORDS: Record<string, [number, number]> = {
  "الرياض": [60, 55],          "Riyadh": [60, 55],
  "جدة": [22, 58],             "Jeddah": [22, 58],
  "مكة": [26, 63],             "مكة المكرمة": [26, 63], "Mecca": [26, 63],
  "المدينة المنورة": [25, 45], "المدينة": [25, 45],     "Medina": [25, 45],
  "الدمام": [82, 50],          "Dammam": [82, 50],
  "الخبر": [83, 51],           "Khobar": [83, 51],
  "الظهران": [82, 50],         "Dhahran": [82, 50],
  "تبوك": [12, 22],            "Tabuk": [12, 22],
  "أبها": [32, 88],            "Abha": [32, 88],
  "خميس مشيط": [34, 88],
  "حائل": [38, 32],            "Hail": [38, 32],
  "الطائف": [28, 65],          "Taif": [28, 65],
  "بريدة": [48, 40],           "Buraidah": [48, 40],
  "عنيزة": [50, 42],
  "نجران": [50, 95],           "Najran": [50, 95],
  "ينبع": [20, 40],            "Yanbu": [20, 40],
  "جازان": [33, 95],           "Jazan": [33, 95],
  "صنعاء": [42, 108],          "Sanaa": [42, 108],
  "عدن": [50, 122],            "Aden": [50, 122],
  "حضرموت": [65, 110],         "Hadhramaut": [65, 110],
  "مكتب": [80, 25], // (filler examples; ignored if no rows match)
};

function matchCity(loc: string): { city: string; x: number; y: number } | null {
  const trimmed = loc.trim();
  // Exact match first.
  if (trimmed in CITY_COORDS) {
    const [x, y] = CITY_COORDS[trimmed];
    return { city: trimmed, x, y };
  }
  // Substring match (location string contains a known city name).
  for (const city of Object.keys(CITY_COORDS)) {
    if (trimmed.includes(city)) {
      const [x, y] = CITY_COORDS[city];
      return { city, x, y };
    }
  }
  return null;
}

// --- computeStats ----------------------------------------------------------

/**
 * Computes every stat from a (people, relationships) snapshot. The TimeMachine
 * filter calls this with a sliced people array — but `parentsOf` is built from
 * the FULL relationship set so cousin detection still works correctly even
 * when grandparent rows fall outside the visible generation range.
 */
function computeStats(
  filteredPeople: Person[],
  filteredRels: Relationship[],
  parentsOfFull: Map<string, string[]>,
  fullPeople: Person[],
): Stats {
  const peopleById = new Map(filteredPeople.map((p) => [p.id, p]));
  const fullPeopleById = new Map(fullPeople.map((p) => [p.id, p]));

  const totalPeople = filteredPeople.length;
  const totalRels = filteredRels.length;
  const totalMale = filteredPeople.filter((p) => p.gender === "male").length;
  const totalFemale = filteredPeople.filter((p) => p.gender === "female").length;

  // Children counts.
  const childCount = new Map<string, number>();
  for (const r of filteredRels) {
    if (r.type !== "parent_of") continue;
    childCount.set(r.fromId, (childCount.get(r.fromId) ?? 0) + 1);
  }
  const avgChildren =
    childCount.size === 0 ? 0 : [...childCount.values()].reduce((a, b) => a + b, 0) / childCount.size;
  const largestEntry = [...childCount.entries()].sort((a, b) => b[1] - a[1])[0];
  const largestFamily = largestEntry
    ? { parent: peopleById.get(largestEntry[0]), count: largestEntry[1] }
    : { count: 0 };
  const sizeCount = new Map<number, number>();
  for (const v of childCount.values()) sizeCount.set(v, (sizeCount.get(v) ?? 0) + 1);
  const familySizeBuckets = [...sizeCount.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([size, count]) => ({ size, count }));

  // Names.
  const nameCounts = new Map<string, number>();
  for (const p of filteredPeople) nameCounts.set(p.nameAr, (nameCounts.get(p.nameAr) ?? 0) + 1);
  const nameSorted = [...nameCounts.entries()].sort((a, b) => b[1] - a[1]);
  const topName = nameSorted[0] ? { name: nameSorted[0][0], count: nameSorted[0][1] } : undefined;
  const rarestNamesCount = nameSorted.filter(([, c]) => c === 1).length;
  const topNames = nameSorted.slice(0, 10).map(([name, count]) => ({ name, count }));

  // Patrilineal dual name (X بن Y).
  const dualCounts = new Map<string, number>();
  for (const r of filteredRels) {
    if (r.type !== "parent_of") continue;
    const parent = peopleById.get(r.fromId);
    const child = peopleById.get(r.toId);
    if (!parent || !child) continue;
    if (parent.gender !== "male") continue;
    const dual = `${child.nameAr} بن ${parent.nameAr}`;
    dualCounts.set(dual, (dualCounts.get(dual) ?? 0) + 1);
  }
  const dualSorted = [...dualCounts.entries()].sort((a, b) => b[1] - a[1]);
  const topDual = dualSorted[0] ? { name: dualSorted[0][0], count: dualSorted[0][1] } : undefined;

  // Most connected.
  const connections = new Map<string, number>();
  for (const r of filteredRels) {
    connections.set(r.fromId, (connections.get(r.fromId) ?? 0) + 1);
    connections.set(r.toId, (connections.get(r.toId) ?? 0) + 1);
  }
  const mostConnectedEntry = [...connections.entries()].sort((a, b) => b[1] - a[1])[0];
  const mostConnected = mostConnectedEntry ? peopleById.get(mostConnectedEntry[0]) : undefined;

  // Oldest.
  const withBirth = filteredPeople.filter((p) => typeof p.birthYear === "number");
  const oldest = withBirth.length ? withBirth.slice().sort((a, b) => a.birthYear! - b.birthYear!)[0] : undefined;

  // Generation table.
  const byGen = new Map<number, { count: number; males: number; females: number }>();
  for (const p of filteredPeople) {
    const g = p.generation ?? 0;
    const row = byGen.get(g) ?? { count: 0, males: 0, females: 0 };
    row.count++;
    if (p.gender === "male") row.males++;
    else if (p.gender === "female") row.females++;
    byGen.set(g, row);
  }
  const genTable = [...byGen.entries()].sort((a, b) => a[0] - b[0]).map(([gen, v]) => ({ gen, ...v }));
  const deepestGen = genTable.length ? genTable[genTable.length - 1].gen : 0;

  // Spouse-derived stats.
  const spousePairs = new Set<string>();
  const spouseCount = new Map<string, number>();
  const inLawFamilyCounts = new Map<string, number>();
  const inLawPairs: { batati: Person; inLaw: Person; family: string }[] = [];
  let totalSpouseLinks = 0;
  let endoSpouseLinks = 0;
  let cousinMarriages = 0;
  const cousinMarriagePairs: MarriagePair[] = [];
  let secondCousinMarriages = 0;
  const secondCousinPairs: MarriagePair[] = [];
  let greatUncleMarriages = 0;
  const greatUnclePairs: MarriagePair[] = [];

  for (const r of filteredRels) {
    if (r.type !== "spouse_of") continue;
    const key = [r.fromId, r.toId].sort().join("|");
    if (spousePairs.has(key)) continue;
    spousePairs.add(key);
    totalSpouseLinks++;
    spouseCount.set(r.fromId, (spouseCount.get(r.fromId) ?? 0) + 1);
    spouseCount.set(r.toId, (spouseCount.get(r.toId) ?? 0) + 1);

    const a = peopleById.get(r.fromId);
    const b = peopleById.get(r.toId);
    if (!a || !b) continue;

    const aIsBatati = !a.familyAr || a.familyAr === "البطاطي";
    const bIsBatati = !b.familyAr || b.familyAr === "البطاطي";

    if (aIsBatati && bIsBatati) {
      endoSpouseLinks++;
      // Use FULL parents map so the ancestor chain isn't broken by the gen filter.
      const rel = classifyMarriage(a.id, b.id, parentsOfFull);
      if (rel === "first_cousin") {
        cousinMarriages++;
        cousinMarriagePairs.push({ a, b });
      } else if (rel === "second_cousin") {
        secondCousinMarriages++;
        secondCousinPairs.push({ a, b });
      } else if (rel === "great_uncle") {
        greatUncleMarriages++;
        greatUnclePairs.push({ a, b });
      }
    } else if (aIsBatati && !bIsBatati) {
      const fam = b.familyAr ?? "أخرى";
      inLawFamilyCounts.set(fam, (inLawFamilyCounts.get(fam) ?? 0) + 1);
      inLawPairs.push({ batati: a, inLaw: b, family: fam });
    } else if (!aIsBatati && bIsBatati) {
      const fam = a.familyAr ?? "أخرى";
      inLawFamilyCounts.set(fam, (inLawFamilyCounts.get(fam) ?? 0) + 1);
      inLawPairs.push({ batati: b, inLaw: a, family: fam });
    }
  }

  const inLawFamilies = [...inLawFamilyCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([family, count]) => ({ family, count }));
  const multiSpouseEntries = [...spouseCount.entries()].filter(([, c]) => c >= 2);
  const multiSpouseCount = multiSpouseEntries.length;
  const multiSpouseTop = multiSpouseEntries
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id, count]) => {
      const person = peopleById.get(id);
      return person ? { person, count } : null;
    })
    .filter((e): e is { person: Person; count: number } => !!e);
  const endogamyRate = totalSpouseLinks === 0 ? 0 : endoSpouseLinks / totalSpouseLinks;

  // Milk siblings.
  const milkSet = new Set<string>();
  let milkSiblingPairs = 0;
  const milkSiblingExamples: { aName: string; bName: string }[] = [];
  const milkSiblingList: MarriagePair[] = [];
  for (const r of filteredRels) {
    if (r.type !== "milk_sibling_of") continue;
    const key = [r.fromId, r.toId].sort().join("|");
    if (milkSet.has(key)) continue;
    milkSet.add(key);
    milkSiblingPairs++;
    const a = peopleById.get(r.fromId);
    const b = peopleById.get(r.toId);
    if (a && b) {
      if (milkSiblingExamples.length < 5) milkSiblingExamples.push({ aName: a.nameAr, bName: b.nameAr });
      milkSiblingList.push({ a, b });
    }
  }

  // Status breakdown.
  const statusBreakdown = { living: 0, deceased: 0, unknown: 0 };
  for (const p of filteredPeople) {
    if (p.status === "living") statusBreakdown.living++;
    else if (p.status === "deceased") statusBreakdown.deceased++;
    else statusBreakdown.unknown++;
  }

  // Locations + map hits.
  const locationCounts = new Map<string, number>();
  const cityCounts = new Map<string, { count: number; x: number; y: number }>();
  for (const p of filteredPeople) {
    if (!p.location) continue;
    locationCounts.set(p.location, (locationCounts.get(p.location) ?? 0) + 1);
    const m = matchCity(p.location);
    if (m) {
      const cur = cityCounts.get(m.city) ?? { count: 0, x: m.x, y: m.y };
      cur.count++;
      cityCounts.set(m.city, cur);
    }
  }
  const topLocations = [...locationCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([location, count]) => ({ location, count }));
  const cityHits = [...cityCounts.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .map(([city, v]) => ({ city, count: v.count, x: v.x, y: v.y }));

  // Naming heatmap (top 10 names × generations).
  const heatmapNames = topNames.slice(0, 10).map((n) => n.name);
  const heatmapGens = [...new Set(filteredPeople.map((p) => p.generation ?? 0))].sort((a, b) => a - b);
  const matrix: number[][] = heatmapNames.map(() => heatmapGens.map(() => 0));
  for (const p of filteredPeople) {
    const nameIdx = heatmapNames.indexOf(p.nameAr);
    if (nameIdx < 0) continue;
    const genIdx = heatmapGens.indexOf(p.generation ?? 0);
    if (genIdx < 0) continue;
    matrix[nameIdx][genIdx]++;
  }

  // Global gen range (always full data, not filtered) — feeds the TimeMachine slider.
  const allGens = fullPeople.map((p) => p.generation ?? 0);
  const minGenAll = allGens.length ? Math.min(...allGens) : 0;
  const maxGenAll = allGens.length ? Math.max(...allGens) : 0;
  // Reference fullPeopleById to silence unused warning; used implicitly for richer error reporting if extended later.
  void fullPeopleById;

  return {
    totalPeople, totalRels, totalMale, totalFemale,
    avgChildren, largestFamily,
    topName, topDual, topNames, rarestNamesCount,
    mostConnected, oldest,
    deepestGen, genTable,
    familySizeBuckets, inLawFamilies, inLawPairs,
    milkSiblingPairs, milkSiblingExamples, milkSiblingList,
    multiSpouseCount, multiSpouseTop,
    cousinMarriages, cousinMarriagePairs,
    secondCousinMarriages, secondCousinPairs,
    greatUncleMarriages, greatUnclePairs,
    statusBreakdown, topLocations, cityHits,
    totalSpouseLinks, endogamyRate,
    nameMatrix: { names: heatmapNames, gens: heatmapGens, matrix },
    minGenAll, maxGenAll,
  };
}

function timeframeFor(gen: number, deepestGen: number): string {
  const center = PRESENT_YEAR - (deepestGen - gen) * YEARS_PER_GEN;
  const half = Math.floor(YEARS_PER_GEN / 2);
  return `~${center - half}–${center + half}`;
}

// --- inline charts ---------------------------------------------------------

function BarChart({ data, accent }: {
  data: { label: string; value: number; sub?: string }[];
  accent: string;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="space-y-2">
      {data.map((d, i) => (
        <div key={`${d.label}-${i}`}>
          <div className="flex items-baseline justify-between gap-2 text-xs">
            <span className="truncate text-sand-800" title={d.label}>{d.label}</span>
            <span className="shrink-0 tabular-nums text-sand-700">
              {d.value}{d.sub && <span className="ms-1 text-[10px] text-sand-500">{d.sub}</span>}
            </span>
          </div>
          <div className="mt-0.5 h-2 overflow-hidden rounded-full bg-sand-100">
            <div className="h-full rounded-full" style={{ width: `${(d.value / max) * 100}%`, background: accent }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function GenerationPyramid({ rows }: { rows: { gen: number; males: number; females: number }[] }) {
  const max = Math.max(...rows.flatMap((r) => [r.males, r.females]), 1);
  return (
    <div className="space-y-1.5">
      <div className="grid grid-cols-[42px_1fr_1fr] items-center gap-2 text-[10px] uppercase tracking-wide text-sand-500">
        <div></div>
        <div className="text-end">ذكور · Male</div>
        <div>إناث · Female</div>
      </div>
      {rows.map((r) => (
        <div key={r.gen} className="grid grid-cols-[42px_1fr_1fr] items-center gap-2 text-xs">
          <div className="text-sand-600">G{r.gen}</div>
          <div className="relative flex h-4 items-center justify-end">
            <div className="h-3 rounded-l-full bg-sand-500/80" style={{ width: `${(r.males / max) * 100}%` }} />
            <span className="absolute -end-0 me-1 text-[10px] tabular-nums text-sand-700">{r.males > 0 ? r.males : ""}</span>
          </div>
          <div className="relative flex h-4 items-center justify-start">
            <div className="h-3 rounded-r-full bg-rose-400/80" style={{ width: `${(r.females / max) * 100}%` }} />
            <span className="absolute -start-0 ms-1 text-[10px] tabular-nums text-rose-700">{r.females > 0 ? r.females : ""}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function StatusDonut({ living, deceased, unknown }: { living: number; deceased: number; unknown: number }) {
  const total = living + deceased + unknown || 1;
  const r = 38;
  const C = 2 * Math.PI * r;
  const seg = (n: number) => (n / total) * C;
  const livLen = seg(living);
  const decLen = seg(deceased);
  return (
    <svg viewBox="0 0 100 100" className="h-32 w-32" aria-label="Status breakdown">
      <circle cx="50" cy="50" r={r} fill="none" stroke="#e5e7eb" strokeWidth="14" />
      <circle cx="50" cy="50" r={r} fill="none" stroke="#16a34a" strokeWidth="14"
        strokeDasharray={`${livLen} ${C}`} transform="rotate(-90 50 50)" />
      <circle cx="50" cy="50" r={r} fill="none" stroke="#475569" strokeWidth="14"
        strokeDasharray={`${decLen} ${C}`} strokeDashoffset={-livLen}
        transform="rotate(-90 50 50)" />
      <text x="50" y="50" textAnchor="middle" dominantBaseline="middle" fill="#3b2a10" fontSize="14">{total}</text>
    </svg>
  );
}

function NamingHeatmap({ names, gens, matrix, locale }: {
  names: string[]; gens: number[]; matrix: number[][]; locale: "ar" | "en";
}) {
  const max = Math.max(1, ...matrix.flat());
  const ar = locale === "ar";
  if (names.length === 0) {
    return <div className="rounded-xl border border-dashed border-sand-200 p-4 text-center text-xs text-sand-500">{ar ? "لا توجد بيانات بعد." : "No data yet."}</div>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border-collapse text-xs">
        <thead>
          <tr>
            <th className="sticky start-0 z-10 bg-white px-2 py-1 text-start font-medium text-sand-600"></th>
            {gens.map((g) => (
              <th key={g} className="px-2 py-1 font-medium text-sand-600">G{g}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {names.map((name, i) => (
            <tr key={name}>
              <td className="sticky start-0 z-10 whitespace-nowrap bg-white px-2 py-1 text-end font-medium text-sand-800">{name}</td>
              {gens.map((g, j) => {
                const v = matrix[i][j] ?? 0;
                const alpha = v ? Math.max(0.08, v / max) : 0;
                return (
                  <td key={g} className="border border-sand-100 p-0">
                    <div
                      className="grid h-7 w-9 place-items-center tabular-nums"
                      style={{
                        backgroundColor: `rgba(27, 73, 101, ${alpha})`,
                        color: alpha > 0.55 ? "white" : "#3b2a10",
                      }}
                    >
                      {v || ""}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SaudiMap({ cityHits, locale }: { cityHits: { city: string; count: number; x: number; y: number }[]; locale: "ar" | "en" }) {
  const ar = locale === "ar";
  if (cityHits.length === 0) {
    return <div className="rounded-xl border border-dashed border-sand-200 p-4 text-center text-xs text-sand-500">{ar ? "لا توجد بيانات موقع متطابقة بعد." : "No matched location data yet."}</div>;
  }
  const max = Math.max(...cityHits.map((c) => c.count), 1);
  // Simplified Arabian Peninsula outline (viewBox 100×130).
  const peninsulaPath =
    "M 10 18 L 30 12 L 55 10 L 75 13 L 88 18 L 95 26 L 96 36 L 90 48 L 95 56 L 92 66 L 86 76 L 80 88 L 70 102 L 58 116 L 45 124 L 30 122 L 18 110 L 8 92 L 5 70 L 8 50 L 6 30 Z";
  return (
    <svg viewBox="0 0 100 130" className="block w-full max-w-md" aria-label={ar ? "خريطة المملكة" : "Arabian Peninsula map"}>
      <path d={peninsulaPath} fill="#fbf7f0" stroke="#dcbb7c" strokeWidth="0.5" />
      {cityHits.map((c) => {
        const r = 1.4 + Math.sqrt(c.count / max) * 3.2;
        return (
          <g key={c.city}>
            <circle cx={c.x} cy={c.y} r={r} fill="#1b4965" opacity={0.75} />
            <text
              x={c.x}
              y={c.y - r - 1.2}
              textAnchor="middle"
              fontSize="2.4"
              fill="#3b2a10"
            >
              {c.city} · {c.count}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function ExpandableSection({ title, count, locale, items, renderItem, emptyMessage }: {
  title: string;
  count: number;
  locale: "ar" | "en";
  items: MarriagePair[];
  renderItem: (p: MarriagePair, locale: "ar" | "en") => React.ReactNode;
  emptyMessage?: string;
}) {
  const ar = locale === "ar";
  return (
    <details className="group rounded-2xl border border-sand-200 bg-white/80 shadow-soft open:bg-sand-50/40">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 p-5">
        <div>
          <div className="text-xs uppercase tracking-wide text-sand-600">{title}</div>
          <div className="mt-2 font-display text-2xl text-sand-900">{count}</div>
        </div>
        <span className="text-sand-400 transition group-open:rotate-180">▾</span>
      </summary>
      <div className="border-t border-sand-200 p-5">
        {items.length === 0 ? (
          <div className="text-xs text-sand-500">{emptyMessage ?? (ar ? "لا توجد عناصر." : "Nothing here.")}</div>
        ) : (
          <ul className="space-y-1.5">
            {items.map((p, i) => (
              <li key={i} className="rounded-xl border border-sand-100 bg-white px-3 py-2 text-sm">
                {renderItem(p, locale)}
              </li>
            ))}
          </ul>
        )}
      </div>
    </details>
  );
}

// --- page ------------------------------------------------------------------

export default async function InsightsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ fromGen?: string; toGen?: string }>;
}) {
  const { locale: rawLocale } = await params;
  if (!isLocale(rawLocale)) notFound();
  const locale = rawLocale as Locale;
  const t = getDictionary(locale);
  const ar = locale === "ar";

  const { people, relationships } = await loadTree();

  // Build the FULL parentsOf map first (used by cousin detection regardless of filter).
  const parentsOfFull = new Map<string, string[]>();
  for (const r of relationships) {
    if (r.type !== "parent_of") continue;
    const list = parentsOfFull.get(r.toId) ?? [];
    list.push(r.fromId);
    parentsOfFull.set(r.toId, list);
  }

  const allGens = people.map((p) => p.generation ?? 0);
  const minGenAll = allGens.length ? Math.min(...allGens) : 0;
  const maxGenAll = allGens.length ? Math.max(...allGens) : 0;

  // Parse the TimeMachine search params, clamping to the actual gen range.
  const sp = await searchParams;
  const fromGenRaw = sp.fromGen ? parseInt(sp.fromGen, 10) : NaN;
  const toGenRaw = sp.toGen ? parseInt(sp.toGen, 10) : NaN;
  const fromGen = Number.isFinite(fromGenRaw)
    ? Math.max(minGenAll, Math.min(maxGenAll, fromGenRaw))
    : minGenAll;
  const toGen = Number.isFinite(toGenRaw)
    ? Math.max(fromGen, Math.min(maxGenAll, toGenRaw))
    : maxGenAll;
  const isFiltered = fromGen !== minGenAll || toGen !== maxGenAll;

  // Apply the filter.
  const filteredPeople = isFiltered
    ? people.filter((p) => {
        const g = p.generation ?? 0;
        return g >= fromGen && g <= toGen;
      })
    : people;
  const filteredIds = new Set(filteredPeople.map((p) => p.id));
  const filteredRels = isFiltered
    ? relationships.filter((r) => filteredIds.has(r.fromId) && filteredIds.has(r.toId))
    : relationships;

  const s = computeStats(filteredPeople, filteredRels, parentsOfFull, people);

  const num = (n: number) => n.toLocaleString(locale === "ar" ? "ar-EG" : "en-US");
  const pct = (n: number) => `${(n * 100).toFixed(0)}%`;

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
    { label: t.insights.cards.mostConnected, value: nameOf(s.mostConnected, locale) },
    { label: t.insights.cards.deepestGen, value: `G${s.deepestGen}` },
    ...(s.oldest
      ? [{ label: t.insights.cards.oldestLiving, value: nameOf(s.oldest, locale), sub: String(s.oldest.birthYear) }]
      : []),
    { label: ar ? "حالات تعدد الزواج" : "Polygamous marriages", value: num(s.multiSpouseCount), sub: ar ? "شخص لديه أكثر من زوج/ـة" : "people with 2+ spouses" },
    { label: ar ? "روابط الرضاعة" : "Milk-sibling pairs", value: num(s.milkSiblingPairs) },
    { label: ar ? "العائلات المصاهرة" : "In-law families", value: num(s.inLawFamilies.length), sub: ar ? "عائلات أخرى دخلت بالمصاهرة" : "external families joined by marriage" },
    { label: ar ? "إجمالي الزيجات" : "Total marriages", value: num(s.totalSpouseLinks) },
    { label: ar ? "نسبة الزواج الداخلي" : "Endogamy rate", value: pct(s.endogamyRate), sub: ar ? "زواج داخل عائلة البطاطي" : "both spouses Al-Batati" },
  ];

  const renderMarriagePair = (p: MarriagePair, loc: "ar" | "en") => (
    <div className="flex items-center justify-between gap-2">
      <span className="truncate text-sand-800">{nameOf(p.a, loc)}</span>
      <span className="shrink-0 text-xs text-sand-500">↔</span>
      <span className="truncate text-sand-800">{nameOf(p.b, loc)}</span>
    </div>
  );
  const renderInLawPair = (pair: { batati: Person; inLaw: Person; family: string }, loc: "ar" | "en") => (
    <div className="flex items-center justify-between gap-2">
      <span className="truncate text-sand-800">{nameOf(pair.batati, loc)}</span>
      <span className="shrink-0 text-xs text-sand-500">×</span>
      <span className="truncate text-sand-800">
        {nameOf(pair.inLaw, loc)}
        <span className="ms-2 rounded-full bg-sand-100 px-2 py-0.5 text-[10px] text-sand-700">{pair.family}</span>
      </span>
    </div>
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <h1 className="font-display text-3xl text-sand-900 sm:text-4xl">{t.insights.title}</h1>
      <p className="mt-2 text-sand-700">{t.insights.subtitle}</p>

      {/* — Time machine — */}
      <div className="mt-6">
        <TimeMachine
          minGen={minGenAll}
          maxGen={maxGenAll}
          defaultFrom={fromGen}
          defaultTo={toGen}
          locale={locale}
        />
        {isFiltered && (
          <div className="mt-2 text-[11px] text-sand-500">
            {ar
              ? `يعرض الإحصاءات للأجيال G${fromGen}–G${toGen} فقط (${num(s.totalPeople)} شخصاً من أصل ${num(people.length)}).`
              : `Showing stats for generations G${fromGen}–G${toGen} only (${num(s.totalPeople)} people of ${num(people.length)}).`}
          </div>
        )}
      </div>

      {/* — KPI grid — */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <div key={c.label} className="rounded-2xl border border-sand-200 bg-white/80 p-5 shadow-soft">
            <div className="text-xs uppercase tracking-wide text-sand-600">{c.label}</div>
            <div className="mt-2 truncate font-display text-2xl text-sand-900" title={c.value}>{c.value}</div>
            {c.sub && <div className="mt-1 text-xs text-sand-600">{c.sub}</div>}
          </div>
        ))}
      </div>

      {/* — Consanguinity click-throughs — */}
      <section className="mt-10">
        <h2 className="font-display text-xl text-sand-900">
          {ar ? "زواج الأقارب" : "Consanguineous marriages"}
        </h2>
        <p className="mt-1 text-xs text-sand-600">
          {ar
            ? "اضغط على أي بطاقة لرؤية القائمة التفصيلية."
            : "Click any card to expand the detailed pair list."}
        </p>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <ExpandableSection
            title={ar ? "زواج بين أبناء العم/الخال (الدرجة الأولى)" : "First-cousin marriages"}
            count={s.cousinMarriages}
            locale={locale}
            items={s.cousinMarriagePairs}
            renderItem={renderMarriagePair}
          />
          <ExpandableSection
            title={ar ? "زواج بين أبناء العم (الدرجة الثانية)" : "Second-cousin marriages"}
            count={s.secondCousinMarriages}
            locale={locale}
            items={s.secondCousinPairs}
            renderItem={renderMarriagePair}
          />
          <ExpandableSection
            title={ar ? "زواج العم الأكبر / عمة" : "Great-uncle / great-aunt marriages"}
            count={s.greatUncleMarriages}
            locale={locale}
            items={s.greatUnclePairs}
            renderItem={renderMarriagePair}
          />
        </div>
      </section>

      {/* — Generation pyramid — */}
      <section className="mt-10">
        <h2 className="font-display text-xl text-sand-900">{ar ? "هرم الأجيال (ذكور / إناث)" : "Generation pyramid (male / female)"}</h2>
        <p className="mt-1 text-xs text-sand-600">{ar ? "توزيع أفراد كل جيل حسب الجنس." : "Distribution per generation by gender."}</p>
        <div className="mt-4 rounded-2xl border border-sand-200 bg-white/80 p-5 shadow-soft">
          <GenerationPyramid rows={s.genTable} />
        </div>
      </section>

      {/* — Top names / family size / status — */}
      <section className="mt-10 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-sand-200 bg-white/80 p-5 shadow-soft">
          <h3 className="font-display text-sand-900">{ar ? "أكثر 10 أسماء شيوعاً" : "Top 10 names"}</h3>
          <p className="text-xs text-sand-600">{ar ? "نُحسب على الاسم بالعربي فقط." : "Counted on the Arabic name."}</p>
          <div className="mt-3"><BarChart data={s.topNames.map((n) => ({ label: n.name, value: n.count }))} accent="#1b4965" /></div>
        </div>
        <div className="rounded-2xl border border-sand-200 bg-white/80 p-5 shadow-soft">
          <h3 className="font-display text-sand-900">{ar ? "توزيع حجم الأسر" : "Family-size distribution"}</h3>
          <p className="text-xs text-sand-600">{ar ? "كم من الآباء لديهم N من الأبناء؟" : "How many parents have N children?"}</p>
          <div className="mt-3"><BarChart data={s.familySizeBuckets.map((b) => ({ label: ar ? `${b.size} أبناء` : `${b.size} kid${b.size === 1 ? "" : "s"}`, value: b.count }))} accent="#2e7d4f" /></div>
        </div>
        <div className="rounded-2xl border border-sand-200 bg-white/80 p-5 shadow-soft">
          <h3 className="font-display text-sand-900">{ar ? "الحالة" : "Living status"}</h3>
          <p className="text-xs text-sand-600">{ar ? "حسب الحقل status." : "By status field."}</p>
          <div className="mt-3 flex items-center gap-4">
            <StatusDonut living={s.statusBreakdown.living} deceased={s.statusBreakdown.deceased} unknown={s.statusBreakdown.unknown} />
            <ul className="space-y-1 text-xs">
              <li className="flex items-center gap-2"><span className="inline-block h-3 w-3 rounded-full" style={{ background: "#16a34a" }} />{ar ? "أحياء" : "Living"} · <span className="font-medium">{num(s.statusBreakdown.living)}</span></li>
              <li className="flex items-center gap-2"><span className="inline-block h-3 w-3 rounded-full" style={{ background: "#475569" }} />{ar ? "متوفون" : "Deceased"} · <span className="font-medium">{num(s.statusBreakdown.deceased)}</span></li>
              <li className="flex items-center gap-2"><span className="inline-block h-3 w-3 rounded-full" style={{ background: "#e5e7eb" }} />{ar ? "غير معروف" : "Unknown"} · <span className="font-medium">{num(s.statusBreakdown.unknown)}</span></li>
            </ul>
          </div>
        </div>
      </section>

      {/* — Naming heatmap — */}
      <section className="mt-10 rounded-2xl border border-sand-200 bg-white/80 p-5 shadow-soft">
        <h3 className="font-display text-sand-900">{ar ? "خريطة الأسماء عبر الأجيال" : "Names across generations"}</h3>
        <p className="text-xs text-sand-600">{ar ? "أكثر 10 أسماء، وكم مرة تكرر كل منها في كل جيل. الخلية الأغمق = تكرار أكبر." : "Top 10 names × generations. Darker cell = more occurrences."}</p>
        <div className="mt-3">
          <NamingHeatmap names={s.nameMatrix.names} gens={s.nameMatrix.gens} matrix={s.nameMatrix.matrix} locale={locale} />
        </div>
      </section>

      {/* — In-law families + multi-spouse — */}
      <section className="mt-10 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ExpandableSection
          title={ar ? "العائلات المصاهرة (الصِّهر)" : "In-law families (الصِّهر)"}
          count={s.inLawFamilies.length}
          locale={locale}
          items={s.inLawPairs.map((p) => ({ a: p.batati, b: p.inLaw }))}
          renderItem={(_pair, loc) => {
            const idx = s.inLawPairs.findIndex((q) => q.batati.id === _pair.a.id && q.inLaw.id === _pair.b.id);
            const pair = idx >= 0 ? s.inLawPairs[idx] : { batati: _pair.a, inLaw: _pair.b, family: "—" };
            return renderInLawPair(pair, loc);
          }}
          emptyMessage={ar ? "لا توجد مصاهرات موثقة بعد." : "No documented in-law marriages yet."}
        />
        <div className="rounded-2xl border border-sand-200 bg-white/80 p-5 shadow-soft">
          <h3 className="font-display text-sand-900">{ar ? "تعدد الزواج" : "Polygamy"}</h3>
          <p className="text-xs text-sand-600">{ar ? `${num(s.multiSpouseCount)} شخصاً موثقاً بأكثر من زواج. أعلى 5:` : `${num(s.multiSpouseCount)} people on record with more than one spouse. Top 5:`}</p>
          <ul className="mt-3 space-y-1.5">
            {s.multiSpouseTop.length === 0 && (<li className="rounded-xl border border-dashed border-sand-200 p-4 text-center text-xs text-sand-500">—</li>)}
            {s.multiSpouseTop.map((e) => (
              <li key={e.person.id} className="flex items-center justify-between rounded-xl border border-sand-100 bg-sand-50/60 px-3 py-2 text-sm">
                <span className="truncate text-sand-800">{nameOf(e.person, locale)}</span>
                <span className="text-xs tabular-nums text-sand-700">{e.count} {ar ? "زيجات" : "marriages"}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* — In-law families bar chart (summary alongside the expandable list) — */}
      {s.inLawFamilies.length > 0 && (
        <section className="mt-6 rounded-2xl border border-sand-200 bg-white/80 p-5 shadow-soft">
          <h3 className="font-display text-sand-900">{ar ? "أبرز العائلات المصاهرة" : "Top in-law families"}</h3>
          <p className="text-xs text-sand-600">{ar ? "العدد = عدد الزيجات الموثقة مع كل عائلة." : "Count = documented marriages per family."}</p>
          <div className="mt-3"><BarChart data={s.inLawFamilies.map((f) => ({ label: f.family, value: f.count }))} accent="#7b3f9e" /></div>
        </section>
      )}

      {/* — Milk siblings — */}
      <section className="mt-10">
        <ExpandableSection
          title={ar ? "إخوة الرضاعة" : "Milk siblings (إخوة الرضاعة)"}
          count={s.milkSiblingPairs}
          locale={locale}
          items={s.milkSiblingList}
          renderItem={renderMarriagePair}
          emptyMessage={ar ? "لا توجد روابط رضاعة موثقة بعد." : "No documented milk-sibling ties yet."}
        />
        <p className="mt-2 text-[11px] text-sand-500">
          {ar
            ? "في الإسلام، رابطة الرضاع تعتبر محرّمة كرابطة الدم."
            : "In Islam, milk-sibling ties create a marriage prohibition (محرّم) equivalent to a blood tie."}
        </p>
      </section>

      {/* — Locations bar chart — */}
      {s.topLocations.length > 0 && (
        <section className="mt-10 rounded-2xl border border-sand-200 bg-white/80 p-5 shadow-soft">
          <h3 className="font-display text-sand-900">{ar ? "الأماكن" : "Locations"}</h3>
          <p className="text-xs text-sand-600">{ar ? "أكثر الأماكن تكراراً في حقل الموقع." : "Most common values in the location field."}</p>
          <div className="mt-3"><BarChart data={s.topLocations.map((l) => ({ label: l.location, value: l.count }))} accent="#3d8c6e" /></div>
        </section>
      )}

      {/* — Saudi Arabia / Arabian Peninsula map — */}
      <section className="mt-10 rounded-2xl border border-sand-200 bg-white/80 p-5 shadow-soft">
        <h3 className="font-display text-sand-900">{ar ? "خريطة الانتشار" : "Geographic spread"}</h3>
        <p className="text-xs text-sand-600">
          {ar
            ? "تقريبية لأكبر المدن المذكورة في حقل الموقع. حجم النقطة يعكس العدد."
            : "Approximate map of cities mentioned in the location field. Dot size = count."}
        </p>
        <div className="mt-3 flex justify-center">
          <SaudiMap cityHits={s.cityHits} locale={locale} />
        </div>
      </section>

      {/* — Generation table — */}
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
