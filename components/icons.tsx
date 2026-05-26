// Inline SVG icons for relationship types and UI affordances.
// Each icon takes className for sizing/coloring via Tailwind.

type IconProps = { className?: string; title?: string };

export function RingsIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <circle cx="9" cy="14" r="5" />
      <circle cx="15" cy="14" r="5" />
      <path d="M7 5l2 2M17 5l-2 2" strokeLinecap="round" />
    </svg>
  );
}

export function BloodIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M9 3c0 4-3 6-3 9a3 3 0 006 0c0-3-3-5-3-9z" opacity=".85" />
      <path d="M16 9c0 3-2 4-2 7a2 2 0 004 0c0-2-2-3-2-7z" opacity=".6" />
    </svg>
  );
}

export function MilkIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
      <path d="M9 3h6v3l1 3v10a2 2 0 01-2 2h-4a2 2 0 01-2-2V9l1-3V3z" />
      <path d="M9 12h6" opacity=".5" />
    </svg>
  );
}

export function BranchIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M12 21V8" strokeLinecap="round" />
      <path d="M12 13l-5-5M12 11l5-5" strokeLinecap="round" />
      <circle cx="12" cy="5" r="2" />
      <circle cx="6" cy="7" r="1.5" />
      <circle cx="18" cy="4" r="1.5" />
    </svg>
  );
}

export function ChildIcon({ className }: IconProps) {
  // Small sapling — single stem with bud, two leaves spreading down.
  // Visually distinct from BranchIcon (which points upward at roots).
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <circle cx="12" cy="5" r="2.4" />
      <path d="M12 7v12" strokeLinecap="round" />
      <path d="M12 14l-5 4M12 14l5 4" strokeLinecap="round" />
    </svg>
  );
}

export function LeafIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M5 19c0-8 6-14 14-14 0 8-6 14-14 14z" />
      <path d="M5 19l9-9" strokeLinecap="round" />
    </svg>
  );
}

export function PlusIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 5v14M5 12h14" strokeLinecap="round" />
    </svg>
  );
}

export function GlobeIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18" />
    </svg>
  );
}

export function CloseIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
    </svg>
  );
}

export function EditIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 20h4l10-10-4-4L4 16v4z" strokeLinejoin="round" />
      <path d="M14 6l4 4" />
    </svg>
  );
}

export function ChevronIcon({ className }: IconProps) {
  // Points down by default. Rotate via className (e.g. `-rotate-90`) for collapsed state.
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
      <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function SearchIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" strokeLinecap="round" />
    </svg>
  );
}

export function TreeIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="4" r="2" />
      <circle cx="6" cy="12" r="2" />
      <circle cx="18" cy="12" r="2" />
      <circle cx="4" cy="20" r="1.6" />
      <circle cx="9" cy="20" r="1.6" />
      <circle cx="15" cy="20" r="1.6" />
      <circle cx="20" cy="20" r="1.6" />
      <path d="M12 6v2M12 8L6 10M12 8l6 2M6 14v2M6 16l-2 2M6 16l3 2M18 14v2M18 16l-3 2M18 16l2 2" strokeLinecap="round" />
    </svg>
  );
}

export function LayersIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 3l9 5-9 5-9-5 9-5z" />
      <path d="M3 13l9 5 9-5" opacity=".7" />
      <path d="M3 17l9 5 9-5" opacity=".4" />
    </svg>
  );
}

export function FocusIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="3" />
      <circle cx="12" cy="12" r="8" opacity=".5" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3" strokeLinecap="round" />
    </svg>
  );
}

export function getRelationshipIcon(name: string, className = "h-4 w-4") {
  switch (name) {
    case "rings":  return <RingsIcon className={className} />;
    case "blood":  return <BloodIcon className={className} />;
    case "milk":   return <MilkIcon className={className} />;
    case "branch": return <BranchIcon className={className} />;
    case "child":  return <ChildIcon className={className} />;
    case "leaf":   return <LeafIcon className={className} />;
    default:       return <span className={className} aria-hidden>•</span>;
  }
}
