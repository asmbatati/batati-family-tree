import { getServerSupabase } from "@/lib/supabase/server";
import { seedPeople, seedRelationships } from "@/lib/data/seed";
import type { Person, Relationship, RelationshipType, Gender, PersonStatus } from "@/lib/types";
import type { SupabaseClient } from "@supabase/supabase-js";

export type LoadTreeOptions = {
  /** When set (non-null), female persons' `nameAr` and `nameEn` are replaced
   *  with this placeholder string and `nameRedacted` is set to `true`. The
   *  rest of the row (id, gender, generation, relationships) stays intact. */
  maskFemaleAs?: string | null;
};

// PostgREST has a default response-row cap (1000 by default in Supabase).
// Past 1000 relationships you start losing rows silently — which manifested
// as "I added a spouse but the focus view doesn't show her" because the
// missing row was just over the limit. We page through everything to make
// sure no row is dropped.
const PAGE = 1000;
async function fetchAll<T = Record<string, unknown>>(
  sb: SupabaseClient,
  table: string,
  orderColumn?: string,
): Promise<{ data: T[] | null; error: { message: string } | null }> {
  const out: T[] = [];
  let offset = 0;
  for (;;) {
    let q = sb.from(table).select("*").range(offset, offset + PAGE - 1);
    if (orderColumn) q = q.order(orderColumn, { ascending: true });
    const res = await q;
    if (res.error) return { data: null, error: { message: res.error.message } };
    const rows = (res.data ?? []) as T[];
    out.push(...rows);
    if (rows.length < PAGE) break;
    offset += PAGE;
    // Safety stop so a broken pager can't infinite-loop.
    if (offset > 200_000) break;
  }
  return { data: out, error: null };
}

export async function loadTree(opts: LoadTreeOptions = {}): Promise<{ people: Person[]; relationships: Relationship[] }> {
  const sb = await getServerSupabase();
  if (!sb) return { people: applyMask(seedPeople, opts), relationships: seedRelationships };

  type PeopleRow = {
    id: string; name_ar: string; name_en: string | null;
    title_ar: string | null; title_en: string | null;
    gender: string; birth_year: number | null; death_year: number | null;
    status: string; location: string | null;
    occupation_ar: string | null; occupation_en: string | null;
    bio_ar: string | null; bio_en: string | null;
    photo_url: string | null; family_ar: string | null; family_en: string | null;
    generation: number | null; external_family_id: string | null;
    birth_order: number | null; phone: string | null; email: string | null; website: string | null;
  };
  type RelRow = {
    id: string; type: string; from_id: string; to_id: string;
    start_year: number | null; end_year: number | null;
    notes: string | null; marriage_order: number | null;
  };

  const [peopleRes, relsRes] = await Promise.all([
    fetchAll<PeopleRow>(sb, "people", "generation"),
    fetchAll<RelRow>(sb, "relationships"),
  ]);

  if (peopleRes.error || relsRes.error || !peopleRes.data?.length) {
    return { people: applyMask(seedPeople, opts), relationships: seedRelationships };
  }

  const mask = opts.maskFemaleAs ?? null;
  const people: Person[] = peopleRes.data.map((r) => {
    const redact = mask !== null && r.gender === "female";
    return {
      id: r.id,
      nameAr: redact ? (mask as string) : r.name_ar,
      nameEn: redact ? (mask as string) : (r.name_en ?? undefined),
      titleAr: r.title_ar ?? undefined,
      titleEn: r.title_en ?? undefined,
      gender: r.gender as Gender,
      birthYear: r.birth_year,
      deathYear: r.death_year,
      status: r.status as PersonStatus,
      location: redact ? undefined : (r.location ?? undefined),
      occupationAr: redact ? undefined : (r.occupation_ar ?? undefined),
      occupationEn: redact ? undefined : (r.occupation_en ?? undefined),
      bioAr: redact ? undefined : (r.bio_ar ?? undefined),
      bioEn: redact ? undefined : (r.bio_en ?? undefined),
      photoUrl: redact ? undefined : (r.photo_url ?? undefined),
      familyAr: r.family_ar ?? undefined,
      familyEn: r.family_en ?? undefined,
      generation: r.generation ?? undefined,
      externalFamilyId: r.external_family_id ?? undefined,
      birthOrder: r.birth_order ?? null,
      phone: redact ? undefined : (r.phone ?? undefined),
      email: redact ? undefined : (r.email ?? undefined),
      website: redact ? undefined : (r.website ?? undefined),
      nameRedacted: redact || undefined,
    };
  });

  const relationships: Relationship[] = (relsRes.data ?? []).map((r) => ({
    id: r.id,
    type: r.type as RelationshipType,
    fromId: r.from_id,
    toId: r.to_id,
    startYear: r.start_year,
    endYear: r.end_year,
    notes: r.notes ?? undefined,
    marriageOrder: r.marriage_order ?? null,
  }));

  return { people, relationships };
}

function applyMask(people: Person[], opts: LoadTreeOptions): Person[] {
  const mask = opts.maskFemaleAs ?? null;
  if (mask === null) return people;
  return people.map((p) =>
    p.gender === "female"
      ? { ...p, nameAr: mask, nameEn: mask, nameRedacted: true }
      : p,
  );
}
