import { notFound } from "next/navigation";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { seedPeople, seedRelationships } from "@/lib/data/seed";
import TreeCanvas from "@/components/tree/TreeCanvas";

export default async function TreePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  if (!isLocale(rawLocale)) notFound();
  const locale = rawLocale as Locale;
  const t = getDictionary(locale);

  // TODO: when Supabase is configured, fetch from DB instead of seed.
  const people = seedPeople;
  const relationships = seedRelationships;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <header className="mb-6">
        <h1 className="font-display text-3xl text-sand-900 sm:text-4xl">{t.tree.title}</h1>
        <p className="mt-1 text-sand-700">{t.tree.subtitle}</p>
      </header>

      <TreeCanvas
        people={people}
        relationships={relationships}
        locale={locale}
        treeDict={{
          layers: t.tree.layers,
          focus: t.tree.focus,
          relations: t.tree.relations,
          add: t.tree.add
        }}
        personDict={t.person}
      />
    </div>
  );
}
