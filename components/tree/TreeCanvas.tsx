"use client";

import { useMemo, useRef, useState } from "react";
import type { Person, Relationship, TreeLayer } from "@/lib/types";
import { RELATIONSHIP_STYLE } from "@/lib/types";
import { computeRelationshipsFor, siblingOrderCompare, styleForRel, type RelationshipEntry } from "@/lib/relationships";
import PersonNode from "./PersonNode";
import LayerToggle from "./LayerToggle";
import PersonProfile from "./PersonProfile";
import CollapsibleTree from "./CollapsibleTree";
import ViewModeToggle, { type ViewMode } from "./ViewModeToggle";
import TreeSearch from "./TreeSearch";
import FocusFilters, { DEFAULT_FOCUS_FILTERS, type FocusFilterState, type FocusFilterKey } from "./FocusFilters";
import AddRelativeForm from "./AddRelativeForm";
import { getRelationshipIcon, PlusIcon } from "@/components/icons";

type RelativeKey =
  | "father" | "mother"
  | "son" | "daughter"
  | "brother" | "sister"
  | "spouse" | "milk"
  | "uncleP" | "uncleM"
  | "auntP" | "auntM";

type Dict = {
  layers: { title: string; men: string; women: string; spouses: string; milk: string; extended: string };
  focus: {
    title: string;
    hint: string;
    clear: string;
    filters: {
      title: string;
      parents: string;
      children: string;
      siblings: string;
      spouses: string;
      milk: string;
      extended: string;
      females: string;
    };
  };
  views: { tree: string; focus: string; layers: string; focusEmpty: string };
  search: { placeholder: string; noResults: string; results: string };
  actions: { expandAll: string; collapseAll: string; focusOn: string };
  relations: Record<string, string>;
  add: {
    title: string;
    choose: string;
    save: string;
    cancel: string;
    nameArLabel: string;
    nameEnLabel: string;
    saving: string;
    notEditor: string;
    forPerson: string;
    modeNew: string;
    modeExisting: string;
    pickExisting: string;
    pickExistingHint: string;
    autoSpouseHint: string;
    duplicateError: string;
    siblingsStepTitle: string;
    siblingsStepHint: string;
    skip: string;
    noSiblings: string;
    placeholderFather: string;
    placeholderMother: string;
    placeholderSpouse: string;
    linkStep: {
      titleSiblings: string;  hintSiblings: string;  emptySiblings: string;
      titleChildren: string;  hintChildren: string;  emptyChildren: string;
      titleParents: string;   hintParents: string;   emptyParents: string;
      titleSpouses: string;   hintSpouses: string;   emptySpouses: string;
      alsoSetMother: string;
      alsoSetFather: string;
    };
  };
};

const EXTENDED_TYPES = new Set([
  "uncle_paternal_of",
  "uncle_maternal_of",
  "aunt_paternal_of",
  "aunt_maternal_of",
  "cousin_of",
]);

type Props = {
  people: Person[];
  relationships: Relationship[];
  locale: "ar" | "en";
  isEditor: boolean;
  treeDict: Dict;
  personDict: {
    profile: string;
    born: string;
    died: string;
    location: string;
    occupation: string;
    bio: string;
    relationships: string;
    addRelative: string;
    edit: string;
    close: string;
    phone: string;
    email: string;
    website: string;
    contact: string;
  };
};

/** Decide which layer a person belongs to (for visibility filtering). */
function personLayer(p: Person): TreeLayer {
  if (p.externalFamilyId) return "spouses";
  return p.gender === "male" ? "men" : "women";
}

