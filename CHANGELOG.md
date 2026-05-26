# CHANGELOG — موقع البطاطي / Al-Batati Family Tree

All notable changes, prompts, and answers for this project are documented in this file.
كل التغييرات والمحادثات والقرارات لهذا المشروع موثقة في هذا الملف.

The format is based on [Keep a Changelog](https://keepachangelog.com/), and this project follows semantic versioning.

---

## [Unreleased] — 2026-05-25

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
