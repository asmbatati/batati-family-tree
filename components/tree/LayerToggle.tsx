"use client";

import type { TreeLayer } from "@/lib/types";

type Props = {
  active: Record<TreeLayer, boolean>;
  onToggle: (layer: TreeLayer) => void;
  labels: { title: string; men: string; women: string; spouses: string; milk: string; extended: string };
};

const layerStyles: Record<TreeLayer, string> = {
  men: "bg-sand-700 text-white",
  women: "bg-rose-400 text-white",
  spouses: "bg-amber-500 text-white",
  milk: "bg-stone-200 text-stone-800",
  extended: "bg-emerald-600 text-white"
};

export default function LayerToggle({ active, onToggle, labels }: Props) {
  const entries: { key: TreeLayer; label: string }[] = [
    { key: "men", label: labels.men },
    { key: "women", label: labels.women },
    { key: "spouses", label: labels.spouses },
    { key: "milk", label: labels.milk },
    { key: "extended", label: labels.extended }
  ];
  return (
    <div className="rounded-2xl border border-sand-200 bg-white/80 p-4 shadow-soft">
      <div className="mb-2 text-xs font-medium uppercase tracking-wide text-sand-600">{labels.title}</div>
      <div className="flex flex-wrap gap-2">
        {entries.map((e) => (
          <button
            key={e.key}
            type="button"
            onClick={() => onToggle(e.key)}
            className={
              "rounded-full px-3 py-1.5 text-xs font-medium transition border " +
              (active[e.key]
                ? `${layerStyles[e.key]} border-transparent shadow`
                : "bg-white text-sand-700 border-sand-200 hover:bg-sand-50")
            }
            aria-pressed={active[e.key]}
          >
            {e.label}
          </button>
        ))}
      </div>
    </div>
  );
}
