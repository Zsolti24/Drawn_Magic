// A pályák rögzített környezete: szilárd akadályok (fák, sziklák, falak), amiken nem lehet
// átmenni, és területek (folyó, tó, láva, szakadék), amiken csak hídon lehet átkelni.
// Minden pálya saját elrendezést kap (alaprajz × téma × saját véletlen mag), így mind egyedi.
// Ez a fájl a leírás, a generálás és az ütközés; a kirajzolás a draw/arena.ts-ben van.
import type { Point } from "./types";

export type SolidLook =
  | "tree"
  | "rock"
  | "bush"
  | "pine"
  | "stump"
  | "mushroom"
  | "deadtree"
  | "mossrock"
  | "reeds"
  | "stalagmite"
  | "crystal"
  | "basalt"
  | "charrock"
  | "obsidian";
export type WallLook = "fence" | "log" | "palisade" | "stonewall" | "obsidianwall";
export type HazardLook = "water" | "swamp" | "chasm" | "lava";
export type BridgeLook = "wood" | "stone";

/** Kör alakú szilárd akadály; r az ütközési sugár (a rajz lehet nagyobb, pl. a fa lombja) */
export interface Solid {
  x: number;
  y: number;
  r: number;
  look: SolidLook;
  /** Rajzolási változat (0..1) */
  seed: number;
}

/** Fal: vastag szakasz (kerítés, rönk, kőfal) */
export interface Wall {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  /** Vastagság (egység) */
  w: number;
  look: WallLook;
}

/** Híd egy folyón: a középpontja, iránya (az átkelés iránya), hossza és szélessége */
export interface Bridge {
  x: number;
  y: number;
  /** Az átkelés iránya (egységvektor) */
  dx: number;
  dy: number;
  length: number;
  width: number;
  look: BridgeLook;
}

/** Folyó (víz, láva, szakadék …): vastag tört vonal, csak hídon lehet átkelni */
export interface River {
  points: Point[];
  width: number;
  look: HazardLook;
  bridges: Bridge[];
}

/** Tó, lávató, mélység: ellipszis, nem lehet belelépni */
export interface Pool {
  x: number;
  y: number;
  rx: number;
  ry: number;
  look: HazardLook;
}

export interface Arena {
  solids: Solid[];
  walls: Wall[];
  rivers: River[];
  pools: Pool[];
}

// ================================================================ ütközés

const BRIDGE_RAIL = 0.016;

/** Pont távolsága egy szakasztól, és a szakasz legközelebbi pontja */
function segmentClosest(px: number, py: number, ax: number, ay: number, bx: number, by: number) {
  const vx = bx - ax;
  const vy = by - ay;
  const len2 = vx * vx + vy * vy || 1e-9;
  const t = Math.max(0, Math.min(1, ((px - ax) * vx + (py - ay) * vy) / len2));
  const cx = ax + vx * t;
  const cy = ay + vy * t;
  return { d: Math.hypot(px - cx, py - cy), cx, cy, vx, vy };
}

/** Rajta van-e a pont a hídon (a hossza mentén és a két korlát között) */
function onBridge(b: Bridge, x: number, y: number, slack = 0) {
  const ox = x - b.x;
  const oy = y - b.y;
  const along = ox * b.dx + oy * b.dy;
  const across = -ox * b.dy + oy * b.dx;
  return Math.abs(along) <= b.length / 2 + slack && Math.abs(across) <= b.width / 2;
}

/** A híd két korlátja falként (a végeinél nyitott, oldalt nem lehet leesni) */
function bridgeRails(b: Bridge): Wall[] {
  const px = -b.dy * (b.width / 2);
  const py = b.dx * (b.width / 2);
  const hx = b.dx * (b.length / 2);
  const hy = b.dy * (b.length / 2);
  return [1, -1].map((s) => ({
    x1: b.x + px * s - hx,
    y1: b.y + py * s - hy,
    x2: b.x + px * s + hx,
    y2: b.y + py * s + hy,
    w: BRIDGE_RAIL * 2,
    look: "fence" as WallLook,
  }));
}

/** Ütközés a környezettel: a mozgó dolgok (mágus, szörnyek, gyöngyök) kitolása az akadályokból */
export class ArenaCollider {
  readonly arena: Arena;
  /** A falak és a hidak korlátai együtt */
  private readonly barriers: Wall[];

