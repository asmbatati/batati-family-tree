"use client";

import { useMemo, useRef, useState } from "react";
import type { Person, Relationship, TreeLayer } from "@/lib/types";
import { siblingOrderCompare, buildPatrilineMap, lineageName } from "@/lib/relationships";
import ExportPdfButton from "./ExportPdfButton";

type Node = {
  person: Person;
  depth: number;
  children: Node[];
  x: number;
  y: number;
  subtreeWidth: number;
};

type Props = {
  center: Person;
  people: Person[];
  relationships: Relationship[];
  locale: "ar" | "en";
  onSelect: (id: string) => void;
};

const NODE_W = 170;
const NODE_H = 44;
const H_GAP = 18;       // horizontal gap between leaf subtrees
const V_GAP = 64;       // vertical gap between generations
const MARGIN = 40;      // svg outer padding

/**
 * DescendantsView — hierarchical top-down tree of every descendant of the
 * center person (children, grandchildren, … down to leaves). Zoomable.
 *
 * Layout: tidy-tree post-order pass — each subtree allocates its own width
 * (max(NODE_W + H_GAP, sum of children subtreeWidths)); parents are then
 * centered above their children. Cycle protection via a visited set so a
 * mis-entered self-loop in `parent_of` doesn't infinite-recurse.
 */
export default function DescendantsView({ center, people, relationships, locale, onSelect }: Props) {
  const [zoom, setZoom] = useState(1);
  const ar = locale === "ar";
  const svgRef = useRef<SVGSVGElement | null>(null);

  const tree = useMemo(
    () => buildTree(center, people, relationships),
    [center, people, relationships],
  );

  const { width, height, maxDepth } = useMemo(() => layoutTree(tree), [tree]);

  const { nodes, edges } = useMemo(() => flattenTree(tree), [tree]);

  const stats = useMemo(() => computeStats(tree), [tree]);

  const centerName = ar ? center.nameAr : (center.nameEn || center.nameAr);

  // PDF title subtitle — patrilineal chain up to 4 forefathers (5 names).
  const peopleById = useMemo(() => new Map(people.map((p) => [p.id, p])), [people]);
  const patrilineMap = useMemo(() => buildPatrilineMap(people, relationships), [people, relationships]);
  const lineageChain = useMemo(
    () => lineageName(center, peopleById, patrilineMap, locale, 5),
    [center, peopleById, patrilineMap, locale],
  );

  return (
    <div className="relative overflow-hidden rounded-3xl border border-sand-200 bg-white/70 p-4 shadow-soft sm:p-6">
      {/* Stats card — corner overlay */}
      <div className="absolute top-4 start-4 z-10 max-w-xs rounded-2xl border border-sand-200 bg-white/95 p-3 text-xs shadow-soft backdrop-blur">
        <div className="text-[10px] font-medium uppercase tracking-wide text-sand-500">
          {ar ? "إحصائيات الذرية" : "Descendant stats"}
        </div>
        <div className="mt-1 truncate text-sand-900" title={centerName}>
          <span className="font-medium">{centerName}</span>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-0.5 text-sand-800">
          <div>{ar ? "الإجمالي" : "Total"}</div>
          <div className="text-end font-medium">{stats.totalDescendants}</div>
          <div className="text-sand-700">{ar ? "ذكور" : "Male"}</div>
          <div className="text-end font-medium text-sand-700">{stats.maleCount}</div>
          <div className="text-rose-700">{ar ? "إناث" : "Female"}</div>
          <div className="text-end font-medium text-rose-700">{stats.femaleCount}</div>
          <div className="text-sand-500">{ar ? "الأجيال" : "Generations"}</div>
          <div className="text-end font-medium text-sand-500">{maxDepth}</div>
        </div>
      </div>

      {/* Zoom + Export controls */}
      <div className="absolute top-4 end-4 z-10 flex items-center gap-2">
        <div className="flex items-center gap-1 rounded-full border border-sand-200 bg-white/95 p-1 shadow-soft">
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(0.25, Math.round((z - 0.2) * 100) / 100))}
            className="grid h-7 w-7 place-items-center rounded-full text-sand-700 hover:bg-sand-100"
            aria-label={ar ? "تصغير" : "Zoom out"}
          >
            −
          </button>
          <button
            type="button"
            onClick={() => setZoom(1)}
            className="rounded-full px-2 py-0.5 text-[11px] tabular-nums text-sand-700 hover:bg-sand-100"
            title={ar ? "إعادة" : "Reset"}
          >
            {Math.round(zoom * 100)}%
          </button>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(3, Math.round((z + 0.2) * 100) / 100))}
            className="grid h-7 w-7 place-items-center rounded-full text-sand-700 hover:bg-sand-100"
            aria-label={ar ? "تكبير" : "Zoom in"}
          >
            +
          </button>
        </div>
        <div className="bg-white/95 rounded-full shadow-soft">
          <ExportPdfButton
            targetRef={svgRef as React.RefObject<SVGSVGElement | null>}
            title={ar ? `الذرية — ${centerName}` : `Descendants — ${centerName}`}
            subtitle={lineageChain}
            locale={locale}
          />
        </div>
      </div>

      {/* Scroll viewport for the SVG */}
      <div className="overflow-auto" style={{ maxHeight: "78vh" }}>
        <svg
          ref={svgRef}
          viewBox={`0 0 ${width} ${height}`}
          width={width * zoom}
          height={height * zoom}
          className="block max-w-none"
          aria-label={ar ? "ذرية الشخص" : "Descendants tree"}
        >
          {/* Edges first so nodes paint on top. */}
          {edges.map((e, i) => (
            <Edge key={i} from={e.from} to={e.to} />
          ))}
          {/* Nodes. */}
          {nodes.map((n) => (
            <foreignObject
              key={n.person.id}
              x={n.x - NODE_W / 2}
              y={n.y - NODE_H / 2}
              width={NODE_W}
              height={NODE_H}
            >
              <DescNode person={n.person} isCenter={n === tree} locale={locale} onSelect={onSelect} />
            </foreignObject>
          ))}
        </svg>
      </div>
    </div>
  );
}

