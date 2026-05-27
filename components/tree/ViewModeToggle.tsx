"use client";

import { TreeIcon, FocusIcon, LayersIcon } from "@/components/icons";

export type ViewMode = "tree" | "focus" | "descendants" | "layers";

type Props = {
  mode: ViewMode;
  onChange: (m: ViewMode) => void;
  labels: { tree: string; focus: string; descendants: string; layers: string };
  focusDisabled?: boolean;
  descendantsDisabled?: boolean;
};

export default function ViewModeToggle({ mode, onChange, labels, focusDisabled, descendantsDisabled }: Props) {
  const items: { key: ViewMode; label: string; icon: React.ReactNode; disabled?: boolean }[] = [
    { key: "tree",        label: labels.tree,        icon: <TreeIcon className="h-4 w-4" /> },
    { key: "focus",       label: labels.focus,       icon: <FocusIcon className="h-4 w-4" />, disabled: focusDisabled },
    { key: "descendants", label: labels.descendants, icon: <TreeIcon className="h-4 w-4 rotate-180" />, disabled: descendantsDisabled },
    { key: "layers",      label: labels.layers,      icon: <LayersIcon className="h-4 w-4" /> },
  ];
  return (
    <div className="inline-flex items-center gap-1 rounded-full border border-sand-200 bg-white/80 p-1 shadow-soft">
      {items.map((it) => {
        const active = mode === it.key;
        return (
          <button
            key={it.key}
            disabled={it.disabled}
            onClick={() => onChange(it.key)}
            className={
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition " +
              (active
                ? "bg-sand-700 text-white shadow"
                : it.disabled
                  ? "cursor-not-allowed text-sand-300"
                  : "text-sand-700 hover:bg-sand-100")
            }
            aria-pressed={active}
          >
            {it.icon}
            <span>{it.label}</span>
          </button>
        );
      })}
    </div>
  );
}
