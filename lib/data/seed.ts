import type { FamilyEvent, Person, Relationship, SourceRef } from "@/lib/types";

/**
 * Sample seed data for the Al-Batati family.
 * This is a placeholder dataset so the UI shows something meaningful out of the box.
 * Once Supabase is connected, this seed is used as a fallback when no env keys are present.
 *
 * بيانات تجريبية لعائلة البطاطي. عند ربط Supabase تستبدل تلقائياً ببيانات حقيقية.
 */

export const seedPeople: Person[] = [
  // Generation 0 — founder
  { id: "p1",  nameAr: "محمد البطاطي", nameEn: "Mohammed Al-Batati", gender: "male",   generation: 0, birthYear: 1900, deathYear: 1975, status: "deceased", familyAr: "البطاطي", familyEn: "Al-Batati", bioAr: "الجد الأكبر للعائلة." },

  // Generation 1 — children of p1
  { id: "p2",  nameAr: "أحمد بن محمد", nameEn: "Ahmad Al-Batati",   gender: "male",   generation: 1, birthYear: 1925, deathYear: 1998, status: "deceased", familyAr: "البطاطي" },
  { id: "p3",  nameAr: "علي بن محمد",  nameEn: "Ali Al-Batati",     gender: "male",   generation: 1, birthYear: 1928, deathYear: 2002, status: "deceased", familyAr: "البطاطي" },
  { id: "p4",  nameAr: "فاطمة بنت محمد", nameEn: "Fatimah Al-Batati", gender: "female", generation: 1, birthYear: 1930, deathYear: 2010, status: "deceased", familyAr: "البطاطي" },

  // Spouses of generation 1 (from other families)
  { id: "p2s", nameAr: "نورة الفلانية", nameEn: "Noura Al-Falani",   gender: "female", generation: 1, birthYear: 1930, status: "deceased", familyAr: "آل فلان", familyEn: "Al-Falani", externalFamilyId: "fam-falani" },
  { id: "p3s", nameAr: "هند العتيبية", nameEn: "Hind Al-Otaibi",     gender: "female", generation: 1, birthYear: 1935, status: "deceased", familyAr: "العتيبي", familyEn: "Al-Otaibi", externalFamilyId: "fam-otaibi" },
  { id: "p4s", nameAr: "خالد القحطاني",  nameEn: "Khaled Al-Qahtani", gender: "male",   generation: 1, birthYear: 1928, status: "deceased", familyAr: "القحطاني", familyEn: "Al-Qahtani", externalFamilyId: "fam-qahtani" },

  // Generation 2 — children of Ahmad (p2 + p2s)
  { id: "p5",  nameAr: "عبدالله بن أحمد", nameEn: "Abdullah Al-Batati", gender: "male", generation: 2, birthYear: 1955, status: "living", familyAr: "البطاطي" },
  { id: "p6",  nameAr: "سعد بن أحمد",    nameEn: "Saad Al-Batati",      gender: "male", generation: 2, birthYear: 1958, status: "living", familyAr: "البطاطي" },
  { id: "p7",  nameAr: "منى بنت أحمد",   nameEn: "Mona Al-Batati",      gender: "female", generation: 2, birthYear: 1962, status: "living", familyAr: "البطاطي" },

  // Generation 2 — children of Ali (p3 + p3s)
  { id: "p8",  nameAr: "فهد بن علي",     nameEn: "Fahad Al-Batati",     gender: "male", generation: 2, birthYear: 1960, status: "living", familyAr: "البطاطي" },
  { id: "p9",  nameAr: "ريم بنت علي",    nameEn: "Reem Al-Batati",      gender: "female", generation: 2, birthYear: 1965, status: "living", familyAr: "البطاطي" },

  // Generation 2 spouses
  { id: "p5s", nameAr: "سارة الشمري",   nameEn: "Sara Al-Shammari",   gender: "female", generation: 2, birthYear: 1958, status: "living", familyAr: "الشمري", familyEn: "Al-Shammari", externalFamilyId: "fam-shammari" },

  // Generation 3 — children of Abdullah (p5 + p5s)
  { id: "p10", nameAr: "ياسر بن عبدالله", nameEn: "Yaser Al-Batati",   gender: "male",   generation: 3, birthYear: 1985, status: "living", familyAr: "البطاطي" },
  { id: "p11", nameAr: "ليلى بنت عبدالله", nameEn: "Layla Al-Batati",  gender: "female", generation: 3, birthYear: 1988, status: "living", familyAr: "البطاطي" },
  { id: "p12", nameAr: "نواف بن عبدالله", nameEn: "Nawaf Al-Batati",   gender: "male",   generation: 3, birthYear: 1992, status: "living", familyAr: "البطاطي" }
];

