import { getDictionary } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/i18n/config";

export default function Footer({ locale }: { locale: Locale }) {
  const t = getDictionary(locale);
  return (
    <footer className="mt-16 border-t border-sand-200/70 bg-sand-50/60">
      <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-2 px-4 py-6 text-sm text-sand-600 sm:flex-row sm:items-center sm:px-6">
        <span>© {new Date().getFullYear()} — {t.footer.rights}</span>
        <span className="text-xs">{t.footer.builtWith}</span>
      </div>
    </footer>
  );
}
