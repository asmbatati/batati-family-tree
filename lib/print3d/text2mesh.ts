"use client";

/**
 * Text → triangulated, extruded mesh.
 *
 * Pipeline:
 *   1. Lazy-load opentype.js + the Amiri font (~250 kB) on first call.
 *      Cached for the rest of the session.
 *   2. opentype's `font.stringToGlyphs(text)` returns shaped glyphs. The font
 *      provides the init/medi/fina/isol GSUB substitutions for Arabic, so the
 *      glyph shapes are correct for connected Arabic script.
 *   3. For all-Arabic input, reverse the glyph order so RTL reads correctly
 *      when laid out left-to-right in the printed model. (Latin text and
 *      mixed-script content stays in source order.)
 *   4. For each glyph, walk its SVG path commands, flatten quadratic /
 *      cubic Bezier curves to line segments (≈0.15 mm chord tolerance), and
 *      classify each closed sub-path as outer ring or hole by signed area.
 *   5. Triangulate the polygon (with holes for letters like ع / و / o / e)
 *      via `earcut`.
 *   6. Extrude the triangulation between `zMin` and `zMax` using
 *      `extrudePolygon` from lib/stl.ts.
 *
 * Output is the same ASCII-STL triangle blob format `boxTriangles` /
 * `cylinderTriangles` emit, so callers compose freely via `buildSTL`.
 */

import { extrudePolygon } from "@/lib/stl";

type LoadedFont = {
  // Loose typing for opentype.js — we only use a handful of its surface.
  load: (url: string) => Promise<OpentypeFont>;
};
type OpentypeFont = {
  unitsPerEm: number;
  stringToGlyphs: (str: string) => OpentypeGlyph[];
  charToGlyph: (ch: string) => OpentypeGlyph;
};
type OpentypeGlyph = {
  getPath: (x: number, y: number, fontSize: number) => OpentypePath;
  advanceWidth?: number;
};
type OpentypePath = {
  commands: PathCommand[];
};
type PathCommand =
  | { type: "M"; x: number; y: number }
  | { type: "L"; x: number; y: number }
  | { type: "C"; x1: number; y1: number; x2: number; y2: number; x: number; y: number }
  | { type: "Q"; x1: number; y1: number; x: number; y: number }
  | { type: "Z" };

let _fontPromise: Promise<OpentypeFont> | null = null;
let _opentype: LoadedFont | null = null;
let _earcut: ((data: number[], holeIndices?: number[] | null, dim?: number) => number[]) | null = null;

const FONT_URL = "/fonts/print3d/Amiri-Regular.ttf";

/** Lazy load opentype.js + the Amiri font (once per session).
 *  We pre-fetch the .ttf manually and pass an ArrayBuffer to opentype.parse
 *  with `lowMemory: true` — that defers parsing the GSUB table until we
 *  actually call `stringToGlyphs`. Since we use `charToGlyph` instead
 *  (avoiding GSUB substitution entirely), we never trip on opentype.js's
 *  unsupported lookup types (the "lookupType X - substFormat Y is not yet
 *  supported" error). Trade-off: Arabic letters render in their isolated
 *  forms, with no contextual joining. */
async function loadFont(): Promise<OpentypeFont> {
  if (_fontPromise) return _fontPromise;
  _fontPromise = (async () => {
    const res = await fetch(FONT_URL);
    if (!res.ok) {
      throw new Error(`Font fetch failed: ${res.status} ${res.statusText} (${FONT_URL})`);
    }
    const ct = res.headers.get("content-type") ?? "";
    if (ct.includes("text/html")) {
      throw new Error(`Font URL returned HTML (${FONT_URL}) — file is missing from public/`);
    }
    const buf = await res.arrayBuffer();
    if (!_opentype) {
      const mod = await import("opentype.js");
      _opentype = mod.default as unknown as LoadedFont & { parse: (buf: ArrayBuffer, opts?: { lowMemory?: boolean }) => OpentypeFont };
    }
    type ParseFn = { parse: (buf: ArrayBuffer, opts?: { lowMemory?: boolean }) => OpentypeFont };
    return (_opentype as unknown as ParseFn).parse(buf, { lowMemory: true });
  })();
  return _fontPromise;
}

