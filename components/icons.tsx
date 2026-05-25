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

export function getRelationshipIcon(name: string, className = "h-4 w-4") {
  switch (name) {
    case "rings": return <RingsIcon className={className} />;
    case "blood": return <BloodIcon className={className} />;
    case "milk":  return <MilkIcon className={className} />;
    case "branch":return <BranchIcon className={className} />;
    case "leaf":  return <LeafIcon className={className} />;
    default:      return <span className={className} aria-hidden>•</span>;
  }
}
