import { notFound } from "next/navigation";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { loadTree } from "@/lib/data/loadTree";
import { getViewerContext } from "@/lib/auth";
import TreeCanvas from "@/components/tree/TreeCanvas";

// Force this route to always render dynamically — never cache the SSR'd output.
// Reason: editors add/edit/delete people and relationships from the client, then
// call `router.refresh()` to re-pull. If Next caches the rendered page (which it
// can do opportunistically even when `cookies()` is used elsewhere in the
// component tree), `router.refresh()` won't actually re-execute `loadTree`, and
// the editor's mutations appear "to not work" — they're in the DB but the tree
// keeps showing the pre-mutation snapshot.
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function TreePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  if (!isLocale(rawLocale)) notFound();
  const locale = rawLocale as Locale;
  const t = getDictionary(locale);

  const viewer = await getViewerContext();
  const { people, relationships } = await loadTree({
    maskFemaleAs: viewer.isEditor ? null : t.tree.redactedFemale,
  });

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
        isEditor={viewer.isEditor}
        canSuggest={viewer.canSuggest}
        userId={viewer.user?.id ?? null}
        treeDict={{
          layers: t.tree.layers,
          focus: t.tree.focus,
          views: t.tree.views,
          search: t.tree.search,
          actions: t.tree.actions,
          relations: t.tree.relations,
          add: t.tree.add
        }}
        personDict={t.person}
      />
    </div>
  );
}
