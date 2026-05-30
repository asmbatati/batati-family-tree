/**
 * Minimal ASCII-STL builder for extruded 2D shapes. Output is the standard
 * `solid name … endsolid` text format that every 3D-printer slicer (Cura,
 * PrusaSlicer, Bambu Studio, …) imports natively.
 *
 * We use ASCII rather than binary STL because (a) it's tiny in JS — no
 * DataView gymnastics, (b) slicer support is universal, (c) the output is
 * inspectable as plain text.
 *
 * Coordinates: x grows to the right, y grows DOWN (matching SVG) and is
 * flipped to STL's y-up at write time. z is the extrusion depth (the "thickness"
 * of the printable model). All units are millimetres unless caller chooses
 * otherwise.
 */

export type Vec3 = readonly [number, number, number];

function fmt(n: number): string {
  // Trim noisy decimals; 4 places is plenty for printer slicers.
  return Number.isFinite(n) ? n.toFixed(4) : "0";
}

/** Emit a single triangle with an auto-computed outward normal. */
function facet(a: Vec3, b: Vec3, c: Vec3): string {
  const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
  const vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
  let nx = uy * vz - uz * vy;
  let ny = uz * vx - ux * vz;
  let nz = ux * vy - uy * vx;
  const len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
  nx /= len; ny /= len; nz /= len;
  return [
    `  facet normal ${fmt(nx)} ${fmt(ny)} ${fmt(nz)}`,
    `    outer loop`,
    `      vertex ${fmt(a[0])} ${fmt(a[1])} ${fmt(a[2])}`,
    `      vertex ${fmt(b[0])} ${fmt(b[1])} ${fmt(b[2])}`,
    `      vertex ${fmt(c[0])} ${fmt(c[1])} ${fmt(c[2])}`,
    `    endloop`,
    `  endfacet`,
  ].join("\n");
}

/** Build the triangles for an axis-aligned box (8 vertices, 12 tris). */
export function boxTriangles(
  x: number, y: number, w: number, h: number,
  zMin: number, zMax: number,
): string {
  // STL convention is y-up; we flip the SVG y so the model prints right-side-up.
  const yFlip = (y0: number) => -y0;
  const v0: Vec3 = [x,     yFlip(y),     zMin];
  const v1: Vec3 = [x + w, yFlip(y),     zMin];
  const v2: Vec3 = [x + w, yFlip(y + h), zMin];
  const v3: Vec3 = [x,     yFlip(y + h), zMin];
  const v4: Vec3 = [x,     yFlip(y),     zMax];
  const v5: Vec3 = [x + w, yFlip(y),     zMax];
  const v6: Vec3 = [x + w, yFlip(y + h), zMax];
  const v7: Vec3 = [x,     yFlip(y + h), zMax];

  return [
    // Bottom face (normal -z)
    facet(v0, v2, v1), facet(v0, v3, v2),
    // Top face (normal +z)
    facet(v4, v5, v6), facet(v4, v6, v7),
    // +y wall (note y flipped, so this is the back when printed)
    facet(v0, v4, v5), facet(v0, v5, v1),
    // -y wall (front)
    facet(v3, v2, v6), facet(v3, v6, v7),
    // -x wall (left)
    facet(v0, v7, v3), facet(v0, v4, v7),
    // +x wall (right)
    facet(v1, v6, v2), facet(v1, v5, v6),
  ].join("\n");
}

/** Build the triangles for an extruded regular n-gon (for circular leaves).
 *  Centered at (cx, cy) in SVG-y-down space; n points on a circle of radius r. */
export function cylinderTriangles(
  cx: number, cy: number, r: number, sides: number,
  zMin: number, zMax: number,
): string {
  const yFlip = (y0: number) => -y0;
  const pts: { sx: number; sy: number }[] = [];
  for (let i = 0; i < sides; i++) {
    const a = (i / sides) * Math.PI * 2;
    pts.push({ sx: cx + Math.cos(a) * r, sy: cy + Math.sin(a) * r });
  }
  const out: string[] = [];
  // Top & bottom — fan triangulation from the centre.
  for (let i = 0; i < sides; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % sides];
    // Bottom (normal -z): wind clockwise
    out.push(facet(
      [cx, yFlip(cy), zMin],
      [b.sx, yFlip(b.sy), zMin],
      [a.sx, yFlip(a.sy), zMin],
    ));
    // Top (normal +z): wind counter-clockwise
    out.push(facet(
      [cx, yFlip(cy), zMax],
      [a.sx, yFlip(a.sy), zMax],
      [b.sx, yFlip(b.sy), zMax],
    ));
    // Side wall — two triangles per segment.
    out.push(facet(
      [a.sx, yFlip(a.sy), zMin],
      [b.sx, yFlip(b.sy), zMin],
      [b.sx, yFlip(b.sy), zMax],
    ));
    out.push(facet(
      [a.sx, yFlip(a.sy), zMin],
      [b.sx, yFlip(b.sy), zMax],
      [a.sx, yFlip(a.sy), zMax],
    ));
  }
  return out.join("\n");
}

