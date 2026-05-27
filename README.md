# موقع البطاطي — Al-Batati Family Tree

> منصة حديثة بلغتين (عربي/إنجليزي) لتوثيق شجرة عائلة البطاطي.
> Modern bilingual (Ar/En) family-tree platform for the Al-Batati family.

**🌐 Live:** [https://batati-family-tree.vercel.app](https://batati-family-tree.vercel.app)

[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19-61dafb)](https://react.dev)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ecf8e)](https://supabase.com)
[![Tailwind](https://img.shields.io/badge/TailwindCSS-3-38bdf8)](https://tailwindcss.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6)](https://www.typescriptlang.org/)

---

## ✨ المميزات / Features

### عربي
- **شجرة عائلة بطبقات (Layers)** — أظهر/أخفِ طبقات الرجال، النساء، الأزواج، الرضاعة، والأقارب الموسّعين.
- **وضع التركيز** — اضغط على أي اسم ليصبح مركز الشجرة، فتظهر روابطه بألوان ورموز مختلفة:
  - الزواج (ذهبي + خواتم)
  - الأخوة (أحمر دافئ + قطرتي دم)
  - الرضاعة (أبيض + رمز حليب، خط متقطع)
  - الأبوة (أزرق عميق + رمز فروع)
- **بروفايل كامل لكل شخص** — اسم، ميلاد، وفاة، مكان، مهنة، سيرة، مصادر.
- **+ لإضافة قريب جديد** — أزرار سريعة لإضافة شخص برابطة محددة.
- **عائلات أخرى** — الضغط على زوج من عائلة أخرى يمكن أن يفتح شجرة عائلته.
- **أقسام** — عن العائلة، الشجرة، المصادر، الأحداث، التحليلات.
- **ثنائي اللغة** — عربي (RTL) + إنجليزي (LTR)، تبديل سلس.

### English
- **Layered tree visualization** — toggle layers (men, women, spouses, milk ties, extended kin).
- **Focus mode** — click any person to center the tree on them and reveal relationships with distinct colors and icons.
- **Rich profiles** — name, birth, death, location, occupation, biography, sources.
- **Quick add** — buttons to add a related person with a specific relationship type.
- **Cross-family** — clicking a spouse from another family can open their family's tree.
- **Sections** — About, Tree, Sources, Events, Insights.
- **Bilingual** — Arabic (RTL) + English (LTR) with seamless switching.

---

## 🛠️ التقنيات / Stack

- **Framework:** Next.js 16 (App Router, Turbopack) + React 19 + TypeScript
- **Styling:** Tailwind CSS 3 with a custom desert/heritage palette
- **Database / Auth:** Supabase (PostgreSQL + Row-Level Security, magic-link email auth)
- **Hosting:** Vercel (auto-deploys from `main`)
- **i18n:** Per-route locale segment (`/ar`, `/en`) with full RTL/LTR direction switching

---

## 🚀 التشغيل المحلي / Local development

```bash
# 1. Install dependencies
npm install

# 2. Copy environment template and fill in your Supabase keys
cp .env.example .env.local
# edit .env.local — until you fill it in the app falls back to seed data.

# 3. Run the dev server
npm run dev
# open http://localhost:3000 → it redirects to /ar by default
```

### إعداد Supabase / Supabase setup

Run these SQL files **in order** in the Supabase Dashboard → **SQL Editor**:

1. **[`supabase/schema.sql`](supabase/schema.sql)** — tables, RLS, public-read policies, the `relationships_uniq` constraint, and idempotent migrations for `birth_order` / `marriage_order` / `phone` / `email` / `website`. Safe to re-run; uses `if not exists` everywhere.

2. **[`supabase/dedupe-relationships.sql`](supabase/dedupe-relationships.sql)** — **run this if you're upgrading an existing project**. Without it, `schema.sql`'s `add constraint relationships_uniq` step silently fails when duplicate `(type, from_id, to_id)` rows already exist, leaving the table without the unique index. The form then stacks duplicate `parent_of` rows on every Save click. Symptoms: "I add a relative but the relation doesn't show up" / "sometimes it works".

3. **[`supabase/auth.sql`](supabase/auth.sql)** — creates the `public.editors` gate table and tightens write RLS to editors-only. Public reads stay open.

4. **[`supabase/seed-tree.sql`](supabase/seed-tree.sql)** (optional) — 695-person family seed extracted from the 1430 H. PowerPoint Org Chart.

5. After every schema change, ping PostgREST so the cache picks up new columns:
   ```sql
   notify pgrst, 'reload schema';
   ```

6. **Copy your keys** from Supabase → Settings → **API Keys**:
   - `NEXT_PUBLIC_SUPABASE_URL` — the project URL.
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` — the **publishable** / anon key (`sb_publishable_…` or legacy `eyJ…` anon JWT). Do **not** use the `sb_secret_…` / `service_role` key here — Supabase's SDK refuses to use it in the browser with "Forbidden use of secret API key in browser".

7. **Bootstrap your first editor** (after you log in once via magic link):
   ```sql
   insert into public.editors (user_id, email)
   select id, email from auth.users where email = 'YOUR_EMAIL_HERE'
   on conflict (user_id) do nothing;
   ```

### Auth callback URLs

In Supabase → **Authentication → URL Configuration**:
- **Site URL**: your production origin, e.g. `https://batati-family-tree.vercel.app` (or `http://localhost:3000` for purely local work).
- **Redirect URLs**: a wildcard entry covers all callback flows:
  ```
  https://batati-family-tree.vercel.app/**
  http://localhost:3000/**
  ```

---

## ☁️ النشر على Vercel / Deploy to Vercel

1. Push the repo to GitHub and import it on [vercel.com](https://vercel.com). Next 16 is auto-detected.
2. In Vercel → **Settings → Environment Variables**, add both keys to **Production, Preview, and Development**:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Trigger a fresh deploy (Vercel doesn't pick up env-var changes on existing builds).
4. Add your Vercel URL(s) to Supabase's Site URL + Redirect URLs (see above) — otherwise the magic-link flow lands on the wrong origin.

---

## 📂 هيكل المشروع / Project structure

```
.
├── app/                     # Next.js App Router
│   ├── layout.tsx           # Root metadata
│   ├── page.tsx             # Redirects to default locale
│   └── [locale]/            # Per-locale routes (ar | en)
│       ├── layout.tsx       # Sets <html dir lang>, mounts Header/Footer
│       ├── page.tsx         # Home
│       ├── about/           # About the family
│       ├── tree/            # Interactive layered tree
│       ├── sources/         # Source references
│       ├── events/          # Events & announcements
│       └── insights/        # Auto-computed statistics
├── components/
│   ├── Header.tsx
│   ├── Footer.tsx
│   ├── LanguageSwitcher.tsx
│   ├── icons.tsx            # Inline SVG icons (rings, blood, milk, branch, …)
│   └── tree/
│       ├── TreeCanvas.tsx   # Main visualization (layered + focus modes)
│       ├── LayerToggle.tsx
│       ├── PersonNode.tsx
│       └── PersonProfile.tsx # Modal with relationships & quick-add
├── lib/
│   ├── i18n/
│   │   ├── config.ts        # Locales, direction, helpers
│   │   └── dictionaries.ts  # Full Ar/En translation dictionaries
│   ├── data/
│   │   └── seed.ts          # Sample family for offline / dev use
│   ├── supabase/
│   │   ├── client.ts        # Browser Supabase client
│   │   └── server.ts        # Server Supabase client
│   └── types.ts             # Domain types (Person, Relationship, …)
├── supabase/
│   ├── schema.sql              # Tables, RLS, public-read policies, constraints
│   ├── auth.sql                # editors-table gate + write RLS
│   ├── seed-tree.sql           # 695-person family seed
│   └── dedupe-relationships.sql # Cleans duplicate (type, from_id, to_id) rows
├── proxy.ts                 # Next 16 proxy (renamed middleware) — refreshes auth cookie
├── CHANGELOG.md             # Mandatory project changelog (prompts + decisions)
├── README.md
└── package.json
```

---

## 🗺️ خارطة الطريق / Roadmap

- [x] هيكل المشروع وإعداد Next.js
- [x] دعم العربية والإنجليزية مع RTL/LTR
- [x] الصفحات الأساسية (الرئيسية، عن، المصادر، الأحداث، التحليلات)
- [x] شجرة العائلة بطبقات + وضع التركيز
- [x] بروفايل الشخص + أزرار إضافة قريب
- [x] مخطط قاعدة بيانات Supabase
- [x] ربط الإضافة الفعلية بقاعدة البيانات (Create/Update people & relationships)
- [x] مصادقة المستخدمين والصلاحيات (محرر / مشاهد) — magic-link + `editors` table
- [x] استيراد 695 شخص من شجرة 1430 هـ (PowerPoint Org Chart)
- [x] صفحة العلاقة بين شخصين (BFS shortest path)
- [x] تصدير PDF من وضع التركيز
- [ ] تحميل الصور (Supabase Storage)
- [ ] استيراد/تصدير GEDCOM
- [ ] تطبيق جوال (React Native أو PWA)

---

## 🩺 استكشاف الأخطاء / Troubleshooting

### "I add a relative but the relation doesn't update"
- **Cause:** the `relationships_uniq` constraint never got created (usually because duplicates blocked it), so every Save click inserts a fresh duplicate row instead of being rejected as a conflict.
- **Fix:** run `supabase/dedupe-relationships.sql`, then re-run the `add constraint relationships_uniq` block from `supabase/schema.sql`. Verify with:
  ```sql
  select count(*) as total, count(distinct (type, from_id, to_id)) as distinct_triples
  from public.relationships;
  ```
  The two numbers must match.

### "Forbidden use of secret API key in browser"
You put `sb_secret_…` (service_role) into `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Use the `sb_publishable_…` (anon) key instead, and **rotate the leaked secret** in Supabase → API Keys (it shipped to every browser that loaded the page).

### "Editor badge doesn't show after login"
You logged in but you're not in `public.editors` on this Supabase project. Run the bootstrap INSERT in the Supabase setup section.

### "Magic-link email arrives but clicking the link errors"
Your **Site URL** or **Redirect URLs** in Supabase Authentication don't include your current origin. Add both your localhost and your Vercel URL — wildcards work: `https://batati-family-tree.vercel.app/**`.

### "Tree doesn't refresh after add/edit (Next 16)"
`router.refresh()` sometimes won't re-execute server components if Next thinks the route is cacheable. `app/[locale]/tree/page.tsx` exports `dynamic = "force-dynamic"` to defeat this. If you copy that page or add a new write-heavy route, do the same.

---

## 🤝 المساهمة / Contributing

هذا مستودع خاص بعائلة البطاطي. لإضافة أو تعديل المعلومات يجب أن تكون مسجّلاً ومخوّلاً كمحرر.

---

## 📜 الترخيص / License

كل الحقوق محفوظة لعائلة البطاطي / All rights reserved — Al-Batati Family.
