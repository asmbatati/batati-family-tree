import { notFound } from "next/navigation";
import { isLocale, localeDirection, type Locale } from "@/lib/i18n/config";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import WelcomeClaim from "@/components/auth/WelcomeClaim";
import { getViewerContext } from "@/lib/auth";
import { loadTree } from "@/lib/data/loadTree";

export function generateStaticParams() {
  return [{ locale: "ar" }, { locale: "en" }];
}

export default async function LocaleLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  if (!isLocale(rawLocale)) notFound();
  const locale = rawLocale as Locale;
  const dir = localeDirection[locale];

  const viewer = await getViewerContext();
  // Show the welcome-claim modal only for *non-editor* signed-in users who
  // haven't yet linked their account to a person in the tree. Editors are
  // already authoritative — they don't need to claim — and showing the modal
  // for them caused it to re-appear over every router.refresh() (which
  // remounts the layout), masking the result of newly-added relations.
  const showWelcomeClaim = !!viewer.user && !viewer.isEditor && !viewer.claimedPersonId;
  // Only pay the tree-load cost when the claim modal is actually going to
  // render (so anonymous viewers don't trigger an extra Supabase round-trip).
  const treeForClaim = showWelcomeClaim ? await loadTree() : null;

  return (
    <html lang={locale} dir={dir}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:wght@600;700&family=Tajawal:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen flex flex-col">
        <Header locale={locale} />
        <main className="flex-1">{children}</main>
        <Footer locale={locale} />
        {showWelcomeClaim && treeForClaim && (
          <WelcomeClaim
            locale={locale}
            people={treeForClaim.people}
            relationships={treeForClaim.relationships}
            userEmail={viewer.user?.email ?? null}
          />
        )}
      </body>
    </html>
  );
}
