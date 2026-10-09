// $1 Unistroke Recognizer (Wobbrock, Wilson, Li, 2007), két eltéréssel:
// - Nem forgatunk a "jellemző szögre", csak ±40°-ot keresünk, így a V és a ^
//   különböző jel marad.
// - A nagyon lapos rajzot arányosan skálázzuk, hogy ne torzuljon el.
import type { Point } from "./types";

const NUM_POINTS = 64;
const SQUARE_SIZE = 250;
const HALF_DIAGONAL = 0.5 * Math.sqrt(2 * SQUARE_SIZE * SQUARE_SIZE);
const ANGLE_RANGE = (40 * Math.PI) / 180;
const ANGLE_PRECISION = (2 * Math.PI) / 180;
const PHI = 0.5 * (-1 + Math.sqrt(5));
/** Ennél kisebb oldalarány esetén arányosan skálázunk */
const ONE_D_RATIO = 0.25;

export interface Match {
  id: string;
  /** 0..1, az 1 a tökéletes egyezés */
  score: number;
}

interface Template {
  id: string;
  points: Point[];
}

export class Recognizer {
  private templates: Template[] = [];

  addTemplate(id: string, points: Point[]) {
    this.templates.push({ id, points: normalize(points) });
  }

  /** A legjobban illeszkedő minta, küszöb nélkül */
  recognize(points: Point[]): Match | null {
    if (points.length < 2 || this.templates.length === 0) return null;
    const candidate = normalize(points);
    let best: Template | null = null;
    let bestDistance = Infinity;
    for (const template of this.templates) {
      const d = distanceAtBestAngle(candidate, template.points);
      if (d < bestDistance) {
        bestDistance = d;
        best = template;
      }
    }
    return best && { id: best.id, score: Math.max(0, 1 - bestDistance / HALF_DIAGONAL) };
  }
}

/** Egy alakzat összes rajzolási változata: visszafelé, és zárt alakzatnál
 *  több kezdőpontból is. */
export function templateVariants(path: Point[], closed = false): Point[][] {
  const variants: Point[][] = [];
  if (closed) {
    const ring = path.slice(0, -1); // az utolsó pont azonos az elsővel
    const starts = 8;
    for (let k = 0; k < starts; k++) {
      const offset = Math.round((k * ring.length) / starts);
      const rotated = [...ring.slice(offset), ...ring.slice(0, offset)];
      rotated.push(rotated[0]);
      variants.push(rotated);
    }
  } else {
    variants.push(path);
  }
  return [...variants, ...variants.map((v) => [...v].reverse())];
}

function normalize(points: Point[]): Point[] {
  return translateToOrigin(scaleToSquare(resample(points, NUM_POINTS)));
}

function distance(a: Point, b: Point) {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

function pathLength(points: Point[]) {
  let d = 0;
  for (let i = 1; i < points.length; i++) d += distance(points[i - 1], points[i]);
  return d;
}

function resample(points: Point[], n: number): Point[] {
  const interval = pathLength(points) / (n - 1);
  if (interval === 0) return Array.from({ length: n }, () => ({ ...points[0] }));

  const src = points.map((p) => ({ ...p }));
  const out: Point[] = [{ ...src[0] }];
  let acc = 0;
  for (let i = 1; i < src.length; i++) {
    const d = distance(src[i - 1], src[i]);
    if (acc + d >= interval) {
      const t = (interval - acc) / d;
      const q = {
        x: src[i - 1].x + t * (src[i].x - src[i - 1].x),
        y: src[i - 1].y + t * (src[i].y - src[i - 1].y),
      };
      out.push(q);
      src.splice(i, 0, q); // q lesz a következő szakasz kezdőpontja
      acc = 0;
    } else {
      acc += d;
    }
  }
  // Kerekítési hiba miatt hiányozhat az utolsó pont
  while (out.length < n) out.push({ ...src[src.length - 1] });
  return out.slice(0, n);
}

function boundingBox(points: Point[]) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of points) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
  return { minX, minY, width: maxX - minX, height: maxY - minY };
}

function scaleToSquare(points: Point[]): Point[] {
  const box = boundingBox(points);
  const w = Math.max(box.width, 1e-6);
  const h = Math.max(box.height, 1e-6);
  const uniform = Math.min(w, h) / Math.max(w, h) < ONE_D_RATIO;
  const sx = SQUARE_SIZE / (uniform ? Math.max(w, h) : w);
  const sy = SQUARE_SIZE / (uniform ? Math.max(w, h) : h);
  return points.map((p) => ({ x: (p.x - box.minX) * sx, y: (p.y - box.minY) * sy }));
}

function centroid(points: Point[]): Point {
  let x = 0, y = 0;
  for (const p of points) {
    x += p.x;
    y += p.y;
  }
  return { x: x / points.length, y: y / points.length };
}

function translateToOrigin(points: Point[]): Point[] {
  const c = centroid(points);
  return points.map((p) => ({ x: p.x - c.x, y: p.y - c.y }));
}

function rotateBy(points: Point[], angle: number): Point[] {
  const c = centroid(points);
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return points.map((p) => ({
    x: (p.x - c.x) * cos - (p.y - c.y) * sin + c.x,
    y: (p.x - c.x) * sin + (p.y - c.y) * cos + c.y,
  }));
}

function pathDistance(a: Point[], b: Point[]) {
  let d = 0;
  for (let i = 0; i < a.length; i++) d += distance(a[i], b[i]);
  return d / a.length;
}

function distanceAtAngle(points: Point[], template: Point[], angle: number) {
  return pathDistance(rotateBy(points, angle), template);
}

/** Aranymetszéses keresés a legjobb elforgatásra */
function distanceAtBestAngle(points: Point[], template: Point[]) {
  let a = -ANGLE_RANGE;
  let b = ANGLE_RANGE;
  let x1 = PHI * a + (1 - PHI) * b;
  let f1 = distanceAtAngle(points, template, x1);
  let x2 = (1 - PHI) * a + PHI * b;
  let f2 = distanceAtAngle(points, template, x2);
  while (Math.abs(b - a) > ANGLE_PRECISION) {
    if (f1 < f2) {
      b = x2;
      x2 = x1;
      f2 = f1;
      x1 = PHI * a + (1 - PHI) * b;
      f1 = distanceAtAngle(points, template, x1);
    } else {
      a = x1;
      x1 = x2;
      f1 = f2;
      x2 = (1 - PHI) * a + PHI * b;
      f2 = distanceAtAngle(points, template, x2);
    }
  }
  return Math.min(f1, f2);
}