  constructor(arena: Arena) {
    this.arena = arena;
    this.barriers = [...arena.walls, ...arena.rivers.flatMap((r) => r.bridges.flatMap(bridgeRails))];
  }

  /** A pont (r sugarú kör) kitolása minden akadályból; az új helyet adja */
  resolve(x: number, y: number, r: number): Point {
    let px = x;
    let py = y;
    for (let pass = 0; pass < 2; pass++) {
      for (const s of this.arena.solids) {
        const dx = px - s.x;
        const dy = py - s.y;
        const d = Math.hypot(dx, dy);
        const min = s.r + r;
        if (d >= min) continue;
        const nx = d > 1e-6 ? dx / d : 1;
        const ny = d > 1e-6 ? dy / d : 0;
        px = s.x + nx * min;
        py = s.y + ny * min;
      }
      for (const w of this.barriers) {
        const c = segmentClosest(px, py, w.x1, w.y1, w.x2, w.y2);
        const min = w.w / 2 + r;
        if (c.d >= min) continue;
        // Pontosan a falon: a fal normálisa felé
        const len = Math.hypot(c.vx, c.vy) || 1;
        const nx = c.d > 1e-6 ? (px - c.cx) / c.d : -c.vy / len;
        const ny = c.d > 1e-6 ? (py - c.cy) / c.d : c.vx / len;
        px = c.cx + nx * min;
        py = c.cy + ny * min;
      }
      for (const p of this.arena.pools) {
        // Az ellipszist körré nyújtjuk, ott toljuk ki, aztán vissza
        const k = p.rx / p.ry;
        const dx = px - p.x;
        const dy = (py - p.y) * k;
        const d = Math.hypot(dx, dy);
        const min = p.rx + r;
        if (d >= min) continue;
        const nx = d > 1e-6 ? dx / d : 1;
        const ny = d > 1e-6 ? dy / d : 0;
        px = p.x + nx * min;
        py = p.y + (ny * min) / k;
      }
      for (const river of this.arena.rivers) {
        if (river.bridges.some((b) => onBridge(b, px, py))) continue;
        for (let i = 1; i < river.points.length; i++) {
          const a = river.points[i - 1];
          const b = river.points[i];
          const c = segmentClosest(px, py, a.x, a.y, b.x, b.y);
          const min = river.width / 2 + r;
          if (c.d >= min) continue;
          const len = Math.hypot(c.vx, c.vy) || 1;
          const nx = c.d > 1e-6 ? (px - c.cx) / c.d : -c.vy / len;
          const ny = c.d > 1e-6 ? (py - c.cy) / c.d : c.vx / len;
          px = c.cx + nx * min;
          py = c.cy + ny * min;
        }
      }
    }
    return { x: px, y: py };
  }

  /** Foglalt-e a hely (r sugarú körrel), pl. érkezéskor vagy leeső tárgynál */
  blocked(x: number, y: number, r: number) {
    const p = this.resolve(x, y, r);
    return Math.hypot(p.x - x, p.y - y) > 1e-4;
  }

  /** Útvonal a cél felé: ha egy folyó van köztük, előbb a legjobb híd felé (a hídon a túlsó vége felé) */
  route(x: number, y: number, tx: number, ty: number): Point {
    for (const river of this.arena.rivers) {
      if (river.bridges.length === 0) continue;
      const bridge = river.bridges.find((b) => onBridge(b, x, y, 0.02));
      if (bridge) {
        // A hídon: a cél felőli vége felé, amíg át nem ért
        const ends = bridgeEnds(bridge);
        const far = Math.hypot(ends[0].x - tx, ends[0].y - ty) < Math.hypot(ends[1].x - tx, ends[1].y - ty) ? ends[0] : ends[1];
        if (crossesRiver(river, x, y, tx, ty)) return far;
        continue;
      }
      if (!crossesRiver(river, x, y, tx, ty)) continue;
      // A legrövidebb kerülő: el a híd közelebbi végéig, át, és onnan a célig
      let best: Point | null = null;
      let bestCost = Infinity;
      for (const b of river.bridges) {
        const [e1, e2] = bridgeEnds(b);
        const near = Math.hypot(e1.x - x, e1.y - y) < Math.hypot(e2.x - x, e2.y - y) ? e1 : e2;
        const far = near === e1 ? e2 : e1;
        const cost = Math.hypot(near.x - x, near.y - y) + Math.hypot(far.x - tx, far.y - ty);
        if (cost < bestCost) {
          bestCost = cost;
          best = near;
        }
      }
      if (best) return best;
    }
    return { x: tx, y: ty };
  }
}