// --- subcomponents -----------------------------------------------------------

function Edge({ from, to }: { from: Node; to: Node }) {
  const startY = from.y + NODE_H / 2;
  const endY = to.y - NODE_H / 2;
  const midY = (startY + endY) / 2;
  const d = `M ${from.x} ${startY} L ${from.x} ${midY} L ${to.x} ${midY} L ${to.x} ${endY}`;
  return (
    <path
      d={d}
      stroke="#2e7d4f"
      strokeWidth={1.5}
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  );
}

function personLayer(p: Person): TreeLayer {
  if (p.externalFamilyId) return "spouses";
  return p.gender === "male" ? "men" : "women";
}

function DescNode({
  person, isCenter, locale, onSelect,
}: {
  person: Person;
  isCenter: boolean;
  locale: "ar" | "en";
  onSelect: (id: string) => void;
}) {
  const layer = personLayer(person);
  const colorBg =
    layer === "men" ? "#fbf7f0" :
    layer === "women" ? "#fff1f2" :
    layer === "spouses" ? "#fff7e6" : "#f8fafc";
  const colorBorder =
    isCenter ? "#3b2a10" :
    layer === "men" ? "#dcbb7c" :
    layer === "women" ? "#fda4af" :
    layer === "spouses" ? "#fbbf24" : "#e5e7eb";
  const name = locale === "ar" ? person.nameAr : (person.nameEn || person.nameAr);
  return (
    <button
      onClick={() => onSelect(person.id)}
      className={
        "flex w-full items-center justify-between gap-2 truncate rounded-full px-3 py-1.5 text-xs font-medium shadow-soft transition hover:scale-[1.02] " +
        (isCenter ? "border-2" : "border")
      }
      style={{ background: colorBg, borderColor: colorBorder, color: "#3b2a10" }}
      title={name}
    >
      <span className="truncate">{name}</span>
      {person.generation !== undefined && (
        <span className="shrink-0 rounded-full bg-white/70 px-1.5 py-0 text-[9px] text-sand-700">
          G{person.generation}
        </span>
      )}
    </button>
  );
}

