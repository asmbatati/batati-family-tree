"use client";

import { buildSTL } from "@/lib/stl";
import type { ThemeLayout, ThemeOptions } from "./types";

/**
 * Compose the final STL output from a theme's ThemeLayout.
 *
 * - `single`: one ASCII STL with one `solid family_tree` block — everything fused.
 * - `connector+rest`: one ASCII STL with TWO `solid` blocks (connector + leaves+names).
 *   Most slicers offer "Split to objects" on import, giving the user 2 parts to
 *   colour separately.
 * - `three-files`: ZIP via fflate with `connector.stl`, `leaves.stl`, `names.stl`
 *   as three independent objects. Cleanest workflow for filament swaps.
 */
export async function composeOutput(
  name: string,
  layout: ThemeLayout,
  opts: ThemeOptions,
): Promise<{ data: string | Uint8Array; mimeType: string; extension: string }> {
  const connectorTris = layout.shapes.filter((s) => s.kind === "connector").map((s) => s.triangles).filter(Boolean).join("\n");
  const leafTris      = layout.shapes.filter((s) => s.kind === "leaf"     ).map((s) => s.triangles).filter(Boolean).join("\n");
  const nameTris      = layout.shapes.filter((s) => s.kind === "name"     ).map((s) => s.triangles).filter(Boolean).join("\n");

  if (opts.separation === "single") {
    const all = [connectorTris, leafTris, nameTris].filter(Boolean);
    return {
      data: buildSTL(name, all),
      mimeType: "model/stl",
      extension: "stl",
    };
  }

  if (opts.separation === "connector+rest") {
    const restTris = [leafTris, nameTris].filter(Boolean).join("\n");
    return {
      data: buildSTL(name, [
        { group: "connector", tris: connectorTris },
        { group: "leaves_and_names", tris: restTris },
      ]),
      mimeType: "model/stl",
      extension: "stl",
    };
  }

  // three-files: ZIP via fflate.
  const { zipSync, strToU8 } = await import("fflate");
  const files: Record<string, Uint8Array> = {};
  if (connectorTris) files[`${name}_connector.stl`] = strToU8(buildSTL(`${name}_connector`, [connectorTris]));
  if (leafTris)      files[`${name}_leaves.stl`]    = strToU8(buildSTL(`${name}_leaves`,    [leafTris]));
  if (nameTris)      files[`${name}_names.stl`]     = strToU8(buildSTL(`${name}_names`,     [nameTris]));
  return {
    data: zipSync(files),
    mimeType: "application/zip",
    extension: "zip",
  };
}
