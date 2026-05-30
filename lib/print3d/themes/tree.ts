"use client";

import { boxTriangles } from "@/lib/stl";
import type { Slot, STLShape, Theme, ThemeLayout, ThemeOptions } from "../types";
import { addLeafAndName } from "./plate";

// Tree theme — tapered trunk + canopy of leaves.
// Couple (center + first spouse) sit on the top branches; additional spouses
// and children populate the lower branches.
export const treeTheme: Theme = {
  id: "tree",
  labelAr: "شجرة",
  labelEn: "Tree",
  layout: async (slots, opts) => buildTreeLayout(slots, opts),
};

async function buildTreeLayout(slots: Slot[], opts: ThemeOptions): Promise<ThemeLayout> {
  const s = opts.scale;
  const PLATE_DEPTH = 4 * s;
  const LEAF_DEPTH = opts.leafDepth * s;
  const COUPLE_R = 22 * s;
  const CHILD_R = 14 * s;
  const TRUNK_W_BOTTOM = 26 * s;
  const TRUNK_W_TOP = 14 * s;

  const couple = slots.filter((s2) => s2.role === "center" || s2.role === "spouse");
  const children = slots.filter((s2) => s2.role === "child");

  // Layout grid: rows of leaves, couple at the top, children below.
  const rows: Slot[][] = [];
  // Top row: couple (up to 3 wide).
  rows.push(couple.slice(0, 3));
  if (couple.length > 3) rows.push(couple.slice(3));
  // Children: up to 4 per row.
  for (let i = 0; i < children.length; i += 4) rows.push(children.slice(i, i + 4));

  const ROW_GAP = 8 * s;
  const COL_GAP = 8 * s;

  // Calculate total dimensions.
  const rowMetrics = rows.map((row) => {
    const r = row[0]?.role === "child" ? CHILD_R : COUPLE_R;
    const w = row.length * (r * 2) + (row.length - 1) * COL_GAP;
    return { row, r, w };
  });
  const maxRowW = rowMetrics.reduce((m, x) => Math.max(m, x.w), 0);
  const canopyH = rowMetrics.reduce((s2, x) => s2 + x.r * 2 + ROW_GAP, 0);
  const trunkH = 50 * s;
  const baseH = 14 * s;
  const baseW = TRUNK_W_BOTTOM * 1.8;
  const width = Math.max(maxRowW + 30 * s, baseW + 20 * s);
  const height = canopyH + trunkH + baseH + 10 * s;
  const cx = width / 2;

  const shapes: STLShape[] = [];

  // Trunk — three stacked tapered boxes from bottom to top.
  const trunkTopY = canopyH + 10 * s; // top of trunk where canopy starts
  const trunkBottomY = trunkTopY + trunkH;
  // 3 segments
  for (let i = 0; i < 3; i++) {
    const t = i / 3;
    const tNext = (i + 1) / 3;
    const w = TRUNK_W_BOTTOM + (TRUNK_W_TOP - TRUNK_W_BOTTOM) * (1 - t);
    const wNext = TRUNK_W_BOTTOM + (TRUNK_W_TOP - TRUNK_W_BOTTOM) * (1 - tNext);
    const wAvg = (w + wNext) / 2;
    const yTop = trunkBottomY - (trunkH * (i + 1)) / 3;
    const yBot = trunkBottomY - (trunkH * i) / 3;
    shapes.push({
      kind: "connector",
      triangles: boxTriangles(cx - wAvg / 2, yTop, wAvg, yBot - yTop, 0, PLATE_DEPTH),
      preview: {
        type: "rect",
        x: cx - wAvg / 2,
        y: yTop,
        w: wAvg,
        h: yBot - yTop,
        rx: 2 * s,
        fill: "#9b6e2e",
        stroke: "#6d4a1a",
      },
    });
  }
  // Base rectangle under the trunk.
  shapes.push({
    kind: "connector",
    triangles: boxTriangles(cx - baseW / 2, trunkBottomY, baseW, baseH, 0, PLATE_DEPTH),
    preview: {
      type: "rect",
      x: cx - baseW / 2,
      y: trunkBottomY,
      w: baseW,
      h: baseH,
      rx: 3 * s,
      fill: "#c9a06b",
      stroke: "#7c5a25",
    },
  });

  // Branches — short extruded rectangles connecting trunk to each row.
  // Then leaves on top of branches.
  let y = ROW_GAP + (rowMetrics[0]?.r ?? COUPLE_R);
  for (const { row, r, w } of rowMetrics) {
    const rowX = (width - w) / 2 + r;
    // Branch rectangle from trunk to under the row.
    // Skip branch for the top row if it's directly above the trunk centre.
    const branchY = y + r;
    const branchLeft = cx - 4 * s;
    const branchRight = cx + 4 * s;
    // The leaves themselves act as the canopy; for visual reference, draw a thin
    // branch line under each row.
    shapes.push({
      kind: "connector",
      triangles: boxTriangles(
        Math.min(branchLeft, rowX - r),
        branchY - 2 * s,
        Math.abs(Math.max(branchRight, rowX + w - r) - Math.min(branchLeft, rowX - r)),
        4 * s,
        0,
        PLATE_DEPTH * 0.9,
      ),
      preview: {
        type: "rect",
        x: Math.min(branchLeft, rowX - r),
        y: branchY - 2 * s,
        w: Math.abs(Math.max(branchRight, rowX + w - r) - Math.min(branchLeft, rowX - r)),
        h: 4 * s,
        rx: 2 * s,
        fill: "#a07640",
        stroke: "#6d4a1a",
      },
    });

    // Leaves themselves.
    let leafX = rowX;
    for (const slot of row) {
      await addLeafAndName(shapes, slot, leafX, y, r, PLATE_DEPTH, LEAF_DEPTH, opts);
      leafX += r * 2 + COL_GAP;
    }
    y += r * 2 + ROW_GAP;
  }

  return { width, height, shapes };
}
