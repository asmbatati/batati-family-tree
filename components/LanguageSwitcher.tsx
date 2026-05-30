"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { locales, localeLabel, type Locale } from "@/lib/i18n/config";
import { GlobeIcon } from "./icons";

export default function LanguageSwitcher({ currentLocale }: { currentLocale: Locale }) {
  const pathname = usePathname() ?? "/";
  // Strip the leading "/<locale>" segment to get the rest of the path
  const rest = pathname.replace(/^\/(ar|en)/, "") || "/";

  return (
    <div className="inline-flex h-8 items-center gap-0.5 rounded-full border border-sand-200 bg-white/70 px-1 text-sm shadow-soft backdrop-blur">
      <GlobeIcon className="mx-1 h-3.5 w-3.5 text-sand-600" />
      {locales.map((loc) => {
        const active = loc === currentLocale;
        return (
          <Link
            key={loc}
            href={`/${loc}${rest === "/" ? "" : rest}`}
            className={
              "whitespace-nowrap rounded-full px-2.5 py-1 text-xs transition " +
              (active
                ? "bg-sand-500 text-white shadow"
                : "text-sand-700 hover:bg-sand-100")
            }
            aria-current={active ? "page" : undefined}
          >
            {localeLabel[loc]}
          </Link>
        );
      })}
    </div>
  );
}
