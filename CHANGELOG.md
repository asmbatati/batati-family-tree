# CHANGELOG — موقع البطاطي / Al-Batati Family Tree

All notable changes, prompts, and answers for this project are documented in this file.
كل التغييرات والمحادثات والقرارات لهذا المشروع موثقة في هذا الملف.

The format is based on [Keep a Changelog](https://keepachangelog.com/), and this project follows semantic versioning.

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
