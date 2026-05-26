import { getServerSupabase } from "@/lib/supabase/server";
import { seedPeople, seedRelationships } from "@/lib/data/seed";
import type { Person, Relationship, RelationshipType, Gender, PersonStatus } from "@/lib/types";

export type LoadTreeOptions = {
  /** When set (non-null), female persons' `nameAr` and `nameEn` are replaced
   *  with this placeholder string and `nameRedacted` is set to `true`. The
   *  rest of the row (id, gender, generation, relationships) stays intact. */
  maskFemaleAs?: string | null;
};

export async function loadTree(opts: LoadTreeOptions = {}): Promise<{ people: Person[]; relationships: Relationship[] }> {
  const sb = await getServerSupabase();
  if (!sb) return { people: applyMask(seedPeople, opts), relationships: seedRelationships };

  const [peopleRes, relsRes] = await Promise.all([
    sb.from("people").select("*").order("generation", { ascending: true }),
    sb.from("relationships").select("*"),
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
      generation: r.generation,
      externalFamilyId: r.external_family_id,
      birthOrder: r.birth_order ?? null,
      phone: redact ? undefined : (r.phone ?? undefined),
      email: redact ? undefined : (r.email ?? undefined),
      website: redact ? undefined : (r.website ?? undefined),
      nameRedacted: redact || undefined,
    };
  });

  const relationships: Relationship[] = relsRes.data.map((r) => ({
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
