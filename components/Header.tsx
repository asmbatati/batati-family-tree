import Link from "next/link";
import { getDictionary } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/i18n/config";
import LanguageSwitcher from "./LanguageSwitcher";

export default function Header({ locale }: { locale: Locale }) {
  const t = getDictionary(locale);
  const items = [
    { href: "", label: t.nav.home },
    { href: "/about", label: t.nav.about },
    { href: "/tree", label: t.nav.tree },
    { href: "/sources", label: t.nav.sources },
    { href: "/events", label: t.nav.events },
    { href: "/insights", label: t.nav.insights }
  ];
  return (
    <header className="sticky top-0 z-40 border-b border-sand-200/70 bg-sand-50/80 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href={`/${locale}`} className="flex items-center gap-3 group">
          <div className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-sand-400 to-sand-600 text-white font-bold shadow-soft">
            <span className="font-display text-lg">ب</span>
          </div>
          <div className="leading-tight">
            <div className="font-display text-lg text-sand-800">{t.brand.name}</div>
            <div className="text-xs text-sand-600">{t.brand.tagline}</div>
          </div>
        </Link>

        <nav className="hidden md:block">
          <ul className="flex items-center gap-1">
            {items.map((item) => (
              <li key={item.href}>
                <Link
                  href={`/${locale}${item.href}`}
                  className="rounded-full px-3 py-2 text-sm text-sand-700 hover:bg-sand-100 hover:text-sand-900"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <LanguageSwitcher currentLocale={locale} />
      </div>

      {/* Mobile nav */}
      <nav className="border-t border-sand-200/60 bg-sand-50/60 md:hidden">
        <ul className="mx-auto flex max-w-7xl items-center gap-1 overflow-x-auto px-4 py-2 text-sm">
          {items.map((item) => (
            <li key={item.href} className="shrink-0">
              <Link
                href={`/${locale}${item.href}`}
                className="rounded-full px-3 py-1.5 text-sand-700 hover:bg-sand-100"
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
