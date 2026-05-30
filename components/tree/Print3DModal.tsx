"use client";

import { useEffect, useMemo, useState } from "react";
import type { Person, Relationship } from "@/lib/types";
import { CloseIcon } from "@/components/icons";
import { buildSlots } from "@/lib/print3d/slots";
import { THEMES, findTheme } from "@/lib/print3d/themes";
import { composeOutput } from "@/lib/print3d/compose";
import type { Slot, STLShape, SVGPreviewElement, ThemeLayout, ThemeOptions } from "@/lib/print3d/types";

type Props = {
  center: Person;
  people: Person[];
  relationships: Relationship[];
  locale: "ar" | "en";
  onClose: () => void;
};

const DEFAULT_OPTIONS: ThemeOptions = {
  separation: "single",
  carveDepth: 0.6,   // engrave 0.6 mm into the leaf
  leafDepth: 3,      // raised relief 3 mm
  scale: 1.0,
};

export default function Print3DModal({ center, people, relationships, locale, onClose }: Props) {
  const ar = locale === "ar";

  const slots: Slot[] = useMemo(
    () => buildSlots(center, relationships, people),
    [center, people, relationships],
  );

  const [themeId, setThemeId] = useState<string>("tree");
  const [opts, setOpts] = useState<ThemeOptions>(DEFAULT_OPTIONS);
  const [layout, setLayout] = useState<ThemeLayout | null>(null);
  const [busy, setBusy] = useState<null | "preview" | "stl" | "svg">(null);
  const [error, setError] = useState<string | null>(null);

  // Re-build the layout (which now includes carved text geometry) whenever
  // the user changes the theme, the family, or the options.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setBusy("preview");
      setError(null);
      try {
        const theme = findTheme(themeId);
        const result = await theme.layout(slots, opts);
        if (!cancelled) setLayout(result);
      } catch (e) {
        if (!cancelled) {
          setError(String((e as Error).message ?? e));
          setLayout(null);
        }
      } finally {
        if (!cancelled) setBusy(null);
      }
    })();
    return () => { cancelled = true; };
  }, [themeId, opts, slots]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const centerName = locale === "ar" ? center.nameAr : (center.nameEn || center.nameAr);
  const filenameBase = `family-tree-${(center.nameEn || center.nameAr || "tree").replace(/\s+/g, "_")}-${themeId}`;

  async function onDownloadSTL() {
    if (!layout) return;
    setBusy("stl");
    try {
      const out = await composeOutput(filenameBase, layout, opts);
      // `out.data` is either a string (single STL / multi-solid STL) or a
      // Uint8Array (ZIP bytes from fflate). Both are valid BlobParts at
      // runtime; TS narrows them via the cast.
      const blob = new Blob([out.data as BlobPart], { type: out.mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${filenameBase}.${out.extension}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      setError(String((e as Error).message ?? e));
    } finally {
      setBusy(null);
    }
  }

  function onDownloadSVG() {
    if (!layout) return;
    setBusy("svg");
    try {
      const svg = renderLayoutToSVG(layout, slots, locale);
      const blob = new Blob([svg], { type: "image/svg+xml" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${filenameBase}.svg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } finally {
      setBusy(null);
    }
  }

  function updateOpt<K extends keyof ThemeOptions>(key: K, value: ThemeOptions[K]) {
    setOpts((o) => ({ ...o, [key]: value }));
  }

  return (
    <div
      className="fixed inset-0 z-[55] grid place-items-center bg-black/50 px-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[94vh] w-full max-w-5xl flex-col rounded-3xl bg-white shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-sand-100 px-6 py-4">
          <div>
            <h2 className="font-display text-xl text-sand-900">
              {ar ? "نموذج للطباعة ثلاثية الأبعاد" : "3D-printable family piece"}
            </h2>
            <p className="mt-0.5 text-xs text-sand-600">
              {ar
                ? `معاينة للوحة ${centerName} وعائلته. الأسماء تُحفر في الـ STL مباشرةً.`
                : `Preview for ${centerName}'s family piece. Names are carved directly into the STL.`}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-full text-sand-600 hover:bg-sand-100"
            aria-label={ar ? "إغلاق" : "Close"}
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        {/* 3-pane body */}
        <div className="grid flex-1 grid-cols-1 gap-4 overflow-y-auto p-6 lg:grid-cols-[200px_1fr_240px]">
          {/* Left rail: theme picker */}
          <div className="space-y-2">
            <div className="text-[10px] font-medium uppercase tracking-wide text-sand-500">
              {ar ? "النمط" : "Theme"}
            </div>
            {THEMES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setThemeId(t.id)}
                className={
                  "flex w-full items-center gap-2 rounded-2xl border px-3 py-2 text-start text-sm transition " +
                  (themeId === t.id
                    ? "border-amber-400 bg-amber-50 text-amber-900 shadow-soft"
                    : "border-sand-200 bg-white text-sand-700 hover:bg-sand-50")
                }
              >
                <ThemeIcon id={t.id} />
                <span>{ar ? t.labelAr : t.labelEn}</span>
              </button>
            ))}
          </div>

          {/* Centre: SVG preview */}
          <div className="flex flex-col items-center gap-3">
            <div className="w-full rounded-2xl border border-sand-200 bg-sand-50 p-3">
              {layout ? (
                <PreviewSVG layout={layout} slots={slots} locale={locale} />
              ) : (
                <div className="grid h-64 place-items-center text-sm text-sand-500">
                  {busy === "preview"
                    ? (ar ? "جارٍ توليد المعاينة..." : "Generating preview…")
                    : (ar ? "اختر نمطاً للبدء" : "Pick a theme to start")}
                </div>
              )}
            </div>
            {layout && (
              <div className="grid w-full grid-cols-1 gap-2 text-xs text-sand-700 sm:grid-cols-3">
                <Stat label={ar ? "الأبعاد" : "Dimensions"} value={`${layout.width.toFixed(0)} × ${layout.height.toFixed(0)} mm`} />
                <Stat label={ar ? "السُمك" : "Thickness"} value={`${(4 + opts.leafDepth).toFixed(1)} mm`} />
                <Stat label={ar ? "الأسماء" : "Names"} value={`${slots.length}`} />
              </div>
            )}
            {error && (
              <div className="w-full rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-900">
                {error}
              </div>
            )}
          </div>

          {/* Right rail: options */}
          <div className="space-y-3">
            <div className="text-[10px] font-medium uppercase tracking-wide text-sand-500">
              {ar ? "الإعدادات" : "Options"}
            </div>

            <SliderRow
              label={ar ? "عمق الحفر (mm)" : "Carve depth (mm)"}
              min={-1.5} max={1.5} step={0.1} value={opts.carveDepth}
              onChange={(v) => updateOpt("carveDepth", v)}
              hint={opts.carveDepth > 0
                ? (ar ? "حفر داخل الورقة" : "Engraved INTO the leaf")
                : (ar ? "بروز فوق الورقة" : "Embossed ABOVE the leaf")}
            />
            <SliderRow
              label={ar ? "سُمك الورقة (mm)" : "Leaf depth (mm)"}
              min={1} max={6} step={0.5} value={opts.leafDepth}
              onChange={(v) => updateOpt("leafDepth", v)}
            />
            <SliderRow
              label={ar ? "الحجم %" : "Scale %"}
              min={0.5} max={1.5} step={0.05} value={opts.scale}
              onChange={(v) => updateOpt("scale", v)}
              formatter={(v) => `${Math.round(v * 100)} %`}
            />

            <div>
              <div className="text-xs font-medium text-sand-700">
                {ar ? "الفصل إلى أجزاء" : "Separation"}
              </div>
              <div className="mt-1 flex flex-col gap-1 text-xs">
                {(
                  [
                    { key: "single",          ar: "ملف واحد",         en: "Single STL" },
                    { key: "connector+rest",  ar: "ملف بقسمين",       en: "Two solids (split in slicer)" },
                    { key: "three-files",     ar: "3 ملفات في ZIP",   en: "Three files (ZIP)" },
                  ] as const
                ).map((sep) => (
                  <label key={sep.key} className="flex items-center gap-2 rounded-xl border border-sand-200 bg-white px-3 py-1.5 hover:bg-sand-50">
                    <input
                      type="radio"
                      name="separation"
                      value={sep.key}
                      checked={opts.separation === sep.key}
                      onChange={() => updateOpt("separation", sep.key)}
                      className="h-3 w-3"
                    />
                    <span className="text-sand-800">{ar ? sep.ar : sep.en}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] text-emerald-900">
              {ar
                ? "الأسماء تُحفر في الـ STL مباشرةً (خط أميري لدعم العربية)."
                : "Names are carved directly into the STL (Amiri font for Arabic support)."}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-sand-100 px-6 py-3">
          <button
            type="button"
            onClick={onDownloadSVG}
            disabled={busy !== null || !layout}
            className="rounded-full border border-sand-300 bg-white px-4 py-2 text-xs font-medium text-sand-700 shadow-soft hover:bg-sand-50 disabled:opacity-50"
          >
            {busy === "svg" ? (ar ? "جارٍ..." : "Generating…") : (ar ? "تنزيل SVG" : "Download SVG")}
          </button>
          <button
            type="button"
            onClick={onDownloadSTL}
            disabled={busy !== null || !layout}
            className="rounded-full bg-sand-700 px-4 py-2 text-xs font-medium text-white shadow-soft hover:bg-sand-800 disabled:opacity-50"
          >
            {busy === "stl"
              ? (ar ? "جارٍ توليد..." : "Generating…")
              : opts.separation === "three-files"
                ? (ar ? "تنزيل ZIP" : "Download ZIP")
                : (ar ? "تنزيل STL" : "Download STL")}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

function PreviewSVG({ layout, slots, locale }: { layout: ThemeLayout; slots: Slot[]; locale: "ar" | "en" }) {
  void slots;
  void locale;
  return (
    <svg
      viewBox={`0 0 ${layout.width} ${layout.height}`}
      width="100%"
      style={{ maxHeight: "60vh", display: "block", margin: "0 auto" }}
    >
      <defs>
        <linearGradient id="plateGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fff8e6" />
          <stop offset="100%" stopColor="#f0e3c0" />
        </linearGradient>
        <radialGradient id="leafGrad" cx="35%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#fbf7f0" />
          <stop offset="100%" stopColor="#e6d4ad" />
        </radialGradient>
      </defs>
      {layout.shapes.map((shape, i) => renderPreviewShape(shape, i))}
    </svg>
  );
}

function renderPreviewShape(shape: STLShape, key: number) {
  const el = shape.preview;
  return renderPreviewElement(el, key);
}

function renderPreviewElement(el: SVGPreviewElement, key: number) {
  switch (el.type) {
    case "rect":
      return (
        <rect
          key={key}
          x={el.x} y={el.y} width={el.w} height={el.h}
          rx={el.rx} ry={el.rx}
          fill={el.fill} stroke={el.stroke} strokeWidth={el.stroke ? 0.8 : 0}
        />
      );
    case "circle":
      return (
        <circle
          key={key}
          cx={el.cx} cy={el.cy} r={el.r}
          fill={el.fill} stroke={el.stroke} strokeWidth={el.stroke ? 0.8 : 0}
        />
      );
    case "polygon":
      return (
        <polygon
          key={key}
          points={el.points.map((p) => `${p.x},${p.y}`).join(" ")}
          fill={el.fill} stroke={el.stroke} strokeWidth={el.stroke ? 0.8 : 0}
        />
      );
    case "path":
      return (
        <path
          key={key}
          d={el.d}
          fill={el.fill} stroke={el.stroke} strokeWidth={el.stroke ? 0.8 : 0}
        />
      );
    case "text":
      return (
        <text
          key={key}
          x={el.x} y={el.y}
          fontSize={el.fontSize}
          textAnchor={el.anchor ?? "middle"}
          dominantBaseline="middle"
          fill={el.fill}
        >
          {el.text}
        </text>
      );
  }
}

function renderLayoutToSVG(layout: ThemeLayout, slots: Slot[], locale: "ar" | "en"): string {
  void slots;
  void locale;
  const escape = (s: string): string =>
    s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" }[c]!));
  const shapeXml = (s: STLShape): string => {
    const el = s.preview;
    switch (el.type) {
      case "rect":
        return `<rect x="${el.x}" y="${el.y}" width="${el.w}" height="${el.h}" rx="${el.rx ?? 0}" ry="${el.rx ?? 0}" fill="${el.fill}" ${el.stroke ? `stroke="${el.stroke}" stroke-width="0.8"` : ""} />`;
      case "circle":
        return `<circle cx="${el.cx}" cy="${el.cy}" r="${el.r}" fill="${el.fill}" ${el.stroke ? `stroke="${el.stroke}" stroke-width="0.8"` : ""} />`;
      case "polygon":
        return `<polygon points="${el.points.map((p) => `${p.x},${p.y}`).join(" ")}" fill="${el.fill}" ${el.stroke ? `stroke="${el.stroke}" stroke-width="0.8"` : ""} />`;
      case "path":
        return `<path d="${el.d}" fill="${el.fill}" ${el.stroke ? `stroke="${el.stroke}" stroke-width="0.8"` : ""} />`;
      case "text":
        return `<text x="${el.x}" y="${el.y}" font-size="${el.fontSize}" text-anchor="${el.anchor ?? "middle"}" dominant-baseline="middle" fill="${el.fill}">${escape(el.text)}</text>`;
    }
  };

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${layout.width} ${layout.height}" width="${layout.width}mm" height="${layout.height}mm">
  ${layout.shapes.map(shapeXml).join("\n  ")}
</svg>`;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-sand-200 bg-white p-2">
      <div className="text-[10px] uppercase tracking-wide text-sand-500">{label}</div>
      <div className="mt-0.5 font-medium">{value}</div>
    </div>
  );
}

function SliderRow({
  label, min, max, step, value, onChange, hint, formatter,
}: {
  label: string;
  min: number; max: number; step: number; value: number;
  onChange: (v: number) => void;
  hint?: string;
  formatter?: (v: number) => string;
}) {
  return (
    <label className="block text-xs">
      <div className="flex items-baseline justify-between">
        <span className="font-medium text-sand-700">{label}</span>
        <span className="tabular-nums text-sand-600">{formatter ? formatter(value) : value.toFixed(2)}</span>
      </div>
      <input
        type="range"
        min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="mt-1 w-full accent-sand-700"
      />
      {hint && <div className="text-[10px] text-sand-500">{hint}</div>}
    </label>
  );
}

function ThemeIcon({ id }: { id: string }) {
  const stroke = "#7c5a25";
  const fill = "#fff8e6";
  const sw = 1.4;
  const base = "h-5 w-5 shrink-0";
  switch (id) {
    case "tree":
      return (
        <svg viewBox="0 0 24 24" className={base} fill={fill} stroke={stroke} strokeWidth={sw}>
          <circle cx="8" cy="7" r="3.5" /><circle cx="16" cy="7" r="3.5" /><circle cx="12" cy="11" r="3.5" />
          <rect x="10.5" y="13" width="3" height="8" rx="1" fill={stroke} stroke="none" />
        </svg>
      );
    case "flower":
      return (
        <svg viewBox="0 0 24 24" className={base} fill={fill} stroke={stroke} strokeWidth={sw}>
          <circle cx="12" cy="6" r="3" /><circle cx="6.5" cy="9.5" r="3" /><circle cx="17.5" cy="9.5" r="3" />
          <circle cx="9" cy="15" r="3" /><circle cx="15" cy="15" r="3" />
          <circle cx="12" cy="11" r="2" fill="#f7c97a" />
        </svg>
      );
    case "roots":
      return (
        <svg viewBox="0 0 24 24" className={base} fill={fill} stroke={stroke} strokeWidth={sw}>
          <rect x="10.5" y="3" width="3" height="6" rx="1" fill={stroke} stroke="none" />
          <circle cx="6" cy="14" r="2.5" /><circle cx="12" cy="17" r="2.5" /><circle cx="18" cy="14" r="2.5" />
          <path d="M12 9 L6 14 M12 9 L12 17 M12 9 L18 14" fill="none" />
        </svg>
      );
    case "cloud":
      return (
        <svg viewBox="0 0 24 24" className={base} fill={fill} stroke={stroke} strokeWidth={sw}>
          <ellipse cx="12" cy="7" rx="9" ry="4" />
          <path d="M9 17 L8 15 M12 18 L12 15 M15 17 L16 15" />
          <path d="M7.5 19 q 0.5 -2 2 -2 q 0.5 -1.5 1.5 -1.5 q 1 0 1.5 1.5 q 1.5 0 2 2 q -0.3 1.5 -2 1.5 h -3 q -1.7 0 -2 -1.5 z" fill="#f8d2d2" stroke="#c04760" />
        </svg>
      );
    case "plate":
    default:
      return (
        <svg viewBox="0 0 24 24" className={base} fill={fill} stroke={stroke} strokeWidth={sw}>
          <rect x="2" y="6" width="20" height="12" rx="2" />
          <circle cx="7" cy="12" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="17" cy="12" r="2" />
        </svg>
      );
  }
}
