import type { Point } from "../game/types";

export interface GlyphDef {
  id: string;
  name: string;
  color: string;
  /** Az alakzat 0..1 közötti koordinátákkal (y lefelé nő). Ebből lesz a
   *  felismerő mintája és az ellenfelek fölötti ikon is. */
  path: Point[];
  /** További elfogadott rajzolási formák (csak a felismeréshez) */
  alternates?: Point[][];
  /** Zárt alakzat: bárhonnan és bármelyik irányba rajzolható */
  closed?: boolean;
}

function circlePath(segments = 32): Point[] {
  return Array.from({ length: segments + 1 }, (_, i) => {
    const a = -Math.PI / 2 + (i / segments) * Math.PI * 2;
    return { x: 0.5 + 0.5 * Math.cos(a), y: 0.5 + 0.5 * Math.sin(a) };
  });
}

/** Körív: start szögtől (radián) a teljes kör frac részéig, a megadott irányba */
function arcPath(start: number, frac: number, dir = 1, segments = 32): Point[] {
  return Array.from({ length: segments + 1 }, (_, i) => {
    const a = start + dir * (i / segments) * frac * Math.PI * 2;
    return { x: 0.5 + 0.5 * Math.cos(a), y: 0.5 + 0.5 * Math.sin(a) };
  });
}

/** Vízszintes cikkcakk adott számú szakasszal, felfelé vagy lefelé indulva */
function zigzagPath(segments: number, startUp = true): Point[] {
  return Array.from({ length: segments + 1 }, (_, i) => ({
    x: i / segments,
    y: (i % 2 === 0) === startUp ? 0.8 : 0.2,
  }));
}

/** Befelé tekeredő spirál: kívülről a közép felé, adott kezdőszöggel, iránnyal és fordulatszámmal */
function spiralPath(start: number, dir = 1, turns = 2, segments = 64): Point[] {
  return Array.from({ length: segments + 1 }, (_, i) => {
    const t = i / segments;
    const r = 0.5 * (1 - 0.85 * t);
    const a = start + dir * t * turns * Math.PI * 2;
    return { x: 0.5 + r * Math.cos(a), y: 0.5 + r * Math.sin(a) };
  });
}

/** Zárt sokszög sűrű pontokkal (hogy bármelyik pontjából indulhasson a rajz) */
function polygonPath(vertices: Point[], perEdge = 12): Point[] {
  const out: Point[] = [];
  for (let i = 0; i < vertices.length; i++) {
    const a = vertices[i];
    const b = vertices[(i + 1) % vertices.length];
    for (let k = 0; k < perEdge; k++) {
      const t = k / perEdge;
      out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
    }
  }
  out.push({ ...out[0] });
  return out;
}

/** Szív egy vonással, az alsó csúcsától indulva */
function heartPath(segments = 48): Point[] {
  const raw = Array.from({ length: segments + 1 }, (_, i) => {
    const t = Math.PI + (i / segments) * Math.PI * 2;
    return {
      x: 16 * Math.sin(t) ** 3,
      y: -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)),
    };
  });
  const xs = raw.map((p) => p.x);
  const ys = raw.map((p) => p.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const w = Math.max(...xs) - minX;
  const h = Math.max(...ys) - minY;
  return raw.map((p) => ({ x: (p.x - minX) / w, y: (p.y - minY) / h }));
}

/** S betű egy vonással, a jobb felső végétől; tükrözve fordított S */
function sPath(mirror = false, segments = 40): Point[] {
  return Array.from({ length: segments + 1 }, (_, i) => {
    const u = i / segments;
    const x = 0.5 - 0.4 * Math.sin(Math.PI * 2 * (u * 1.25 - 0.125));
    return { x: mirror ? 1 - x : x, y: 0.05 + 0.9 * u };
  });
}

const TRIANGLE: Point[] = [
  { x: 0.5, y: 0.05 },
  { x: 0.95, y: 0.92 },
  { x: 0.05, y: 0.92 },
];

export const GLYPHS: GlyphDef[] = [
  {
    id: "v",
    name: "V",
    color: "#fb923c",
    path: [
      { x: 0, y: 0 },
      { x: 0.5, y: 1 },
      { x: 1, y: 0 },
    ],
  },
  {
    id: "circle",
    name: "Kör",
    color: "#5ee0ff",
    path: circlePath(),
    closed: true,
    // Nyitva hagyott (70%, 85%) és túlhúzott (125%) kör, 8 kezdőpontból
    alternates: [0.7, 0.85, 1.25].flatMap((frac) =>
      Array.from({ length: 8 }, (_, k) => arcPath((k / 8) * Math.PI * 2, frac)),
    ),
  },
  {
    id: "zigzag",
    name: "Cikkcakk",
    color: "#facc15",
    path: zigzagPath(4),
    alternates: [3, 5, 6, 7, 8].map((n) => zigzagPath(n)).concat([3, 4, 5, 6, 7, 8].map((n) => zigzagPath(n, false))),
  },
  {
    id: "spiral",
    name: "Spirál",
    color: "#5eead4",
    path: spiralPath(-Math.PI / 2, 1, 2),
    // Bárhonnan indulhat, mindkét irányba, 1,5–2,5 fordulattal
    alternates: [1.5, 2, 2.5].flatMap((turns) =>
      [1, -1].flatMap((dir) => Array.from({ length: 8 }, (_, k) => spiralPath((k / 8) * Math.PI * 2, dir, turns))),
    ),
  },
  {
    id: "triangle",
    name: "Háromszög",
    color: "#a3e635",
    path: polygonPath(TRIANGLE),
    closed: true,
    // A rajz általában egy csúcsból indul: mindhárom csúcsból, mindkét irányba
    alternates: [0, 1, 2].flatMap((start) =>
      [TRIANGLE, [...TRIANGLE].reverse()].map((v) => polygonPath([...v.slice(start), ...v.slice(0, start)])),
    ),
  },
  {
    id: "heart",
    name: "Szív",
    color: "#f9a8d4",
    path: heartPath(),
    closed: true,
  },
  {
    id: "caret",
    name: "Hegycsúcs",
    color: "#bae6fd",
    path: [
      { x: 0, y: 1 },
      { x: 0.5, y: 0 },
      { x: 1, y: 1 },
    ],
  },
  {
    id: "s",
    name: "S",
    color: "#ef4444",
    path: sPath(),
    alternates: [sPath(true)],
  },
  {
    id: "infinity",
    name: "Végtelen",
    color: "#c084fc",
    path: Array.from({ length: 61 }, (_, i) => {
      const t = (i / 60) * Math.PI * 2;
      return { x: 0.5 + 0.5 * Math.sin(t), y: 0.5 + 0.3 * Math.sin(2 * t) };
    }),
    closed: true,
  },
];

export const GLYPH_BY_ID = new Map(GLYPHS.map((g) => [g.id, g]));
