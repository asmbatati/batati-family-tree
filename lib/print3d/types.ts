import type { Person } from "@/lib/types";

/**
 * One person in the 3D-print model. `role` drives sizing — the couple
 * (center + spouse) gets larger leaves; children get smaller ones.
 */
export type Slot = {
  person: Person;
  role: "center" | "spouse" | "child";
  /** Stable display order within `role`. Drives left-to-right placement. */
  index: number;
};

/** A printable sub-shape — pre-tessellated triangles + a 2D footprint for SVG preview. */
export type STLShape = {
  /** ASCII-STL triangle list in the same format `lib/stl.ts` emits. */
  triangles: string;
  /** 2D footprint for the modal's inline SVG preview. */
  preview: SVGPreviewElement;
  /** Logical category — drives separation into single / multi-solid / multi-file STL. */
  kind: "connector" | "leaf" | "name";
};

/** A primitive that can render to SVG for the preview. */
export type SVGPreviewElement =
  | { type: "rect"; x: number; y: number; w: number; h: number; rx?: number; fill: string; stroke?: string }
  | { type: "circle"; cx: number; cy: number; r: number; fill: string; stroke?: string }
  | { type: "polygon"; points: { x: number; y: number }[]; fill: string; stroke?: string }
  | { type: "path"; d: string; fill: string; stroke?: string }
  | { type: "text"; x: number; y: number; text: string; fontSize: number; fill: string; anchor?: "start" | "middle" | "end" };

export type ThemeLayout = {
  /** Bounding box of the whole printable piece in mm. Used to compute the SVG viewBox. */
  width: number;
  height: number;
  /** All printable shapes, already positioned in the (svg-y-down, mm) coordinate space. */
  shapes: STLShape[];
};

export type ThemeOptions = {
  /** How to break the final STL into discrete parts. */
  separation: "single" | "connector+rest" | "three-files";
  /** mm to carve INTO each leaf when rendering names. Positive = engrave depth, negative = emboss height. */
  carveDepth: number;
  /** Z-thickness of the raised leaf above the connector plane (mm). */
  leafDepth: number;
  /** Overall scale multiplier applied to all mm dimensions. */
  scale: number;
};

export type ThemeId = "tree" | "flower" | "roots" | "cloud" | "plate";

export type Theme = {
  id: ThemeId;
  labelAr: string;
  labelEn: string;
  layout: (slots: Slot[], opts: ThemeOptions) => Promise<ThemeLayout>;
};