/** A híd két vége, kicsit a parton túl */
function bridgeEnds(b: Bridge): [Point, Point] {
  const h = b.length / 2 + 0.06;
  return [
    { x: b.x - b.dx * h, y: b.y - b.dy * h },
    { x: b.x + b.dx * h, y: b.y + b.dy * h },
  ];
}

/** Metszi-e az (a → b) szakasz a folyót */
function crossesRiver(river: River, ax: number, ay: number, bx: number, by: number) {
  for (let i = 1; i < river.points.length; i++) {
    const p = river.points[i - 1];
    const q = river.points[i];
    if (segmentsIntersect(ax, ay, bx, by, p.x, p.y, q.x, q.y)) return true;
  }
  return false;
}

function segmentsIntersect(ax: number, ay: number, bx: number, by: number, cx: number, cy: number, dx: number, dy: number) {
  const cross = (ux: number, uy: number, vx: number, vy: number) => ux * vy - uy * vx;
  const d1 = cross(bx - ax, by - ay, cx - ax, cy - ay);
  const d2 = cross(bx - ax, by - ay, dx - ax, dy - ay);
  const d3 = cross(dx - cx, dy - cy, ax - cx, ay - cy);
  const d4 = cross(dx - cx, dy - cy, bx - cx, by - cy);
  return d1 * d2 < 0 && d3 * d4 < 0;
}

// ================================================================ generálás

/** A témák kinézete: milyen akadályok, falak, veszélyes területek és hidak */
const THEME_STYLE: Record<string, { solids: SolidLook[]; wall: WallLook; hazard: HazardLook; bridge: BridgeLook }> = {
  meadow: { solids: ["tree", "rock", "bush"], wall: "fence", hazard: "water", bridge: "wood" },
  forest: { solids: ["pine", "stump", "mushroom"], wall: "log", hazard: "water", bridge: "wood" },
  swamp: { solids: ["deadtree", "mossrock", "reeds"], wall: "palisade", hazard: "swamp", bridge: "wood" },
  cave: { solids: ["stalagmite", "crystal", "rock"], wall: "stonewall", hazard: "chasm", bridge: "stone" },
  ash: { solids: ["basalt", "charrock", "obsidian"], wall: "obsidianwall", hazard: "lava", bridge: "stone" },
};

/** Az ütközési sugár akadályfajtánként (a rajz ennél nagyobb lehet) */
const SOLID_SIZE: Record<SolidLook, [number, number]> = {
  tree: [0.08, 0.11],
  rock: [0.07, 0.13],
  bush: [0.07, 0.1],
  pine: [0.07, 0.1],
  stump: [0.06, 0.08],
  mushroom: [0.07, 0.1],
  deadtree: [0.06, 0.09],
  mossrock: [0.08, 0.13],
  reeds: [0.07, 0.1],
  stalagmite: [0.06, 0.1],
  crystal: [0.07, 0.11],
  basalt: [0.08, 0.12],
  charrock: [0.07, 0.12],
  obsidian: [0.07, 0.1],
};

/** A pálya közepe (a mágus kezdőhelye) körül ekkora terület szabad marad */
const START_CLEAR = 0.6;

/** A pálya alaprajzai a témán belüli sorszám szerint */
type Blueprint = "grove" | "river" | "ruins" | "ponds" | "arena";
const BLUEPRINTS: Blueprint[] = ["grove", "river", "ruins", "ponds", "arena"];

