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
  /** Saját felismerési küszöb (0..1): a bonyolult, nehezen pontosan rajzolható jeleknél enyhébb */
  minScore?: number;
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

/** Zárt alakzat simítása (mozgó átlag, körbe): a sarkok és csúcsok lekerekednek */
function smoothPath(path: Point[], window: number): Point[] {
  const ring = path.slice(0, -1);
  const n = ring.length;
  const out = ring.map((_, i) => {
    let x = 0;
    let y = 0;
    for (let k = -window; k <= window; k++) {
      const p = ring[(i + k + n) % n];
      x += p.x;
      y += p.y;
    }
    return { x: x / (window * 2 + 1), y: y / (window * 2 + 1) };
  });
  out.push({ ...out[0] });
  return out;
}

/** Egyenes vonal a középponton át, adott szögben (fok) */
function linePath(deg: number): Point[] {
  const a = (deg * Math.PI) / 180;
  return [
    { x: 0.5 - Math.cos(a) / 2, y: 0.5 - Math.sin(a) / 2 },
    { x: 0.5 + Math.cos(a) / 2, y: 0.5 + Math.sin(a) / 2 },
  ];
}

/** Omega (Ω): bal láb, nagy ív a tetején át, jobb láb */
function omegaPath(segments = 40): Point[] {
  const arc = Array.from({ length: segments + 1 }, (_, i) => {
    const a = ((120 + (i / segments) * 300) * Math.PI) / 180;
    return { x: 0.5 + 0.42 * Math.cos(a), y: 0.48 + 0.42 * Math.sin(a) };
  });
  return [{ x: 0, y: 0.92 }, { x: 0.29, y: 0.92 }, ...arc, { x: 0.71, y: 0.92 }, { x: 1, y: 0.92 }];
}

/** Hurok: felfelé ível, a tetején egy hurkot vet, és lefelé folytatódik; tükrözve a másik irányba hurkol */
function loopPath(mirror = false, segments = 48): Point[] {
  const raw = Array.from({ length: segments + 1 }, (_, i) => {
    const u = i / segments;
    return { x: u + 0.3 * Math.sin(2 * Math.PI * u), y: 0.9 - 0.8 * Math.sin(Math.PI * u) ** 2 };
  });
  const xs = raw.map((p) => p.x);
  const minX = Math.min(...xs);
  const w = Math.max(...xs) - minX;
  return raw.map((p) => {
    const x = (p.x - minX) / w;
    return { x: mirror ? 1 - x : x, y: p.y };
  });
}

/** Zárt sokszög csúcsai: minden csúcsból indulva, mindkét irányba (a rajz többnyire egy csúcsból indul) */
function polygonStarts(vertices: Point[]): Point[][] {
  return vertices.flatMap((_, start) =>
    [vertices, [...vertices].reverse()].map((v) => polygonPath([...v.slice(start), ...v.slice(0, start)])),
  );
}

const TRIANGLE: Point[] = [
  { x: 0.5, y: 0.05 },
  { x: 0.95, y: 0.92 },
  { x: 0.05, y: 0.92 },
];

/** Szigma (Σ): felső él jobbról balra, csúcs befelé, alsó él balról jobbra */
const SIGMA: Point[] = [
  { x: 0.95, y: 0.05 },
  { x: 0.05, y: 0.05 },
  { x: 0.55, y: 0.5 },
  { x: 0.05, y: 0.95 },
  { x: 0.95, y: 0.95 },
];

/** Homokóra: felső él, átló, alsó él, átló vissza (a két átló keresztezi egymást) */
const HOURGLASS: Point[] = [
  { x: 0.1, y: 0.05 },
  { x: 0.9, y: 0.05 },
  { x: 0.1, y: 0.95 },
  { x: 0.9, y: 0.95 },
];

/** Ötágú csillag egy vonással: a csúcsok kettesével ugorva */
const STAR: Point[] = Array.from({ length: 5 }, (_, k) => {
  const a = -Math.PI / 2 + (k * 4 * Math.PI) / 5;
  return { x: 0.5 + 0.5 * Math.cos(a), y: 0.52 + 0.5 * Math.sin(a) };
});

export const GLYPHS: GlyphDef[] = [
  {
    // A legegyszerűbb: egy húzás bármelyik irányba
    id: "line",
    name: "Vonal",
    color: "#fb923c",
    path: linePath(0),
    alternates: [45, 90, 135].map(linePath),
  },
  {
    id: "zigzag",
    name: "Villám",
    color: "#facc15",
    path: zigzagPath(6),
    // Legalább 5 szakasz, bármelyik irányba indulva
    alternates: [5, 7, 8].map((n) => zigzagPath(n)).concat([5, 6, 7, 8].map((n) => zigzagPath(n, false))),
  },
  {
    id: "sigma",
    name: "Szigma",
    color: "#a78bfa",
    path: SIGMA,
  },
  {
    id: "spiral",
    name: "Spirál",
    color: "#5eead4",
    path: spiralPath(-Math.PI / 2, 1, 2.5),
    // Bárhonnan indulhat, mindkét irányba, 2–3 fordulattal
    alternates: [2, 2.5, 3].flatMap((turns) =>
      [1, -1].flatMap((dir) => Array.from({ length: 8 }, (_, k) => spiralPath((k / 8) * Math.PI * 2, dir, turns))),
    ),
  },
  {
    id: "hourglass",
    name: "Homokóra",
    color: "#a3e635",
    path: polygonPath(HOURGLASS),
    closed: true,
    alternates: polygonStarts(HOURGLASS),
    minScore: 0.62,
  },
  {
    id: "heart",
    name: "Szív",
    color: "#f9a8d4",
    path: heartPath(),
    closed: true,
    // Lekerekített szív: a gyorsan rajzolt szív csúcsa és bemetszése elmosódik
    alternates: [smoothPath(heartPath(), 3), smoothPath(heartPath(), 5)],
  },
  {
    id: "triangle",
    name: "Háromszög",
    color: "#bae6fd",
    path: polygonPath(TRIANGLE),
    closed: true,
    alternates: polygonStarts(TRIANGLE),
  },
  {
    id: "loop",
    name: "Hurok",
    color: "#ef4444",
    path: loopPath(),
    alternates: [loopPath(true)],
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
    minScore: 0.62,
  },
  {
    id: "star",
    name: "Csillag",
    color: "#fde047",
    path: polygonPath(STAR, 16),
    closed: true,
    alternates: polygonStarts(STAR),
  },
  {
    id: "circle",
    name: "Kör",
    color: "#f97316",
    path: circlePath(),
    closed: true,
    // Nyitva hagyott (85%) és túlhúzott (115%) kör, 8 kezdőpontból
    alternates: [0.85, 1.15].flatMap((frac) => Array.from({ length: 8 }, (_, k) => arcPath((k / 8) * Math.PI * 2, frac))),
  },
  {
    id: "omega",
    name: "Omega",
    color: "#5ee0ff",
    path: omegaPath(),
  },
  {
    id: "z",
    name: "Z",
    color: "#e879f9",
    path: [
      { x: 0.05, y: 0.08 },
      { x: 0.95, y: 0.08 },
      { x: 0.05, y: 0.92 },
      { x: 0.95, y: 0.92 },
    ],
  },
  {
    id: "check",
    name: "Pipa",
    color: "#f43f5e",
    path: [
      { x: 0, y: 0.55 },
      { x: 0.32, y: 0.95 },
      { x: 1, y: 0 },
    ],
  },
];

export const GLYPH_BY_ID = new Map(GLYPHS.map((g) => [g.id, g]));
