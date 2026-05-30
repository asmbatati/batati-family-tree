# CHANGELOG — موقع البطاطي / Al-Batati Family Tree

All notable changes, prompts, and answers for this project are documented in this file.
كل التغييرات والمحادثات والقرارات لهذا المشروع موثقة في هذا الملف.

The format is based on [Keep a Changelog](https://keepachangelog.com/), and this project follows semantic versioning.

---

## [Unreleased] — 2026-05-30

### Added — Multi-theme 3D-printable family piece with real carved names
- Replaces the previous Print3DModal (flat plate + circular leaves, names only in the SVG preview) with a real multi-theme 3D model whose names are **carved as triangulated glyphs in the STL itself**.
- **Five themes**, picked via a left-rail tab list inside the modal: Tree (default), Flower, Roots, Cloud + hearts, Classic (the old plate).
- **Family scope**: per the user's spec, only the centred person + spouse(s) + children are included. Parents and siblings are excluded. The couple (center + first spouse) gets larger leaves (22 mm radius); children get smaller ones (14 mm).
- **Real text-to-mesh** pipeline ([lib/print3d/text2mesh.ts](lib/print3d/text2mesh.ts)) — lazy-loads opentype.js + the bundled Amiri font on first export, runs glyph-by-glyph Bezier flattening at 0.18 mm chord tolerance, triangulates each glyph (with holes for letters like ع / و / o) via `earcut`, and extrudes the triangulation between configurable `zMin` / `zMax`. Arabic strings are auto-detected by Unicode range and reversed in glyph order so they read RTL when laid out at advancing x; opentype.js applies the font's own GSUB shaping (init/medi/fina/isol) internally.
- **lib/stl.ts extended** (backwards-compatible):
  - `buildSTL` overload that accepts `{ group, tris }[]` and emits one `solid <group>` block per group — slicers' "Split to objects" handles the multi-part case.
  - `triangleFan(centre, ring, zMin, zMax)` — extruded fan around a centre point (hearts, petals).
  - `extrudePolygon(flatCoords, holeIndices, triIndices, zMin, zMax)` — bridge from `earcut` output to STL facets. Used by `textToTriangles`.
- **Theme modules** in `lib/print3d/themes/`:
  - `tree.ts` — tapered trunk (3 stacked boxes) + base + horizontal branches + canopy of leaves.
  - `flower.ts` — central disc + petals radially placed; couple as two large opposing petals, children interleaved 360°.
  - `roots.ts` — trunk stub at the top + fan of downward roots, child leaves at root tips.
  - `cloud.ts` — overlapping-disc cloud with carved couple names on the cloud body + hearts hanging from string tabs for each child.
  - `plate.ts` — port of the previous flat-plate layout, kept as the "Classic" option.
- **Composer** ([lib/print3d/compose.ts](lib/print3d/compose.ts)) — single STL / two-solid STL / three-file ZIP (via `fflate`). User picks via a Separation radio group in the right rail.
- **UI restructured** to 3-pane (theme tabs / live preview / options rail). Right rail has sliders for carve depth (-1.5 mm engrave to +1.5 mm emboss), leaf depth, scale, and the Separation radio. Inline SVG preview re-renders on every option change (~200–600 ms once the font is loaded). Footer has Download STL + Download SVG.
- **New file structure**:
  - `lib/print3d/types.ts` — Slot, STLShape, SVGPreviewElement, ThemeLayout, ThemeOptions, Theme.
  - `lib/print3d/slots.ts` — buildSlots(center, relationships, people) → [center, ...spouses, ...children].
  - `lib/print3d/text2mesh.ts` — text → triangulated extrusion.
  - `lib/print3d/themes/{tree,flower,roots,cloud,plate}.ts` + `index.ts` (registry).
  - `lib/print3d/compose.ts` — single/multi-solid/ZIP composition.
  - `public/fonts/print3d/Amiri-Regular.ttf` — bundled OFL-licensed Arabic + Latin font.
- **Dependencies added** (all small, lazy-loaded via dynamic import — main bundle is unaffected): `opentype.js@^1.3.4`, `earcut@^2.2.4`, `fflate@^0.8.2`, plus `@types/opentype.js` and `@types/earcut`.
- **Trade-offs**: glyphs with self-intersecting paths can confuse earcut; we catch and skip those gracefully (the rest of the name still prints). Mixed-script names (e.g. "Ahmad أحمد" in one string) aren't fully bidi-reordered — Arabic-predominant names get reversed, mixed stays in source order. Family-tree entries in practice are monolingual per name, so this is fine for v1.
- User prompt: *"I want to create a meaningful tree that could be printed. First, only names are the person of interest, spouse, and children. Inspire how to do the names meshes from here https://github.com/romgere/text2stl … plan for different shapes that could be created. A tree where each name is on a part of it like the first picture. A flower where each name is part of the flower. A root where each name is a leaf. A cloud where each name is on a heart shape, …"*
- Plan file: `C:\Users\asmal\.claude\plans\transient-skipping-pelican.md`.

## [Superseded — 2026-05-30] flat-plate STL export
The original "Export 3D model" entry below is superseded by the multi-theme entry above. Keeping the prose for the project history.

### Added — 3D-printable family tree (STL + SVG export, flat plate)
- **New "3D model" button** in the FocusView toolbar ([components/tree/TreeCanvas.tsx](components/tree/TreeCanvas.tsx)) — amber pill next to "Export PDF". Opens a modal that previews a wooden-art-style family piece for the centered person and downloads a print-ready file.
- **[components/tree/Print3DModal.tsx](components/tree/Print3DModal.tsx)** — laid-out preview + download buttons:
  - Family picked automatically: parents (top row), centre + spouses (second row), siblings (third), children (bottom). Up to 5 leaves per row.
  - Inspired by the wooden tree-art pieces the user shared — each person gets a raised "leaf" disk on a base plate.
  - Live SVG preview with cream gradient base + walnut-stained borders so you can see the print before downloading.
  - Dimension card shows total mm size + thickness so you know if it'll fit your printer's bed before slicing.
- **[lib/stl.ts](lib/stl.ts)** — dependency-free ASCII-STL builder. `boxTriangles` extrudes the base plate; `cylinderTriangles` extrudes each name-plate as a 32-sided n-gon. Outward-pointing normals computed per-triangle, SVG y is flipped to STL's y-up convention. `downloadSTL` / `downloadSVG` Blob-URL the output and trigger a browser download.
- **STL geometry**: base plate `~240×variable` mm × 4mm thick; each leaf is `r=18` mm × 3mm raised relief above the base. Watertight — the leaves sit ON the plate (not boolean-merged) so the slicer fuses them as one solid in the first few layers, perfectly printable on a flat-bed FDM or resin printer.
- **Names left for engraving / painting**: extruding readable Arabic/English text without a font-tessellation library would have added a huge dependency. Instead the SVG preview shows the labels (so a vinyl-cutter or laser etcher can apply them post-print), and the dimension card notes this trade-off.
- **SVG export**: the same SVG used for the preview can be downloaded for laser-cut workflows. Plate is rounded rect, each leaf is a circle with the person's name centred — drop into Inkscape / Lightburn / your CAM of choice.
- User prompt: *"I want you to create a new 3d view where we can export a mesh ready to print in a 3d printer."* + reference photos of wooden family-tree art pieces.

### Changed — PDF export now fits the whole tree on a single page
- **Bug**: tall or wide trees got split across multiple pages because the print engine kept using A3 landscape regardless of content shape. When the tree's natural height exceeded the page's, the bottom rows ended up on page 2 (or 3).
- **Fix** ([components/tree/ExportPdfButton.tsx](components/tree/ExportPdfButton.tsx)): compute the content's aspect ratio at print time and *generate a custom @page size to match it*, so the whole diagram fits in one page regardless of shape.
  - For SVGs: aspect ratio comes from the `viewBox` attribute (`width / height`). Falls back to the live `getBoundingClientRect()` if no viewBox.
  - For HTML containers (Tree / Layers views): aspect ratio comes from `scrollWidth / scrollHeight` so the FULL natural size — including content currently hidden by overflow clips — is measured.
  - Page width anchored at 420mm (A3 landscape width); page height = `width / aspect + 30mm` for the title block, clamped to `[150mm, 2000mm]` to avoid pathologic paper sizes.
  - `@page { size: <Wmm> <Hmm>; margin: 0 }` + a small body padding emits the custom dimensions to the print engine. Chrome / Edge / Firefox all respect this for PDF output.
- **CSS hardening**: `page-break-inside: avoid` and `break-inside: avoid` on the print container plus everything inside it; explicit `overflow: visible !important` on all `overflow-*` classes so the Tree-view's `max-h-[70vh]` scroll wrapper doesn't truncate during print.
- Net effect: every view now exports as a single-page PDF sized exactly to the content's natural aspect ratio. Open the PDF and zoom — the entire tree is there, in one frame, no spillover.
- User prompt: *"when I export to pdf, make the whole tree fit in one page. Because sometimes it gets seperated to several pages"*

### Changed — Parents' marriage line now aligned with the parents' row
- The marriage rail (horizontal line + rings icon) used to sit *below* the parents at `Y_RAIL = Y_PARENTS + nodeH/2 + 18`, with two vertical stubs running from each parent's bottom down to that rail. That looked like the parents had small antennae dangling beneath them.
- **Now** ([components/tree/TreeCanvas.tsx](components/tree/TreeCanvas.tsx)): the horizontal line runs directly between the parents at `y = Y_PARENTS` (their visual center), splitting around the rings icon at `CX`. The vertical drop to the centered person starts from the icon's bottom and runs cleanly downward through the parent-icon midpoint.
- Dropped the two stub lines from the parents to the old rail; the horizontal line connects from each parent's inner edge (`fatherX + nodeW/2` and `motherX - nodeW/2`) directly to the rings icon.

User prompt: *"make the marriage connection between the father and mother inligned with them"*

### Changed — Sibling boxes: milk back in its own box, both shifted off-center
- The previous all-in-one merged box (full + halves + milk) was centered on the column under the centered person — directly on top of the parental drop line — and visually obscured it. Also, milk siblings aren't really the same category as blood siblings (no shared blood, different inheritance rules), so merging them was conceptually loose.
- **Two boxes now** ([components/tree/TreeCanvas.tsx](components/tree/TreeCanvas.tsx)):
  - Blood box (full + halfFromFather + halfFromMother, color-coded MixedKinBox) at `CX - SIB_SLOT`.
  - Milk box (plain GroupBox, cream MILK_STYLE) at `CX + SIB_SLOT`.
- Connection lines: one elbowed line per box back to the centered person (the milk line is dashed, matching the existing milk relationship style).
- `Y_SIB_H` recomputed as the max of the two box heights (blood box gets a +14 fudge for its legend row; milk box doesn't have one).
- The parental drop line at `CX` is now visually clear — no box overlaps it.

User prompt: *"Return the milk siblings to its own box, and do not make the boxes on top of the parental line, make them shefted on the sides like before"*

### Changed — Header layout: aligned baselines, no-wrap, compact brand
- **Bug**: nav items wrapped to two lines ("My dashboard", "Sign out", "ابحث عن رابط", "تسجيل الخروج"). The brand tagline ("Family Tree — Heritage & Lineage") spanned 3 lines beside the logo. Heights of the email pill, sign-out button, and language switcher were all different. The whole bar looked uneven.
- **Fix** ([components/Header.tsx](components/Header.tsx) + [components/LanguageSwitcher.tsx](components/LanguageSwitcher.tsx)):
  - Header row is now fixed-height `h-14` with `items-center`, so every child sits on a single baseline.
  - Every nav link, every pill, and the language switcher pills get `whitespace-nowrap` so they refuse to break to a second line.
  - Brand tagline is now hidden below `lg` (it was the worst offender at smaller widths); brand name itself is hidden below `sm` (logo-only on phone).
  - Nav links have responsive padding — tighter (`px-2.5 py-1.5`) on `md`, full (`px-3 py-2`) on `lg+`. Items now fit on a single row on the typical laptop width even with "My dashboard" + "Moderation" present.
  - The auth area (editor pill / email / sign-out) is now consistent `h-8` controls with matching radii; email pill widened slightly (`max-w-[160px]`) and gets a `title` tooltip so hovering shows the full address.
  - Language switcher rebuilt with the same `h-8` height and slimmer pills (`px-2.5 text-xs`) so it lines up perfectly with the sign-out and email pills.
  - `nav` container uses `flex-1 justify-center` so nav items are centered between brand and auth area — gives the bar a balanced look.
- The mobile nav bar (below `md`) is unchanged in structure but now `whitespace-nowrap` so items don't wrap when they scroll horizontally.

User prompt: *"In the header (arbic and english) some text are not aligned and does not look good. Make all of them aligned and enhance the look"*

### Fixed — Side panel now sits above the page header (consistent across LTR/RTL)
- **Bug**: in LTR mode the page header (z-40) overlapped the side panel (z-30) — and because both the language-switcher pills and the panel are on the right side of the screen, the header visually obscured the panel's top header. In RTL the same z-mismatch existed but the panel sat on the left where the header had less visual content, so it wasn't noticed.
- **Fix** ([components/Header.tsx](components/Header.tsx)): lowered the page header from `z-40` to `z-20`. Side panel keeps `z-30` and now visibly sits *on top of* the header in both locales.
- Final z-index stack: page content (default) → page header (z-20) → side panel (z-30) → floating Hide/Close bar (z-40) → AddRelativeForm (z-50) → EditPersonForm (z-60) → WelcomeClaim (z-70). Each layer cleanly covers the one below it.
- The page header is still functional — it's just visually below the panel when both occupy the same horizontal space.

### Fixed — Hide + Close are now a floating bar OUTSIDE the side panel
- The user reported they couldn't see *either* the new Hide pill OR the existing Close X button after the last change. Whatever's hiding them (panel internal overflow, RTL flex quirk, browser-extension overlay, anything else), the fix is to render the controls outside the panel entirely so panel internals can't affect them.
- **Floating control bar** ([components/tree/TreeCanvas.tsx](components/tree/TreeCanvas.tsx)) — fixed at `top-4 end-4` with `z-40`, rendered only when `selected && profileVisible`. Two pills inside a rounded white card:
  - **إخفاء / Hide** — calls `setProfileVisible(false)`. The existing bottom-end "Show panel" chip brings it back.
  - **إغلاق / Close** — calls `setSelectedId(null)`. Drops the selection entirely.
- z-index chosen to sit above the panel (z-30) but below the AddRelativeForm (z-50) and EditPersonForm (z-60) modals, so opening one of those correctly covers the bar.
- The header controls inside PersonProfile are still there as a fallback for users who happen to find them, but the floating bar is now the primary entry point.

### Changed — Hide-panel button is now a visible pill, not an easily-missed icon
- The eye-off icon I added next to Close looked too similar to the X next to it; editors didn't notice it. Replaced with a labelled pill — chevron + "إخفاء / Hide" text — matching the existing "Focus on" / "Edit" button language ([components/tree/PersonProfile.tsx](components/tree/PersonProfile.tsx)).
- Chevron direction flips for RTL/LTR so it always points toward the panel's screen edge.

### Changed — Kin connection lines now elbowed
- The L2 connection from each parent down to their respective kin box used `ConnectionLine` (a straight diagonal). The parents sit close to the center while the kin boxes sit further out at the same y — the diagonal looked ugly. Switched to `ElbowLine` (down → across → into the box) ([components/tree/TreeCanvas.tsx](components/tree/TreeCanvas.tsx)).

### Changed — Centered person's siblings: one color-coded box instead of four
- Previously the L3 row could render up to four separate `GroupBox`es (half-from-father, full, half-from-mother, milk). Replaced with a single `MixedKinBox` of all categories with a legend at the top ([components/tree/TreeCanvas.tsx](components/tree/TreeCanvas.tsx)).
- The box is wider (`boxW + 60`) and centered on the column under the person. The L3 connection line is now a single elbowed line from the box bottom up to the centered person's top.
- `Y_SIB_H` recomputed as the sum of all four counts + 14px legend fudge.

User prompt: *"1- I still can not see the eye-off button 2- for the paternal and maternal links (boxes), change the lines from straight to elbowed 3- I like the color coded siblings, do the same idea to the person of interest siblings. Now if a person have full siblings, and half siblings from the father, and half siblings from the mother, there would be three boxes. Make them only one box but color code the siblings"*

## [Unreleased] — 2026-05-29

### Added — PersonProfile hide/show toggle
- **Bug**: the side panel (z-30, fixed `end-0`) sometimes covered the part of the tree the editor wanted to see. Closing it dropped the selection — and re-selecting that person was extra friction.
- **Fix**: new `onHide` prop on PersonProfile ([components/tree/PersonProfile.tsx](components/tree/PersonProfile.tsx)) that hides the panel *without* clearing `selectedId`. Eye-off icon next to the existing Close button. When hidden, TreeCanvas renders a floating chip at the bottom-end of the viewport with the selected person's initial — clicking the chip reopens the panel. `profileVisible` state is local to TreeCanvas; clearing `selectedId` resets it for next time.

### Added — Father/mother siblings boxes (color-coded by half/full/milk)
- **Replaced** the old paternal/maternal "kin" boxes in FocusView ([components/tree/TreeCanvas.tsx](components/tree/TreeCanvas.tsx)) with computed-from-`parent_of` father's-siblings and mother's-siblings boxes. The old boxes only showed people with explicit `uncle_paternal_of` / `aunt_paternal_of` rows, which most data doesn't have. The new boxes derive siblings from the underlying parent_of graph: anyone who shares at least one parent with the centered person's father / mother.
- **Color-coded categories** per row in each box:
  - **full** (red) — sibling shares both grandparents.
  - **halfFather** (warm brown) — shares only the paternal-side grandfather.
  - **halfMother** (rose) — shares only the paternal-side grandmother (mirrored for mother's box).
  - **milk** (cream) — milk_sibling_of(parent, sibling) row.
- New `MixedKinBox` component renders these with a category legend in the header and a colored dot beside each name. Falls back to the legacy uncle/aunt rows if no parent_of-derived siblings exist (so the box is never empty when the legacy data is the only source).
- `Y_KIN_H` grew by a 14px header fudge to fit the legend row.

### Added — Generalised PDF export across every view, with 4-gen lineage as the title
- **New shared component** [components/tree/ExportPdfButton.tsx](components/tree/ExportPdfButton.tsx) — takes a `targetRef` (HTMLElement | SVGSVGElement), `title`, optional `subtitle`, and renders a button that opens a print-ready window with the cloned target + the document's stylesheets re-attached. Works equally well for SVG-only canvases (focus / descendants) and HTML-based views (tree / layers).
- **All four view modes now export**:
  - **Tree** and **Layers**: a new `ViewWithPdf` wrapper in TreeCanvas captures the view's container `<div>` via a ref and shows an Export button above it. Title is generic ("شجرة عائلة البطاطي" / "Al-Batati family tree").
  - **Focus**: the inline `exportToPdf` was deleted; the shared button replaces it. Title: "شجرة العائلة — {name}". Subtitle: 5-name patrilineal lineage chain via `lineageName(center, …, 5)` — that's the centered person plus up to 4 forefathers, matching the editor's "name to the 4th grandfather" request.
  - **Descendants**: Export button slotted into the existing toolbar alongside the zoom controls. Title: "الذرية — {name}". Same 5-name patrilineal subtitle.
- The shared component HTML-escapes the title/subtitle text so a name containing `<` or `&` doesn't break the printed page.

User prompt: *"1- The person form that shows when I click on a name some times block my view on the screen. I want the option to hide/show it. 2- I want the option of pdf export in all views. And in the focused and heritage views, I want to display the name to the 4th grandfather as the title. 3- In the focus view I want to see a box for the fathers siblings (all siblings in the same box but color coded, full siblings, siblings from father, from mother, and milk) and another box for mothers siblings"*

## [Unreleased] — 2026-05-27

### Added — Persist selected person + view mode in the URL (survives reload)
- **Why**: after the previous fix changed AddRelative/Edit/AddPerson forms to do `window.location.reload()` for guaranteed-fresh data, the editor lost their context — `selectedId` and `viewMode` are `useState` and reset on reload, so a save would dump them back to the default tree view and force them to click their way back to the focused person.
- **Fix** ([components/tree/TreeCanvas.tsx](components/tree/TreeCanvas.tsx)): two `useEffect`s drive a `?p=<id>&view=<mode>` query-string for the tree page. On mount, the restore effect reads search params and seeds `selectedId` + `viewMode`. On subsequent state changes, a writer effect updates the URL via `window.history.replaceState` (no router fetch). A `urlRestored` ref blocks the writer from running before the restorer has finished, so the URL doesn't get wiped on initial render.
- Default values are omitted from the URL (no `p=`, no `view=tree`) so the bar stays clean when nothing is selected.
- Using the History API directly instead of `router.replace` means no RSC re-fetch, no router-cache changes — purely a cosmetic URL-bar update.
- **Effect on the reload flow**: editor adds/edits → reload fires → page reload preserves the URL → mount effect reads `?p=…&view=focus` → state restored → page shows the same focused person with the new relationship now visible.
- User prompt: *"When I add a relation, it gets saved successfuly now. But after saving it sends me to the tree page and I have to navigate again to the focused view of that person which is daunting"*

### Fixed — Paginate loadTree past PostgREST's 1000-row default cap
- **Root cause**: PostgREST (and therefore the Supabase REST client) caps a single response at 1000 rows by default. The Al-Batati DB has ~695 `people` rows plus hundreds of `parent_of` / `spouse_of` / `sibling_of` / `milk_sibling_of` rows — easily over 1000 relationships. `loadTree()`'s `.select("*")` was silently returning only the first 1000 relationships ordered by PostgREST's internal sort; rows past the cap were dropped on the floor. The user's freshly-added `spouse_of(أحمد ↔ سميرة)` row was one of the dropped ones, which is why the focus view kept showing no spouse even though the DB had the row.
- **Fix** ([lib/data/loadTree.ts](lib/data/loadTree.ts)): introduce a `fetchAll<T>(sb, table, orderColumn?)` helper that pages through the table via `.range(offset, offset + 999)` calls until the page returns fewer rows than the limit. Both `people` and `relationships` use it now. Safety stop at 200,000 rows to prevent a pager bug from looping forever.
- Adds typed PeopleRow / RelRow row shapes inline so the helper is type-safe.
- **Why the side panel only showed 14** for أحمد: the 14 were whatever rows out of the first 1000 happened to involve أحمد. The spouse_of row was past the 1000 cutoff, so it never reached `computeRelationshipsFor`.
- User prompt: *"I still can not see her in the focused view!"* — followed by SQL queries confirming سميرة exists and the spouse_of row exists, but the side panel relationships list of 14 didn't include her.

### Fixed — Stale client snapshot caused phantom "edits don't apply" + 409 duplicates
- **Root cause**: `router.refresh()` is unreliable in our Next 16 dev environment — it intermittently no-ops, leaving the client's `relationships` snapshot stale. Stale snapshot → the form's client-side `isDup` check (built from the loaded `relationships` array) misses rows that exist in the DB → form re-attempts inserts that the DB then rejects with `409 Conflict / 23505 duplicate key`. The form swallows the duplicate as "no change" and shows nothing → editor concludes "the addition does not happen".
- **Diagnosis from the user's HAR log**: after the first run added سميرة as spouse and linked her to 3 children successfully (the writes ARE in the DB), every subsequent attempt at the same flow hit a sequence of 409s — `spouse_of(c9351969↔5df04048)` + a batch of 3 `parent_of(5df04048→{children})`. The writes never produced new rows; they were trying to re-add what was already there.
- **Fix**: replace `router.refresh()` with `window.location.reload()` in every form's *success* path ([components/tree/AddRelativeForm.tsx](components/tree/AddRelativeForm.tsx), [components/tree/AddPersonForm.tsx](components/tree/AddPersonForm.tsx), [components/tree/EditPersonForm.tsx](components/tree/EditPersonForm.tsx)). Cancel/X paths still just call `onClose()` so there's no reload when nothing was written. The trade-off is the side panel's `selectedId` resets after each save — acceptable because the editor lands on a guaranteed-fresh snapshot.
- **`closeAndMaybeRefresh`** in AddRelativeForm now also reloads when `dirtyRef` is true (i.e. user reached the linkOthers step then X'd out). Previously it called `router.refresh()` which silently no-op'd, leaving the user staring at a stale tree.
- TreeCanvas's `onClose` is unchanged — still just `setPendingAdd(null) + router.refresh()`. Reload is owned by the forms now, so cancelling a form doesn't trigger a reload.
- User prompt: *"I do not see the welcome modal and I do not see the addition neither in the tree nor in the review!"* + follow-up Network log showing 201s on inserts then 409s on retries.

### Fixed — WelcomeClaim modal was masking add-relation results
- **Bug**: after introducing the WelcomeClaim modal in the locale layout, the modal would re-mount on every `router.refresh()` (which is called after a successful add/edit) with its internal `open` state defaulting to `true`. Because the modal sits at `z-[70]` — above AddRelativeForm (`z-50`) and EditPersonForm (`z-60`) — it popped over the page right when the freshly-added relation should have become visible. Symptom: "I added several relations but they did not happen".
- **Fix (1)**: editors are now exempted from the WelcomeClaim modal entirely ([app/[locale]/layout.tsx](app/%5Blocale%5D/layout.tsx)) — they're already authoritative in the editors table and don't need to claim. `showWelcomeClaim = !!viewer.user && !viewer.isEditor && !viewer.claimedPersonId`.
- **Fix (2)**: dismissal persists across the session ([components/auth/WelcomeClaim.tsx](components/auth/WelcomeClaim.tsx)). The component now starts closed and opens on first mount only if `sessionStorage["batati-welcome-dismissed"]` is not set. Every close path (backdrop click, Escape, X button, "Skip for now", successful link/submit) routes through a `dismiss()` helper that sets the flag. So once a non-editor user dismisses or completes the welcome flow, the modal stays gone for the rest of the session even though `router.refresh()` re-mounts the layout.
- User prompt: *"The problem has returned, I have added several relations but they did not happen."*

### Added — User claim flow, personal dashboard, moderation queue, event submission

**1. Schema migration** — new file [supabase/user-moderation.sql](supabase/user-moderation.sql). Run AFTER `schema.sql` and `auth.sql`.
- **`public.user_people`** — links `auth.users.id` → `people.id` so a logged-in user "claims" their place in the tree. RLS: self read/write; editors get read-only.
- **`public.pending_edits`** — moderation queue. Authenticated non-editors INSERT proposed edits here (`entity_type ∈ {person, relationship, event}`, `operation ∈ {insert, update, delete}`, `payload jsonb`, `original_payload jsonb`, `note`, `status`, `review_note`, `reviewed_by`, `reviewed_at`, `submitted_at`). RLS: submitters insert + read their own; editors can do anything.
- **`public.events` extended** — added `status` (default 'approved'), `submitted_by`, `reviewed_by`, `reviewed_at` columns. Public read now filtered to `status = 'approved'` (plus submitters see their own + editors see all). Non-editors can insert with `status = 'pending'`.

**2. Auth context** — new `getViewerContext()` in [lib/auth.ts](lib/auth.ts) bundles `{ user, isEditor, claimedPersonId, canSuggest }` into a single round-trip. `canSuggest` is true for any authenticated non-editor → they submit to the queue instead of writing directly.

**3. Welcome / claim modal** — new [components/auth/WelcomeClaim.tsx](components/auth/WelcomeClaim.tsx). Auto-shown by [app/[locale]/layout.tsx](app/%5Blocale%5D/layout.tsx) when `viewer.user && !viewer.claimedPersonId`. Three modes:
- *Search & link*: lineage-aware fuzzy search; on pick, upserts a `user_people` row. Direct write (allowed by self-RLS).
- *Submit join request*: a non-editor user can propose adding themselves to the tree. Writes to `pending_edits` (`entity_type = 'person', operation = 'insert'`) with their name + gender. Editor approves later from the moderation queue.
- *Skip*.

**4. Personal dashboard** — new route [/{locale}/me](app/%5Blocale%5D/me/page.tsx) (force-dynamic). Redirects to `/login` if unauthenticated; to `/` (home + welcome modal) if no claim yet. Shows:
- Header with claimed person's name + lineage chain + quick links to `/tree` and `/relate`.
- KPI cards: generation, sibling count, children count, grandchildren count.
- Four relatives cards: parents, spouse(s), siblings, children.
- "My pending suggestions" list (the user's own queue with status pills).

**5. Admin moderation queue** — new route [/{locale}/admin/queue](app/%5Blocale%5D/admin/queue/page.tsx) (editors only — non-editors get a 403-style message). Tab filter (`pending` / `approved` / `rejected`) via search params. Each row:
- Op pill (`insert`/`update`/`delete` × `person`/`relationship`/`event`).
- Submitter (resolved to their claimed name via `user_people` join).
- Target (resolved via `people` lookup when `target_id` is set).
- Submitter note + expandable payload + expandable original payload (diff).
- Reviewer-note input + **Approve & apply** / **Reject** buttons via new client component [components/admin/QueueActions.tsx](components/admin/QueueActions.tsx). Approve fetches the row, applies the operation to the live table (using the editor's session — RLS allows it), then marks the pending row `approved`. Reject just sets `status = 'rejected'` with the reviewer note.

**6. Event submission flow** — events page rewritten to load from Supabase ([app/[locale]/events/page.tsx](app/%5Blocale%5D/events/page.tsx), force-dynamic, seed fallback when empty). New [components/events/SuggestEventForm.tsx](components/events/SuggestEventForm.tsx) lets authenticated users post events:
- *Editors*: button label "Post new event", row inserted with `status = 'approved'` (publishes immediately).
- *Non-editors*: button label "Suggest an event", row inserted with `status = 'pending'`. They see their pending suggestions in a sticky-note section at the top of the events page; everyone else only sees approved events.

**7. Header navigation** — [components/Header.tsx](components/Header.tsx) now uses `getViewerContext()`. Dynamic nav items: `لوحتي / My dashboard` appears when the viewer has claimed a person; `المراجعة / Moderation` appears when the viewer is an editor.

**8. Helper** — [lib/moderation.ts](lib/moderation.ts) — server-side `submitPending`, `applyPendingEdit`, `rejectPendingEdit` (referenced by future admin-side server actions if we want to move QueueActions away from the client).

**9. TreeCanvas Props** — added optional `canSuggest` + `userId`. Passed through from [app/[locale]/tree/page.tsx](app/%5Blocale%5D/tree/page.tsx) using the new viewer context. The forms-route-through-pending change is **deferred** to a follow-up: today's editor-direct flow is unchanged, and non-editor edits go through the WelcomeClaim flow + future per-field "Suggest edit" buttons.

**Migration order to run on production**: `schema.sql` → `auth.sql` → `user-moderation.sql` (each is idempotent). Then `notify pgrst, 'reload schema';`.

User prompt: *"Now I want a feature for the users. 1- When someone logs in, it will ask him his name and he can choose from the search bar his name if it exists, or create a new file and connect it to the family. Then he will see a dashboard about him… 2- He can edit the tree, however, these edits will need approval from my side to take effect. 3- He can post events also that needs approval"*

### Added — "Family name" field at add-time (no more add-then-find-then-edit)
- **AddPersonForm** ([components/tree/AddPersonForm.tsx](components/tree/AddPersonForm.tsx)) and **AddRelativeForm** ([components/tree/AddRelativeForm.tsx](components/tree/AddRelativeForm.tsx)) now both expose a single locale-aware **Family name** input on the new-person flow. Defaults to the appropriate Al-Batati spelling (`البطاطي` in Arabic UI, `Al-Batati` in English) so the common case is a no-op for the editor — only in-laws need a typed value.
- **Splitter helper** (`familyPayload(typed)`) is duplicated in both forms (small, kept local). It recognises the canonical Al-Batati spellings (`البطاطي`, `Al-Batati`, `albatati`) and writes the same standard values to both `family_ar` + `family_en`; for any other input it mirrors the typed value to both columns (the editor can refine the cross-locale spelling later via the Edit form).
- **Inline help text** under the field clarifies the rule: "Defaults to Al-Batati. Override only when the person is from another family (an in-law)."
- **Other-parent inline add** inside the AddRelativeForm's linkOthers step also routes through the splitter (still defaults to Al-Batati since that flow doesn't have its own family input — the editor can refine via the new person's Edit form afterwards if needed).
- User prompt: *"when I add a person, I want to see a field for family name, it should default to al-batati, but if it was not al-batati, I have to add, then look for it, then edit to be able to change the family name."*

### Added — Delete person from Edit form
- **Red "حذف الشخص / Delete person" button in the EditPersonForm footer** ([components/tree/EditPersonForm.tsx](components/tree/EditPersonForm.tsx)) — left-aligned, separated from Cancel/Save on the right. Triggers a localized `window.confirm` that explicitly warns "this will remove the person and all their relationships (children/spouses/siblings…)" before issuing a single `DELETE FROM public.people WHERE id = …` via the browser Supabase client. The `ON DELETE CASCADE` FKs on `relationships.from_id` / `to_id` clean up every related row automatically — no separate relationship delete needed.
- **New `onDeleted` callback prop** on EditPersonForm. After a successful delete, `router.refresh()` runs, then `onDeleted()` fires, then `onClose()` closes the form.
- **PersonProfile wires `onDeleted` → its own `onClose`** ([components/tree/PersonProfile.tsx](components/tree/PersonProfile.tsx)) so the side panel closes too. TreeCanvas's existing `setSelectedId(null)` on profile close then clears the focus selection, so the tree settles on a coherent state with no dangling selection.
- **RLS** — write-delete on `public.people` is gated by the same `editors` policy as updates/inserts, so non-editors can't trigger this even if they hack the UI.
- **Caveat**: deleting a person who is referenced as a parent in another generation's `parent_of` row will sever that branch (CASCADE drops the relationship). The descendants' `people` rows are NOT deleted — they just become roots in the tree. That's the intended behavior for fixing a mis-added person.
- User prompt: *"I want to be able to delete a person when I edit the entry"*

### Added — Tree view: family-name windows
- **Family grouping in CollapsibleTree** ([components/tree/CollapsibleTree.tsx](components/tree/CollapsibleTree.tsx)) — people are now bucketed by `family_ar` (or `family_en` in English mode) into separate collapsible windows. Each window renders its own internal hierarchy. The primary family (البطاطي / Al-Batati) is pinned to the top with a primary badge and is open by default; other families follow in descending member count and are collapsed by default.
- **Intra-family hierarchy** — `buildMaps` is now called per-family with that family's members only, so it only registers `parent_of` edges that stay inside the family. A wife from family Y married into family X (with children in X) appears as a root in Y's window, while her children appear under her husband in X's window — exactly how the patrilineal record reads.
- **Search auto-opens windows with matches** — when a search hit is in a non-primary family, that family's `<details>` is force-opened so the highlight isn't hidden. User toggles persist via an override map keyed by family name.
- **Family header bar** — each window's `<summary>` shows the family name (display font for the primary family), member count, and root count. Primary family has a sand-900 border and "العائلة الرئيسية / primary" pill.
- **`Expand`/`Collapse` buttons now act across all family windows.**
- **Tree-page header line** updates to show the family count alongside the people count: "695 · 4 families".
- User prompt: *"In the tree view, I want to make seperation between families. So all that has similar family name will be under that familty window"*

### Added — Insights: time-machine filter, naming heatmap, peninsula map, deeper consanguinity, click-through pair lists
- **Time machine** (gen-range slider) — new client component [components/insights/TimeMachine.tsx](components/insights/TimeMachine.tsx). Two range inputs update the URL's `?fromGen=&toGen=` params with a 250ms debounce via `router.replace`. The server route re-runs `computeStats` on the filtered slice while still using the FULL `parentsOf` graph for ancestor lookup — so cousin detection stays correct even when the slider hides the grandparents.
- **2nd-cousin + great-uncle/aunt marriage detection** ([app/[locale]/insights/page.tsx](app/%5Blocale%5D/insights/page.tsx)) — new `classifyMarriage(a, b, parentsOf)` returns one of `first_cousin | second_cousin | great_uncle | other` by intersecting `ancestorsAtLevel` sets at depths 1/2/3. Each category gets its own pair list (`cousinMarriagePairs`, `secondCousinPairs`, `greatUnclePairs`).
- **Click-through pair lists** — new `ExpandableSection` (native `<details>` + `<summary>`, no client JS) renders the full pair list under each consanguinity card and under the in-law and milk-sibling cards. So tapping "first cousin marriages: 13" expands into the actual 13 pairs with both names.
- **Naming heatmap** — new `NamingHeatmap` component renders a top-10-names × generations grid. Cell intensity (`rgba(27,73,101, count/max)`) shows how name popularity shifts across time; cell numbers stay readable via auto white/dark text based on alpha.
- **Arabian Peninsula map** — new `SaudiMap` component. Stylized SVG outline (single `<path>`) with dots positioned via a static `CITY_COORDS` lookup of ~20 Saudi + Yemen cities (Arabic and English keys both). Cities are detected by exact-match-then-substring on the `location` field. Dot radius scales with `√(count/max)`. Falls back to "no matched location data" when zero rows match.
- **In-law section** is now both summary (top-10 bar chart) AND expandable pair list — the editor can see every documented marriage with each external family.
- **Removed the open-web "Heritage references" section** per user feedback: "they all are wrong, I will provide accurate sources later". The structure is gone; will be re-added once authoritative sources are supplied.
- **`isFiltered` banner** — when the user has the slider away from the full range, a one-line note shows `"Showing stats for generations G3–G6 only (N people of M)"`.
- **Cousin detection is consistent under filtering** — the `parentsOf` graph is built once from the FULL relationship set before `computeStats` runs on the filtered slice; only the *display* of marriages is restricted to pairs where both spouses are in the filtered set.
- User prompt: *"Do all of them please. Also remove the 'Open-web sources on the origins and history of the Al-Batati family.' They all are wrong, I will provide you with accurate sources later"*

### Added — Insights page: rich analytics + charts + heritage references
- **`export const dynamic = "force-dynamic"` + `revalidate = 0`** on the insights route ([app/[locale]/insights/page.tsx](app/%5Blocale%5D/insights/page.tsx)) so the stats always reflect the live DB instead of an opportunistically cached SSR.
- **`computeStats` massively expanded** — new fields: `topNames` (top 10), `familySizeBuckets`, `inLawFamilies`, `milkSiblingPairs` + `milkSiblingExamples`, `multiSpouseCount` + `multiSpouseTop`, `cousinMarriages`, `statusBreakdown`, `topLocations`, `totalSpouseLinks`, `endogamyRate`. Cousin-marriage detection runs grandparent-set intersection over unique spouse pairs; in-law family counting only fires when exactly one side has `familyAr !== "البطاطي"` (so cousin marriages don't inflate the in-law count). Top dual-name now constrained to patrilineal pairs (parent gender = male) since `X بن Y` is patronymic.
- **Inline SVG chart components** (no dependencies, no client interactivity needed):
  - `BarChart` — Tailwind divs, accent color per chart, value label inline.
  - `GenerationPyramid` — mirrored male/female bars centered on the gen label.
  - `StatusDonut` — pure SVG (two `<circle>` arcs via `strokeDasharray` + dashoffset) with the total in the middle.
- **New rendered sections**:
  - Extended KPI grid — 6 new cards (multi-spouse count, milk-sibling pairs, cousin marriages, in-law families, total marriages, endogamy %).
  - Generation pyramid.
  - 3-column row: top 10 names / family-size distribution / status donut.
  - 2-column row: in-law families bar chart + multi-spouse top-5 list (الصِّهر / الصهور والمصاهرة).
  - Milk siblings section with examples.
  - Locations bar chart (only shown when at least one person has a location).
  - Generation table (preserved).
  - **Heritage references** — 5 open-web sources on Al-Batati origins, in both `ar` and `en` ordering, rendered as nofollow external links with a caveat note.
- **Why include external references**: per the user's brief, the analytics surface is "an entrance to the wider family heritage". Online genealogical references (Ashabakah, Wikipedia disambiguation, etc.) give visitors context without claiming to be authoritative — the family historian still owns the source of truth.
- User prompt: *"Is the insights tab dynamic and changes with each update? Also, I want to enhance it and enrich it with data analytics. Do your best to impress me here with analytics, stats, diagrams, charts, other families in law (الصهور والمصاهرة), milk siblings, ... Also start to look for references online to use for enriching the website"*

### Added — Standalone "Add person" button (no center required)
- **New component** ([components/tree/AddPersonForm.tsx](components/tree/AddPersonForm.tsx)) — modal that inserts a row into `public.people` with name (Ar required, En optional), gender (male/female toggle), and optional generation + birth year. Does NOT touch the `relationships` table; the editor wires the new person into the tree afterward via the side panel's quick-add buttons.
- **Button placement** ([components/tree/TreeCanvas.tsx](components/tree/TreeCanvas.tsx)) — emerald-pill "Add person" button beside the view-mode toggle in the top controls row. Editor-only (mirrors the AddRelativeForm gate). Inline locale strings, no new dictionary entries needed.
- User prompt: *"I want to add (Add person) button without focusing on any person. External button to add"*

### Fixed — Duplicate-key error in DescendantsView for re-reachable descendants
- **Bug**: when a descendant was reachable through more than one parent line from the center (cousin marriage, or any case where the center is an ancestor of both of a person's parents), the previous `buildTree` placed them twice — once as a fully-expanded node on the first encounter, and once as a leaf on the second (`visited` Set was preventing infinite recursion but not the second placement). React then warned `"Encountered two children with the same key"` and stats double-counted that person.
- **Fix** ([components/tree/DescendantsView.tsx](components/tree/DescendantsView.tsx)): renamed the guard to `placed`, and on second encounter `recurse` returns `null` instead of an empty-children node. The parent filters `null`s out of its `children` array. Each descendant is now placed exactly once (under whichever parent's branch is traversed first), keys are unique, and stats are correct.

### Added — Descendants view
- **New view mode** "descendants" in `ViewModeToggle` ([components/tree/ViewModeToggle.tsx](components/tree/ViewModeToggle.tsx)) — fourth tab alongside Tree / Focus / Layers, with a tree-down icon. Disabled until a person is selected (same gating as Focus). Labels: `الذرية` / `Descendants` added to `tree.views` in both locales.
- **New component** ([components/tree/DescendantsView.tsx](components/tree/DescendantsView.tsx)) — top-down hierarchical tree of every descendant of the center person.
  - **Layout**: tidy-tree post-order — `subtreeWidth = max(NODE_W + H_GAP, sum of children subtreeWidths)`; parent x is centered between its first and last child. Cycle protection via a `visited` Set so a self-referential `parent_of` row can't infinite-recurse.
  - **Rendering**: SVG with `foreignObject` HTML buttons for nodes (same color-by-layer styling as PersonNode); 3-segment elbow paths for parent→child edges (green, matching the existing children-relationship color).
  - **Stats card** (top-start corner, overlaid on the canvas) — total descendants, male count, female count, generation depth. Excludes the center person from counts.
  - **Zoom** (top-end corner) — `−` / percent label / `+` buttons. Range 25%–300%, 20% increments, percent label resets to 100%. Implemented via SVG `width`/`height` scaling against a fixed `viewBox` so layout coordinates stay stable.
  - **Scroll viewport**: outer div is `overflow-auto` with `maxHeight: 78vh` so the canvas pans naturally when the tree exceeds the viewport.
- **Wired into TreeCanvas** ([components/tree/TreeCanvas.tsx](components/tree/TreeCanvas.tsx)) — renders DescendantsView when `viewMode === "descendants"` and a person is selected, otherwise shows the empty-state placeholder.
- User prompt: *"I want to add a view that is similar to the Focus view, However, it will show all the offspring to a person (children, grand children, till the end) where we can zoom in and out and see all the offspring from a person of interest with a brief stat box in the corner above saying how many male/female offspring"*

### Docs — README updated with live URL, full Supabase setup, deploy guide, and troubleshooting
- **Live URL surfaced** ([README.md](README.md)): `https://batati-family-tree.vercel.app` at the top of the README.
- **Stack badges refreshed**: Next 16 + React 19 instead of Next 14 + React 18; added a Vercel hosting note.
- **Supabase setup section rewritten** with the migration order (`schema.sql` → `dedupe-relationships.sql` → `auth.sql` → optional `seed-tree.sql`) and a `notify pgrst, 'reload schema'` step. Explicitly calls out the publishable vs secret API-key distinction (and to rotate any leaked secret) since a leaked `sb_secret_…` in `NEXT_PUBLIC_…` triggers Supabase's "Forbidden use of secret API key in browser" guardrail.
- **Vercel deploy section added** with the exact env-var names + scope (Production, Preview, Development) + the redeploy gotcha (Vercel doesn't pick up env-var changes on existing builds).
- **Auth callback URL section added** — explains both Site URL and Redirect URLs, with wildcard examples (`https://batati-family-tree.vercel.app/**`).
- **Roadmap updated** — DB writes, auth, 695-person import, relate page, and PDF export are now checked off.
- **Troubleshooting section added** covering: duplicate relationships → run `dedupe-relationships.sql`; secret API key error → rotate + replace with publishable; editor badge missing → run `editors` INSERT; magic-link error → fix Site/Redirect URLs; tree not refreshing → `force-dynamic` requirement.
- User prompt: *"yes, also add the domain to the readme"* (in response to the offer to document the schema + dedupe migration order).

### Fixed — Tree route now always re-renders on `router.refresh()`
- **Symptom**: editor adds a relative → DB write succeeds (Network shows `201 Created`) → modal closes → tree doesn't update. Inconsistent — sometimes the same flow worked, sometimes the new person showed up at the root with no parent connection.
- **Root cause**: Next 16 can opportunistically cache the SSR output of `app/[locale]/tree/page.tsx` even when the underlying `cookies()` call would normally mark it dynamic. When the client calls `router.refresh()` after an insert, Next sees the route as "already fresh" and doesn't actually re-execute `loadTree()`, so the new rows never reach the client.
- **Fix**: explicit `export const dynamic = "force-dynamic"` + `export const revalidate = 0` on the tree route ([app/[locale]/tree/page.tsx](app/[locale]/tree/page.tsx)). This guarantees every render re-runs `loadTree` against Supabase.
- **Belt-and-suspenders in `TreeCanvas`** ([components/tree/TreeCanvas.tsx](components/tree/TreeCanvas.tsx)): the parent's `AddRelativeForm.onClose` now always calls `router.refresh()` in addition to clearing `pendingAdd`. So even if the form's own dirty-tracking missed a write (e.g. background spouse-link inserts, future code paths), the tree still re-pulls on close.
- User prompt: *"It is still does not work always (not consistant)"* + screenshot showing عاطف with two parent placeholders after picking an existing ازهار in the form.

### Fixed — AddRelativeForm now refreshes when closed after a successful primary insert
- **Bug** ([components/tree/AddRelativeForm.tsx](components/tree/AddRelativeForm.tsx)): after the primary insert (person + relationship row) succeeded, the form sometimes switched to the linkOthers follow-up step (e.g. "which spouse is the mother of this new son?"). If the editor closed the modal at that point — via the X button, clicking the backdrop, or pressing Escape — the existing code called `onClose` directly without `router.refresh()`, so the route didn't re-fetch. The new person + relationship were in the DB (Network tab showed 201 Created on the POST), but the tree continued displaying the stale snapshot — symptom: "I add a son and he shows up at the root and the relation doesn't update".
- **Fix**: track a `dirtyRef` boolean inside the form; set it to `true` immediately after the primary `relationships` insert resolves (whether or not the form proceeds to linkOthers). Replace every close path (X button, backdrop click, Escape key, and the primary-step Cancel button) with a `closeAndMaybeRefresh` wrapper that calls `router.refresh()` first when `dirtyRef.current` is true, then `onClose`. The explicit Save paths still call `router.refresh()` unconditionally, so behavior on the happy path is unchanged.
- User prompt: *"Adding relation does not work anymore!"* — diagnosed via Network tab showing `POST /rest/v1/relationships → 201 Created`, confirming the data reached the DB; the missing refresh was the only remaining culprit.

### Added — PDF export from FocusView
- **"Export PDF" button in the FocusView toolbar** ([components/tree/TreeCanvas.tsx](components/tree/TreeCanvas.tsx)) — top-right of the focus-view container, with a download-arrow icon and a locale-aware label (تصدير PDF / Export PDF).
- **Dependency-free implementation** — clicking the button opens a new browser window containing (1) a cloned copy of the live SVG (width/height attributes stripped, `preserveAspectRatio` set so it scales to the page), (2) the document's `<link rel="stylesheet">` and inline `<style>` tags re-attached so Tailwind classes inside `foreignObject` HTML still render exactly as on-screen, (3) a centered title with the person's name + the current date, and (4) print CSS that targets A3 landscape with 8mm margins. After load, the window auto-triggers `window.print()`; the user picks "Save as PDF" from the print dialog. An `afterprint` listener closes the popup. No new npm dependencies (the documented Google Drive `npm install` issue meant we wanted to avoid jsPDF / html2canvas).
- **Popup blocker fallback** — if the browser blocks the popup, the user gets a localized alert telling them to allow popups.
- User prompt: *"Add pdf export functionality to the focus view"*

### Changed — Spouse layout: 1st marriage on left, 2nd+ stack on the right
- **Spouse placement rewritten** ([components/tree/TreeCanvas.tsx](components/tree/TreeCanvas.tsx)) — previously the layout alternated sides (i=0 right, i=1 left, i=2 right-above, …). Now: `i = 0` (first marriage) anchors on the LEFT, every subsequent marriage stacks on the RIGHT with later ones higher (`i = 1` = column 0 right, `i = 2` = column 1 right, `i = 3` = column 2 right, …). The "original spouse" stays at the same y as the centered person on the left; later marriages form a vertical tower on the right that grows upward as more spouses are added.
- **Helper extracted** — `spouseColumnFor(i: number) => i === 0 ? 0 : i - 1` is reused by `spouseSlot`, `_placeholderColumn`, and `maxSpouseColumn` so the formula lives in one place.
- **L-shape children drop emerges from the icon's SIDE** — for any column ≥ 1 spouse (stacked-above), the children's drop now starts at `(iconX + side × 14, iconY)` — the icon's edge facing the spouse, at the icon's y-center — instead of `(iconX, iconY + 14)` (the icon's bottom). The bottom of the icon is now reserved for the trunk segment connecting to the column-below icon, and the horizontal "branch" run reads as emerging *from* the marriage rather than dropping below them. The vertical descent then runs from the L-corner at `iconY` down to the per-group rail.
- User prompt: *"1- for the one stacked above the other, make the offspring line connect to the side of the rings icon instead of bottom 2- Make the 1st spouse in the left, and 2nd and 3rd stacked above each other"*

### Fixed — Children-row stagger is now large enough to clear node height
- **`CHILD_STAGGER` bumped from 22px → 56px** ([components/tree/TreeCanvas.tsx](components/tree/TreeCanvas.tsx)) — the previous 22px was smaller than `nodeH = 44px`, so a staggered-up row's bottom edge sat *inside* the baseline row's top, making names overlap visually. 56px = `nodeH + 12px` gap, so adjacent rows are now cleanly separated.
- **`Y_CHILD_RAIL` grows by `(totalRanksUsed − 1) × CHILD_STAGGER`** — without this, pushing rows higher with a larger stagger would make the earliest rank's row collide with the marriage-rings icons / center node. Now the *latest* marriage's row stays at the original baseline position (`Y_CENTER + centerH/2 + 50`), the *earliest* always sits above it by `(totalRanksUsed − 1) × CHILD_STAGGER`, and `H` (and via it the SVG height) grows proportionally so the layout has room for arbitrarily many marriage ranks without intruding upward.
- **Rank computation hoisted** — `rankedSpouseIds` / `ranksWithChildren` / `totalRanksUsed` are now computed once near the top of `FocusView` (right after `spouseEntries.sort`), so `Y_CHILD_RAIL` can use the count *before* the L5 IIFE runs. The L5 block now consumes these instead of recomputing the rank locally.
- Note: only ranks whose spouse has *children* count toward `totalRanksUsed` — a ranked spouse with no kids doesn't need a row, so they don't take vertical space.
- User prompt: *"It works but they are overfloating above each other, the lines are not clear"* (screenshot showed نجلاء's row touching ياسر's row at the same y because the 22px stagger didn't clear `nodeH`).

### Added — `marriage_order` property on `spouse_of` relationships
- **New `marriage_order int` column on `public.relationships`** ([supabase/schema.sql](supabase/schema.sql)) — explicit ordering among one person's marriages (1 = first marriage, ascending). Idempotent `alter table ... add column if not exists` so existing installs pick it up. Semantics: from the perspective of `from_id`. `AddRelativeForm.metaFor("spouse")` already inserts spouse rows with `fromIsCurrent: true`, so the centered person is `from_id` and the value is meaningfully theirs.
  - User-facing migration to run on existing installs:
    ```sql
    alter table public.relationships add column if not exists marriage_order int;
    notify pgrst, 'reload schema';
    ```
- **`Relationship.marriageOrder?` in TS** ([lib/types.ts](lib/types.ts)) + **mapped in `loadTree`** ([lib/data/loadTree.ts](lib/data/loadTree.ts)).
- **FocusView spouses now sort by `marriage_order`** ([components/tree/TreeCanvas.tsx](components/tree/TreeCanvas.tsx)) — `spouseEntries` is sorted by `marriageOrderFor(spouseId)` so the first marriage gets `i=0` (column 0 slot, base position) and later marriages stack outward / above. Spouses with no order keep insertion order and fall after those that have one.
- **Children groups stagger vertically by marriage rank** — earlier marriages' children sit slightly above later marriages' to keep names from crowding. Implementation: `yOffsetFor(group)` returns `(rank - (totalRanks - 1)) * STAGGER` where `STAGGER = 22px`; rank 0 (earliest) gets the largest negative offset, rank N-1 (latest) sits at the baseline `Y_CHILD_RAIL`. Per-group `groupRailY` / `groupChildY` are threaded through the drop, bridge, rail, child-line, and child-node positions. Groups without a known marriage_order (or the orphan group with unknown mother) stay at baseline.
- **PersonProfile chevrons for spouse rows** ([components/tree/PersonProfile.tsx](components/tree/PersonProfile.tsx)) — mirror the sibling chevrons. `orderedSpousesForPerson` builds the sorted list (by `marriageOrder`, then by row id); `moveSpouse(spouseRelId, direction)` re-numbers all of this person's spouse rows `marriage_order = 1..n` via parallel `relationships.update`. Tooltips: "زواج سابق / Earlier marriage" and "زواج لاحق / Later marriage".
- User prompt: *"create a property of marriage order (similar to birth order) Where childern of the prior will be shifted slightly above the one after to make sure names do not interfere on top of each other"*

### Changed — Stacked-spouse rings icon now sits at the row midpoint
- **Column ≥ 1 rings icon moved to the vertical midpoint between the two adjacent spouse rows** — previously, the column-1 icon sat at column-1's spouse row (level with فوزية's node), which left it visually attached to the spouse rather than centered "between" the two marriages. Now `spouseSlot(i).iconY = sy + VERT_SPACING / 2` for column ≥ 1, so the rings icon for فوزية's marriage sits halfway between انتصار's row (Y_CENTER) and فوزية's row (Y_CENTER − VERT_SPACING). The icon for column ≥ 2 similarly sits at the midpoint between the previous and current spouse rows.
- **`marriageSegments` now draws a 3-segment trunk for column ≥ 1** — (1) vertical from the previous column's icon top edge to this icon's bottom edge, (2) vertical from this icon's top edge up to the current column's spouse row, (3) horizontal from the trunk-top across to the spouse node. The icon is therefore interrupted by the trunk on both sides, reading as a marriage tie placed exactly between the two stacked spouses.
- The L-shaped children drop still starts at the icon's bottom edge and works as before — the drop's horizontal segment emanates from `(iconX, iconY + 14)` outward to `dropX`, so it leaves the trunk cleanly and the column-1 drop continues to clear the column-0 spouse row at the far side.
- File: `components/tree/TreeCanvas.tsx`.
- User prompt: *"make the rings icon of the above فوزية in the center distance between فوزية and انتصار."*

### Fixed — Stacked-spouse children drops no longer cross the column-0 drop
- **Children drops route around the column-0 spouse** — when a center person has 3+ spouses, the stacked spouses (column ≥ 1, drawn vertically above the column-0 spouse) used to drop their children's branch straight down from the marriage rings icon. Because every higher-column rings icon shares the same x as column 0's icon (newly aligned, see below), the drop overlapped column 0's drop and the column-0 spouse's children rail. Now column ≥ 1 drops are L-shaped: a short horizontal run from the rings icon's bottom edge out past the spouse's own node (on her side), then a vertical descent to `Y_CHILD_RAIL`. The terminal x (`dropX`) is `sx + side × (nodeW/2 + 30 + (column − 1) × 50)`, so successive stacked columns fan out incrementally without collision.
- **All stacked rings icons are now column-aligned (same x)** — `spouseSlot(i).iconX` is now always `col0IconX = (sourceX + targetX) / 2` regardless of column, so higher-column rings icons sit directly above column 0's icon. `marriageSegments` was updated to match: column ≥ 1 draws a trunk segment (vertical from the previous icon's top edge to this icon's bottom edge) plus a horizontal segment from this icon's far edge to the spouse node.
- **All children branch icons share a common y line** — `Y_BRANCH = Y_CENTER + centerH / 2 + 18` is a new constant. Every drop's branch icon (green child sapling) is rendered at `(terminalX, Y_BRANCH)` regardless of column, so the icons read as a single horizontal alignment across all spouses' children. The child rail itself (`Y_CHILD_RAIL`) was pushed slightly further down (+50 vs the previous +24) to keep the branch icon centered on the visible part of the drop.
- **Group sort key switched from `iconX` to `dropX`** — `groupAnchorX` now uses each spouse's `dropX` so children groups are positioned left → right by where their drops actually land at the child rail, not by where their rings icon sits. This keeps the bridges from drop terminal to group center from crossing on `Y_CHILD_RAIL`.
- File: `components/tree/TreeCanvas.tsx`.
- User prompt: *"This is much better. But the children is interfering with the other line (فوزية child line is on top of انتصار's line). Can we make the two rings icons on top of each others (aligned), then فوزية children lines start by going to the right then down. Also align the child icon horizontally"*

### Added
- **First real Supabase read** — `app/[locale]/tree/page.tsx` now calls `loadTree()` (in `lib/data/loadTree.ts`) instead of importing seed directly. The loader queries `public.people` and `public.relationships` via `getServerSupabase()`, maps snake_case columns to the camelCase TS types, and falls back to seed data when (a) env vars are absent, (b) the query errors, or (c) the `people` table is empty. The null-safe fallback path documented in CLAUDE.md is preserved.
  - User prompt: *"Ok, the database has some rows now. What should I do next?"*
- **Full 1430 H. family tree reconstructed from PowerPoint source** — `supabase/seed-tree.sql` contains INSERTs for **695 people across 11 generations + 694 parent_of relationships**, reverse-engineered from the legacy `الشجرة كاملة 1430.ppt` (Microsoft Org Chart 2003 binary). Pipeline: PowerPoint COM → `.pptx` → unzipped → `ppt/drawings/vmlDrawing1.vml` parsed for 695 `<v:roundrect>` person boxes + 694 `<o:r>` connector rules; each shape's `<p:textdata id="rIdN"/>` mapped via `vmlDrawing1.vml.rels` → `legacyDiagramTextN.bin` (UTF-16LE Arabic name). Root: ناصر (Gen 0) → 6 sons (Gen 1) → fan-out to Gen 10. Intermediate artifacts (extracted text, tree JSON, rendered PNG) live under `ppt-extract/` (gitignored). Defaults: `gender='male'`, `status='unknown'` — refine via UI.
  - User prompt: *"analyze the .ppt to make the database, then I will expand"*

- **Multi-view tree visualization** — the tree page now supports three modes selectable via a segmented `ViewModeToggle` at the top:
  - **Tree** (default) — new `components/tree/CollapsibleTree.tsx`. Vertical indented tree, click ▾ to expand, name to open profile, scales to 695+ nodes. Search auto-expands ancestor paths to matches.
  - **Focus** — the existing radial relationship view, now reached either by selecting a person + switching mode, or via a "Focus on" button in the side panel. Disabled in the toggle until a person is selected.
  - **Layers** — the prior generation-grid; each row is now scrollable instead of overflowing horizontally (Gen 7 has 207 people).
- **Search** — `components/tree/TreeSearch.tsx`. Matches against `nameAr` (substring) and `nameEn` (case-insensitive). Live result count, clears via X button. In Tree mode, hits get highlighted and their ancestor path is auto-expanded.
- **Profile is now a side panel, not a modal** — `components/tree/PersonProfile.tsx` changed from full-screen `fixed inset-0` with backdrop blur to a right-edge drawer (`fixed inset-y-0 end-0 w-full sm:w-[420px]`) with no backdrop, so the tree remains visible alongside the profile. Esc closes. Added a "Focus on" button in the panel header that switches the main view to Focus mode for the selected person.
- **Dictionary additions** — `tree.views`, `tree.search`, `tree.actions` keys added to the `Dictionary` type and both `ar`/`en` records.
- **New icons** — `ChevronIcon`, `SearchIcon`, `TreeIcon`, `LayersIcon`, `FocusIcon` in `components/icons.tsx`.
  - User prompt: *"I can not see the tree view clearly. It pops only after I press on a name, and it appears blurred behind the person window. Add multiple views to the tree to visualize."*

### Fixed
- **CollapsibleTree multi-parent dedup** — when a person had multiple `parent_of` rows (e.g. both father and mother, as in the offline `lib/data/seed.ts`), they were rendered under each parent. Now `buildMaps` records only the first-encountered parent, so each person appears in the tree exactly once. The full set of parents is still shown in the side-panel relationships list.

### Added — Authentication (magic link + editors gate)
- **`proxy.ts` at repo root** — Next 16's renamed middleware. Refreshes the Supabase auth cookie on every request via `@supabase/ssr`'s `createServerClient`. No-op when Supabase env vars are missing. Matcher excludes static assets and image endpoints. (Note: originally `middleware.ts`; Next 16 deprecated that filename in favor of `proxy.ts` with an exported `proxy` function — both file and export renamed.)
- **`supabase/auth.sql`** — Creates `public.editors (user_id, email, granted_at, granted_by)` referencing `auth.users`. Tightens write policies on every data table: previous `for all to authenticated` becomes `for all to authenticated using/with check (auth.uid() in (select user_id from public.editors))`. Public read access on `people/relationships/sources/events/person_sources` is unchanged. Includes a documented bootstrap step for granting the first editor.
- **`lib/auth.ts`** — server-side `getCurrentUser()` and `isEditor()` helpers. Both are null-safe (return `null`/`false` when Supabase env is missing). `isEditor()` is a UX convenience — RLS is the actual security boundary.
- **Login flow** — `app/[locale]/login/page.tsx` + `components/auth/LoginForm.tsx` (client). Email + "Send magic link" form using `supabase.auth.signInWithOtp({ emailRedirectTo: /auth/callback?next=/<locale> })`. States: idle → sending → sent / error. Gracefully degrades when Supabase isn't configured.
- **Auth callback** — `app/auth/callback/route.ts`. GET handler reads `?code=...`, exchanges it for a session via `exchangeCodeForSession`, sets cookies on the redirect response, and forwards to `?next=...`. On error, redirects home with `?auth_error=...`.
- **Sign-out** — `app/auth/signout/route.ts`. POST handler that invokes `supabase.auth.signOut()` and redirects to the page the user came from (origin-checked).
- **Header now async** — `components/Header.tsx` is now an async server component. Reads `getCurrentUser()` + `isEditor()` in parallel; shows sign-in link when logged out, email pill (+ "Editor" badge if applicable) + sign-out button (as a `<form action="/auth/signout" method="post">`) when logged in. All routes that go through the locale layout are now `ƒ (Dynamic)` as a result — expected, since auth state must be live.
- **Dictionary additions** — `auth.*` keys for both `ar` and `en` (signIn, signOut, loginTitle, loginSubtitle, emailLabel, emailPlaceholder, sendLink, sending, linkSent, linkSentHint, notConfigured, editor, notEditor, notEditorHint).
  - User prompt: *"Implement Magic link + editors approach"*

### Fixed
- **Recursive RLS on `public.editors`** — initial policy used `auth.uid() in (select user_id from public.editors)`, which is self-referential under RLS and silently returned no rows for everyone. `isEditor()` therefore always returned false even after a user was inserted into `editors`. Replaced with `using (user_id = auth.uid())` — the only thing the app needs is to ask "am I in this table?" against the user's own row.
  - User-facing migration to run on existing installs:
    ```sql
    drop policy if exists "editors readable by editors" on public.editors;
    create policy "editors read own row" on public.editors
      for select to authenticated using (user_id = auth.uid());
    ```
  - User prompt: *"I have ran this insert ... but still I am signed in but no editor badge!"*

### Added — Add Relative writes (editor-gated)
- **`components/tree/AddRelativeForm.tsx`** — client modal that opens when an editor clicks an "Add father / mother / son / …" button. Pure form (name in Arabic required, English optional). On submit, uses the browser Supabase client to (1) insert a new row in `public.people` with auto-computed gender + generation based on the relative type, then (2) insert a row in `public.relationships` with the right direction (`parent_of`, `spouse_of`, `sibling_of`, `milk_sibling_of`, or the uncle/aunt variants). Calls `router.refresh()` on success so the tree re-renders with the new node.
- **`PersonProfile` now editor-aware** — `onAddRelative` prop dropped; the component owns the `pendingAdd` state and renders `AddRelativeForm` directly. When `isEditor === false`, the Add-quick-buttons row is replaced with a "you need editor permission" notice instead of being hidden, so non-editors understand why the actions aren't available.
- **`isEditor` plumbed through** — `app/[locale]/tree/page.tsx` now awaits `loadTree()` and `isEditor()` in parallel and passes `editor` to `TreeCanvas`, which forwards it to `PersonProfile`. The check is a UX gate; RLS on `public.people` and `public.relationships` is the actual security boundary (rejects writes from non-editors regardless of UI).
- **Relationship semantics encoded once** — `metaFor()` in `AddRelativeForm` maps each relative key to `{ type, gender, generation, fromIsCurrent }`. Direction matters: `parent_of(A,B)` means A is the parent of B, so "Add father" inserts a new person with `fromIsCurrent: false` (the new person is the parent). Spouse defaults to opposite gender of the current person; milk-sibling defaults to same gender.
- **Dictionary additions** — `tree.add.nameArLabel`, `nameEnLabel`, `saving`, `notEditor`, `forPerson` in both `ar` and `en`.
  - User prompt: *"Continue to fix the Add relative buttons"*

### Changed — Female visibility (revised: structure visible, name redacted)
- **Reverted the gender-based RLS policy** introduced earlier. `public read people` is now back to unconditional (`for select using (true)`), so non-editors can see female rows and the relationship edges that touch them — the *structure* of the tree stays intact for everyone.
- **Name redaction moved into the application layer.** `lib/data/loadTree.ts` now accepts `{ maskFemaleAs: string | null }`. When set, every row with `gender='female'` has its `nameAr` / `nameEn` replaced with the placeholder string and `nameRedacted: true` is set on the resulting `Person`. Other identifying fields (`location`, `occupation*`, `bio*`, `photoUrl`) are also stripped for redacted rows. The id, gender, generation, and relationship links pass through untouched, so the side panel for a male still shows e.g. "Mother → محجوبة" (instead of dropping the row entirely).
- **`Person` type** gained an optional `nameRedacted?: boolean` flag.
- **Tree page + Relate page** compute the placeholder from `t.tree.redactedFemale` (`محجوبة` / `(hidden)`) and pass `maskFemaleAs` only when the viewer isn't an editor. Insights loads unmasked — counts only, no personal exposure.
- **Migration for existing DBs:**
  ```sql
  drop policy if exists "public read males, editors see all" on public.people;
  create policy "public read people" on public.people for select using (true);
  ```
  - User prompt: *"For non editors, they can see relationships to females but without showing the names"*

### Changed — Parent vs child visual differentiation
- **`parent_of` is now direction-aware** in `RELATIONSHIP_STYLE` (via the new `styleForRel(type, isFrom)` in `lib/relationships.ts`):
  - **Parent** (I'm the child): deep blue `#1b4965` + `BranchIcon` (upward growth — roots).
  - **Child** (I'm the parent): forest green `#2e7d4f` + new `ChildIcon` (downward sapling).
- Applied in `PersonProfile` relationships list, `FocusView` edges, and `RelateExplorer` chain edges. The legend and DB schema for `RELATIONSHIP_STYLE` are unchanged; the directional override is computed at the call site.
  - User prompt: *"differentiate between the symbol and color of the parent and child"*

### Fixed — Focus view now shows all relationships, not just parental
- `TreeCanvas.focusRels` now calls the shared `computeRelationshipsFor` helper, so the radial view surfaces explicit relationships **plus implicit siblings** (same-parent peers). The layer filters for milk/extended kin still apply. Previously the view only showed rows from `relationships` directly, which on the imported seed meant only parent/child edges.
- **Shared helper extracted:** `lib/relationships.ts` now exports `computeRelationshipsFor`, `labelForRel`, `styleForRel`, `relationshipSortKey`, plus graph utilities `buildRelationshipGraph` and `shortestPath`. `PersonProfile` no longer hosts its own copies.
  - User prompt: *"Focus view still shows only parental relationships, I want to show all relationships here"*

### Added — Enriched Insights page
- [app/[locale]/insights/page.tsx](app/[locale]/insights/page.tsx) now reads from Supabase via `loadTree()` and computes:
  - Total people / males / females / relationships
  - Average children per parent + largest family (parent with most children)
  - Most common single name (with usage count)
  - Most common dual name "child بن parent" (e.g. محمد بن أحمد) with count
  - Number of unique names (names appearing exactly once)
  - Most-connected person, deepest generation reached
  - **By-generation table**: per-gen count, M/F split, and an approximate timeframe (assumes ~25 years per generation, latest gen ≈ 2025).
- New `insights.*` dictionary keys for all the new labels.
  - User prompt: *"Enrich the analysis with more values…"*

### Changed — Hierarchical Focus view
- **3-row layout** replaces the radial-circle layout in `FocusView`:
  - **Top row** — parents, aunts, uncles (everything above the center generation-wise).
  - **Middle row** — siblings, spouses, milk-siblings, cousins (same generation), flanking the center person who occupies `cx`.
  - **Bottom row** — children (`parent_of` rows where the center is the `from`).
- The canvas width now scales with the widest row (`W = max(760, widestRow × 170 + 120)`); horizontal scroll is enabled if it overflows.
  - User prompt: *"In the focus view, always put children below, siblings on the same level horizontally, parents and aunts and uncles above."*

### Added — Per-category Focus filters
- New `components/tree/FocusFilters.tsx` toggle bar that appears in Focus mode only (above the canvas). Toggles: **Parents, Siblings, Spouses, Children, Milk-siblings, Uncles & aunts, Females**.
- Each toggle filters `focusRels` deterministically: `parent_of` is split into parents vs children based on direction; uncles/aunts/cousins share the **extended** toggle; the **females** toggle hides every non-male relative regardless of relationship type.
- Replaces the indirect milk/extended filtering that used to piggyback on the layer toggles. The layer toggles still exist for the Layers view.
- New `tree.focus.filters.*` dictionary block (Ar + En).
  - User prompt: *"I want toggle buttons in the focus view (toggle siblings on/off, aunts and uncles, females, milk sibling, ...)"*

### Changed — Stacked-spouse marriages are now elbowed, children bridges sorted to avoid crossings
- Stacked spouses (column ≥ 1) used to render their marriage edge as a single diagonal from the center's adjacent edge straight to the spouse. With multiple stacked spouses on the same side those diagonals fanned out and looked messy.
- New routing: each column-0 marriage is still a clean horizontal line at `Y_CENTER`. For column ≥ 1, the marriage edge becomes an **elbow** — a vertical trunk that rises out of column-0's rings icon to the stacked spouse's row, then a short horizontal to the spouse, with that row's own rings icon centered on the horizontal segment between the trunk and the spouse.
- The trunk has a single shared x = column-0's iconX (the midpoint of the column-0 horizontal). All stacked spouses on the same side share the trunk; their per-row icons sit at the midpoint of their respective horizontals — different x per column, so the L4→L5 children drops from each rings icon also end up at different x values and don't overlap into one vertical line.
- **Children groups now sort by parent's iconX.** The bottom-row children groups are laid out left → right by the x of their parent spouse's rings icon (or center for orphan children). Bridges from each drop to its children group's center stay on one side of each other instead of crossing.
  - User prompt: *"If more than two spouses, and you put them above each other. The ones that are not inline make the line type elbowed. Also make the children lines do not interfere with other lines somehow"*

### Changed — Multi-spouse layout: stack vertically once both sides are filled
- The L4 spouse layout used to spread every additional spouse outward on its respective side (i=0 left at offset 1, i=1 right at offset 1, i=2 left at offset 2, ...), which got wide and unreadable fast.
- New rule:
  - i=0 → right side, column 0 (regular row)
  - i=1 → left side, column 0 (regular row)
  - i=2 → right side, column 1 (**stacked above** i=0)
  - i=3 → left side, column 1 (stacked above i=1)
  - ...
- Spouses on the same side share the same x; vertical column = `floor(i/2)`. With 3 spouses you get "two on the right above each other, one on the left", exactly the layout you asked for.
- Each spouse keeps her own marriage edge to the center. For column = 0 the edge is horizontal at `Y_CENTER`; for column > 0 it's a diagonal from the center's adjacent edge up to the spouse's adjacent edge, with the rings icon abutting both endpoints regardless of angle (vector math: line ends 14 px short of the icon center along the unit vector).
- Children's drop anchor was unified: it now starts at the rings icon's **southern edge** (`iconY + 14`) for every spouse, so the L4→L5 drop stays vertical and the geometry matches.
- Canvas height auto-grows: `Y_CENTER` now leaves `maxSpouseColumn × VERT_SPACING` (70 px each) of vertical room between the sibling boxes (L3) and the L4 row, so stacked spouses can never collide with L3 above them.
- The "Add spouse" placeholder uses the same slot logic and contributes to `maxSpouseColumn` so it stacks correctly too.
  - User prompt: *"More than one spouse gets messy … if three spouses, two on the right above each other, and the third is on the left."*

### Fixed — Re-running the link step no longer produces duplicate rows
- `submitLinkOthers` now pre-computes the set of existing `(type, from_id, to_id)` triples from the form's `relationships` snapshot and filters every prospective insert against it. So re-adding a parent (or sibling, spouse, etc.) and re-checking the same candidates inserts nothing new — the link relationships you already have are skipped client-side, in addition to the DB-side unique constraint that's supposed to catch them. The constraint is still the primary defense; this is just so the bug doesn't show up if the migration hasn't been applied yet.
  - User prompt: *"When I do that multiple times names get dublicated."*

### Added — "Also set the other parent" inline picker
- When adding a father or mother, the link-others step now shows an extra green section: **"Also set the mother (optional)"** (or *the father*, mirrored). It has the same New / Existing toggle as the primary form, with a lineage-aware picker for existing-person mode. Filling it in inserts the second parent + auto-spouse link in the same submit — no second form session needed.
- New dictionary keys: `tree.add.linkStep.alsoSetMother` / `alsoSetFather`.
  - User prompt: *"When I create a new person then add a father, I should be able to check the mother right away also."*

### Changed — Generalized "link-others" follow-up step for every relative type
- The siblings-choose step (previously only triggered after adding a father or mother) is now generalized to **every** relative type whose addition implies a missing cross-link. The form chooses a category + link direction based on `relativeKey`:
  - **father / mother** → siblings to link (newIsParent — `parent_of(newPerson, sibling)`)
  - **spouse** → children to link (newIsParent — `parent_of(newSpouse, child)`)
  - **brother / sister** → parents to link (candidateIsParent — `parent_of(parent, newSibling)`)
  - **son / daughter** → spouses to link (candidateIsParent — `parent_of(spouse, newChild)`)
  - **milk / uncle / aunt** → no follow-up
- `AddRelativeForm` now uses a single `linkConfigFor(relativeKey)` helper to pick the category and direction, computes the candidate list once for whichever category applies, and the submit inserts each picked candidate using the appropriate parent_of direction. Duplicates are silently ignored by the unique constraint.
- Title / hint / empty-state strings are picked from a new `linkStep` dictionary block (siblings / children / parents / spouses variants), so each step reads naturally for its context.
- The renamed step is `"linkOthers"` (was `"siblings"`).
- User prompt: *"When I added a spouse and there was a kid, I did not get to choose who of these kids are hers. … I want the functionality of adding a mother to be across all additions."*

### Added — "Add spouse" placeholder when the center has unparented children
- Mirrors the existing parent-placeholder behavior. If the center person has children but at least one of them has no known mother (i.e. there's no `parent_of` row linking any current spouse to that child), a dashed amber pill labeled **"Add spouse"** (إضافة زوج/ة) now appears at the next spouse slot in L4. Click it → opens `AddRelativeForm` with `relativeKey: "spouse"` pre-filled.
- The placeholder also gets a dashed gold marriage rail with the rings icon centered in the gap, matching the style of a real spouse (just slightly faded). Editor-only, gated by `focusFilters.spouses`.
- New dictionary key `tree.add.placeholderSpouse` for both locales.
  - User prompt: *"If he has children, then he must have had the children from spouse/s. Then make a placeholder to add."*

### Changed — Marriage rings centered in the gap between center and spouse
- The L4 marriage icon was anchored at `(CX + sx) / 2` — the midpoint of the two **node centers**. Because the center node is 220 px wide and the spouse node is 170 px wide, the icon ended up offset toward the spouse and sometimes overlapped the center node's right edge.
- Now the icon anchors at the midpoint of the two **node edges** (gap-midpoint formula): `(centerRightEdge + spouseLeftEdge) / 2`. The rings sit visually centered between the two names regardless of which node is wider, and for either side (spouse left or right of center).
- Bumped `SPOUSE_OFFSET` 240 → 290 so the gap (≈ 95 px) leaves room for the rings icon (28 px) with breathing space on each side.
- Children's drop anchor uses the same formula so the parent_of drop continues to start exactly at the rings icon's bottom edge.
  - User prompt: *"make the symbol of marriage between the person of interest and the spouse centered between them"*

### Changed — Sibling box connectors are now elbowed
- New `ElbowLine` component draws a three-segment path (`M from.x from.y L from.x midY L to.x midY L to.x to.y`) — vertical down from the box, horizontal across at the midpoint, vertical down to the center. Looks like a classic family-tree connector. Sibling-of icon sits on the horizontal rail at its midpoint. Used for all four sibling box → center connections (full, half-from-father, half-from-mother, milk). `ConnectionLine` (single diagonal segment) is still used for kin-to-parent connections.
  - User prompt: *"change siblings line type from straight to elbowed"*

### Fixed — Sibling boxes still disappearing when Parents toggle is off
- Root cause: `peopleById` inside `FocusView` was being rebuilt from the filtered `rels`, not from the full people set. The `parentsOf` map then did `peopleById.get(r.fromId)` to read each parent's gender — but with Parents toggled off, parent rows are dropped from `rels`, so the parents were absent from `peopleById`. Every `parent_of` row whose `fromId` was an invisible parent got skipped, leaving `centerParents` empty → no candidates → no siblings.
- Now `FocusView` takes the full `allPeople: Person[]` array (threaded through from `TreeCanvas`) and uses it to build `peopleById` once at the top, independent of which rows are visually filtered out. Sibling classification works regardless of the Parents toggle.
  - User prompt: *"When I toggle Parents off, siblings box disappears also!"*

### Fixed — Children edge style + box connection lines
- **Children drop now uses the CHILD style** (green `#2e7d4f` + `ChildIcon` sapling) instead of the parent_of variant (blue + branch). This restores what the changelog entry from 2026-05-25 already specified: from the center person's perspective, descendants are the **child** side of `parent_of`, so they should use `styleForRel("parent_of", true)`. The horizontal child rail, the bridge, and the short verticals to each child all share the green color now.
- **Sibling connection lines no longer "float" disconnected from the boxes.** The `boxHeight` formula had a `+ padding` term that didn't match what the CSS rendered, so the line anchor was ~8px below the visible box bottom. Removed the padding term and made the inner `<div>` use `flex h-full flex-col` with a `flex-1` `<ul>`, so the box's visible bottom edge now sits exactly at the foreignObject's bottom — which is where the connection lines start.
  - User prompt: *"Why did you change the children style … connection lines are disconnected now"*

### Note — `birth_order column missing` save error
- If you see `Could not find the 'birth_order' column of 'people'`, the column hasn't been added to your DB yet. Run in Supabase SQL Editor:
  ```sql
  alter table public.people add column if not exists birth_order int;
  alter table public.people add column if not exists phone       text;
  alter table public.people add column if not exists email       text;
  alter table public.people add column if not exists website     text;
  ```
  Then **Settings → API → Reload Schema Cache** (or `notify pgrst, 'reload schema';`). Re-trying the save should now succeed.

### Fixed — FocusView 5-level layout follow-ups
- **Sibling boxes connect to the person of interest, not to the parents.** Every sibling-category box (full / half-from-father / half-from-mother / milk) now draws its single connection line from the box's bottom edge straight to the top of the center person, with the sibling_of style (red blood icon) — milk siblings keep the dashed cream style. The category is already labeled in the box header, so "from father / from mother / milk" is conveyed by the label, not by which parent the line touches.
- **Children connection restored to parent_of style + drops from the rings icon edge.** Each spouse-group's drop now starts at the **bottom edge of the marriage rings icon** (`y = Y_CENTER + 14`) instead of through its center, and a branch icon sits at the midpoint of the drop — same blue color/icon as elsewhere. Unknown-mother groups drop from the center node's bottom edge.
- **Parents toggle now hides the whole L1 row.** Previously, toggling **Parents** off removed the parent nodes but kept the placeholders visible. Now `showParentsLayer = focusFilters.parents` gates the entire layer: when off, parent nodes, placeholders, marriage rail, and the parental drop all disappear. The kin-to-parent connection lines hide too.
- **Sibling boxes survive the parents toggle.** Sibling classification (full / half-father / half-mother) is computed from `allRelationships` via `parentsOf` and `centerParents` — independent of the rels-level filter — so toggling parents off no longer wipes the sibling boxes from L3.
  - User prompt: *"The sibling connecting line should be to the person of interest not to the father … put back the children connection style (color and symbol) and make it connect to the edge of the circular symbol of the marriage … When I toggle off the parents, the layer of parents should disappear."*

### Changed — FocusView redesigned as a 5-level family-tree diagram
- Replaced the previous 3-row (parents / center+siblings / children) layout with a **5-level vertical diagram** that more clearly separates relationship categories:
  1. **L1** — Father + Mother (or `+ Add` placeholders for editors) with the marriage rail + rings icon, then a long blue parent-of drop to L4. The center person's full siblings hang off this drop.
  2. **L2** — Two boxes flanking the parent pair: **Paternal kin** (uncles & aunts on father's side, green leaf style) on the left, **Maternal kin** on the right. Each box has one connection line back to the relevant parent's bottom edge.
  3. **L3** — Up to four sibling boxes side by side: **Half-siblings (father)** | **Siblings** (full) | **Half-siblings (mother)** | **Milk siblings**. Each gets one connection line — full siblings to the parental drop, half-* to the relevant parent, milk-siblings to the center (dashed, cream).
  4. **L4** — Center person flanked by spouse nodes (alternating left/right), each pair joined by a marriage line with the gold rings icon at the midpoint.
  5. **L5** — Children, **grouped by mother** and connected to the marriage rail of their parents (not directly to the center). Each group has a T-junction: vertical drop from the marriage midpoint to a horizontal rail spanning the children, then short verticals to each child node.
- **Boxes** ([components/tree/TreeCanvas.tsx](components/tree/TreeCanvas.tsx) inline `GroupBox`): rounded rectangle with a colored header (`title · count`), a divided list of clickable name rows with generation badges. Single connection line per box (not one per name) — keeps the diagram readable for crowded categories.
- **Sibling classification** computed live: walk every candidate sibling's parent set and bucket as full / half-father / half-mother based on which of the center's parents they share. Implicit siblings (only `parent_of` data) work; explicit `sibling_of` rows are deduped via the existing helper.
- **Connection styling preserved**: every line uses the existing `RELATIONSHIP_STYLE` (or `styleForRel` for direction-aware parent_of) — same colors and icons everywhere. Milk-sibling lines stay dashed.
- **Spacing tuned for clarity** — node width / icon radius / level gaps now leave room for the circular icons to sit between nodes without touching them. The wrapper has horizontal scroll so wide canvases (e.g. lots of children) don't compress.
- Empty groups (no half-siblings, no kin, no milk siblings) skip rendering entirely; the layout collapses cleanly.
  - User prompt: *"I would suggest the following schema, divide into 5 levels …"*

### Added — Editable person profile
- **New `phone`, `email`, `website` columns** on `public.people`. Added inline in [supabase/schema.sql](supabase/schema.sql) AND as idempotent `alter table ... add column if not exists` migrations, so existing databases can pick them up by re-running the file (or just running the three `alter` lines).
- `Person` type gained `phone? / email? / website?` (also redacted alongside the name for non-editors).
- **`components/tree/EditPersonForm.tsx`** — modal with sectioned form covering every editable field on a person: identity (names, titles, gender, status), dates & order (birth/death year, birth_order, generation), contact (location, phone, email, website), bio (occupation + biography in both locales + photo URL), family (Ar/En surnames). On submit it does a single `update().eq("id", ...)` against `public.people`, refreshes the route, and closes. RLS enforces editor-only writes.
- **Edit button in side panel header** — appears in green next to "Focus on" when the viewer is an editor. Click → opens the form pre-filled with the current person's data.
- **Read-only display** of the new fields (`phone`, `email`, `website`) in the side-panel `<dl>` block when set, with tappable `tel:` / `mailto:` / `target=_blank` links.
- Full `editPerson.*` dictionary block (sections, field labels, status options, save/cancel) for both locales, plus extensions to `person.*` for the new contact fields.
  - User prompt: *"I can not modify the person info … I want to be able as editor to modify values when I click on a person."*

### Changed — Marriage rings icon: restored, lines route around its edges
- Brought the rings badge back to the center of the marriage rail.
- Marriage rail rendered as two separate gold segments: one from the father's stub to `cx − 14` (left edge of the icon), another from `cx + 14` to the mother's stub. The icon sits in the gap; the line doesn't pass through it.
- The vertical parent drop now starts at `y = railY + 14` (bottom edge of the rings icon) instead of `railY`, so the branch icon further down has clear separation and the rings stays visually crisp.
  - User prompt: *"revert the symbol between the father and mother … But make the connection not to the line since it will overfloat the ring symbol, but make it on the edge of the ring circular symbol"*

### Changed — Dropped the rings icon on the marriage rail
- Removed the rings badge from the horizontal gold rail. The gold color and the T-junction shape already convey "this is a marriage line"; adding the icon on top kept colliding visually with the branch icon below. Now only the parent drop carries an icon (branch), at the midpoint of the line where it has space.
  - User prompt: *"It is still over floating."*

### Added — Sibling birth-order
- New nullable `birth_order int` column on `public.people` (lower = older). Added to [supabase/schema.sql](supabase/schema.sql) inline AND as an idempotent `add column if not exists` migration so existing databases pick it up by re-running the file.
- `Person` type gained `birthOrder?: number | null`; `loadTree()` maps `birth_order` → `birthOrder`.
- New `siblingOrderCompare(a, b)` exported from [lib/relationships.ts](lib/relationships.ts): primary key `birthOrder` (nulls last), tiebreak `birthYear`, then `nameAr`.
- Applied wherever same-generation peers are listed:
  - **CollapsibleTree** — `buildMaps` sorts each parent's children with this comparator, so the tree displays oldest-to-youngest left-to-right under every node.
  - **FocusView** — the middle row (center's siblings) and the bottom row (center's children) both sort by the comparator before laying out.
  - **PersonProfile** relationships list — siblings come back from `computeRelationshipsFor` already in birth-order.
- **Side-panel reorder controls** — each sibling row in the relationships list now shows tiny ▲▼ chevrons for editors only. Click ▲ to mark a sibling as older than the one above them; ▼ to mark younger. The handler computes the full ordered sibling set (current person + siblings), swaps the two adjacent positions, then writes `birth_order = 1..n` to every sibling row in parallel. Disabled when at the top/bottom of the list.
  - User prompt: *"I want a way to define who is the oldest sibling to the youngest and show it in the graph view"*
- The marriage rail's rings icon and the parent-drop's branch icon were positioned only ~42px apart vertically because both lines were short (rail at y≈130, drop midpoint at y≈200, icons 28px tall). They visually overlapped.
- Lengthened the drop: canvas `H` bumped 560 → 620 and `yMid` shifted to `H/2 + 30`, giving the vertical parent line ~180px of height instead of ~140.
- Moved the branch icon from the drop's midpoint (50%) to 60% of the way down, doubling the gap between the two icon badges so neither bleeds into the other.
  - User prompt: *"it is over floathing the other symbol"*

### Fixed — Parent line lost its colors/icon in the paired-parents layout
- When the marriage layout was first introduced, the entire parent connector (rail + drop) was drawn in a single hardcoded blue stroke with no relationship icon — so the visual semantics (gold-rings for the marriage, blue-branch for parent_of) silently disappeared.
- Restored: the **marriage rail** (the horizontal between father and mother + the short stubs from each parent down to it) is now drawn in the spouse color (`#d4a017`) with the rings icon at its midpoint; the **vertical drop** from the rail's midpoint down to the center is in the parent color (`#1b4965`) with the branch icon at its midpoint. The single-parent fallback also got its branch icon back.
  - User prompt: *"Why did you change the style of the paternal connection (color and symbol)?"*

### Changed — FocusView: paired-parents top row + missing-parent placeholder
- **New top-row layout.** Father and mother are no longer two arbitrary entries in the "up" row; they're a dedicated pair at `(cx - 130, parentsY)` and `(cx + 130, parentsY)`. A short vertical drops from each parent's bottom to a horizontal marriage rail just under them, and a single vertical line drops from the midpoint of that rail down to the center person. The visual reads "father – mother → center" the way a classical family tree does.
- **Aunts/uncles flank outward.** Same row as the parents, but at `cx ± (130 + n·colWidth)`, so they don't collide with the parent slots.
- **Placeholder for the missing parent.** When the center has only one parent recorded and the viewer is an editor, the empty slot renders as a dashed-border "+ Add father / + Add mother" button. Clicking it opens `AddRelativeForm` pre-set to the right relative type. Non-editors see no placeholder; if both parents exist the marriage layout is still drawn.
- **State lifted.** `pendingAdd` (which controls `AddRelativeForm`) moved from `PersonProfile` up to `TreeCanvas`, so both the side-panel "+ Add father" buttons and the new focus-view placeholder buttons share one form instance. `PersonProfile` and `FocusView` now both receive an `onRequestAdd(key)` callback.
- New dictionary keys: `tree.add.placeholderFather`, `placeholderMother`.
  - User prompt: *"put a placeholder for احمد spouse that if I click I can add right away … make the relationship line always vertical upward connecting exactly in the middle between the father and mother"*

### Added — Sibling-choose step when adding a parent
- After successfully inserting a `father` or `mother` relationship, if the current person has any siblings, `AddRelativeForm` switches to a second step: a checkbox list of those siblings asking *"which of these are also children of [newly-added parent]?"*. Each checked sibling gets an additional `parent_of(newParent, sibling)` row. Duplicates are silently ignored thanks to the unique constraint.
- An explicit **Skip** button lets the editor advance without selecting any siblings (still refreshes the tree so the new parent appears).
- New dictionary keys: `tree.add.siblingsStepTitle`, `siblingsStepHint`, `skip`, `noSiblings`.
  - User prompt: *"then if I add, I can choose who from her siblings are also children of that person"*

### Fixed — Duplicate relationships and squashed sibling nodes
- **Root cause of "names appearing twice"**: the `relationships` table had no uniqueness constraint, and the AddRelativeForm didn't dedupe before insert. Submitting the form twice (e.g., the dialog flickered), or re-adding an existing-person link, produced duplicate `parent_of` rows. The focus-view children list iterated over those rows directly, so the same child appeared once per duplicate.
- **DB-side fix**: added a `relationships_uniq` unique constraint on `(type, from_id, to_id)` in [supabase/schema.sql](supabase/schema.sql). For existing databases, run [supabase/dedupe-relationships.sql](supabase/dedupe-relationships.sql) — it removes already-existing duplicate rows (keeps the oldest via `ctid`) and then adds the constraint.
- **App-side fix**: `AddRelativeForm` now detects unique-violation errors (Postgres code `23505` or "duplicate key" in the message) and surfaces a localized "this relationship already exists" message instead of the raw SQL error. The auto-spouse step ignores duplicate errors silently — re-running on an already-spoused parent is a no-op.
- **New dictionary key**: `tree.add.duplicateError` for both locales.
- **Focus view spacing & disambiguation**: bumped `colWidth` 170 → 210 and `nodeW` 150 → 170 so siblings no longer crowd. Each related-person node in `FocusView` now shows a tiny `G{n}` generation badge next to the name, so two people sharing a first name (e.g. عبدالرحمن at G6 vs عبدالرحمن at G9) are visually distinguishable.
  - User prompt: *"There are a lot of duplications. Also, siblings are squashed together"*

### Fixed — Lineage name rendered in mixed bidi (Arabic + Latin " b. ")
- `lineageName` used to emit `" b. "` (Latin) as the separator between Arabic names in English locale. Browsers' bidi algorithm placed the Latin runs in LTR slots between the RTL names, producing reversed/garbled output like "صلاح b. عبدالله b. احمد b. مريم".
- Connector is now **always Arabic**, and **gender-aware**: `بن` after a male name, `بنت` after a female name. Example: "مريم بنت احمد بن عبدالله بن صلاح". Works correctly in both `ar` and `en` locales because the names are themselves Arabic-script.
  - User prompt: *"The name appears in a wrong format."*

### Fixed — Focus view clutter when many relatives
- `FocusView` was using `className="w-full"` on the SVG, so as the viewBox got wider (many uncles or many children), the SVG got scaled down to fit the container — nodes shrank and overlapped. Removed the `w-full`; the SVG now renders at its natural `width={W}` and the surrounding `overflow-x-auto` wrapper lets you scroll horizontally if the canvas exceeds the viewport. Nodes keep their full size, so labels stay readable at any tree width.
  - User prompt: *"Also the names get cluttered sometimes"*

### Added — Delete a relationship from the side panel
- Each non-synthetic row in `PersonProfile`'s relationships list now shows a small red × button next to the navigation arrow (editors only). Clicking it shows a localized browser confirm; on confirm the row is deleted via the browser Supabase client and `router.refresh()` re-fetches the tree.
- Synthetic relationships (implicit siblings derived from shared parents, id prefixed `_sib_`) get no delete button — there's no DB row to remove.
- The delete is RLS-gated as well: only editors can hit the row server-side.
  - User prompt: *"there is no option to delete a relationship if it is wrong"*

### Changed — FocusView: spouses to the bottom, children grouped by mother
- New bottom-row layout. Spouses are no longer in the middle row alongside siblings; they move to the bottom and sit **between their children**, so each mother is visually adjacent to her offspring.
- Multiple-spouse case: for every spouse of the center, the children whose *other* parent is that spouse are gathered into a contiguous block with the spouse in the middle. Children whose other parent isn't a known spouse fall into an "orphan" group placed after the spouse groups.
- The "other parent" of a child is resolved by scanning `allRelationships` (now passed into `FocusView`) for any `parent_of` row pointing to that child whose `fromId` isn't the center.
- Middle row now only contains true peers: siblings, milk-siblings, cousins, and `other` types. Same-row flanking-the-center layout preserved.
  - User prompt: *"make the spouse below in the focus view (between their children). If a person has multiple spouses, then the children will be clearly visualised in the focus view under the correct mother."*

### Changed — Person pickers show patrilineal lineage
- New helpers `buildPatrilineMap` and `lineageName` in [lib/relationships.ts](lib/relationships.ts). The map records each person's father (preferring male parent rows; falls back to any parent if no male exists). `lineageName(person, ..., depth)` walks up the map to produce "name بن father بن grandfather بن great-grandfather" (default depth 4 = self + 3 generations).
- **AddRelativeForm** existing-person picker now displays the full chain for each candidate, both in the dropdown list and in the selected-person card. Search also matches against the full chain, so typing "بن محمد" filters to people whose father (or anyone up the line) is محمد.
- **RelateExplorer** PersonPicker gets the same treatment — both endpoints show their lineage chain. Makes the 695-person tree actually pickable when many share common first names like محمد or صالح.
- Truncation: long chains use `truncate` + `title` so the full chain is in the tooltip on hover.
  - User prompt: *"Connecting to an existing person is super hard because of the similar names. Make the list appears as the name to the 3rd grandfather"*

### Added — AddRelativeForm: pick existing + auto-link mother ↔ father
- **Mode switch** at the top of `AddRelativeForm`: "New person" (existing behavior) vs **"Existing person"**. The existing-person mode shows a search-as-you-type picker over the in-memory `people` list, and on submit only inserts the relationship row — no new `people` row is created.
- **Auto-spouse linking**: when the relative being added is a **father** or **mother**, the form scans the current person's existing `parent_of` rows for the opposite-gender parent and, if found, inserts a `spouse_of` row between the two parents in addition to the `parent_of` row that's always created. Works in both "new" and "existing" modes.
- A green hint banner appears in the form whenever father/mother is being added so the editor knows the auto-link will happen.
- `PersonProfile` now threads `people` and `relationships` into `AddRelativeForm` (it had them already; just forwards them).
- New dictionary keys: `tree.add.modeNew`, `modeExisting`, `pickExisting`, `pickExistingHint`, `autoSpouseHint`.
  - User prompt: *"I have tried to add a mother relation, but it was not automatically related to the father and I couldn't connect her to people that are already in the base!"*

### Added — `/[locale]/relate` (relationship explorer)
- **New page** `app/[locale]/relate/page.tsx` + client component `components/relate/RelateExplorer.tsx`. Pick two people from autocomplete search, the page runs BFS on the relationship graph to find the shortest chain between them and renders it as a horizontal node-edge chain (endpoints styled as sand-700, intermediate nodes as cards, edge pills colored per `styleForRel`).
- **Graph utilities** (`buildRelationshipGraph` + `shortestPath` in `lib/relationships.ts`): bidirectional adjacency including synthetic sibling edges (children of the same parent → siblings), standard BFS with predecessor reconstruction. No external library dependency.
- **Edge labels** use the same direction-aware `labelForRel` logic as the side panel, so a step from a father to his son reads "son" rather than "parent_of".
- New `nav.relate` and full `relate.*` dictionary block for both locales. Header gains a "Relate / ابحث عن رابط" tab between Tree and Insights.
  - User prompt: *"I want a new property to query about the relationship between two people. Then show a graph view that connects between them."*

### Fixed — Relationship labels in side panel
- **Labels are now direction- and gender-aware.** The list in `PersonProfile` previously rendered raw type strings ("parent_of") because the dictionary is keyed by role (`father`/`son`/`brother`/...) not by relationship type. Added a `labelForRel()` helper that picks the right label given (a) the relationship type, (b) whether the current person is the `from` or `to` side, and (c) the other person's gender:
  - `parent_of` + I'm `from` (parent) → `son` / `daughter`
  - `parent_of` + I'm `to` (child) → `father` / `mother`
  - `sibling_of` → `brother` / `sister`
  - `spouse_of` → `spouse`
  - `milk_sibling_of` → `milk`
  - uncle/aunt/cousin types → corresponding labels
- **Implicit siblings** — `PersonProfile` now also derives siblings on the fly: anyone who shares at least one parent with the current person and isn't already linked by an explicit `sibling_of`/`milk_sibling_of` row gets added to the list with a synthetic `sibling_of` entry (id `_sib_<other>`, never inserted to the DB). This means the 695-person seed (which only carries `parent_of` rows) now shows brothers and sisters automatically.
- **Sort order** — relationships are grouped so parents come first, then spouses, then siblings, then children, then uncles/aunts/cousins/other. Within each group, sorted by generation, then name.
  - User prompt: *"in the relationships it shows 'parent_of' even for the son. Also it does not mention siblings or other realtions other than parent_of"*

### Fixed
- **Stripped trailing sequence numbers from imported names** — 64 of the 695 names in the PowerPoint had a trailing space + integer (e.g. "محسن 7", "صالح 8") added by the original author as visual reference numbers. These leaked into the import. [supabase/seed-tree.sql](supabase/seed-tree.sql) was regenerated with the cleanup applied. For an existing live DB, run:
  ```sql
  update public.people
  set name_ar = regexp_replace(name_ar, '\s+[0-9٠-٩]+\s*$', '')
  where name_ar ~ '\s+[0-9٠-٩]+\s*$';
  ```
  Covers both ASCII (0–9) and Arabic-Indic (٠–٩) digits.
  - User prompt: *"remove the numbers"*

### To activate the auth system
1. Run [supabase/auth.sql](supabase/auth.sql) in the Supabase SQL Editor.
2. Visit `/<locale>/login` and request a magic link with the email you want to be the first editor.
3. Click the link in the email — you'll be redirected back signed in.
4. In Supabase, run the documented bootstrap INSERT (replacing the email):
   ```sql
   insert into public.editors (user_id, email)
   select id, email from auth.users where email = 'YOUR_EMAIL_HERE';
   ```
5. Refresh the app — the header should now show the "Editor" badge next to your email.

### Notes
- `/[locale]/tree` is now `ƒ (Dynamic)` (server-rendered per request) instead of SSG — `loadTree()` calls `cookies()` via `getServerSupabase`, which forces dynamic rendering. Intentional: fresh DB reads on each visit.

---

## [Unreleased] — 2026-05-18

### Project initialized — التهيئة الأولية للمشروع

#### Prompt from user (Arabic) — طلب المستخدم
> هدفي من هذا المشروع هو بناء منصة (موقع وتطبيق) حديث لشجرة العائلة، حيث يمكن للمستخدم اضافة افراد العائلة واضافة الروابط بينهم (اب، اخ، زوج، اخ بالرضاعة، عم، خال، وغيره من الروابط) ومعلومات عن الشخص (بروفايل للشخص)
>
> أريد ان تكون المنصة بتصميم حديث وسهل للاستخدام واضافة المعلومات والمشاركة والتعديل
>
> أريد ان ابدأ بعائلتي (البطاطي) حيث يكون فيه جزء تعريفي بالعائلة وجذورها ومناقبها ونسبها وتاريخها
>
> وجزء آخر متعلق بالمصادر
>
> وجزء شجرة العائلة
>
> وجزء يكون عبارة عن تحليل للبيانات امكانية ايجاد الروابط ما بين الأشخاص، والأحداث الجديدة والاعلانات مثل الأفراح وغيرها
>
> أريد الشجرة ان تكون على شكل طبقات فوق بعضها (Layers)، على سبيل المثل الطبقة الأولى تظهر أسماء الرجال فقط مع تظليل خفيف على أسماء البنات (الطبقة الثانية) ثم الأزواج (الطبقة الثالثة) ثم الرضاعة مثلا (الطبقة الرابعة)
>
> وعند الضغط على اسم معين، يتم التركيز عليه وجعله كمركز للشجرة واظهار كل الروابط، وكل رابط بلون ورمز مختلف (مثلا الزواج بلون ذهبي ورمز خواتم، الاخوة بلون احمر دافئ ورمز قطرتين دم، والرضاعة لون ابيض ورمز حليب، والأبوة بلون ورمز مناسب)
>
> وعند الضغط على اسم زوج من عائلة أخرى مثلا، يتم اظهار شجرة عائلته،
>
> وعند الضغط على اسم، تظهر علامات + لاضافة شخص برابطة معينة لهذا الشخص
>
> أجعل المشروع بلغتين En|Ar وعلى Github
>
> وعائلتي على Github مختلف
>
> Any change, prompt and answer should be documented inside a CHANGELOG.md

#### Clarifying questions and decisions — أسئلة توضيحية وقرارات
| Question | Answer |
|---|---|
| Tech stack | **Next.js + React** (App Router, TypeScript, Tailwind CSS) |
| Backend / data store | **Supabase** (PostgreSQL + Auth) |
| Initial scope | **Web only first** (responsive design, mobile-friendly) |
| GitHub account | **https://github.com/asmbatati** (family-specific account) |

#### Scope summary — ملخص النطاق
The platform is a modern, bilingual (Arabic ↔ English) family tree application starting with the **Al-Batati (البطاطي) family**. Key sections:
1. **About the family** — roots, virtues, lineage, history (`/about`).
2. **Sources & references** — historical sources, books, documents (`/sources`).
3. **Family tree** — layered visualization (men, women, spouses, milk-relationships) with focus mode (`/tree`).
4. **Events & announcements** — weddings, births, deaths, family gatherings (`/events`).
5. **Analytics & insights** — relationship discovery and statistics (`/insights`).

#### Key features — أهم المميزات
- **Layered tree** — toggle layers: men only, women, spouses, milk (الرضاعة), and more.
- **Focus mode** — click a person → that person becomes the center, all relationships are drawn outward with distinct color + icon per relationship type:
  - Marriage (زواج) — gold, rings icon.
  - Brotherhood (أخوة) — warm red, two-drop icon.
  - Milk relationship (رضاعة) — white/cream, milk-drop icon.
  - Parenthood (أبوة) — deep blue, branch icon.
- **Cross-family** — clicking a spouse from another family loads their family's tree.
- **Quick add** — clicking a person shows `+` buttons to add a related person with a specific relationship.
- **Profiles** — rich profile per person (name, dates, photo, biography, location, occupation, sources).
- **Bilingual UI** — English + Arabic, full RTL support, language toggle persisted.

### Added
- `CHANGELOG.md` — this changelog.
- Project planning and task list created.
- **Project scaffold** — Next.js 14 App Router + TypeScript + Tailwind CSS:
  - `package.json`, `tsconfig.json`, `next.config.js`, `tailwind.config.ts`, `postcss.config.js`, `.gitignore`, `.env.example`, `next-env.d.ts`.
- **i18n foundation** — `lib/i18n/config.ts` (locales, RTL/LTR direction map) and `lib/i18n/dictionaries.ts` (complete Arabic + English translation dictionaries).
- **Domain model** — `lib/types.ts` defines `Person`, `Relationship`, `SourceRef`, `FamilyEvent`, `TreeLayer`, and the `RELATIONSHIP_STYLE` map (color + icon per relationship type).
- **Seed dataset** — `lib/data/seed.ts` with three generations of placeholder Al-Batati people, including in-laws from other families, plus sample sources and events.
- **Supabase wiring** — `lib/supabase/client.ts` (browser), `lib/supabase/server.ts` (RSC). Returns `null` when env vars are absent so the app gracefully falls back to seed data.
- **Database schema** — `supabase/schema.sql` with `people`, `relationships`, `sources`, `person_sources`, `events` tables + RLS policies (public read, authenticated write).
- **Routes (App Router)**:
  - `app/layout.tsx` — root metadata.
  - `app/page.tsx` — redirects `/` → `/ar` (default locale).
  - `app/[locale]/layout.tsx` — sets `<html lang dir>`, loads Google Fonts (Inter, Tajawal, Playfair Display), mounts Header + Footer.
  - `app/[locale]/page.tsx` — landing page with hero + five feature cards.
  - `app/[locale]/about/page.tsx` — Roots / Virtues / Lineage / History sections.
  - `app/[locale]/tree/page.tsx` — server entry that hands seed data to `TreeCanvas`.
  - `app/[locale]/sources/page.tsx` — sources table.
  - `app/[locale]/events/page.tsx` — upcoming/past events list.
  - `app/[locale]/insights/page.tsx` — auto-computed statistics (total people, total relationships, avg children, oldest, most connected).
- **Components**:
  - `components/Header.tsx`, `components/Footer.tsx`, `components/LanguageSwitcher.tsx`.
  - `components/icons.tsx` — inline SVG for rings (marriage), blood (sibling), milk, branch (parent), leaf (uncle/aunt), plus, globe, close.
  - `components/tree/TreeCanvas.tsx` — main interactive widget. Two modes:
    1. **Layered view** (default) — rows per generation, layer toggles fade/show men / women / spouses / milk / extended.
    2. **Focus view** — selected person at center, related people on a circle, SVG edges colored per relationship style with an icon badge in the middle of each edge.
  - `components/tree/LayerToggle.tsx` — pill buttons to toggle each layer.
  - `components/tree/PersonNode.tsx` — pill node, styled per layer.
  - `components/tree/PersonProfile.tsx` — bottom-sheet / centered modal with profile fields, relationships list, and quick "+ add relative" buttons for every common relationship type.
- **Documentation** — `README.md` (bilingual), this `CHANGELOG.md`.

### Design decisions / تصاميم اعتُمدت
- **Layered tree semantics**: rather than four hard layers, the toggles act as visibility filters — "men" / "women" / "spouses" filter people; "milk" / "extended" filter relationship edges in the focus view. This matches the spec ("layer 1 men only, women dimmed in layer 2, …") while remaining intuitive.
- **Focus view geometry**: SVG with `viewBox="0 0 760 520"` and HTML nodes via `<foreignObject>` so the pills keep all Tailwind styling. Edges are dashed for milk relationships (per the white/cream cue from the spec).
- **Fallback to seed**: every server page reads from `lib/data/seed.ts` today; once Supabase env vars are filled in, the same pages can swap to the Supabase client without UI changes.
- **Default locale**: `ar` (Arabic) — the family's primary language. `/` redirects to `/ar`.

### Fixed
- **2026-05-18 — npm install ERESOLVE** — `eslint-config-next@14.2.15` only supports ESLint 7/8, but `package.json` pinned `eslint@^9.12.0`, causing `ERESOLVE unable to resolve dependency tree`. Downgraded `eslint` to `^8.57.1`.
  - User prompt: `npm install` failed with `npm error code ERESOLVE`.

### Diagnosed (not a code defect)
- **2026-05-18 — `npm install` hanging on `G:\My Drive\...`** — the project lives on a Google Drive synced folder; Drive tries to sync each of the tens of thousands of `node_modules` files in real time, making installation effectively hang.
  - Verified `package.json` itself is healthy: `npm install --dry-run` resolves the dependency tree cleanly in ~40s with no peer conflicts.
  - Recommended action documented in README: move the project off Google Drive (e.g. `C:\Projects\batati-family-tree`) and use Git for syncing, OR pause Drive sync during install, OR symlink `node_modules` to a local drive.
  - User prompt: `both npm install and npm install --legacy-peer-deps gets stuck`.

### Pending / قيد التطوير
- Hooking up real CRUD (Create/Update/Delete) against Supabase.
- File/image uploads via Supabase Storage.
- Authenticated editor role + sharing controls.
- GEDCOM import/export.
- Mobile app (React Native or PWA).
