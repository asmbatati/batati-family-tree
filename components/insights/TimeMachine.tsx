"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type Props = {
  minGen: number;
  maxGen: number;
  defaultFrom: number;
  defaultTo: number;
  locale: "ar" | "en";
};

/**
 * Two-handle generation-range filter for the insights page. Updates the URL's
 * `fromGen` / `toGen` search params (debounced) so the server can re-compute
 * every stat on the filtered slice of the family.
 *
 * Client-side because we need a live slider; the actual stats remain server-
 * rendered (the slider just causes a router.replace which triggers RSC re-run).
 */
export default function TimeMachine({ minGen, maxGen, defaultFrom, defaultTo, locale }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(defaultTo);
  const [, startTransition] = useTransition();
  const ar = locale === "ar";
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep local state in sync with external URL changes (browser back/forward).
  useEffect(() => {
    setFrom(defaultFrom);
    setTo(defaultTo);
  }, [defaultFrom, defaultTo]);

  function pushUrl(f: number, t: number) {
    const params = new URLSearchParams(searchParams.toString());
    if (f !== minGen) params.set("fromGen", String(f));
    else params.delete("fromGen");
    if (t !== maxGen) params.set("toGen", String(t));
    else params.delete("toGen");
    const qs = params.toString();
    startTransition(() => {
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    });
  }

  function debouncedPush(f: number, t: number) {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => pushUrl(f, t), 250);
  }

  function onFromChange(v: number) {
    const clamped = Math.min(v, to);
    setFrom(clamped);
    debouncedPush(clamped, to);
  }
  function onToChange(v: number) {
    const clamped = Math.max(v, from);
    setTo(clamped);
    debouncedPush(from, clamped);
  }
  function reset() {
    setFrom(minGen);
    setTo(maxGen);
    pushUrl(minGen, maxGen);
  }

  const isFiltered = from !== minGen || to !== maxGen;

  return (
    <div className="rounded-2xl border border-sand-200 bg-white/80 p-4 shadow-soft">
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-xs font-medium uppercase tracking-wide text-sand-600">
            {ar ? "آلة الزمن" : "Time machine"}
          </div>
          <div className="mt-0.5 text-[11px] text-sand-500">
            {ar
              ? "اضبط نطاق الأجيال — تتحدّث جميع الإحصاءات تلقائياً."
              : "Filter every stat below to a generation range — updates live."}
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="rounded-full bg-sand-100 px-2 py-0.5 tabular-nums text-sand-700">
            G{from}–G{to}
          </span>
          {isFiltered && (
            <button
              type="button"
              onClick={reset}
              className="rounded-full border border-sand-200 bg-white px-2.5 py-0.5 text-sand-700 hover:bg-sand-50"
            >
              {ar ? "إعادة" : "Reset"}
            </button>
          )}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-xs text-sand-700">
          <span>{ar ? "من الجيل" : "From generation"}: G{from}</span>
          <input
            type="range"
            min={minGen}
            max={maxGen}
            value={from}
            onChange={(e) => onFromChange(parseInt(e.target.value, 10))}
            className="accent-sand-700"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-sand-700">
          <span>{ar ? "إلى الجيل" : "To generation"}: G{to}</span>
          <input
            type="range"
            min={minGen}
            max={maxGen}
            value={to}
            onChange={(e) => onToChange(parseInt(e.target.value, 10))}
            className="accent-sand-700"
          />
        </label>
      </div>
    </div>
  );
}