/** Lazy load earcut. */
async function loadEarcut() {
  if (_earcut) return _earcut;
  const mod = await import("earcut");
  // earcut's main export is the function itself.
  _earcut = (mod.default as unknown) as typeof _earcut as never;
  return _earcut!;
}

const ARABIC_RANGE = /[؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿]/;

function isMostlyArabic(s: string): boolean {
  let arabic = 0, total = 0;
  for (const ch of s) {
    if (/\s|\d|\p{P}/u.test(ch)) continue;
    total++;
    if (ARABIC_RANGE.test(ch)) arabic++;
  }
  return total > 0 && arabic / total > 0.5;
}

/** Adaptive Bezier flattening — recursive subdivision. */
function flattenCubic(
  out: number[][],
  x0: number, y0: number,
  x1: number, y1: number,
  x2: number, y2: number,
  x3: number, y3: number,
  tol: number,
  depth = 0,
) {
  if (depth > 10) { out.push([x3, y3]); return; }
  // Approximate flatness: distance from control points to the line p0–p3.
  const dx = x3 - x0, dy = y3 - y0;
  const len2 = dx * dx + dy * dy || 1;
  const d1 = Math.abs((x1 - x0) * dy - (y1 - y0) * dx) / Math.sqrt(len2);
  const d2 = Math.abs((x2 - x0) * dy - (y2 - y0) * dx) / Math.sqrt(len2);
  if (Math.max(d1, d2) < tol) { out.push([x3, y3]); return; }
  // Subdivide via de Casteljau.
  const x01 = (x0 + x1) / 2, y01 = (y0 + y1) / 2;
  const x12 = (x1 + x2) / 2, y12 = (y1 + y2) / 2;
  const x23 = (x2 + x3) / 2, y23 = (y2 + y3) / 2;
  const x012 = (x01 + x12) / 2, y012 = (y01 + y12) / 2;
  const x123 = (x12 + x23) / 2, y123 = (y12 + y23) / 2;
  const x0123 = (x012 + x123) / 2, y0123 = (y012 + y123) / 2;
  flattenCubic(out, x0, y0, x01, y01, x012, y012, x0123, y0123, tol, depth + 1);
  flattenCubic(out, x0123, y0123, x123, y123, x23, y23, x3, y3, tol, depth + 1);
}

function flattenQuadratic(
  out: number[][],
  x0: number, y0: number,
  x1: number, y1: number,
  x2: number, y2: number,
  tol: number,
  depth = 0,
) {
  if (depth > 10) { out.push([x2, y2]); return; }
  const dx = x2 - x0, dy = y2 - y0;
  const len2 = dx * dx + dy * dy || 1;
  const d = Math.abs((x1 - x0) * dy - (y1 - y0) * dx) / Math.sqrt(len2);
  if (d < tol) { out.push([x2, y2]); return; }
  const x01 = (x0 + x1) / 2, y01 = (y0 + y1) / 2;
  const x12 = (x1 + x2) / 2, y12 = (y1 + y2) / 2;
  const x012 = (x01 + x12) / 2, y012 = (y01 + y12) / 2;
  flattenQuadratic(out, x0, y0, x01, y01, x012, y012, tol, depth + 1);
  flattenQuadratic(out, x012, y012, x12, y12, x2, y2, tol, depth + 1);
}

