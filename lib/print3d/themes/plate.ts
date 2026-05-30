"use client";

import { boxTriangles, cylinderTriangles } from "@/lib/stl";
import { textToTriangles } from "../text2mesh";
import type { Slot, STLShape, Theme, ThemeLayout, ThemeOptions } from "../types";

// Classic flat plate with raised circular leaves. Carries the original
// behaviour from the first iteration of the modal as a fifth theme option.
export const plateTheme: Theme = {
  id: "plate",
  labelAr: "كلاسيكية",
  labelEn: "Classic",
  layout: async (slots, opts) => buildPlateLayout(slots, opts),
};

async function buildPlateLayout(slots: Slot[], opts: ThemeOptions): Promise<ThemeLayout> {
  const s = opts.scale;
  const PLATE_DEPTH = 4 * s;
  const LEAF_DEPTH = opts.leafDepth * s;
  const COUPLE_R = 22 * s;
  const CHILD_R = 14 * s;
  const COL_GAP = 6 * s;
  const ROW_GAP = 10 * s;

  const couple = slots.filter((s2) => s2.role === "center" || s2.role === "spouse");
  const children = slots.filter((s2) => s2.role === "child");

  // Couple row at the top, children laid out below in up to two rows.
  const coupleRowW = couple.length * (COUPLE_R * 2) + (couple.length - 1) * COL_GAP;
  const childrenPerRow = Math.min(5, children.length);
  const childRows: Slot[][] = [];
  for (let i = 0; i < children.length; i += childrenPerRow) {
    childRows.push(children.slice(i, i + childrenPerRow));
  }
  const childrenMaxRowW = childRows.length
    ? Math.max(...childRows.map((r) => r.length * (CHILD_R * 2) + (r.length - 1) * COL_GAP))
    : 0;
  const width = Math.max(coupleRowW, childrenMaxRowW) + 30 * s;
  const height =
    COUPLE_R * 2 + ROW_GAP +
    childRows.length * (CHILD_R * 2 + ROW_GAP) +
    20 * s;

  const shapes: STLShape[] = [];

  // Base plate.
  const plateColor = "#fff8e6";
  shapes.push({
    kind: "connector",
    triangles: boxTriangles(0, 0, width, height, 0, PLATE_DEPTH),
    preview: { type: "rect", x: 0, y: 0, w: width, h: height, rx: 8 * s, fill: plateColor, stroke: "#7c5a25" },
  });

  // Couple row.
  let x = (width - coupleRowW) / 2 + COUPLE_R;
  const coupleY = 10 * s + COUPLE_R;
  for (const slot of couple) {
    await addLeafAndName(shapes, slot, x, coupleY, COUPLE_R, PLATE_DEPTH, LEAF_DEPTH, opts);
    x += COUPLE_R * 2 + COL_GAP;
  }

  // Children rows.
  let y = coupleY + COUPLE_R + ROW_GAP + CHILD_R;
  for (const row of childRows) {
    const rowW = row.length * (CHILD_R * 2) + (row.length - 1) * COL_GAP;
    let cx = (width - rowW) / 2 + CHILD_R;
    for (const slot of row) {
      await addLeafAndName(shapes, slot, cx, y, CHILD_R, PLATE_DEPTH, LEAF_DEPTH, opts);
      cx += CHILD_R * 2 + COL_GAP;
    }
    y += CHILD_R * 2 + ROW_GAP;
  }

  return { width, height, shapes };
}

// Helper used by every theme — adds a circular leaf + the carved/embossed name on top.
export async function addLeafAndName(
  shapes: STLShape[],
  slot: Slot,
  cx: number,
  cy: number,
  r: number,
  plateDepth: number,
  leafDepth: number,
  opts: ThemeOptions,
) {
  // Raised leaf disc.
  shapes.push({
    kind: "leaf",
    triangles: cylinderTriangles(cx, cy, r, 36, plateDepth, plateDepth + leafDepth),
    preview: { type: "circle", cx, cy, r, fill: "url(#leafGrad)", stroke: "#7c5a25" },
  });
  // Carved/embossed name on top.
  const label = slot.person.nameAr || slot.person.nameEn || "";
  if (!label.trim()) return;
  // Carve depth determines z-range and direction.
  const top = plateDepth + leafDepth;
  const nameWidth = r * 1.55;
  let zMin: number, zMax: number;
  if (opts.carveDepth > 0) {
    // Engrave INTO the leaf.
    zMin = top - opts.carveDepth;
    zMax = top;
  } else {
    // Emboss ABOVE the leaf.
    zMin = top;
    zMax = top + Math.abs(opts.carveDepth);
  }
  const { tris } = await textToTriangles(label, {
    width: nameWidth,
    cx,
    cy,
    zMin,
    zMax,
    locale: pickLocale(slot.person.nameAr, slot.person.nameEn),
  });
  if (tris) {
    shapes.push({
      kind: "name",
      triangles: tris,
      preview: {
        type: "text",
        x: cx,
        y: cy,
        text: label,
        fontSize: r * 0.42,
        fill: "#3b2a10",
        anchor: "middle",
      },
    });
  }
}

export function pickLocale(nameAr: string | undefined, nameEn: string | undefined): "ar" | "en" {
  // Prefer Arabic when present (the app is Arabic-first).
  if (nameAr && nameAr.trim()) return "ar";
  if (nameEn && nameEn.trim()) return "en";
  return "ar";
}