export const seedRelationships: Relationship[] = [
  // Gen 0 → Gen 1 (parent_of)
  { id: "r1", type: "parent_of", fromId: "p1", toId: "p2" },
  { id: "r2", type: "parent_of", fromId: "p1", toId: "p3" },
  { id: "r3", type: "parent_of", fromId: "p1", toId: "p4" },

  // Gen 1 spouses
  { id: "r4", type: "spouse_of", fromId: "p2", toId: "p2s" },
  { id: "r5", type: "spouse_of", fromId: "p3", toId: "p3s" },
  { id: "r6", type: "spouse_of", fromId: "p4", toId: "p4s" },

  // Gen 1 siblings (auto: children of p1)
  { id: "r7", type: "sibling_of", fromId: "p2", toId: "p3" },
  { id: "r8", type: "sibling_of", fromId: "p2", toId: "p4" },
  { id: "r9", type: "sibling_of", fromId: "p3", toId: "p4" },

  // Gen 1 → Gen 2
  { id: "r10", type: "parent_of", fromId: "p2",  toId: "p5" },
  { id: "r11", type: "parent_of", fromId: "p2s", toId: "p5" },
  { id: "r12", type: "parent_of", fromId: "p2",  toId: "p6" },
  { id: "r13", type: "parent_of", fromId: "p2s", toId: "p6" },
  { id: "r14", type: "parent_of", fromId: "p2",  toId: "p7" },
  { id: "r15", type: "parent_of", fromId: "p2s", toId: "p7" },
  { id: "r16", type: "parent_of", fromId: "p3",  toId: "p8" },
  { id: "r17", type: "parent_of", fromId: "p3s", toId: "p8" },
  { id: "r18", type: "parent_of", fromId: "p3",  toId: "p9" },
  { id: "r19", type: "parent_of", fromId: "p3s", toId: "p9" },

  // Gen 2 siblings
  { id: "r20", type: "sibling_of", fromId: "p5", toId: "p6" },
  { id: "r21", type: "sibling_of", fromId: "p5", toId: "p7" },
  { id: "r22", type: "sibling_of", fromId: "p6", toId: "p7" },
  { id: "r23", type: "sibling_of", fromId: "p8", toId: "p9" },

  // Cousins (Gen 2 cross-branch)
  { id: "r24", type: "cousin_of", fromId: "p5", toId: "p8" },
  { id: "r25", type: "cousin_of", fromId: "p5", toId: "p9" },
  { id: "r26", type: "cousin_of", fromId: "p6", toId: "p8" },
  { id: "r27", type: "cousin_of", fromId: "p7", toId: "p9" },

  // Gen 2 spouse
  { id: "r28", type: "spouse_of", fromId: "p5", toId: "p5s" },

  // Gen 2 → Gen 3
  { id: "r29", type: "parent_of", fromId: "p5",  toId: "p10" },
  { id: "r30", type: "parent_of", fromId: "p5s", toId: "p10" },
  { id: "r31", type: "parent_of", fromId: "p5",  toId: "p11" },
  { id: "r32", type: "parent_of", fromId: "p5s", toId: "p11" },
  { id: "r33", type: "parent_of", fromId: "p5",  toId: "p12" },
  { id: "r34", type: "parent_of", fromId: "p5s", toId: "p12" },

  // Gen 3 siblings
  { id: "r35", type: "sibling_of", fromId: "p10", toId: "p11" },
  { id: "r36", type: "sibling_of", fromId: "p10", toId: "p12" },
  { id: "r37", type: "sibling_of", fromId: "p11", toId: "p12" },

  // Example milk-sibling relationship (across families)
  { id: "r38", type: "milk_sibling_of", fromId: "p10", toId: "p8" }
];

export const seedSources: SourceRef[] = [
  { id: "s1", titleAr: "نسب عائلة البطاطي — رواية شفوية", titleEn: "Al-Batati Lineage — Oral History", author: "الجد محمد", year: 1970, type: "oral" },
  { id: "s2", titleAr: "وثيقة شجرة عائلية", titleEn: "Family-tree document", author: "—", year: 1985, type: "document" }
];

export const seedEvents: FamilyEvent[] = [
  { id: "e1", type: "wedding", titleAr: "زفاف ياسر", titleEn: "Yaser's wedding", date: "2026-09-15", location: "الرياض", personIds: ["p10"], descriptionAr: "حفل زفاف ياسر بن عبدالله." },
  { id: "e2", type: "gathering", titleAr: "لمّة العيد", titleEn: "Eid family gathering", date: "2026-06-15", location: "جدة" },
  { id: "e3", type: "birth", titleAr: "مولود جديد", titleEn: "New baby", date: "2026-03-04", location: "—" }
];