/** Walk a glyph path's commands → array of closed sub-paths (rings of [x,y] pts). */
function pathToRings(cmds: PathCommand[], tol: number): number[][][] {
  const rings: number[][][] = [];
  let cur: number[][] = [];
  let x = 0, y = 0;
  let startX = 0, startY = 0;
  for (const c of cmds) {
    if (c.type === "M") {
      if (cur.length > 0) rings.push(cur);
      cur = [[c.x, c.y]];
      x = c.x; y = c.y; startX = c.x; startY = c.y;
    } else if (c.type === "L") {
      cur.push([c.x, c.y]);
      x = c.x; y = c.y;
    } else if (c.type === "C") {
      const pts: number[][] = [];
      flattenCubic(pts, x, y, c.x1, c.y1, c.x2, c.y2, c.x, c.y, tol);
      for (const p of pts) cur.push(p);
      x = c.x; y = c.y;
    } else if (c.type === "Q") {
      const pts: number[][] = [];
      flattenQuadratic(pts, x, y, c.x1, c.y1, c.x, c.y, tol);
      for (const p of pts) cur.push(p);
      x = c.x; y = c.y;
    } else if (c.type === "Z") {
      // Close path — drop the closing point if it duplicates the first.
      if (cur.length > 1) {
        const f = cur[0], l = cur[cur.length - 1];
        if (Math.abs(f[0] - l[0]) < 1e-6 && Math.abs(f[1] - l[1]) < 1e-6) cur.pop();
      }
      rings.push(cur);
      cur = [];
      x = startX; y = startY;
    }
  }
  if (cur.length > 0) rings.push(cur);
  return rings;
}

/** Signed area of a ring — positive = CCW, negative = CW. */
function signedArea(ring: number[][]): number {
  let a = 0;
  for (let i = 0, n = ring.length; i < n; i++) {
    const [x0, y0] = ring[i];
    const [x1, y1] = ring[(i + 1) % n];
    a += x0 * y1 - x1 * y0;
  }
  return a / 2;
}

export type TextToMeshOptions = {
  /** Desired width of the rendered text in mm. Height scales proportionally. */
  width: number;
  /** Centre position of the text (mm) in the model's coordinate space (svg-y-down). */
  cx: number;
  cy: number;
  /** Z-range of the extruded text. zMin < zMax. */
  zMin: number;
  zMax: number;
  /** Bezier flatness tolerance (mm). Smaller = more triangles, smoother letters. */
  tolerance?: number;
  /** Caller-provided locale hint, used when guessing RTL. Defaults to auto-detect. */
  locale?: "ar" | "en";
};

/** Render a single line of text as extruded triangles. Returns the ASCII-STL
 *  triangle string + the actual rendered bounds in mm. */