// --- pure helpers ------------------------------------------------------------

function buildTree(root: Person, people: Person[], relationships: Relationship[]): Node {
  const peopleById = new Map(people.map((p) => [p.id, p]));
  const childrenOf = new Map<string, Person[]>();
  for (const r of relationships) {
    if (r.type !== "parent_of") continue;
    const child = peopleById.get(r.toId);
    if (!child) continue;
    const bucket = childrenOf.get(r.fromId);
    if (bucket) bucket.push(child);
    else childrenOf.set(r.fromId, [child]);
  }
  // `placed` tracks ids already added to the tree. If a descendant is reachable
  // through more than one ancestor path (e.g. cousin marriage where the center
  // is an ancestor of both parents), we keep only the first occurrence — the
  // second would render with a duplicate React key and double-count in stats.
  const placed = new Set<string>();
  function recurse(person: Person, depth: number): Node | null {
    if (placed.has(person.id)) return null;
    placed.add(person.id);
    const kids = (childrenOf.get(person.id) ?? []).slice().sort(siblingOrderCompare);
    const children: Node[] = [];
    for (const k of kids) {
      const childNode = recurse(k, depth + 1);
      if (childNode) children.push(childNode);
    }
    return { person, depth, children, x: 0, y: 0, subtreeWidth: 0 };
  }
  return recurse(root, 0) ?? { person: root, depth: 0, children: [], x: 0, y: 0, subtreeWidth: 0 };
}

function layoutTree(root: Node): { width: number; height: number; maxDepth: number } {
  function setWidths(n: Node): void {
    if (n.children.length === 0) {
      n.subtreeWidth = NODE_W + H_GAP;
      return;
    }
    for (const c of n.children) setWidths(c);
    const sum = n.children.reduce((s, c) => s + c.subtreeWidth, 0);
    n.subtreeWidth = Math.max(NODE_W + H_GAP, sum);
  }
  setWidths(root);

  let maxDepth = 0;
  function setPositions(n: Node, leftX: number, depth: number): void {
    n.y = depth * (NODE_H + V_GAP) + NODE_H / 2 + MARGIN;
    maxDepth = Math.max(maxDepth, depth);
    if (n.children.length === 0) {
      n.x = leftX + n.subtreeWidth / 2;
      return;
    }
    let cursor = leftX;
    for (const c of n.children) {
      setPositions(c, cursor, depth + 1);
      cursor += c.subtreeWidth;
    }
    const firstX = n.children[0].x;
    const lastX = n.children[n.children.length - 1].x;
    n.x = (firstX + lastX) / 2;
  }
  setPositions(root, 0, 0);

  const width = Math.max(root.subtreeWidth, NODE_W + 80) + MARGIN * 2;
  const height = (maxDepth + 1) * (NODE_H + V_GAP) + MARGIN * 2;
  return { width, height, maxDepth };
}

function flattenTree(root: Node): { nodes: Node[]; edges: { from: Node; to: Node }[] } {
  const nodes: Node[] = [];
  const edges: { from: Node; to: Node }[] = [];
  function walk(n: Node) {
    nodes.push(n);
    for (const c of n.children) {
      edges.push({ from: n, to: c });
      walk(c);
    }
  }
  walk(root);
  return { nodes, edges };
}

function computeStats(root: Node): { totalDescendants: number; maleCount: number; femaleCount: number } {
  let total = 0, male = 0, female = 0;
  function walk(n: Node) {
    if (n !== root) {
      total++;
      if (n.person.gender === "male") male++;
      else female++;
    }
    for (const c of n.children) walk(c);
  }
  walk(root);
  return { totalDescendants: total, maleCount: male, femaleCount: female };
}
