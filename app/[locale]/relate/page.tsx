import { notFound } from "next/navigation";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { loadTree } from "@/lib/data/loadTree";
import { isEditor } from "@/lib/auth";
import RelateExplorer from "@/components/relate/RelateExplorer";

export default async function RelatePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  if (!isLocale(rawLocale)) notFound();
  const locale = rawLocale as Locale;
  const t = getDictionary(locale);

  const editor = await isEditor();
  const { people, relationships } = await loadTree({
    maskFemaleAs: editor ? null : t.tree.redactedFemale,
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <h1 className="font-display text-3xl text-sand-900 sm:text-4xl">{t.relate.title}</h1>
      <p className="mt-2 text-sand-700">{t.relate.subtitle}</p>

      <div className="mt-8">
        <RelateExplorer
          people={people}
          relationships={relationships}
          locale={locale}
          dict={t.relate}
          relationLabels={t.tree.relations}
        />
      </div>
    </div>
  );
}
