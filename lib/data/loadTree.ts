import { getServerSupabase } from "@/lib/supabase/server";
import { seedPeople, seedRelationships } from "@/lib/data/seed";
import type { Person, Relationship, RelationshipType, Gender, PersonStatus } from "@/lib/types";

export async function loadTree(): Promise<{ people: Person[]; relationships: Relationship[] }> {
  const sb = await getServerSupabase();
  if (!sb) return { people: seedPeople, relationships: seedRelationships };

  const [peopleRes, relsRes] = await Promise.all([
    sb.from("people").select("*").order("generation", { ascending: true }),
    sb.from("relationships").select("*"),
  ]);

  if (peopleRes.error || relsRes.error || !peopleRes.data?.length) {
    return { people: seedPeople, relationships: seedRelationships };
  }

  const people: Person[] = peopleRes.data.map((r) => ({
    id: r.id,
    nameAr: r.name_ar,
    nameEn: r.name_en ?? undefined,
    titleAr: r.title_ar ?? undefined,
    titleEn: r.title_en ?? undefined,
    gender: r.gender as Gender,
    birthYear: r.birth_year,
    deathYear: r.death_year,
    status: r.status as PersonStatus,
    location: r.location ?? undefined,
    occupationAr: r.occupation_ar ?? undefined,
    occupationEn: r.occupation_en ?? undefined,
    bioAr: r.bio_ar ?? undefined,
    bioEn: r.bio_en ?? undefined,
    photoUrl: r.photo_url ?? undefined,
    familyAr: r.family_ar ?? undefined,
    familyEn: r.family_en ?? undefined,
    generation: r.generation,
    externalFamilyId: r.external_family_id,
  }));

  const relationships: Relationship[] = relsRes.data.map((r) => ({
    id: r.id,
    type: r.type as RelationshipType,
    fromId: r.from_id,
    toId: r.to_id,
    startYear: r.start_year,
    endYear: r.end_year,
    notes: r.notes ?? undefined,
  }));

  return { people, relationships };
}
