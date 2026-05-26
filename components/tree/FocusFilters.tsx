"use client";

export type FocusFilterKey =
  | "parents"
  | "children"
  | "siblings"
  | "spouses"
  | "milk"
  | "extended"
  | "females";

export type FocusFilterState = Record<FocusFilterKey, boolean>;

export const DEFAULT_FOCUS_FILTERS: FocusFilterState = {
  parents: true,
  children: true,
  siblings: true,
  spouses: true,
  milk: true,
  extended: true,
  females: true,
};

type Props = {
  filters: FocusFilterState;
  onToggle: (key: FocusFilterKey) => void;
  labels: {
    title: string;
    parents: string;
    children: string;
    siblings: string;
    spouses: string;
    milk: string;
    extended: string;
    females: string;
  };
};

export default function FocusFilters({ filters, onToggle, labels }: Props) {
  const items: { key: FocusFilterKey; label: string }[] = [
    { key: "parents",  label: labels.parents },
    { key: "siblings", label: labels.siblings },
    { key: "spouses",  label: labels.spouses },
    { key: "children", label: labels.children },
    { key: "milk",     label: labels.milk },
    { key: "extended", label: labels.extended },
    { key: "females",  label: labels.females },
  ];

  return (
    <div className="rounded-2xl border border-sand-200 bg-white/80 p-3 shadow-soft">
      <div className="mb-2 text-xs font-medium uppercase tracking-wide text-sand-600">{labels.title}</div>
      <div className="flex flex-wrap gap-1.5">
        {items.map((it) => (
          <button
            key={it.key}
            type="button"
            onClick={() => onToggle(it.key)}
            aria-pressed={filters[it.key]}
            className={
              "rounded-full border px-3 py-1 text-xs font-medium transition " +
              (filters[it.key]
                ? "border-transparent bg-sand-700 text-white shadow"
                : "border-sand-200 bg-white text-sand-700 hover:bg-sand-50")
            }
          >
            {it.label}
          </button>
        ))}
      </div>
    </div>
  );
}
