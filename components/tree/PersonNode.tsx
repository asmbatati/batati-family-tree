"use client";

import type { Person, TreeLayer } from "@/lib/types";

type Props = {
  person: Person;
  locale: "ar" | "en";
  layer: TreeLayer;
  active: boolean;
  faded: boolean;
  onClick: () => void;
};

/** Single person node — sized & styled by layer */
export default function PersonNode({ person, locale, layer, active, faded, onClick }: Props) {
  const name = locale === "ar" ? person.nameAr : (person.nameEn || person.nameAr);
  const isMale = person.gender === "male";

  const base =
    "group inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition focus:outline-none focus:ring-2 focus:ring-sand-500";

  let style = "";
  switch (layer) {
    case "men":
      style = "bg-sand-50 border-sand-300 text-sand-900 hover:bg-sand-100 shadow-soft";
      break;
    case "women":
      style = "bg-rose-50/70 border-rose-200 text-rose-900 hover:bg-rose-100/80 shadow-soft";
      break;
    case "spouses":
      style = "bg-amber-50 border-amber-300 text-amber-900 hover:bg-amber-100 ring-1 ring-amber-200";
      break;
    case "milk":
      style = "bg-white border-stone-300 text-stone-700 hover:bg-stone-50 border-dashed";
      break;
    case "extended":
      style = "bg-emerald-50/70 border-emerald-200 text-emerald-900 hover:bg-emerald-100/70";
      break;
  }

  const activeRing = active ? "ring-2 ring-sand-700 ring-offset-2 ring-offset-sand-50 animate-pulse-soft" : "";
  const fadedCls = faded ? "opacity-30 saturate-50" : "";

  return (
    <button onClick={onClick} className={`${base} ${style} ${activeRing} ${fadedCls}`} title={name}>
      <span
        aria-hidden
        className={
          "h-2.5 w-2.5 rounded-full " +
          (isMale ? "bg-sand-600" : "bg-rose-400")
        }
      />
      <span className="font-medium">{name}</span>
      {person.externalFamilyId && (
        <span className="rounded-full bg-white/70 px-1.5 py-0.5 text-[10px] text-sand-700 border border-sand-200">
          {locale === "ar" ? person.familyAr : (person.familyEn || person.familyAr || "?")}
        </span>
      )}
    </button>
  );
}
