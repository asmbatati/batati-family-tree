"use client";

import { boxTriangles, cylinderTriangles, triangleFan } from "@/lib/stl";
import { textToTriangles } from "../text2mesh";
import type { Slot, STLShape, Theme, ThemeLayout, ThemeOptions } from "../types";
import { pickLocale } from "./plate";

// Cloud + hearts theme — a bumpy cloud at the top carries the couple's names,
// hearts hang below from short strings, each carrying a child's name.
export const cloudTheme: Theme = {
  id: "cloud",
  labelAr: "غيمة وقلوب",
  labelEn: "Cloud & hearts",
  layout: async (slots, opts) => buildCloudLayout(slots, opts),
};

async function buildCloudLayout(slots: Slot[], opts: ThemeOptions): Promise<ThemeLayout> {
  const s = opts.scale;
  const PLATE_DEPTH = 4 * s;
  const LEAF_DEPTH = opts.leafDepth * s;
  const HEART_SIZE = 26 * s;
  const STRING_W = 2.4 * s;
  const STRING_H = 14 * s;

  const couple = slots.filter((s2) => s2.role === "center" || s2.role === "spouse").slice(0, 3);
  const children = slots.filter((s2) => s2.role === "child");

  // Cloud is built from N overlapping discs in a roughly-egg shape.
  const childCount = children.length;
  const cloudW = Math.max(160 * s, childCount * (HEART_SIZE + 6 * s) + 40 * s);
  const cloudH = 60 * s;
  const cloudCx = cloudW / 2;
  const cloudCy = cloudH / 2 + 10 * s;

  const totalH = cloudH + 20 * s + STRING_H + HEART_SIZE * 1.1 + 10 * s;
  const width = cloudW + 20 * s;
  const height = totalH;

  const shapes: STLShape[] = [];

  // Overlapping disc cloud.
  const discs = [
    { cx: cloudCx - cloudW * 0.32, cy: cloudCy + 4 * s, r: 24 * s },
    { cx: cloudCx - cloudW * 0.12, cy: cloudCy - 6 * s, r: 30 * s },
    { cx: cloudCx + cloudW * 0.08, cy: cloudCy - 8 * s, r: 28 * s },
    { cx: cloudCx + cloudW * 0.28, cy: cloudCy + 2 * s, r: 26 * s },
    { cx: cloudCx,                cy: cloudCy + 12 * s, r: 24 * s }, // bottom bump
  ];
  for (const d of discs) {
    shapes.push({
      kind: "connector",
      triangles: cylinderTriangles(d.cx, d.cy, d.r, 32, 0, PLATE_DEPTH),
      preview: { type: "circle", cx: d.cx, cy: d.cy, r: d.r, fill: "#f4f1e6", stroke: "#a8997b" },
    });
  }

  // Couple names carved directly into the cloud (no leaf disc — text on the
  // cloud face). Positioned across the top of the cloud.
  if (couple.length > 0) {
    const stride = (cloudW - 30 * s) / Math.max(1, couple.length);
    let nx = 15 * s + stride / 2;
    for (const slot of couple) {
      const label = slot.person.nameAr || slot.person.nameEn || "";
      if (label.trim()) {
        const top = PLATE_DEPTH;
        let zMin: number, zMax: number;
        if (opts.carveDepth > 0) { zMin = top - opts.carveDepth; zMax = top; }
        else { zMin = top; zMax = top + Math.abs(opts.carveDepth); }
        const { tris } = await textToTriangles(label, {
          width: stride * 0.85,
          cx: nx,
          cy: cloudCy,
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
              x: nx,
              y: cloudCy,
              text: label,
              fontSize: 7 * s,
              fill: "#3b2a10",
              anchor: "middle",
            },
          });
        }
      }
      nx += stride;
    }
  }

  // Hearts hanging below.
  if (childCount > 0) {
    const heartRowY = cloudH + 20 * s + STRING_H + HEART_SIZE / 2;
    const heartStride = cloudW / childCount;
    for (let i = 0; i < childCount; i++) {
      const slot = children[i];
      const hx = heartStride * (i + 0.5);
      // String — thin rectangle.
      shapes.push({
        kind: "connector",
        triangles: boxTriangles(
          hx - STRING_W / 2,
          cloudH + 10 * s,
          STRING_W,
          STRING_H,
          0,
          PLATE_DEPTH * 0.6,
        ),
        preview: {
          type: "rect",
          x: hx - STRING_W / 2,
          y: cloudH + 10 * s,
          w: STRING_W,
          h: STRING_H,
          fill: "#a8997b",
        },
      });
      // Heart shape.
      const heart = buildHeartShape(hx, heartRowY, HEART_SIZE);
      shapes.push({
        kind: "leaf",
        triangles: triangleFan({ x: hx, y: heartRowY }, heart, PLATE_DEPTH, PLATE_DEPTH + LEAF_DEPTH),
        preview: {
          type: "polygon",
          points: heart,
          fill: "#f8d2d2",
          stroke: "#c04760",
        },
      });
      // Name on top of heart.
      const label = slot.person.nameAr || slot.person.nameEn || "";
      if (label.trim()) {
        const top = PLATE_DEPTH + LEAF_DEPTH;
        let zMin: number, zMax: number;
        if (opts.carveDepth > 0) { zMin = top - opts.carveDepth; zMax = top; }
        else { zMin = top; zMax = top + Math.abs(opts.carveDepth); }
        const { tris } = await textToTriangles(label, {
          width: HEART_SIZE * 0.7,
          cx: hx,
          cy: heartRowY,
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
              x: hx,
              y: heartRowY + 2,
              text: label,
              fontSize: HEART_SIZE * 0.18,
              fill: "#3b2a10",
              anchor: "middle",
            },
          });
        }
      }
    }
  }

  return { width, height, shapes };
}

// Parametric heart silhouette — sampled around the perimeter, returns points
// in CW or CCW order suitable for a triangle-fan from the centre.
function buildHeartShape(cx: number, cy: number, size: number): { x: number; y: number }[] {
  const pts: { x: number; y: number }[] = [];
  const STEPS = 64;
  for (let i = 0; i <= STEPS; i++) {
    const t = (i / STEPS) * Math.PI * 2;
    // Classic heart parametric.
    const x = 16 * Math.pow(Math.sin(t), 3);
    const y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
    // The parametric centres around (0,0) with extent ~32 wide; scale to size.
    const scale = size / 32;
    pts.push({ x: cx + x * scale, y: cy + y * scale });
  }
  return pts;
}