/** A pálya környezete: alaprajz (a sorszám szerint) × téma, saját véletlen maggal */
export function buildArena(theme: string, index: number, halfWidth: number, halfHeight: number): Arena {
  const style = THEME_STYLE[theme] ?? THEME_STYLE.meadow;
  const rand = seeded(theme.length * 7919 + index * 104729 + 17);
  const arena: Arena = { solids: [], walls: [], rivers: [], pools: [] };
  const between = (a: number, b: number) => a + rand() * (b - a);
  const blueprint = BLUEPRINTS[index] ?? "grove";

  /** Szabad-e a hely: a kezdőhely, a pálya széle és a meglévő dolgok körül hagy helyet az átjáráshoz */
  const free = (x: number, y: number, r: number, gap = 0.14) => {
    if (Math.abs(x) > halfWidth - r - 0.12 || Math.abs(y) > halfHeight - r - 0.12) return false;
    if (Math.hypot(x, y) < START_CLEAR + r) return false;
    return !new ArenaCollider(arena).blocked(x, y, r + gap);
  };
  const addSolid = (x: number, y: number, look: SolidLook, gap?: number) => {
    const [lo, hi] = SOLID_SIZE[look];
    const r = between(lo, hi);
    if (!free(x, y, r, gap)) return false;
    arena.solids.push({ x, y, r, look, seed: rand() });
    return true;
  };
  const pickLook = () => style.solids[Math.floor(rand() * style.solids.length)];
  const scatter = (count: number) => {
    for (let i = 0, tries = 0; i < count && tries < count * 30; tries++) {
      if (addSolid(between(-halfWidth, halfWidth), between(-halfHeight, halfHeight), pickLook())) i++;
    }
  };

  switch (blueprint) {
    case "grove": {
      // Ligetek: akadálycsoportok, köztük tágas tisztások
      for (let c = 0, tries = 0; c < 7 && tries < 60; tries++) {
        const cx = between(-halfWidth + 0.4, halfWidth - 0.4);
        const cy = between(-halfHeight + 0.4, halfHeight - 0.4);
        if (Math.hypot(cx, cy) < START_CLEAR + 0.5) continue;
        const look = pickLook();
        let placed = 0;
        for (let k = 0; k < 7; k++) {
          const a = rand() * Math.PI * 2;
          const d = rand() * 0.3;
          if (addSolid(cx + Math.cos(a) * d, cy + Math.sin(a) * d * 0.8, rand() < 0.75 ? look : pickLook(), 0.02)) placed++;
        }
        if (placed) c++;
      }
      scatter(10);
      break;
    }
    case "river": {
      // Kanyargó folyó a pálya egyik felén, 2–3 híddal
      const side = rand() < 0.5 ? -1 : 1;
      const x0 = side * between(0.95, 1.35);
      const amp = between(0.18, 0.32);
      const phase = rand() * Math.PI * 2;
      const points: Point[] = Array.from({ length: 9 }, (_, i) => {
        const t = i / 8;
        return { x: x0 + Math.sin(t * Math.PI * 2 + phase) * amp, y: -halfHeight - 0.3 + t * (halfHeight * 2 + 0.6) };
      });
      const width = style.hazard === "chasm" ? 0.3 : 0.34;
      const river: River = { points, width, look: style.hazard, bridges: [] };
      const spots = rand() < 0.5 ? [0.28, 0.72] : [0.2, 0.5, 0.8];
      for (const f of spots) {
        const i = Math.max(1, Math.min(points.length - 1, Math.round(f * (points.length - 1))));
        const a = points[i - 1];
        const b = points[i];
        const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
        // Az átkelés iránya merőleges a folyóra
        river.bridges.push({
          x: (a.x + b.x) / 2,
          y: (a.y + b.y) / 2,
          dx: -(b.y - a.y) / len,
          dy: (b.x - a.x) / len,
          length: width + 0.22,
          width: 0.2,
          look: style.bridge,
        });
      }
      arena.rivers.push(river);
      scatter(14);
      break;
    }
    case "ruins": {
      // Romok: a kezdőhelyet körülvevő, kapukkal megszakított falgyűrű és szétszórt falmaradványok
      const rx = between(1.15, 1.35);
      const ry = between(0.78, 0.92);
      const t = 0.07;
      const sides: [number, number, number, number][] = [
        [-rx, -ry, rx, -ry],
        [rx, -ry, rx, ry],
        [rx, ry, -rx, ry],
        [-rx, ry, -rx, -ry],
      ];
      for (const [x1, y1, x2, y2] of sides) {
        // Minden oldal közepén kapu, és néha még egy rés
        const gap = 0.24;
        const mx = (x1 + x2) / 2;
        const my = (y1 + y2) / 2;
        const ux = (x2 - x1) / Math.hypot(x2 - x1, y2 - y1);
        const uy = (y2 - y1) / Math.hypot(x2 - x1, y2 - y1);
        arena.walls.push({ x1, y1, x2: mx - ux * gap, y2: my - uy * gap, w: t, look: style.wall });
        arena.walls.push({ x1: mx + ux * gap, y1: my + uy * gap, x2, y2, w: t, look: style.wall });
      }
      // Kint falmaradványok
      for (let i = 0, tries = 0; i < 5 && tries < 80; tries++) {
        const x = between(-halfWidth + 0.4, halfWidth - 0.4);
        const y = between(-halfHeight + 0.4, halfHeight - 0.4);
        if (Math.abs(x) < rx + 0.35 && Math.abs(y) < ry + 0.35) continue;
        const a = rand() * Math.PI;
        const l = between(0.25, 0.4);
        const wall: Wall = { x1: x - Math.cos(a) * l, y1: y - Math.sin(a) * l, x2: x + Math.cos(a) * l, y2: y + Math.sin(a) * l, w: t, look: style.wall };
        const collider = new ArenaCollider(arena);
        if ([0, 0.5, 1].some((k) => collider.blocked(wall.x1 + (wall.x2 - wall.x1) * k, wall.y1 + (wall.y2 - wall.y1) * k, 0.2))) continue;
        if (Math.max(Math.abs(wall.x1), Math.abs(wall.x2)) > halfWidth - 0.15 || Math.max(Math.abs(wall.y1), Math.abs(wall.y2)) > halfHeight - 0.15) continue;
        arena.walls.push(wall);
        i++;
      }
      scatter(10);
      break;
    }
    case "ponds": {
      // Tavak: három nagyobb víztükör a kezdőhely körül, partjukon akadályok
      const base = rand() * Math.PI * 2;
      for (let i = 0; i < 3; i++) {
        const a = base + (i / 3) * Math.PI * 2 + between(-0.3, 0.3);
        const d = between(1.25, 1.6);
        const pool: Pool = {
          x: Math.max(-halfWidth + 0.7, Math.min(halfWidth - 0.7, Math.cos(a) * d * 1.3)),
          y: Math.max(-halfHeight + 0.55, Math.min(halfHeight - 0.55, Math.sin(a) * d * 0.75)),
          rx: between(0.32, 0.48),
          ry: between(0.2, 0.3),
          look: style.hazard,
        };
        arena.pools.push(pool);
        for (let k = 0; k < 4; k++) {
          const b = rand() * Math.PI * 2;
          addSolid(pool.x + Math.cos(b) * (pool.rx + 0.16), pool.y + Math.sin(b) * (pool.ry + 0.14), pickLook(), 0.04);
        }
      }
      scatter(10);
      break;
    }
    case "arena": {
      // Aréna: oszlopkör négy kapuval a pálya közepén, a sarkokban tavak
      const n = 16;
      for (let i = 0; i < n; i++) {
        if (i % 4 === 0) continue;
        const a = (i / n) * Math.PI * 2;
        const look = style.solids[theme === "meadow" || theme === "forest" ? 1 : 0];
        const [lo, hi] = SOLID_SIZE[look];
        arena.solids.push({ x: Math.cos(a) * 1.4, y: Math.sin(a) * 0.95, r: (lo + hi) / 2, look, seed: rand() });
      }
      for (const [sx, sy] of [
        [-1, -1],
        [1, -1],
        [1, 1],
        [-1, 1],
      ]) {
        arena.pools.push({ x: sx * (halfWidth - 0.55), y: sy * (halfHeight - 0.45), rx: between(0.28, 0.38), ry: between(0.18, 0.26), look: style.hazard });
      }
      scatter(8);
      break;
    }
  }

  // A mocsárban mindig van még néhány pocsolya
  if (theme === "swamp") {
    for (let i = 0, tries = 0; i < 3 && tries < 40; tries++) {
      const pool: Pool = { x: between(-halfWidth + 0.5, halfWidth - 0.5), y: between(-halfHeight + 0.4, halfHeight - 0.4), rx: between(0.18, 0.26), ry: between(0.12, 0.17), look: "swamp" };
      if (Math.hypot(pool.x, pool.y) < START_CLEAR + 0.4 || new ArenaCollider(arena).blocked(pool.x, pool.y, pool.rx + 0.2)) continue;
      arena.pools.push(pool);
      i++;
    }
  }
  return arena;
}

function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
