"use client";

import { boxTriangles } from "@/lib/stl";
import type { Slot, STLShape, Theme, ThemeLayout, ThemeOptions } from "../types";
import { addLeafAndName } from "./plate";

// Roots theme — inverted tree. Couple sit at the trunk-cap (top of the
// model), and children spread downward as leaves at the tips of radiating
// roots, evoking a family tree growing into the ground.
export const rootsTheme: Theme = {
  id: "roots",
  labelAr: "جذور",
  labelEn: "Roots",
  layout: async (slots, opts) => buildRootsLayout(slots, opts),
};

async function buildRootsLayout(slots: Slot[], opts: ThemeOptions): Promise<ThemeLayout> {
  const s = opts.scale;
  const PLATE_DEPTH = 4 * s;
  const LEAF_DEPTH = opts.leafDepth * s;
  const COUPLE_R = 22 * s;
  const CHILD_R = 13 * s;
  const TRUNK_W = 24 * s;
  const TRUNK_H = 18 * s; // shorter — this is the "stub" at the top
  const ROOT_LEN = 70 * s;
  const ROOT_THICK = 4 * s;

  const couple = slots.filter((s2) => s2.role === "center" || s2.role === "spouse").slice(0, 2);
  const children = slots.filter((s2) => s2.role === "child");

  // Couple occupies the top region (one or two leaves above the trunk stub).
  const coupleRowW = couple.length * (COUPLE_R * 2) + (couple.length - 1) * 8 * s;

  // Roots radiate downward in a fan — one per child.
  // We use a wide fan spanning roughly 160° centred straight down.
  const childCount = children.length;
  const fanSpan = childCount <= 1 ? 0 : Math.min(Math.PI * 0.9, 0.4 + childCount * 0.18);
  const fanStart = Math.PI / 2 - fanSpan / 2; // π/2 = straight down

  // Plate dimensions.
  const width = Math.max(coupleRowW + 30 * s, ROOT_LEN * 2 + CHILD_R * 2 + 20 * s);
  const height = COUPLE_R * 2 + 8 * s + TRUNK_H + ROOT_LEN + CHILD_R * 2 + 10 * s;
  const cx = width / 2;
  const coupleY = COUPLE_R + 8 * s;
  const trunkTop = coupleY + COUPLE_R + 4 * s;

  const shapes: STLShape[] = [];

  // Trunk stub.
  shapes.push({
    kind: "connector",
    triangles: boxTriangles(cx - TRUNK_W / 2, trunkTop, TRUNK_W, TRUNK_H, 0, PLATE_DEPTH),
    preview: {
      type: "rect",
      x: cx - TRUNK_W / 2,
      y: trunkTop,
      w: TRUNK_W,
      h: TRUNK_H,
      rx: 2 * s,
      fill: "#9b6e2e",
      stroke: "#6d4a1a",
    },
  });

  // Couple leaves at the top.
  if (couple.length > 0) {
    const startX = (width - coupleRowW) / 2 + COUPLE_R;
    let x = startX;
    for (const slot of couple) {
      await addLeafAndName(shapes, slot, x, coupleY, COUPLE_R, PLATE_DEPTH, LEAF_DEPTH, opts);
      x += COUPLE_R * 2 + 8 * s;
    }
  }

  // Roots: thin rectangles from trunk bottom outward, plus a leaf at the tip.
  const rootOrigin = { x: cx, y: trunkTop + TRUNK_H };
  for (let i = 0; i < childCount; i++) {
    const t = childCount === 1 ? 0.5 : i / (childCount - 1);
    const angle = fanStart + fanSpan * t;
    const tipX = rootOrigin.x + Math.cos(angle) * ROOT_LEN;
    const tipY = rootOrigin.y + Math.sin(angle) * ROOT_LEN;

    // Approximate the root as a series of small axis-aligned segments along
    // the line — keeps the math simple and prints fine.
    const segments = 8;
    for (let j = 0; j < segments; j++) {
      const tA = j / segments;
      const tB = (j + 1) / segments;
      const ax = rootOrigin.x + Math.cos(angle) * ROOT_LEN * tA;
      const ay = rootOrigin.y + Math.sin(angle) * ROOT_LEN * tA;
      const bx = rootOrigin.x + Math.cos(angle) * ROOT_LEN * tB;
      const by = rootOrigin.y + Math.sin(angle) * ROOT_LEN * tB;
      const midX = (ax + bx) / 2;
      const midY = (ay + by) / 2;
      // Segment AABB
      shapes.push({
        kind: "connector",
        triangles: boxTriangles(
          midX - ROOT_THICK / 2,
          midY - ROOT_THICK / 2,
          ROOT_THICK,
          ROOT_THICK,
          0,
          PLATE_DEPTH * 0.7,
        ),
        preview: {
          type: "circle",
          cx: midX,
          cy: midY,
          r: ROOT_THICK / 2,
          fill: "#a07640",
          stroke: "#6d4a1a",
        },
      });
    }

    // Leaf at tip.
    await addLeafAndName(shapes, children[i], tipX, tipY, CHILD_R, PLATE_DEPTH, LEAF_DEPTH, opts);
  }

  return { width, height, shapes };
}
