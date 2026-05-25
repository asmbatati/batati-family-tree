# موقع البطاطي — Al-Batati Family Tree

> منصة حديثة بلغتين (عربي/إنجليزي) لتوثيق شجرة عائلة البطاطي.
> Modern bilingual (Ar/En) family-tree platform for the Al-Batati family.

[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org)
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

- **Framework:** Next.js 14 (App Router) + React 18 + TypeScript
- **Styling:** Tailwind CSS 3 with a custom desert/heritage palette
- **Database / Auth:** Supabase (PostgreSQL + Row-Level Security)
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
1. أنشئ مشروعاً جديداً على [supabase.com](https://supabase.com).
2. افتح SQL Editor والصق محتوى `supabase/schema.sql` ثم نفّذه.
3. انسخ مفتاحَيّ `NEXT_PUBLIC_SUPABASE_URL` و `NEXT_PUBLIC_SUPABASE_ANON_KEY` إلى `.env.local`.
4. أعد تشغيل `npm run dev`.

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
│   └── schema.sql           # Full PostgreSQL schema + RLS policies
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
- [ ] ربط الإضافة الفعلية بقاعدة البيانات (Create/Update people & relationships)
- [ ] تحميل الصور (Supabase Storage)
- [ ] مصادقة المستخدمين والصلاحيات (محرر / مشاهد)
- [ ] استيراد/تصدير GEDCOM
- [ ] تطبيق جوال (React Native أو PWA)

---

## 🤝 المساهمة / Contributing

هذا مستودع خاص بعائلة البطاطي. لإضافة أو تعديل المعلومات يجب أن تكون مسجّلاً ومخوّلاً كمحرر.

---

## 📜 الترخيص / License

كل الحقوق محفوظة لعائلة البطاطي / All rights reserved — Al-Batati Family.