export async function textToTriangles(
  text: string,
  opts: TextToMeshOptions,
): Promise<{ tris: string; bounds: { width: number; height: number } }> {
  if (!text.trim()) return { tris: "", bounds: { width: 0, height: 0 } };

  const font = await loadFont();
  const earcut = await loadEarcut();

  // 1. Pick glyphs WITHOUT GSUB — `charToGlyph` returns the codepoint's
  // base glyph, never the contextual form. This avoids opentype.js's
  // unsupported-lookup-type crashes. Cost: Arabic letters render in their
  // isolated form (each character a standalone shape).
  const chars = [...text];
  let glyphs = chars.map((ch) => font.charToGlyph(ch));

  // 2. RTL: reverse glyph order for predominantly-Arabic strings so they
  // read right-to-left when laid out at advancing x.
  const isRTL = opts.locale === "ar" || (opts.locale !== "en" && isMostlyArabic(text));
  if (isRTL) glyphs = glyphs.slice().reverse();

  // 3. Compute total advance to derive a font size that hits the target width.
  // First pass at fontSize=1000 (em units), then scale.
  const PROBE = 1000;
  let probeWidth = 0;
  const probeAdvances: number[] = [];
  for (const g of glyphs) {
    const adv = ((g.advanceWidth ?? 0) / font.unitsPerEm) * PROBE;
    probeAdvances.push(adv);
    probeWidth += adv;
  }
  if (probeWidth <= 0) return { tris: "", bounds: { width: 0, height: 0 } };
  const fontSize = (opts.width / probeWidth) * PROBE;
  const tolMm = opts.tolerance ?? 0.18;
  // Convert mm tolerance back to glyph-path units at this fontSize.
  const tol = tolMm;

  // 4. Walk glyphs left-to-right, collecting rings.
  const allTris: string[] = [];
  let minY = Infinity, maxY = -Infinity;
  let penX = 0;
  for (let gi = 0; gi < glyphs.length; gi++) {
    const g = glyphs[gi];
    const p = g.getPath(penX, 0, fontSize);
    penX += (probeAdvances[gi] / PROBE) * fontSize;
    const rings = pathToRings(p.commands as PathCommand[], tol);
    if (rings.length === 0) continue;

    // Sort rings by signed area: largest absolute area = outer ring; others nested as holes.
    // For most glyphs there's one outer + a few holes. We treat the largest as outer.
    const ringsWithArea = rings.map((r) => ({ ring: r, area: signedArea(r) }));
    ringsWithArea.sort((a, b) => Math.abs(b.area) - Math.abs(a.area));

    // Build a single combined polygon per glyph with holes.
    const outer = ringsWithArea[0].ring;
    const holes = ringsWithArea.slice(1).map((r) => r.ring);

    // Ensure outer is CCW (positive area), holes are CW (negative area) — earcut convention.
    if (signedArea(outer) < 0) outer.reverse();
    for (const h of holes) if (signedArea(h) > 0) h.reverse();

    // Flatten into [x0, y0, x1, y1, …] for earcut.
    const flat: number[] = [];
    for (const [x, y] of outer) flat.push(x, y);
    const holeIndices: number[] = [];
    for (const h of holes) {
      holeIndices.push(flat.length / 2);
      for (const [x, y] of h) flat.push(x, y);
    }

    let triIdx: number[];
    try {
      triIdx = earcut(flat, holeIndices.length ? holeIndices : null, 2);
    } catch {
      // earcut threw — skip this glyph rather than break the whole STL.
      continue;
    }
    if (triIdx.length === 0) continue;

    allTris.push(extrudePolygon(flat, holeIndices, triIdx, opts.zMin, opts.zMax));

    // Track bounds for the bounds return value.
    for (let k = 0; k < flat.length; k += 2) {
      if (flat[k + 1] < minY) minY = flat[k + 1];
      if (flat[k + 1] > maxY) maxY = flat[k + 1];
    }
  }

  const renderedWidth = penX;
  const renderedHeight = isFinite(minY) ? maxY - minY : 0;

  // 5. Translate the assembled triangle blob to be centred at (cx, cy).
  // The triangles were emitted at penX=0 origin with baseline y=0.
  // We need them centred horizontally at cx and vertically at cy.
  // Easiest: parse the lines and offset the x and y coords. The triangle
  // text format has lines starting with "      vertex X Y Z".
  const dx = opts.cx - renderedWidth / 2;
  const baselineY = (minY + maxY) / 2;
  const dy = opts.cy - baselineY;
  const blob = allTris.join("\n");
  const offset = blob.replace(/^\s{6}vertex\s(-?\d+(?:\.\d+)?)\s(-?\d+(?:\.\d+)?)\s(-?\d+(?:\.\d+)?)$/gm, (_m, x, y, z) => {
    // Note: lib/stl.ts y-flips for STL y-up, but here we're shifting BEFORE the flip
    // would be applied — except extrudePolygon already flipped y. So we shift the
    // already-flipped y. The flipped y of (cy + ...) is (-cy + ...).
    const nx = parseFloat(x) + dx;
    const ny = parseFloat(y) - dy; // y is already flipped, so subtract dy to shift "down" in svg-y terms
    return `      vertex ${nx.toFixed(4)} ${ny.toFixed(4)} ${z}`;
  });

  return {
    tris: offset,
    bounds: { width: renderedWidth, height: renderedHeight },
  };
}
