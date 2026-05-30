import type { Theme } from "../types";
import { plateTheme } from "./plate";
import { treeTheme } from "./tree";
import { flowerTheme } from "./flower";
import { rootsTheme } from "./roots";
import { cloudTheme } from "./cloud";

/** Registry of all available themes, in display order. */
export const THEMES: Theme[] = [
  treeTheme,
  flowerTheme,
  rootsTheme,
  cloudTheme,
  plateTheme,
];

export function findTheme(id: string): Theme {
  return THEMES.find((t) => t.id === id) ?? treeTheme;
}
