"use client";

import { SearchIcon, CloseIcon } from "@/components/icons";

type Props = {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  resultsCount?: number;
  resultsLabel: string;
  noResultsLabel: string;
};

export default function TreeSearch({ value, onChange, placeholder, resultsCount, resultsLabel, noResultsLabel }: Props) {
  return (
    <div className="relative w-full sm:w-80">
      <SearchIcon className="pointer-events-none absolute top-1/2 start-3 h-4 w-4 -translate-y-1/2 text-sand-500" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-full border border-sand-200 bg-white/90 py-2 ps-9 pe-9 text-sm text-sand-900 placeholder:text-sand-500 shadow-soft outline-none focus:border-sand-400 focus:ring-2 focus:ring-sand-200"
      />
      {value && (
        <button
          onClick={() => onChange("")}
          className="absolute top-1/2 end-2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-full text-sand-500 hover:bg-sand-100"
          aria-label="Clear"
        >
          <CloseIcon className="h-3.5 w-3.5" />
        </button>
      )}
      {value && (
        <div className="absolute -bottom-5 start-3 text-[11px] text-sand-600">
          {resultsCount === 0 ? noResultsLabel : `${resultsCount} ${resultsLabel}`}
        </div>
      )}
    </div>
  );
}
