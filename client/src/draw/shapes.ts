// Saját rajzolású elemek. A játékban és a felületen is ezek rajzolnak:
// nincs SVG, ikon vagy betűkészletből vett jel.
import type { Point } from "../game/types";

/** Egy jel kirajzolása a (cx, cy) középpontú, size méretű dobozba */
export function drawGlyph(ctx: CanvasRenderingContext2D, path: Point[], cx: number, cy: number, size: number) {
  ctx.beginPath();
  path.forEach((p, i) => {
    const x = cx + (p.x - 0.5) * size;
    const y = cy + (p.y - 0.5) * size;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();
}

/** Izzó jel: vastag, kerek végű vonal fénnyel */
export function drawGlowingGlyph(
  ctx: CanvasRenderingContext2D,
  path: Point[],
  cx: number,
  cy: number,
  size: number,
  color: string,
  lineWidth: number,
) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.shadowColor = color;
  ctx.shadowBlur = lineWidth * 2;
  drawGlyph(ctx, path, cx, cy, size);
  ctx.restore();
}

/** Szív a (cx, cy) középponttal; üresen csak a körvonala látszik */
export function drawHeart(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  filled: boolean,
  color = "#f87171",
) {
  const s = size / 2;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.beginPath();
  ctx.moveTo(0, s * 0.95);
  ctx.bezierCurveTo(-s * 1.15, s * 0.1, -s * 1.05, -s * 0.95, -s * 0.5, -s * 0.95);
  ctx.bezierCurveTo(-s * 0.2, -s * 0.95, 0, -s * 0.7, 0, -s * 0.45);
  ctx.bezierCurveTo(0, -s * 0.7, s * 0.2, -s * 0.95, s * 0.5, -s * 0.95);
  ctx.bezierCurveTo(s * 1.05, -s * 0.95, s * 1.15, s * 0.1, 0, s * 0.95);
  ctx.closePath();
  if (filled) {
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = size * 0.4;
    ctx.fill();
    // Kis csillanás
    ctx.shadowBlur = 0;
    ctx.fillStyle = "rgba(255,255,255,0.45)";
    ctx.beginPath();
    ctx.ellipse(-s * 0.45, -s * 0.45, s * 0.2, s * 0.12, -0.6, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.strokeStyle = color;
    ctx.globalAlpha = 0.5;
    ctx.lineWidth = Math.max(1.5, size * 0.09);
    ctx.stroke();
  }
  ctx.restore();
}

/** QR-kód saját stílusban. A modules a kód négyzetrácsa (true = sötét). */
export function drawQr(ctx: CanvasRenderingContext2D, modules: boolean[], count: number, size: number) {
  const quiet = 2; // üres keret, hogy a telefon felismerje
  const cell = size / (count + quiet * 2);
  const at = (i: number) => (i + quiet) * cell;
  const dark = "#140d2b";

  ctx.fillStyle = "#f4f0ff";
  ctx.beginPath();
  ctx.roundRect(0, 0, size, size, cell * 2);
  ctx.fill();

  // A három sarokjelölő (7x7) külön, lekerekítve rajzolva
  const finders = [
    [0, 0],
    [count - 7, 0],
    [0, count - 7],
  ];
  const inFinder = (x: number, y: number) => finders.some(([fx, fy]) => x >= fx && x < fx + 7 && y >= fy && y < fy + 7);

  ctx.fillStyle = dark;
  for (let y = 0; y < count; y++) {
    for (let x = 0; x < count; x++) {
      if (!modules[y * count + x] || inFinder(x, y)) continue;
      ctx.beginPath();
      ctx.roundRect(at(x) + cell * 0.08, at(y) + cell * 0.08, cell * 0.84, cell * 0.84, cell * 0.3);
      ctx.fill();
    }
  }

  for (const [fx, fy] of finders) {
    const x = at(fx);
    const y = at(fy);
    ctx.fillStyle = dark;
    ctx.beginPath();
    ctx.roundRect(x, y, cell * 7, cell * 7, cell * 1.8);
    ctx.fill();
    ctx.fillStyle = "#f4f0ff";
    ctx.beginPath();
    ctx.roundRect(x + cell, y + cell, cell * 5, cell * 5, cell * 1.2);
    ctx.fill();
    ctx.fillStyle = "#4c2a91";
    ctx.beginPath();
    ctx.roundRect(x + cell * 2, y + cell * 2, cell * 3, cell * 3, cell * 0.9);
    ctx.fill();
  }
}
