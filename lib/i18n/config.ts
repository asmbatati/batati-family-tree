export const locales = ["ar", "en"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "ar";

export const localeDirection: Record<Locale, "rtl" | "ltr"> = {
  ar: "rtl",
  en: "ltr"
};

export const localeLabel: Record<Locale, string> = {
  ar: "العربية",
  en: "English"
};

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}