/** Combine several extruded shapes into a complete ASCII-STL string. */
export function buildSTL(name: string, parts: string[]): string;
export function buildSTL(name: string, groups: { group: string; tris: string }[]): string;
export function buildSTL(name: string, partsOrGroups: string[] | { group: string; tris: string }[]): string {
  const safeName = name.replace(/[^A-Za-z0-9_-]+/g, "_") || "model";
  if (partsOrGroups.length === 0) return `solid ${safeName}\nendsolid ${safeName}`;
  // Detect the grouped form (array of objects with `group` + `tris`).
  const first = partsOrGroups[0];
  if (typeof first === "object" && first !== null && "group" in first) {
    const groups = partsOrGroups as { group: string; tris: string }[];
    return groups
      .map((g) => {
        const gName = g.group.replace(/[^A-Za-z0-9_-]+/g, "_") || "part";
        return [`solid ${gName}`, g.tris, `endsolid ${gName}`].join("\n");
      })
      .join("\n");
  }
  const parts = partsOrGroups as string[];
  return [`solid ${safeName}`, ...parts, `endsolid ${safeName}`].join("\n");
}

// ---------------------------------------------------------------------------
// Higher-level geometry helpers used by the print3d theme modules.

/** Format-flip an SVG y-down coordinate to STL y-up. Used everywhere below. */
const yFlip = (y: number): number => -y;

/** Triangle-fan around a centre point in the XY plane, extruded between zMin and zMax.
 *  Used for petals (where `ring` is two arcs joined at a centre) and hearts. */
export function triangleFan(
  centre: { x: number; y: number },
  ring: { x: number; y: number }[],
  zMin: number,
  zMax: number,
): string {
  if (ring.length < 2) return "";
  const out: string[] = [];
  for (let i = 0; i < ring.length - 1; i++) {
    const a = ring[i];
    const b = ring[i + 1];
    // Bottom (normal -z)
    out.push(facet(
      [centre.x, yFlip(centre.y), zMin],
      [b.x, yFlip(b.y), zMin],
      [a.x, yFlip(a.y), zMin],
    ));
    // Top (normal +z)
    out.push(facet(
      [centre.x, yFlip(centre.y), zMax],
      [a.x, yFlip(a.y), zMax],
      [b.x, yFlip(b.y), zMax],
    ));
    // Side wall between ring[i] and ring[i+1]
    out.push(facet(
      [a.x, yFlip(a.y), zMin],
      [b.x, yFlip(b.y), zMin],
      [b.x, yFlip(b.y), zMax],
    ));
    out.push(facet(
      [a.x, yFlip(a.y), zMin],
      [b.x, yFlip(b.y), zMax],
      [a.x, yFlip(a.y), zMax],
    ));
  }
  return out.join("\n");
}

/** Extrude an arbitrary polygon (outer ring + optional holes) between zMin and zMax.
 *
 *  Inputs are SVG-y-down coordinates as a flat `[x0, y0, x1, y1, …]` array
 *  and a `holeIndices` array matching the format the `earcut` library
 *  produces. Returns the same ASCII-STL triangle string format the rest of
 *  this module emits, so output composes naturally with `buildSTL`. */
export function extrudePolygon(
  flatCoords: number[],
  holeIndices: number[],
  triIndices: number[],
  zMin: number,
  zMax: number,
): string {
  if (triIndices.length === 0) return "";
  const out: string[] = [];

  // Top + bottom faces — use the triangulation directly.
  for (let i = 0; i < triIndices.length; i += 3) {
    const ia = triIndices[i], ib = triIndices[i + 1], ic = triIndices[i + 2];
    const ax = flatCoords[ia * 2], ay = flatCoords[ia * 2 + 1];
    const bx = flatCoords[ib * 2], by = flatCoords[ib * 2 + 1];
    const cx = flatCoords[ic * 2], cy = flatCoords[ic * 2 + 1];
    // Bottom face — clockwise winding for outward -z normal.
    out.push(facet(
      [ax, yFlip(ay), zMin],
      [cx, yFlip(cy), zMin],
      [bx, yFlip(by), zMin],
    ));
    // Top face — counter-clockwise for outward +z normal.
    out.push(facet(
      [ax, yFlip(ay), zMax],
      [bx, yFlip(by), zMax],
      [cx, yFlip(cy), zMax],
    ));
  }

  // Side walls — walk each ring's edges. A ring is a contiguous index
  // range [start, end) in flatCoords/2. `holeIndices` marks ring boundaries.
  const totalVerts = flatCoords.length / 2;
  const ringStarts = [0, ...holeIndices, totalVerts];
  for (let r = 0; r < ringStarts.length - 1; r++) {
    const s = ringStarts[r];
    const e = ringStarts[r + 1];
    for (let i = s; i < e; i++) {
      const j = i + 1 < e ? i + 1 : s;
      const ax = flatCoords[i * 2], ay = flatCoords[i * 2 + 1];
      const bx = flatCoords[j * 2], by = flatCoords[j * 2 + 1];
      out.push(facet(
        [ax, yFlip(ay), zMin],
        [bx, yFlip(by), zMin],
        [bx, yFlip(by), zMax],
      ));
      out.push(facet(
        [ax, yFlip(ay), zMin],
        [bx, yFlip(by), zMax],
        [ax, yFlip(ay), zMax],
      ));
    }
  }
  return out.join("\n");
}

/** Trigger a browser download of an ASCII string as a .stl file. */
export function downloadSTL(stlText: string, filename: string): void {
  const blob = new Blob([stlText], { type: "model/stl" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".stl") ? filename : `${filename}.stl`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Same for an SVG string — useful for laser-cut workflows. */
export function downloadSVG(svgText: string, filename: string): void {
  const blob = new Blob([svgText], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".svg") ? filename : `${filename}.svg`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
