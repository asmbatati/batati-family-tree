// Core domain types for the family-tree application.
// أنواع البيانات الأساسية لمنصة شجرة العائلة.

export type Gender = "male" | "female";

export type PersonStatus = "living" | "deceased" | "unknown";

export interface Person {
  id: string;
  /** Display name in Arabic — used as the primary label */
  nameAr: string;
  /** Display name in English (transliteration) */
  nameEn?: string;
  /** Optional honorific/title — e.g. الشيخ, د. */
  titleAr?: string;
  titleEn?: string;
  gender: Gender;
  birthYear?: number | null;
  deathYear?: number | null;
  status: PersonStatus;
  location?: string;
  occupationAr?: string;
  occupationEn?: string;
  bioAr?: string;
  bioEn?: string;
  photoUrl?: string;
  /** Family surname/branch — most will be "Al-Batati" but spouses may carry their own */
  familyAr?: string;
  familyEn?: string;
  /** Generation index — used for the layered tree (0 = founder/eldest) */
  generation?: number;
  /** Foreign family reference — if this person belongs primarily to another family
   *  (e.g. an in-law), this points to a separate Tree document/identifier. */
  externalFamilyId?: string | null;
  sources?: string[]; // ids of source records
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Relationship types. Each has a canonical direction:
 *   parent_of(A,B) means A is the parent of B.
 *   spouse_of, sibling_of, milk_sibling_of are symmetric — direction not meaningful.
 */
export type RelationshipType =
  | "parent_of"
  | "spouse_of"
  | "sibling_of"
  | "milk_sibling_of"
  | "uncle_paternal_of" // فلان عم فلان
  | "uncle_maternal_of" // خال
  | "aunt_paternal_of"  // عمة
  | "aunt_maternal_of"  // خالة
  | "cousin_of"
  | "guardian_of"
  | "other";

export interface Relationship {
  id: string;
  type: RelationshipType;
  fromId: string;
  toId: string;
  /** Optional metadata */
  startYear?: number | null;
  endYear?: number | null;
  notes?: string;
  sources?: string[];
}

export interface SourceRef {
  id: string;
  titleAr: string;
  titleEn?: string;
  author?: string;
  year?: number;
  type: "book" | "document" | "oral" | "online" | "other";
  url?: string;
  notes?: string;
}

export type FamilyEventType = "wedding" | "birth" | "death" | "gathering" | "other";

export interface FamilyEvent {
  id: string;
  type: FamilyEventType;
  titleAr: string;
  titleEn?: string;
  date: string; // ISO date
  location?: string;
  personIds?: string[];
  descriptionAr?: string;
  descriptionEn?: string;
}

/** Layer identifiers used by the tree visualization */
export const TREE_LAYERS = ["men", "women", "spouses", "milk", "extended"] as const;
export type TreeLayer = (typeof TREE_LAYERS)[number];

/** Relationship → visual style mapping */
export const RELATIONSHIP_STYLE: Record<
  RelationshipType,
  { color: string; icon: string; labelKey: string }
> = {
  parent_of:         { color: "#1b4965", icon: "branch",   labelKey: "tree.relations.father" },
  spouse_of:         { color: "#d4a017", icon: "rings",    labelKey: "tree.relations.spouse" },
  sibling_of:        { color: "#b3261e", icon: "blood",    labelKey: "tree.relations.brother" },
  milk_sibling_of:   { color: "#e9d8b8", icon: "milk",     labelKey: "tree.relations.milk" },
  uncle_paternal_of: { color: "#2e7d4f", icon: "leaf",     labelKey: "tree.relations.uncleP" },
  uncle_maternal_of: { color: "#3d8c6e", icon: "leaf",     labelKey: "tree.relations.uncleM" },
  aunt_paternal_of:  { color: "#7b3f9e", icon: "leaf",     labelKey: "tree.relations.auntP" },
  aunt_maternal_of:  { color: "#9358b8", icon: "leaf",     labelKey: "tree.relations.auntM" },
  cousin_of:         { color: "#666666", icon: "dot",      labelKey: "tree.relations.cousin" },
  guardian_of:       { color: "#4a4a4a", icon: "shield",   labelKey: "tree.relations.father" },
  other:             { color: "#999999", icon: "dot",      labelKey: "tree.relations.cousin" }
};
