# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # next dev — http://localhost:3000, redirects to /ar
npm run build      # next build (Next 16, Turbopack)
npm start          # next start
npm run typecheck  # tsc --noEmit
npm run lint       # eslint . (flat config in eslint.config.mjs)
```

There is no test framework configured.

## Mandatory: CHANGELOG.md

Every change, prompt, and decision must be appended to `CHANGELOG.md` (this is a project rule stated in the original brief and enforced by the existing changelog). Follow the existing format — `### Added` / `### Fixed` / `### Diagnosed` sections, with the user's prompt quoted when relevant.

## Architecture

### Bilingual-first design (Ar/En, RTL/LTR)
- `lib/i18n/config.ts` — locales (`"ar" | "en"`), direction map, `isLocale` type-guard. Default locale is `ar`.
- `lib/i18n/dictionaries.ts` — the `Dictionary` TS type **is** the contract: adding a UI string requires adding the key to *both* `ar` and `en` records or typecheck fails. All user-facing strings flow through `getDictionary(locale)`.
- Routes live under `app/[locale]/...`. The root `app/page.tsx` redirects `/` → `/{defaultLocale}`. `app/[locale]/layout.tsx` is where `<html lang dir>` is set.

### Next 16 async APIs
This repo was migrated from Next 14 → 16. All dynamic-route components take `params: Promise<{ locale: string }>` and must be `async`. `cookies()` in `lib/supabase/server.ts` is also async. Follow this pattern in any new pages.

### Seed-fallback data layer
Both Supabase clients (`lib/supabase/{client,server}.ts`) return `null` when `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` are missing. Pages currently read directly from `lib/data/seed.ts` so the app works offline; the swap to Supabase reads is intentionally not yet wired. **Preserve the null-safe path** when adding Supabase calls.

### Domain model & relationship styling
`lib/types.ts` is the single source of truth:
- `Person` carries bilingual fields (`nameAr` required, `nameEn` optional — same pattern for title/occupation/bio/family). `generation` (0 = founder) drives the layered tree's vertical grouping. `externalFamilyId` flags in-laws who belong primarily to a different family.
- `RelationshipType` is a discriminated string union. `RELATIONSHIP_STYLE` (same file) maps each type → `{ color, icon, labelKey }`. **Add new relationship types here, in `lib/types.ts`, in `supabase/schema.sql`'s `check` constraint, and in the `tree.relations` dictionary entries — all four places.**

### Tree visualization (`components/tree/TreeCanvas.tsx`)
Two rendering modes selected by `focusId` state:
- **LayeredView** (default): people grouped by `generation`, layer toggles (`men`/`women`/`spouses`/`milk`/`extended`) act as **visibility filters**, not hard layers — women aren't a separate row, they're just dimmed/hidden by the women toggle.
- **FocusView**: clicked person becomes the SVG center; related people positioned on a circle, edges colored per `RELATIONSHIP_STYLE`, milk relationships rendered dashed. Cross-family in-laws (`externalFamilyId`) show an `↗` badge — clicking them is intended to open their family's tree (not yet implemented).

### Supabase schema
`supabase/schema.sql` is the canonical DB definition: `people`, `relationships`, `sources`, `person_sources`, `events`. RLS enabled with public read + authenticated write on every table. Any change to `RelationshipType` or person/event enums in TS must also update this file's `check` constraints.

## Known environment gotcha
Running this project from a Google Drive synced folder makes `npm install` effectively hang (Drive tries to sync every file in `node_modules`). Documented in CHANGELOG entry 2026-05-18. Recommend a local-disk path before any install work.
