"use client";

import { cylinderTriangles } from "@/lib/stl";
import type { Slot, STLShape, Theme, ThemeLayout, ThemeOptions } from "../types";
import { addLeafAndName } from "./plate";

// Flower theme — central disc + petals radiating around. Couple as two large
// opposing petals at the top; children as smaller petals interleaved 360°.
export const flowerTheme: Theme = {
  id: "flower",
  labelAr: "زهرة",
  labelEn: "Flower",
  layout: async (slots, opts) => buildFlowerLayout(slots, opts),
};

async function buildFlowerLayout(slots: Slot[], opts: ThemeOptions): Promise<ThemeLayout> {
  const s = opts.scale;
  const PLATE_DEPTH = 4 * s;
  const LEAF_DEPTH = opts.leafDepth * s;
  const COUPLE_R = 22 * s;
  const CHILD_R = 14 * s;
  const CENTER_R = 16 * s;
  const COUPLE_OFFSET = 50 * s; // radial distance for couple petals
  const CHILD_OFFSET = 46 * s;  // radial distance for child petals

  const couple = slots.filter((s2) => s2.role === "center" || s2.role === "spouse").slice(0, 2);
  const children = slots.filter((s2) => s2.role === "child");

  // Total petals
  const allPetals = [...couple, ...children];
  const n = allPetals.length;

  // Layout: couple at top (angles -PI/2 ± gap), children fill the rest.
  // Use n equally-spaced angles starting from -PI/2 (top), going clockwise.
  // Couple gets the first two slots (top-left and top-right of the top).
  const angles: number[] = [];
  if (n === 1) {
    angles.push(-Math.PI / 2);
  } else if (couple.length === 2) {
    // Couple at top-left and top-right.
    angles.push(-Math.PI / 2 - 0.3);
    angles.push(-Math.PI / 2 + 0.3);
    // Children evenly around the remaining 360°-0.6 arc.
    const childCount = children.length;
    const startA = -Math.PI / 2 + 0.3 + 0.5;
    const endA = -Math.PI / 2 - 0.3 - 0.5 + Math.PI * 2;
    const sweep = endA - startA;
    for (let i = 0; i < childCount; i++) {
      angles.push(startA + (sweep * (i + 0.5)) / childCount);
    }
  } else {
    // Just center + children. Center at top, children around.
    angles.push(-Math.PI / 2);
    const childCount = children.length;
    for (let i = 0; i < childCount; i++) {
      angles.push(-Math.PI / 2 + ((Math.PI * 2 - 0.4) * (i + 1)) / (childCount + 1) + 0.2);
    }
  }

  const radius = Math.max(COUPLE_OFFSET, CHILD_OFFSET);
  const width = (radius + COUPLE_R) * 2 + 20 * s;
  const height = (radius + COUPLE_R) * 2 + 20 * s;
  const cx = width / 2;
  const cy = height / 2;

  const shapes: STLShape[] = [];

  // Central disc.
  shapes.push({
    kind: "connector",
    triangles: cylinderTriangles(cx, cy, CENTER_R, 36, 0, PLATE_DEPTH + LEAF_DEPTH * 0.5),
    preview: { type: "circle", cx, cy, r: CENTER_R, fill: "#f7c97a", stroke: "#a06820" },
  });
  // A thin ring "stem" — radial spokes from center to each petal.
  for (let i = 0; i < n; i++) {
    const a = angles[i];
    const slot = allPetals[i];
    const isCouple = slot.role === "center" || slot.role === "spouse";
    const r = isCouple ? COUPLE_R : CHILD_R;
    const offset = isCouple ? COUPLE_OFFSET : CHILD_OFFSET;
    const px = cx + Math.cos(a) * offset;
    const py = cy + Math.sin(a) * offset;

    // Stem rectangle from disc edge to petal base — approximated as a thin
    // box rotated to angle a. We just lay it down as a thin axis-aligned
    // box for simplicity; the visual is dominated by the petals anyway.
    // (Skipped for now — keeps the model cleaner.)

    await addLeafAndName(shapes, slot, px, py, r, PLATE_DEPTH, LEAF_DEPTH, opts);
  }

  return { width, height, shapes };
}