export default function TreeCanvas({ people, relationships, locale, isEditor, treeDict, personDict }: Props) {
  const [viewMode, setViewMode] = useState<ViewMode>("tree");
  const [active, setActive] = useState<Record<TreeLayer, boolean>>({
    men: true, women: true, spouses: true, milk: true, extended: true,
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [focusFilters, setFocusFilters] = useState<FocusFilterState>(DEFAULT_FOCUS_FILTERS);
  const [pendingAdd, setPendingAdd] = useState<RelativeKey | null>(null);
  const toggleFocus = (k: FocusFilterKey) => setFocusFilters((s) => ({ ...s, [k]: !s[k] }));

  const toggle = (k: TreeLayer) => setActive((s) => ({ ...s, [k]: !s[k] }));

  const peopleById = useMemo(() => new Map(people.map((p) => [p.id, p])), [people]);
  const selected = selectedId ? peopleById.get(selectedId) ?? null : null;

  // Search results (used by TreeSearch counter; CollapsibleTree does its own matching).
  const searchMatches = useMemo(() => {
    const q = search.trim();
    if (!q) return [];
    const lower = q.toLowerCase();
    return people.filter(
      (p) => p.nameAr.includes(q) || (p.nameEn?.toLowerCase().includes(lower) ?? false),
    );
  }, [search, people]);

  const isVisible = (p: Person) => active[personLayer(p)];

  const generations = useMemo(() => {
    const map = new Map<number, Person[]>();
    for (const p of people) {
      const g = p.generation ?? 0;
      if (!map.has(g)) map.set(g, []);
      map.get(g)!.push(p);
    }
    return Array.from(map.entries()).sort((a, b) => a[0] - b[0]);
  }, [people]);

  // Build focus-view relationships when a person is selected. Uses the shared
  // helper (which also surfaces implicit siblings), then applies the focus
  // filters owned by FocusFilters above.
  const focusRels = useMemo<RelationshipEntry[]>(() => {
    if (!selected) return [];
    const all = computeRelationshipsFor(selected, peopleById, relationships);
    return all.filter(({ r, isFrom, other }) => {
      if (!focusFilters.females && other.gender === "female") return false;
      if (r.type === "parent_of") return isFrom ? focusFilters.children : focusFilters.parents;
      if (r.type === "sibling_of") return focusFilters.siblings;
      if (r.type === "spouse_of") return focusFilters.spouses;
      if (r.type === "milk_sibling_of") return focusFilters.milk;
      if (EXTENDED_TYPES.has(r.type)) return focusFilters.extended;
      return true;
    });
  }, [selected, relationships, peopleById, focusFilters]);

  return (
    <div className="space-y-6">
      {/* Top controls: view toggle + search */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <ViewModeToggle
          mode={viewMode}
          onChange={setViewMode}
          labels={treeDict.views}
          focusDisabled={!selected}
        />
        <TreeSearch
          value={search}
          onChange={setSearch}
          placeholder={treeDict.search.placeholder}
          resultsCount={search ? searchMatches.length : undefined}
          resultsLabel={treeDict.search.results}
          noResultsLabel={treeDict.search.noResults}
        />
      </div>

      {/* Layered-view chrome: layer toggles only shown in layers mode */}
      {viewMode === "layers" && (
        <LayerToggle active={active} onToggle={toggle} labels={treeDict.layers} />
      )}

      {/* Main view */}
      {viewMode === "tree" && (
        <CollapsibleTree
          people={people}
          relationships={relationships}
          locale={locale}
          selectedId={selectedId}
          searchQuery={search}
          onSelect={setSelectedId}
        />
      )}

      {viewMode === "focus" && selected && (
        <FocusFilters
          filters={focusFilters}
          onToggle={toggleFocus}
          labels={treeDict.focus.filters}
        />
      )}

      {viewMode === "focus" && (
        selected ? (
          <FocusView
            center={selected}
            rels={focusRels}
            allPeople={people}
            allRelationships={relationships}
            locale={locale}
            isEditor={isEditor}
            focusFilters={focusFilters}
            placeholderFather={treeDict.add.placeholderFather}
            placeholderMother={treeDict.add.placeholderMother}
            placeholderSpouse={treeDict.add.placeholderSpouse}
            onSelect={setSelectedId}
            onRequestAdd={setPendingAdd}
          />
        ) : (
          <EmptyFocus message={treeDict.views.focusEmpty} />
        )
      )}

      {viewMode === "layers" && (
        <LayeredView
          generations={generations}
          locale={locale}
          active={active}
          isVisible={isVisible}
          onSelect={setSelectedId}
        />
      )}

      {/* Legend — shown in focus view since that's where colors mean the most */}
      {viewMode === "focus" && selected && <Legend treeDict={treeDict} />}

      {/* Profile side panel */}
      {selected && (
        <PersonProfile
          person={selected}
          people={people}
          relationships={relationships}
          locale={locale}
          isEditor={isEditor}
          dict={personDict}
          relationLabels={treeDict.relations}
          addDict={treeDict.add}
          focusOnLabel={treeDict.actions.focusOn}
          onClose={() => setSelectedId(null)}
          onSelect={(id) => setSelectedId(id)}
          onFocus={() => setViewMode("focus")}
          onRequestAdd={setPendingAdd}
        />
      )}

      {/* Centralized AddRelativeForm — triggered by side panel buttons or
          by the parent-placeholder click in FocusView. */}
      {selected && pendingAdd && (
        <AddRelativeForm
          relativeKey={pendingAdd}
          currentPerson={selected}
          people={people}
          relationships={relationships}
          locale={locale}
          relationLabel={treeDict.relations[pendingAdd] ?? pendingAdd}
          dict={{
            title: treeDict.add.title,
            save: treeDict.add.save,
            cancel: treeDict.add.cancel,
            nameArLabel: treeDict.add.nameArLabel,
            nameEnLabel: treeDict.add.nameEnLabel,
            saving: treeDict.add.saving,
            forPerson: treeDict.add.forPerson,
            close: personDict.close,
            modeNew: treeDict.add.modeNew,
            modeExisting: treeDict.add.modeExisting,
            pickExisting: treeDict.add.pickExisting,
            pickExistingHint: treeDict.add.pickExistingHint,
            autoSpouseHint: treeDict.add.autoSpouseHint,
            duplicateError: treeDict.add.duplicateError,
            skip: treeDict.add.skip,
            linkStep: treeDict.add.linkStep,
          }}
          onClose={() => setPendingAdd(null)}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

function LayeredView({
  generations, locale, active, isVisible, onSelect,
}: {
  generations: [number, Person[]][];
  locale: "ar" | "en";
  active: Record<TreeLayer, boolean>;
  isVisible: (p: Person) => boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="overflow-hidden rounded-3xl border border-sand-200 bg-white/70 p-4 shadow-soft sm:p-6">
      <div className="space-y-6">
        {generations.map(([gen, members]) => {
          const visibleMembers = members.filter(isVisible);
          return (
            <div key={gen}>
              <div className="mb-2 flex items-center gap-2">
                <span className="rounded-full bg-sand-700 px-2.5 py-0.5 text-xs font-medium text-white">
                  {locale === "ar" ? `الجيل ${gen}` : `Gen ${gen}`}
                </span>
                <span className="h-px flex-1 bg-sand-200" />
                <span className="text-xs text-sand-500">{visibleMembers.length} / {members.length}</span>
              </div>
              <div className="flex max-h-[200px] flex-wrap gap-2 overflow-y-auto">
                {members.map((p) => {
                  const layer = personLayer(p);
                  const visible = active[layer];
                  return (
                    <PersonNode
                      key={p.id}
                      person={p}
                      locale={locale}
                      layer={layer}
                      active={false}
                      faded={!visible}
                      onClick={() => onSelect(p.id)}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

function FocusView({
  center, rels, allPeople, allRelationships, locale, isEditor, focusFilters, placeholderFather, placeholderMother, placeholderSpouse, onSelect, onRequestAdd,
}: {
  center: Person;
  rels: RelationshipEntry[];
  allPeople: Person[];
  allRelationships: Relationship[];
  locale: "ar" | "en";
  isEditor: boolean;
  focusFilters: FocusFilterState;
  placeholderFather: string;
  placeholderMother: string;
  placeholderSpouse: string;
  onSelect: (id: string) => void;
  onRequestAdd: (key: RelativeKey) => void;
}) {
  // -------- 1. Bucket relationships into the 6 categories. --------
  // Parents
  let father: Person | null = null;
  let mother: Person | null = null;
  // Half-siblings, full siblings, milk siblings (from explicit + implicit).
  const paternalKin: Person[] = [];   // uncle/aunt paternal
  const maternalKin: Person[] = [];   // uncle/aunt maternal
  const milkSiblings: Person[] = [];
  const spouseEntries: { spouse: Person; spouseEdgeId: string }[] = [];
  const directChildren: Person[] = []; // I'm parent_of these

  for (const item of rels) {
    if (item.r.type === "parent_of") {
      if (item.isFrom) {
        directChildren.push(item.other);
      } else if (item.other.gender === "male" && !father) {
        father = item.other;
      } else if (item.other.gender === "female" && !mother) {
        mother = item.other;
      }
    } else if (item.r.type === "uncle_paternal_of" || item.r.type === "aunt_paternal_of") {
      paternalKin.push(item.other);
    } else if (item.r.type === "uncle_maternal_of" || item.r.type === "aunt_maternal_of") {
      maternalKin.push(item.other);
    } else if (item.r.type === "spouse_of") {
      spouseEntries.push({ spouse: item.other, spouseEdgeId: item.r.id });
    } else if (item.r.type === "milk_sibling_of") {
      milkSiblings.push(item.other);
    }
  }

  // Marriage order — read from the spouse_of row, preferring rows where the
  // center is `from_id` (that's the authoritative perspective; AddRelativeForm
  // inserts spouse rows with the centered person as from_id). Falls back to
  // any spouse_of row involving the center and the spouse if no from-row has
  // an order set.
  const marriageOrderFor = (spouseId: string): number | null => {
    let backup: number | null = null;
    for (const r of allRelationships) {
      if (r.type !== "spouse_of") continue;
      if (r.fromId === center.id && r.toId === spouseId) {
        if (r.marriageOrder != null) return r.marriageOrder;
      } else if (r.toId === center.id && r.fromId === spouseId) {
        if (r.marriageOrder != null && backup === null) backup = r.marriageOrder;
      }
    }
    return backup;
  };

  // Sort spouses by marriage_order (lower = earlier). Spouses with no order
  // keep their insertion order after those that do. This sort also drives the
  // side/column assignment in spouseSlot(i) below, so the first marriage gets
  // i=0 (right side, column 0), the second i=1 (left side, column 0), etc.
  spouseEntries.sort((a, b) => {
    const ao = marriageOrderFor(a.spouse.id);
    const bo = marriageOrderFor(b.spouse.id);
    if (ao != null && bo != null) return ao - bo;
    if (ao != null) return -1;
    if (bo != null) return 1;
    return 0;
  });

  // Sibling classification — full / half-father / half-mother.
  // We need to know the GENDER of every parent to bucket candidates, so we
  // build the lookup from the FULL `allPeople` array — not from the filtered
  // `rels`. Otherwise toggling Parents off (which drops parent rows from
  // `rels`) would silently empty out the sibling boxes.
  const peopleById = new Map<string, Person>(allPeople.map((p) => [p.id, p]));

  // Helper: get the parents of person id (excluding center.id obviously).
  const parentsOf = new Map<string, { fatherId?: string; motherId?: string }>();
  for (const r of allRelationships) {
    if (r.type !== "parent_of") continue;
    const child = r.toId;
    const parent = peopleById.get(r.fromId);
    if (!parent) continue;
    const entry = parentsOf.get(child) ?? {};
    if (parent.gender === "male" && !entry.fatherId) entry.fatherId = parent.id;
    else if (parent.gender === "female" && !entry.motherId) entry.motherId = parent.id;
    parentsOf.set(child, entry);
  }
  const centerParents = parentsOf.get(center.id) ?? {};

  // Candidate siblings: anyone (other than center) who shares at least one
  // parent with the center.
  const candidates = new Set<string>();
  for (const parentId of [centerParents.fatherId, centerParents.motherId]) {
    if (!parentId) continue;
    for (const r of allRelationships) {
      if (r.type !== "parent_of") continue;
      if (r.fromId !== parentId) continue;
      if (r.toId === center.id) continue;
      candidates.add(r.toId);
    }
  }

  const fullSiblings: Person[] = [];
  const halfFromFather: Person[] = [];
  const halfFromMother: Person[] = [];
  for (const id of candidates) {
    const p = peopleById.get(id);
    if (!p) continue;
    const pp = parentsOf.get(id) ?? {};
    const shareFather = !!centerParents.fatherId && pp.fatherId === centerParents.fatherId;
    const shareMother = !!centerParents.motherId && pp.motherId === centerParents.motherId;
    if (shareFather && shareMother) fullSiblings.push(p);
    else if (shareFather)            halfFromFather.push(p);
    else if (shareMother)            halfFromMother.push(p);
    else                             fullSiblings.push(p); // shouldn't happen
  }

  // Sort every group by sibling order (birth_order → year → name).
  fullSiblings.sort(siblingOrderCompare);
  halfFromFather.sort(siblingOrderCompare);
  halfFromMother.sort(siblingOrderCompare);
  milkSiblings.sort(siblingOrderCompare);
  paternalKin.sort(siblingOrderCompare);
  maternalKin.sort(siblingOrderCompare);
  directChildren.sort(siblingOrderCompare);

  // Children grouped by their *other* parent (= the spouse who's also the mom).
  const knownSpouseIds = new Set(spouseEntries.map((s) => s.spouse.id));
  const motherIdByChild = new Map<string, string | null>();
  for (const c of directChildren) {
    let other: string | null = null;
    for (const r of allRelationships) {
      if (r.type !== "parent_of") continue;
      if (r.toId !== c.id) continue;
      if (r.fromId === center.id) continue;
      other = r.fromId;
      break;
    }
    motherIdByChild.set(c.id, other);
  }

  type ChildGroup = { spouse: Person | null; children: Person[] };
  const childGroups: ChildGroup[] = [];
  for (const sp of spouseEntries) {
    const kids = directChildren.filter((c) => motherIdByChild.get(c.id) === sp.spouse.id);
    childGroups.push({ spouse: sp.spouse, children: kids });
  }
  const orphanChildren = directChildren.filter((c) => {
    const m = motherIdByChild.get(c.id);
    return m === null || m === undefined || !knownSpouseIds.has(m);
  });
  if (orphanChildren.length > 0 || (spouseEntries.length === 0 && directChildren.length > 0)) {
    childGroups.push({ spouse: null, children: orphanChildren.length > 0 ? orphanChildren : directChildren });
  }

  // -------- Marriage-rank ordering (drives vertical staggering of children
  // groups, AND grows Y_CHILD_RAIL so the staggered-up row still clears the
  // marriage-rings icons). Earlier marriage = smaller marriage_order = higher
  // on screen; latest marriage sits at Y_CHILD_RAIL baseline.
  const rankedSpouseIds = spouseEntries
    .filter((s) => marriageOrderFor(s.spouse.id) != null)
    .sort((a, b) => marriageOrderFor(a.spouse.id)! - marriageOrderFor(b.spouse.id)!)
    .map((s) => s.spouse.id);
  // Only ranks that *have children groups* drive vertical room. A ranked spouse
  // with no children doesn't need a row.
  const ranksWithChildren = rankedSpouseIds.filter((id) =>
    childGroups.some((g) => g.spouse?.id === id && g.children.length > 0),
  );
  const totalRanksUsed = ranksWithChildren.length;
  const CHILD_STAGGER = 56; // px between adjacent ranks — must exceed nodeH (44) + a small gap so rows don't overlap.

  // -------- 2. Layout dimensions. --------
  const nodeW = 170;
  const nodeH = 44;
  const centerW = 220;
  const centerH = 60;
  const boxW = 210;
  const boxHeaderH = 24;
  const boxRowH = 26;

  function boxHeight(rows: number): number {
    return boxHeaderH + rows * boxRowH;
  }

  // Y bands
  const Y_PARENTS  = 80;  // center of father/mother
  const Y_RAIL     = Y_PARENTS + nodeH / 2 + 18; // 120 — marriage rail
  const Y_KIN_TOP  = 170; // top of kin boxes
  const Y_KIN_H    = Math.max(
    boxHeight(Math.max(1, paternalKin.length)),
    boxHeight(Math.max(1, maternalKin.length)),
    boxHeight(0) + 10,
  );
  const Y_SIB_TOP  = Y_KIN_TOP + Y_KIN_H + 30;
  const Y_SIB_H    = Math.max(
    boxHeight(Math.max(1, halfFromFather.length)),
    boxHeight(Math.max(1, fullSiblings.length)),
    boxHeight(Math.max(1, halfFromMother.length)),
    boxHeight(Math.max(1, milkSiblings.length)),
    boxHeight(0) + 10,
  );
  // Stacked spouses extend above Y_CENTER. Compute how many vertical columns
  // the spouse layout will use so we can push Y_CENTER down to fit them.
  //
  // Layout rule: first marriage (i=0) goes on the LEFT, all subsequent
  // marriages stack on the RIGHT, with later marriages stacked above earlier
  // ones (i=1 = column 0 right, i=2 = column 1 right, i=3 = column 2 right,
  // …). The "main spouse" stays anchored on the left; second/third/etc.
  // marriages form a vertical tower on the right that grows as more spouses
  // are added. This matches the user's preference of "1st on left, 2nd and
  // 3rd stacked above each other".
  const VERT_SPACING = 70;
  const spouseColumnFor = (i: number): number => (i === 0 ? 0 : i - 1);
  const _placeholderColumn =
    isEditor && focusFilters.spouses && orphanChildren.length > 0
      ? spouseColumnFor(spouseEntries.length)
      : 0;
  const maxSpouseColumn = Math.max(
    0,
    ...spouseEntries.map((_, i) => spouseColumnFor(i)),
    _placeholderColumn,
  );
  const Y_CENTER   = Y_SIB_TOP + Y_SIB_H + 60 + maxSpouseColumn * VERT_SPACING; // center of person at L4
  // Baseline (latest-marriage rank) lives at Y_CHILD_RAIL. Every earlier rank
  // sits CHILD_STAGGER higher than the next, so total vertical room used by
  // child rows is (totalRanksUsed − 1) × CHILD_STAGGER. We add that to the
  // baseline so the *earliest* rank's row still clears the marriage-rings
  // icons (at Y_CENTER + 14 + a bit). Without this expansion, when ≥ 2 ranks
  // exist, the staggered-up row's bottom edge intrudes on the baseline row,
  // and child names sit on top of each other.
  const Y_CHILD_RAIL = Y_CENTER + centerH / 2 + 50 + Math.max(0, totalRanksUsed - 1) * CHILD_STAGGER;
  const Y_BRANCH   = Y_CENTER + centerH / 2 + 18; // common y for the branch icon on every L4→L5 drop
  const Y_CHILD    = Y_CHILD_RAIL + 36; // center of child nodes at L5 (baseline rank)

  const H = Y_CHILD + nodeH / 2 + 50;
  const cx = 0; // placeholder, computed below after W is known

  // Slot X positions (relative to cx).
  // Level 1: father/mother stay close to center.
  // Level 2: kin boxes flank the parent pair, further out.
  // Level 3: 4 sibling slots evenly distributed.
  const PARENT_OFFSET = 130;          // father/mother are at cx ± 130
  const KIN_OFFSET    = 360;          // kin boxes at cx ± 360
  const SIB_SLOT      = 230;          // half-fa at cx - 345, full at cx - 115, half-mo at cx + 115, milk at cx + 345
  const SPOUSE_OFFSET = 290;

  // Compute minimum width to fit everything (and overflow-x-auto on the wrapper).
  // Widest is either kin row (2 boxes + parent spacing) or sib row (4 boxes).
  const minW_kin = 2 * KIN_OFFSET + boxW + 80;
  const minW_sib = 4 * boxW + 3 * 40 + 80;
  // Bottom: children row width depends on group sizes.
  const totalChildren = childGroups.reduce((acc, g) => acc + (g.spouse ? 1 : 0) + g.children.length, 0);
  const minW_children = Math.max(760, totalChildren * (nodeW + 20) + 200);
  const W = Math.max(900, minW_kin, minW_sib, minW_children);
  const CX = W / 2;
  const fatherX = CX - PARENT_OFFSET;
  const motherX = CX + PARENT_OFFSET;

  // Whether to render the parents row. When `focusFilters.parents` is off,
  // the whole L1 layer (parent nodes, placeholders, marriage rail, parental
  // drop) disappears — but the sibling boxes at L3 stay (they're computed
  // from `allRelationships`, not from the filtered `rels`).
  const showParentsLayer = focusFilters.parents;
  const showFatherSlot = showParentsLayer && (!!father || isEditor);
  const showMotherSlot = showParentsLayer && (!!mother || isEditor);
  const showMarriage = showFatherSlot && showMotherSlot;

  // -------- Spouse placement (side + stacking column). --------
  // 1 spouse → one side; 2 → one on each side; 3+ → stack vertically on the
  // sides that already have a spouse. iconPos is the rings-icon position on
  // the line from center's edge to spouse's edge (used both for the marriage
  // badge AND for children's drop anchor).
  function spouseSlot(i: number) {
    // First marriage (i=0) anchors on the LEFT. Every subsequent marriage
    // stacks on the RIGHT side, with later marriages drawn higher (column 0,
    // 1, 2, …). See `spouseColumnFor` above for the matching column formula.
    const side = i === 0 ? -1 : 1;
    const column = spouseColumnFor(i);
    const sx = CX + side * SPOUSE_OFFSET;
    const sy = Y_CENTER - column * VERT_SPACING;
    const sourceX = CX + side * (centerW / 2);
    const sourceY = Y_CENTER;
    const targetX = sx - side * (nodeW / 2);
    const targetY = sy;
    // All rings icons on the same side share the same x = column-0's icon x
    // (the midpoint of the horizontal between center and column-0 spouse),
    // so the icons stack neatly column-aligned above each other. Each higher
    // column connects via a trunk segment going up to it.
    //
    // Vertically: column 0 sits on the center person's row (sourceY). Columns
    // ≥ 1 sit at the VERTICAL MIDPOINT between this column's spouse row and
    // the previous column's spouse row — so e.g. the icon for spouse #2 lives
    // halfway between spouse #1's row and spouse #2's row.
    const col0IconX = (sourceX + targetX) / 2;
    const iconX = col0IconX;
    const iconY = column === 0 ? sourceY : sy + VERT_SPACING / 2;
    // Children's drop x. Column 0 drops straight down from its icon; column
    // ≥ 1 routes out past the column-0 spouse to avoid crossing through her
    // node, then descends to the child rail.
    const dropX = column === 0
      ? col0IconX
      : sx + side * (nodeW / 2 + 30 + (column - 1) * 50);
    return { side, column, sx, sy, sourceX, sourceY, targetX, targetY, col0IconX, iconX, iconY, dropX };
  }
  /** Marriage edge as SVG line segments. Column-0 is a straight horizontal
   *  broken by the icon. Column-N (N≥1) is a trunk that runs vertically from
   *  the previous column's icon top edge, THROUGH this column's icon (which
   *  sits at the midpoint between the two adjacent spouse rows), and on up to
   *  this column's spouse row — then a horizontal segment to the spouse node.
   *  The icon thus appears centered vertically between the two stacked spouses. */
  function marriageSegments(s: ReturnType<typeof spouseSlot>) {
    if (s.column === 0) {
      return [
        { x1: s.sourceX, y1: s.sourceY, x2: s.iconX - s.side * 14, y2: s.iconY },
        { x1: s.iconX + s.side * 14, y1: s.iconY, x2: s.targetX, y2: s.targetY },
      ];
    }
    // Previous column's icon y. Column 0's icon is at sourceY (Y_CENTER);
    // columns ≥ 1 sit at the spouse-row midpoint, hence the formula.
    const prevIconY = s.column === 1
      ? Y_CENTER
      : Y_CENTER - (s.column - 1.5) * VERT_SPACING;
    return [
      // Trunk from previous icon's top edge up to this icon's bottom edge.
      { x1: s.iconX, y1: prevIconY - 14, x2: s.iconX, y2: s.iconY + 14 },
      // Trunk continuing from this icon's top edge up to this column's spouse row.
      { x1: s.iconX, y1: s.iconY - 14, x2: s.iconX, y2: s.targetY },
      // Horizontal from the trunk-top across to the spouse node.
      { x1: s.iconX, y1: s.targetY, x2: s.targetX, y2: s.targetY },
    ];
  }

  // -------- 3. Styles for box headers. --------
  const SIB_STYLE = RELATIONSHIP_STYLE.sibling_of;       // red blood
  const MILK_STYLE = RELATIONSHIP_STYLE.milk_sibling_of; // milk-cream
  const UNCLE_P_STYLE = RELATIONSHIP_STYLE.uncle_paternal_of; // green leaf
  const UNCLE_M_STYLE = RELATIONSHIP_STYLE.uncle_maternal_of;
  const SPOUSE_STYLE = RELATIONSHIP_STYLE.spouse_of;
  const PARENT_STYLE = styleForRel("parent_of", false); // blue + branch (parents → me)
  const CHILD_STYLE  = styleForRel("parent_of", true);  // green + child  (me → children)

  // -------- 4. PDF export.
  // Opens a new window with a print-ready copy of the SVG (with the document's
  // stylesheets re-attached so Tailwind classes inside foreignObject elements
  // still render), then triggers the browser's print dialog. The user picks
  // "Save as PDF" from there. Dependency-free.
  const svgRef = useRef<SVGSVGElement | null>(null);
  function exportToPdf() {
    const svgEl = svgRef.current;
    if (!svgEl) return;
    const printWin = window.open("", "_blank");
    if (!printWin) {
      window.alert(locale === "ar" ? "متصفحك يمنع النوافذ المنبثقة." : "Your browser blocked the popup.");
      return;
    }
    // Clone so we can strip width/height (let CSS scale via viewBox).
    const clone = svgEl.cloneNode(true) as SVGSVGElement;
    clone.removeAttribute("width");
    clone.removeAttribute("height");
    clone.setAttribute("preserveAspectRatio", "xMidYMid meet");
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    // Copy <link rel=stylesheet> and inline <style> tags from the host so the
    // foreignObject HTML (which uses Tailwind utility classes) renders the
    // same way it does in the live view.
    const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
      .map((el) => el.outerHTML)
      .join("\n");
    const personName = locale === "ar" ? center.nameAr : (center.nameEn || center.nameAr);
    const titleText = locale === "ar" ? `شجرة العائلة — ${personName}` : `Family tree — ${personName}`;
    const dateText = new Date().toLocaleDateString(locale === "ar" ? "ar" : "en");
    const html = `<!DOCTYPE html>
<html lang="${locale}" dir="${locale === "ar" ? "rtl" : "ltr"}">
<head>
<meta charset="UTF-8" />
<title>${titleText}</title>
${styles}
<style>
  body { margin: 0; padding: 24px; background: #fff; font-family: inherit; }
  .pdf-title { text-align: center; font-size: 22px; font-weight: 600; margin-bottom: 4px; color: #3b2a10; }
  .pdf-date  { text-align: center; font-size: 12px; color: #6b7280; margin-bottom: 16px; }
  svg { display: block; margin: 0 auto; width: 100%; height: auto; max-width: 100%; }
  @media print {
    body { padding: 0; }
    @page { size: A3 landscape; margin: 8mm; }
  }
</style>
</head>
<body>
<div class="pdf-title">${titleText}</div>
<div class="pdf-date">${dateText}</div>
${clone.outerHTML}
<script>
  // Wait for stylesheets to settle, then print. Close after the dialog
  // resolves (cancel or save) so the user isn't left with a stray window.
  window.addEventListener("load", () => {
    setTimeout(() => {
      window.focus();
      window.print();
    }, 400);
  });
  window.addEventListener("afterprint", () => { window.close(); });
</script>
</body>
</html>`;
    printWin.document.open();
    printWin.document.write(html);
    printWin.document.close();
  }

  // -------- 5. Render. --------
  return (
    <div className="overflow-x-auto rounded-3xl border border-sand-200 bg-white/70 p-4 shadow-soft sm:p-6">
      <div className="mb-3 flex items-center justify-end">
        <button
          type="button"
          onClick={exportToPdf}
          className="inline-flex items-center gap-1.5 rounded-full border border-sand-300 bg-white px-3 py-1 text-xs font-medium text-sand-700 shadow-soft hover:bg-sand-50"
          aria-label={locale === "ar" ? "تصدير إلى PDF" : "Export to PDF"}
          title={locale === "ar" ? "تصدير إلى PDF" : "Export to PDF"}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden="true">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          {locale === "ar" ? "تصدير PDF" : "Export PDF"}
        </button>
      </div>
      <div className="relative">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          width={W}
          height={H}
          className="block max-w-none"
          aria-label="Family relationships"
        >
          {/* ===== Level 1: marriage rail + vertical drop to L4 ===== */}
          {showParentsLayer && showMarriage ? (
            <g>
              <line x1={fatherX} y1={Y_PARENTS + nodeH / 2} x2={fatherX} y2={Y_RAIL} stroke={SPOUSE_STYLE.color} strokeWidth={2} />
              <line x1={motherX} y1={Y_PARENTS + nodeH / 2} x2={motherX} y2={Y_RAIL} stroke={SPOUSE_STYLE.color} strokeWidth={2} />
              <line x1={fatherX} y1={Y_RAIL} x2={CX - 14} y2={Y_RAIL} stroke={SPOUSE_STYLE.color} strokeWidth={2} />
              <line x1={CX + 14} y1={Y_RAIL} x2={motherX} y2={Y_RAIL} stroke={SPOUSE_STYLE.color} strokeWidth={2} />
              <foreignObject x={CX - 14} y={Y_RAIL - 14} width={28} height={28}>
                <div
                  className="grid h-7 w-7 place-items-center rounded-full border bg-white shadow-soft"
                  style={{ color: SPOUSE_STYLE.color, borderColor: SPOUSE_STYLE.color + "55" }}
                >
                  {getRelationshipIcon(SPOUSE_STYLE.icon, "h-3.5 w-3.5")}
                </div>
              </foreignObject>
              {/* Long vertical drop from rail bottom edge of icon to center top */}
              <line x1={CX} y1={Y_RAIL + 14} x2={CX} y2={Y_CENTER - centerH / 2} stroke={PARENT_STYLE.color} strokeWidth={2.5} />
              {/* Parent icon halfway between rail and center */}
              <foreignObject x={CX - 14} y={(Y_RAIL + 14 + Y_CENTER - centerH / 2) / 2 - 14} width={28} height={28}>
                <div
                  className="grid h-7 w-7 place-items-center rounded-full border bg-white shadow-soft"
                  style={{ color: PARENT_STYLE.color, borderColor: PARENT_STYLE.color + "55" }}
                >
                  {getRelationshipIcon(PARENT_STYLE.icon, "h-3.5 w-3.5")}
                </div>
              </foreignObject>
            </g>
          ) : showParentsLayer && (father || mother) ? (
            <line
              x1={father ? fatherX : motherX} y1={Y_PARENTS + nodeH / 2}
              x2={CX} y2={Y_CENTER - centerH / 2}
              stroke={PARENT_STYLE.color} strokeWidth={2}
            />
          ) : null}

          {/* ===== L2: kin box connection lines (one per box) ===== */}
          {paternalKin.length > 0 && father && showParentsLayer && (
            <ConnectionLine
              from={{ x: fatherX, y: Y_PARENTS + nodeH / 2 }}
              to={{ x: CX - KIN_OFFSET, y: Y_KIN_TOP }}
              style={UNCLE_P_STYLE}
            />
          )}
          {maternalKin.length > 0 && mother && showParentsLayer && (
            <ConnectionLine
              from={{ x: motherX, y: Y_PARENTS + nodeH / 2 }}
              to={{ x: CX + KIN_OFFSET, y: Y_KIN_TOP }}
              style={UNCLE_M_STYLE}
            />
          )}

          {/* ===== L3: sibling box connection lines — ALWAYS to the center
              person, regardless of category. The box header already tells
              you which parent is shared. Full siblings, half-from-father,
              and half-from-mother all use the sibling style (red blood);
              milk siblings keep the dashed cream milk style. */}
          {(() => {
            const lines: React.ReactNode[] = [];
            const centerTopY = Y_CENTER - centerH / 2;
            const slot = (boxes: { count: number; x: number; style: typeof SIB_STYLE; dashed?: boolean; key: string }[]) => {
              for (const b of boxes) {
                if (b.count === 0) continue;
                const boxBottomY = Y_SIB_TOP + boxHeight(b.count);
                lines.push(
                  <ElbowLine
                    key={b.key}
                    from={{ x: b.x, y: boxBottomY }}
                    to={{ x: CX, y: centerTopY }}
                    style={b.style}
                    dashed={b.dashed}
                  />,
                );
              }
            };
            slot([
              { count: halfFromFather.length, x: CX - SIB_SLOT * 2 + 30, style: SIB_STYLE, key: "conn-halffa" },
              { count: fullSiblings.length,   x: CX - SIB_SLOT,           style: SIB_STYLE, key: "conn-full"   },
              { count: halfFromMother.length, x: CX + SIB_SLOT * 2 - 30, style: SIB_STYLE, key: "conn-halfmo" },
              { count: milkSiblings.length,   x: CX + SIB_SLOT,           style: MILK_STYLE, dashed: true, key: "conn-milk" },
            ]);
            return lines;
          })()}

          {/* ===== L4: center + spouse marriage lines.
              Layout: 1 spouse → one side, 2 → one each side, 3+ → start
              stacking vertically. side = i%2 (first one on the RIGHT in our
              convention), column = floor(i/2) (0 = at Y_CENTER, 1 = above, 2
              = above above, ...). The marriage rings sits on the line between
              center's adjacent edge and the spouse's adjacent edge, with the
              line abutting the icon's circular edge regardless of angle. */}
          {spouseEntries.map((sp, i) => {
            const slot = spouseSlot(i);
            const segs = marriageSegments(slot);
            return (
              <g key={"spouse-" + sp.spouseEdgeId}>
                {segs.map((s, si) => (
                  <line key={si} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} stroke={SPOUSE_STYLE.color} strokeWidth={2} />
                ))}
                <foreignObject x={slot.iconX - 14} y={slot.iconY - 14} width={28} height={28}>
                  <div
                    className="grid h-7 w-7 place-items-center rounded-full border bg-white shadow-soft"
                    style={{ color: SPOUSE_STYLE.color, borderColor: SPOUSE_STYLE.color + "55" }}
                  >
                    {getRelationshipIcon(SPOUSE_STYLE.icon, "h-3.5 w-3.5")}
                  </div>
                </foreignObject>
                {/* Spouse node */}
                <foreignObject x={slot.sx - nodeW / 2} y={slot.sy - nodeH / 2} width={nodeW} height={nodeH}>
                  <NodeButton
                    person={sp.spouse}
                    locale={locale}
                    onSelect={onSelect}
                    layer={personLayer(sp.spouse)}
                  />
                </foreignObject>
              </g>
            );
          })}

          {/* Spouse placeholder — shown when the center has children whose
              mother isn't a known spouse yet (or no spouses at all). Mirrors
              the parent placeholder behavior: implies "there must be a spouse
              somewhere — let me add her". Editor only, and only when the
              spouses filter is on. */}
          {isEditor && focusFilters.spouses && orphanChildren.length > 0 && (() => {
            const slot = spouseSlot(spouseEntries.length);
            const segs = marriageSegments(slot);
            return (
              <g key="spouse-placeholder">
                {segs.map((s, si) => (
                  <line key={si} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} stroke={SPOUSE_STYLE.color} strokeWidth={2} strokeDasharray="4 4" opacity={0.6} />
                ))}
                <foreignObject x={slot.iconX - 14} y={slot.iconY - 14} width={28} height={28}>
                  <div
                    className="grid h-7 w-7 place-items-center rounded-full border bg-white shadow-soft"
                    style={{ color: SPOUSE_STYLE.color, borderColor: SPOUSE_STYLE.color + "55", opacity: 0.8 }}
                  >
                    {getRelationshipIcon(SPOUSE_STYLE.icon, "h-3.5 w-3.5")}
                  </div>
                </foreignObject>
                <foreignObject x={slot.sx - nodeW / 2} y={slot.sy - nodeH / 2} width={nodeW} height={nodeH}>
                  <button
                    onClick={() => onRequestAdd("spouse")}
                    className="flex w-full items-center justify-center gap-1 truncate rounded-full border-2 border-dashed border-amber-300 bg-white/40 px-3 py-1.5 text-xs text-amber-700 hover:border-amber-500 hover:bg-amber-50"
                  >
                    <PlusIcon className="h-3 w-3" />
                    <span className="truncate">{placeholderSpouse}</span>
                  </button>
                </foreignObject>
              </g>
            );
          })()}

          {/* Center person */}
          <foreignObject x={CX - centerW / 2} y={Y_CENTER - centerH / 2} width={centerW} height={centerH}>
            <button
              onClick={() => onSelect(center.id)}
              className="grid w-full place-items-center rounded-full border-2 border-sand-700 bg-white px-4 py-2 text-center font-display text-base text-sand-900 shadow-lg animate-pulse-soft"
            >
              {locale === "ar" ? center.nameAr : (center.nameEn || center.nameAr)}
            </button>
          </foreignObject>

          {/* ===== L5: children grouped by their mother ===== */}
          {(() => {
            // For each group, the parental drop starts at the BOTTOM EDGE of
            // the marriage rings icon (when there's a known spouse) so the
            // line doesn't pass through the icon. For groups with no known
            // mother, the drop starts at the center node's bottom edge.
            //
            // For column-0 spouses, the drop goes straight down from the icon.
            // For column ≥ 1 (stacked-above) spouses, the drop first runs
            // horizontally outward past the column-0 spouse's node, then turns
            // downward — so it doesn't cross through the column-0 marriage row
            // or its drop. Every drop's branch icon lives on a common y line
            // (Y_BRANCH) so they read as a single horizontal alignment.
            //
            // Groups are sorted by their drop's terminal x (the x at the child
            // rail) so the bridges from each drop to its children's group
            // don't have to cross each other on Y_CHILD_RAIL.
            const groupAnchorX = (g: typeof childGroups[number]) => {
              if (!g.spouse) return CX;
              const i = spouseEntries.findIndex((s) => s.spouse.id === g.spouse!.id);
              if (i < 0) return CX;
              return spouseSlot(i).dropX;
            };
            const sortedGroups = [...childGroups].sort((a, b) => groupAnchorX(a) - groupAnchorX(b));

            // Marriage-order rank → vertical y-offset. Earlier marriages
            // (lower marriage_order) render ABOVE later ones so name rows
            // don't crowd each other. The orphan group (unknown mother) and
            // any spouse without a marriage_order or without children stay
            // at the baseline.
            //
            // Only ranks with actual children consume vertical slots, so we
            // rank within `ranksWithChildren` (hoisted up so Y_CHILD_RAIL can
            // reserve enough room for the staggered-up rows).
            const totalRanks = totalRanksUsed;
            const yOffsetFor = (g: typeof childGroups[number]): number => {
              if (!g.spouse) return 0;
              const rank = ranksWithChildren.indexOf(g.spouse.id);
              if (rank < 0) return 0;
              // rank 0 (earliest) → -(totalRanks-1)*CHILD_STAGGER (highest);
              // rank totalRanks-1 (latest) → 0 (baseline).
              return (rank - (totalRanks - 1)) * CHILD_STAGGER;
            };

            const elements: React.ReactNode[] = [];
            let cursorX = 80; // start near the left edge
            for (let gi = 0; gi < sortedGroups.length; gi++) {
              const g = sortedGroups[gi];
              const count = g.children.length;
              if (count === 0) continue;
              const groupW = count * (nodeW + 20);
              const groupCenterX = cursorX + groupW / 2;
              cursorX += groupW + 30;

              // Per-group rail/child y. Negative offset = shifted up.
              const yOff = yOffsetFor(g);
              const groupRailY  = Y_CHILD_RAIL + yOff;
              const groupChildY = Y_CHILD + yOff;

              // Drop geometry.
              //   Column 0 (and orphan): straight vertical drop from the icon's
              //   bottom (or center node's bottom for orphans) down to the
              //   rail.
              //   Column ≥ 1 (stacked-above spouse): L-shape that emerges from
              //   the icon's SIDE (the edge facing the spouse, at the icon's
              //   y-center) → horizontal run out to terminalX → vertical down
              //   to the rail. Emerging from the side keeps the bottom of the
              //   icon clean (where the trunk connects to the column-below
              //   icon) and visually anchors the line to "this marriage".
              let startX = CX;
              let startY = Y_CENTER + centerH / 2;
              let terminalX = CX;
              let isLShape = false;
              let lSide: 1 | -1 = 1;
              let lIconY = 0;
              let lIconX = 0;
              if (g.spouse) {
                const i = spouseEntries.findIndex((s) => s.spouse.id === g.spouse!.id);
                if (i >= 0) {
                  const slot = spouseSlot(i);
                  startX = slot.iconX;
                  startY = slot.iconY + 14;
                  terminalX = slot.dropX;
                  isLShape = slot.column >= 1;
                  lSide = slot.side as 1 | -1;
                  lIconY = slot.iconY;
                  lIconX = slot.iconX;
                }
              }

              // The drop line(s). Children style (green + child icon).
              if (isLShape) {
                // Horizontal segment from icon's SIDE edge out to terminalX.
                const sideX = lIconX + lSide * 14;
                elements.push(
                  <line
                    key={`drop-h-${gi}`}
                    x1={sideX} y1={lIconY}
                    x2={terminalX} y2={lIconY}
                    stroke={CHILD_STYLE.color} strokeWidth={2}
                  />,
                );
                // Vertical segment from the L-corner down to the rail.
                elements.push(
                  <line
                    key={`drop-v-${gi}`}
                    x1={terminalX} y1={lIconY}
                    x2={terminalX} y2={groupRailY}
                    stroke={CHILD_STYLE.color} strokeWidth={2}
                  />,
                );
              } else {
                // Straight vertical drop from icon's bottom (or center's bottom).
                elements.push(
                  <line
                    key={`drop-${gi}`}
                    x1={startX} y1={startY}
                    x2={startX} y2={groupRailY}
                    stroke={CHILD_STYLE.color} strokeWidth={2}
                  />,
                );
              }
              // Branch icon for every drop sits on the common Y_BRANCH line,
              // at the drop's terminal column — so all child icons across
              // every spouse's drop line up horizontally regardless of which
              // group has children staggered up vs at the baseline.
              elements.push(
                <foreignObject key={`drop-icon-${gi}`} x={terminalX - 14} y={Y_BRANCH - 14} width={28} height={28}>
                  <div
                    className="grid h-7 w-7 place-items-center rounded-full border bg-white shadow-soft"
                    style={{ color: CHILD_STYLE.color, borderColor: CHILD_STYLE.color + "55" }}
                  >
                    {getRelationshipIcon(CHILD_STYLE.icon, "h-3.5 w-3.5")}
                  </div>
                </foreignObject>,
              );
              // Bridge to the children group center (if offset), then horizontal rail.
              if (Math.abs(terminalX - groupCenterX) > 1) {
                elements.push(
                  <line
                    key={`bridge-${gi}`}
                    x1={terminalX} y1={groupRailY}
                    x2={groupCenterX} y2={groupRailY}
                    stroke={CHILD_STYLE.color} strokeWidth={2}
                  />,
                );
              }
              // Horizontal child rail across all children of this group.
              if (count > 1) {
                const firstX = groupCenterX - (count - 1) * (nodeW + 20) / 2;
                const lastX = groupCenterX + (count - 1) * (nodeW + 20) / 2;
                elements.push(
                  <line
                    key={`crail-${gi}`}
                    x1={firstX} y1={groupRailY}
                    x2={lastX} y2={groupRailY}
                    stroke={CHILD_STYLE.color} strokeWidth={2}
                  />,
                );
              }

              // Each child: short vertical drop from rail + the node itself.
              g.children.forEach((child, ci) => {
                const offsetFromCenter = (ci - (count - 1) / 2) * (nodeW + 20);
                const cx2 = groupCenterX + offsetFromCenter;
                elements.push(
                  <line
                    key={`child-line-${gi}-${ci}`}
                    x1={cx2} y1={groupRailY}
                    x2={cx2} y2={groupChildY - nodeH / 2}
                    stroke={CHILD_STYLE.color} strokeWidth={2}
                  />,
                );
                elements.push(
                  <foreignObject
                    key={`child-node-${gi}-${ci}`}
                    x={cx2 - nodeW / 2} y={groupChildY - nodeH / 2}
                    width={nodeW} height={nodeH}
                  >
                    <NodeButton
                      person={child}
                      locale={locale}
                      onSelect={onSelect}
                      layer={personLayer(child)}
                    />
                  </foreignObject>,
                );
              });
            }
            return elements;
          })()}

          {/* ===== Parent slots (L1) ===== */}
          {showFatherSlot && (
            <foreignObject x={fatherX - nodeW / 2} y={Y_PARENTS - nodeH / 2} width={nodeW} height={nodeH}>
              {father ? (
                <NodeButton person={father} locale={locale} onSelect={onSelect} layer="men" />
              ) : (
                <button
                  onClick={() => onRequestAdd("father")}
                  className="flex w-full items-center justify-center gap-1 truncate rounded-full border-2 border-dashed border-sand-300 bg-white/40 px-3 py-1.5 text-xs text-sand-600 hover:border-sand-500 hover:bg-sand-50"
                >
                  <PlusIcon className="h-3 w-3" />
                  <span className="truncate">{placeholderFather}</span>
                </button>
              )}
            </foreignObject>
          )}
          {showMotherSlot && (
            <foreignObject x={motherX - nodeW / 2} y={Y_PARENTS - nodeH / 2} width={nodeW} height={nodeH}>
              {mother ? (
                <NodeButton person={mother} locale={locale} onSelect={onSelect} layer="women" />
              ) : (
                <button
                  onClick={() => onRequestAdd("mother")}
                  className="flex w-full items-center justify-center gap-1 truncate rounded-full border-2 border-dashed border-rose-200 bg-white/40 px-3 py-1.5 text-xs text-rose-500 hover:border-rose-400 hover:bg-rose-50"
                >
                  <PlusIcon className="h-3 w-3" />
                  <span className="truncate">{placeholderMother}</span>
                </button>
              )}
            </foreignObject>
          )}

          {/* ===== L2: kin boxes ===== */}
          {paternalKin.length > 0 && (
            <GroupBox
              x={CX - KIN_OFFSET}
              y={Y_KIN_TOP}
              width={boxW}
              title={locale === "ar" ? "أعمام وعمات" : "Paternal kin"}
              members={paternalKin}
              color={UNCLE_P_STYLE.color}
              locale={locale}
              onSelect={onSelect}
            />
          )}
          {maternalKin.length > 0 && (
            <GroupBox
              x={CX + KIN_OFFSET}
              y={Y_KIN_TOP}
              width={boxW}
              title={locale === "ar" ? "أخوال وخالات" : "Maternal kin"}
              members={maternalKin}
              color={UNCLE_M_STYLE.color}
              locale={locale}
              onSelect={onSelect}
            />
          )}

          {/* ===== L3: sibling boxes ===== */}
          {halfFromFather.length > 0 && (
            <GroupBox
              x={CX - SIB_SLOT * 2 + 30}
              y={Y_SIB_TOP}
              width={boxW}
              title={locale === "ar" ? "إخوة من الأب" : "Half-siblings (father)"}
              members={halfFromFather}
              color={SIB_STYLE.color}
              locale={locale}
              onSelect={onSelect}
            />
          )}
          {fullSiblings.length > 0 && (
            <GroupBox
              x={CX - SIB_SLOT}
              y={Y_SIB_TOP}
              width={boxW}
              title={locale === "ar" ? "الإخوة" : "Siblings"}
              members={fullSiblings}
              color={SIB_STYLE.color}
              locale={locale}
              onSelect={onSelect}
            />
          )}
          {halfFromMother.length > 0 && (
            <GroupBox
              x={CX + SIB_SLOT * 2 - 30}
              y={Y_SIB_TOP}
              width={boxW}
              title={locale === "ar" ? "إخوة من الأم" : "Half-siblings (mother)"}
              members={halfFromMother}
              color={SIB_STYLE.color}
              locale={locale}
              onSelect={onSelect}
            />
          )}
          {milkSiblings.length > 0 && (
            <GroupBox
              x={CX + SIB_SLOT}
              y={Y_SIB_TOP}
              width={boxW}
              title={locale === "ar" ? "إخوة الرضاعة" : "Milk siblings"}
              members={milkSiblings}
              color={MILK_STYLE.color}
              locale={locale}
              onSelect={onSelect}
            />
          )}
        </svg>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

/** Three-segment elbowed connector: vertical from source, horizontal at the
 *  midpoint y, vertical to target. Icon sits on the horizontal rail. Used for
 *  sibling box → center connections. */
function ElbowLine({
  from, to, style, dashed,
}: {
  from: { x: number; y: number };
  to: { x: number; y: number };
  style: { color: string; icon: string };
  dashed?: boolean;
}) {
  const midY = (from.y + to.y) / 2;
  const d = `M ${from.x} ${from.y} L ${from.x} ${midY} L ${to.x} ${midY} L ${to.x} ${to.y}`;
  const railIconX = (from.x + to.x) / 2;
  return (
    <g>
      <path
        d={d}
        stroke={style.color}
        strokeWidth={2}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={dashed ? "6 4" : undefined}
        opacity={0.85}
      />
      <foreignObject x={railIconX - 14} y={midY - 14} width={28} height={28}>
        <div
          className="grid h-7 w-7 place-items-center rounded-full border bg-white shadow-soft"
          style={{ color: style.color, borderColor: style.color + "55" }}
        >
          {getRelationshipIcon(style.icon, "h-3.5 w-3.5")}
        </div>
      </foreignObject>
    </g>
  );
}

/** Single-segment connection line from a source point to a target point, with
 *  the appropriate relationship icon badge at its midpoint. */
function ConnectionLine({
  from, to, style, dashed,
}: {
  from: { x: number; y: number };
  to: { x: number; y: number };
  style: { color: string; icon: string };
  dashed?: boolean;
}) {
  const mx = (from.x + to.x) / 2;
  const my = (from.y + to.y) / 2;
  return (
    <g>
      <line
        x1={from.x} y1={from.y}
        x2={to.x}   y2={to.y}
        stroke={style.color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeDasharray={dashed ? "6 4" : undefined}
        opacity={0.85}
      />
      <foreignObject x={mx - 14} y={my - 14} width={28} height={28}>
        <div
          className="grid h-7 w-7 place-items-center rounded-full border bg-white shadow-soft"
          style={{ color: style.color, borderColor: style.color + "55" }}
        >
          {getRelationshipIcon(style.icon, "h-3.5 w-3.5")}
        </div>
      </foreignObject>
    </g>
  );
}

// ---------------------------------------------------------------------------

/** Rounded-rectangle box with a colored header and a clickable name list.
 *  The inner div uses `flex h-full` so its bottom edge sits exactly at the
 *  foreignObject's bottom — that's what `boxHeight` advertises, and what the
 *  connection lines anchor to. */
function GroupBox({
  x, y, width, title, members, color, locale, onSelect,
}: {
  x: number; y: number; width: number;
  title: string;
  members: Person[];
  color: string;
  locale: "ar" | "en";
  onSelect: (id: string) => void;
}) {
  const headerH = 24;
  const rowH = 26;
  const height = headerH + members.length * rowH;
  return (
    <foreignObject x={x - width / 2} y={y} width={width} height={height}>
      <div
        className="flex h-full flex-col overflow-hidden rounded-2xl border bg-white shadow-soft"
        style={{ borderColor: color }}
      >
        <div
          className="px-3 py-1 text-[10px] font-medium uppercase tracking-wide"
          style={{ background: color + "22", color }}
        >
          {title} · {members.length}
        </div>
        <ul className="flex-1 divide-y divide-sand-100">
          {members.map((p) => (
            <li key={p.id}>
              <button
                onClick={() => onSelect(p.id)}
                className="flex w-full items-center justify-between gap-2 truncate px-3 py-1 text-xs text-sand-800 hover:bg-sand-50"
                title={locale === "ar" ? p.nameAr : (p.nameEn || p.nameAr)}
              >
                <span className="truncate">
                  {locale === "ar" ? p.nameAr : (p.nameEn || p.nameAr)}
                </span>
                {p.generation !== undefined && (
                  <span className="shrink-0 text-[9px] text-sand-500">G{p.generation}</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </foreignObject>
  );
}

// ---------------------------------------------------------------------------

/** Single-person pill node (same style as before — used for parents, spouses,
 *  children, and center peers). */
function NodeButton({
  person, locale, onSelect, layer,
}: {
  person: Person;
  locale: "ar" | "en";
  onSelect: (id: string) => void;
  layer: TreeLayer;
}) {
  const colorBg =
    layer === "men" ? "#fbf7f0" :
    layer === "women" ? "#fff1f2" :
    layer === "spouses" ? "#fff7e6" :
    "#f8fafc";
  const colorBorder =
    layer === "men" ? "#dcbb7c" :
    layer === "women" ? "#fda4af" :
    layer === "spouses" ? "#fbbf24" :
    "#e5e7eb";
  const name = locale === "ar" ? person.nameAr : (person.nameEn || person.nameAr);
  return (
    <button
      onClick={() => onSelect(person.id)}
      className="flex w-full items-center justify-between gap-2 truncate rounded-full border px-3 py-1.5 text-xs font-medium hover:scale-[1.02] transition shadow-soft"
      style={{ background: colorBg, borderColor: colorBorder, color: "#3b2a10" }}
      title={name}
    >
      <span className="truncate">{name}</span>
      {person.generation !== undefined && (
        <span className="shrink-0 rounded-full bg-white/70 px-1.5 py-0 text-[9px] text-sand-700">
          G{person.generation}
        </span>
      )}
      {person.externalFamilyId && (
        <span className="shrink-0 rounded bg-white/70 px-1 text-[9px] text-sand-700">↗</span>
      )}
    </button>
  );
}

// ---------------------------------------------------------------------------

function EmptyFocus({ message }: { message: string }) {
  return (
    <div className="grid place-items-center rounded-3xl border border-dashed border-sand-300 bg-white/50 px-6 py-16 text-center text-sand-600">
      {message}
    </div>
  );
}

// ---------------------------------------------------------------------------

function Legend({ treeDict }: { treeDict: Dict }) {
  const entries = [
    { type: "parent_of" as const,         label: treeDict.relations.father },
    { type: "spouse_of" as const,         label: treeDict.relations.spouse },
    { type: "sibling_of" as const,        label: treeDict.relations.brother },
    { type: "milk_sibling_of" as const,   label: treeDict.relations.milk },
    { type: "uncle_paternal_of" as const, label: treeDict.relations.uncleP },
    { type: "cousin_of" as const,         label: treeDict.relations.cousin },
  ];
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-sand-200 bg-white/70 p-3 text-xs">
      {entries.map((e) => {
        const s = RELATIONSHIP_STYLE[e.type];
        return (
          <span key={e.type} className="inline-flex items-center gap-1.5">
            <span
              className="grid h-5 w-5 place-items-center rounded-full"
              style={{ color: s.color, background: s.color + "22" }}
            >
              {getRelationshipIcon(s.icon, "h-3 w-3")}
            </span>
            <span className="text-sand-700">{e.label}</span>
          </span>
        );
      })}
    </div>
  );
}
