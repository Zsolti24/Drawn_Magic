// Saját rajzolású menüelemek és illusztrációk. Minden függvény egy w × h
// méretű dobozba rajzol, a (0, 0) a bal felső sarok.
import type { Point } from "../game/types";
import { drawGlowingGlyph } from "./shapes";
import { shade } from "./wizard";

/** Lakat (lezárt tartalomhoz) */
export function drawLock(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number, color = "#c4b5fd") {
  const s = size / 2;
  ctx.save();
  ctx.lineCap = "round";
  ctx.strokeStyle = color;
  ctx.lineWidth = s * 0.22;
  ctx.beginPath();
  ctx.arc(cx, cy - s * 0.1, s * 0.48, Math.PI, 0);
  ctx.lineTo(cx + s * 0.48, cy + s * 0.15);
  ctx.moveTo(cx - s * 0.48, cy - s * 0.1);
  ctx.lineTo(cx - s * 0.48, cy + s * 0.15);
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(cx - s * 0.8, cy + s * 0.05, s * 1.6, s * 1.05, s * 0.2);
  ctx.fill();
  ctx.fillStyle = shade(color.startsWith("#") ? color : "#c4b5fd", -0.6);
  ctx.beginPath();
  ctx.arc(cx, cy + s * 0.48, s * 0.17, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(cx - s * 0.06, cy + s * 0.5, s * 0.12, s * 0.3);
  ctx.restore();
}

/** Fogaskerék (beállítások) */
export function drawGear(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number, color = "#c4b5fd") {
  const r = size / 2;
  const teeth = 8;
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < teeth * 2; i++) {
    const a = (i / (teeth * 2)) * Math.PI * 2;
    const rr = i % 2 === 0 ? r : r * 0.78;
    const half = (Math.PI / (teeth * 2)) * 0.7;
    ctx.lineTo(cx + Math.cos(a - half) * rr, cy + Math.sin(a - half) * rr);
    ctx.lineTo(cx + Math.cos(a + half) * rr, cy + Math.sin(a + half) * rr);
  }
  ctx.closePath();
  ctx.fill();
  ctx.globalCompositeOperation = "destination-out";
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.35, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** Pályák: kanyargós ösvény a réten, állomásokkal és zászlóval */
export function drawMapArt(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const ground = ctx.createLinearGradient(0, 0, 0, h);
  ground.addColorStop(0, "#5c9a3c");
  ground.addColorStop(1, "#3f7a2c");
  ctx.fillStyle = ground;
  ctx.fillRect(0, 0, w, h);
  // Bokrok
  ctx.fillStyle = "#2f5d22";
  for (const [x, y, r] of [
    [0.12, 0.2, 0.09],
    [0.85, 0.75, 0.1],
    [0.9, 0.18, 0.07],
    [0.2, 0.85, 0.08],
  ]) {
    ctx.beginPath();
    ctx.arc(x * w, y * h, r * w, 0, Math.PI * 2);
    ctx.fill();
  }
  // Ösvény
  const path: Point[] = [
    { x: 0.1, y: 0.75 },
    { x: 0.35, y: 0.6 },
    { x: 0.5, y: 0.75 },
    { x: 0.7, y: 0.45 },
    { x: 0.85, y: 0.3 },
  ];
  ctx.strokeStyle = "#d9b97a";
  ctx.lineWidth = w * 0.05;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  path.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x * w, p.y * h) : ctx.lineTo(p.x * w, p.y * h)));
  ctx.stroke();
  // Állomások
  path.slice(0, -1).forEach((p, i) => {
    ctx.fillStyle = i < 2 ? "#fbbf24" : "#6b7280";
    ctx.strokeStyle = "#3b2a1a";
    ctx.lineWidth = w * 0.012;
    ctx.beginPath();
    ctx.arc(p.x * w, p.y * h, w * 0.045, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  });
  // Zászló a végén
  const f = path[path.length - 1];
  ctx.strokeStyle = "#3b2a1a";
  ctx.lineWidth = w * 0.015;
  ctx.beginPath();
  ctx.moveTo(f.x * w, f.y * h);
  ctx.lineTo(f.x * w, f.y * h - h * 0.28);
  ctx.stroke();
  ctx.fillStyle = "#ef4444";
  ctx.beginPath();
  ctx.moveTo(f.x * w, f.y * h - h * 0.28);
  ctx.lineTo(f.x * w + w * 0.12, f.y * h - h * 0.22);
  ctx.lineTo(f.x * w, f.y * h - h * 0.16);
  ctx.closePath();
  ctx.fill();
}

/** Képességek: nyitott varázskönyv izzó jellel */
export function drawSpellbookArt(ctx: CanvasRenderingContext2D, w: number, h: number, glyph: Point[], color: string) {
  const bg = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w * 0.7);
  bg.addColorStop(0, "#2d1f5c");
  bg.addColorStop(1, "#140d2b");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  const cx = w / 2;
  const cy = h * 0.6;
  const bw = w * 0.36;
  const bh = h * 0.42;
  // Borító
  ctx.fillStyle = "#6b2d1f";
  ctx.beginPath();
  ctx.roundRect(cx - bw - w * 0.02, cy - bh / 2 + h * 0.03, bw * 2 + w * 0.04, bh, w * 0.02);
  ctx.fill();
  // Lapok
  for (const side of [-1, 1]) {
    ctx.fillStyle = "#f5ecd7";
    ctx.beginPath();
    ctx.moveTo(cx, cy - bh / 2 + h * 0.04);
    ctx.quadraticCurveTo(cx + side * bw * 0.5, cy - bh / 2 - h * 0.03, cx + side * bw, cy - bh / 2);
    ctx.lineTo(cx + side * bw, cy + bh / 2 - h * 0.02);
    ctx.quadraticCurveTo(cx + side * bw * 0.5, cy + bh / 2 - h * 0.06, cx, cy + bh / 2);
    ctx.closePath();
    ctx.fill();
    // Sorok
    ctx.strokeStyle = "rgba(90,70,40,0.35)";
    ctx.lineWidth = h * 0.012;
    for (let i = 0; i < 4; i++) {
      const y = cy - bh * 0.22 + i * bh * 0.15;
      ctx.beginPath();
      ctx.moveTo(cx + side * bw * 0.18, y);
      ctx.lineTo(cx + side * bw * 0.82, y - h * 0.01);
      ctx.stroke();
    }
  }
  // Izzó jel a könyv fölött
  drawGlowingGlyph(ctx, glyph, cx, h * 0.3, w * 0.24, color, w * 0.025);
  for (const [x, y] of [
    [0.25, 0.2],
    [0.75, 0.16],
    [0.68, 0.38],
  ]) {
    drawSparkleAt(ctx, x * w, y * h, w * 0.025, color);
  }
}

/** Négyágú szikra */
export function drawSparkleAt(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string) {
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
    const rr = i % 2 === 0 ? r : r * 0.35;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fill();
}

/** Gyakorló célbábu: fa oszlop szalmakoronggal. (x, y) a talppont, size a magasság. */
export function drawTargetDummy(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, flash = 0) {
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.beginPath();
  ctx.ellipse(x, y, size * 0.22, size * 0.07, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#7c5a32";
  ctx.fillRect(x - size * 0.045, y - size * 0.6, size * 0.09, size * 0.6);
  ctx.fillStyle = "#5c4024";
  ctx.fillRect(x - size * 0.18, y - size * 0.06, size * 0.36, size * 0.06);
  const rings: [number, string][] = [
    [0.3, "#f5ecd7"],
    [0.22, "#ef4444"],
    [0.14, "#f5ecd7"],
    [0.07, "#ef4444"],
  ];
  for (const [r, color] of rings) {
    ctx.fillStyle = flash > 0 ? mix(color, "#ffffff", flash) : color;
    ctx.beginPath();
    ctx.arc(x, y - size * 0.72, size * r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = "#7c5a32";
  ctx.lineWidth = size * 0.025;
  ctx.beginPath();
  ctx.arc(x, y - size * 0.72, size * 0.3, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function mix(a: string, b: string, t: number) {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = (s: number) => Math.round(((pa >> s) & 255) * (1 - t) + ((pb >> s) & 255) * t);
  return `rgb(${ch(16)},${ch(8)},${ch(0)})`;
}

/** Mana ikon: kék kristálycsepp csillanással. (cx, cy) a közép, size a magasság. */
export function drawManaIcon(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number) {
  const h = size / 2;
  ctx.save();
  const g = ctx.createLinearGradient(cx, cy - h, cx, cy + h);
  g.addColorStop(0, "#bfdbfe");
  g.addColorStop(1, "#2563eb");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(cx, cy - h);
  ctx.bezierCurveTo(cx + h * 0.15, cy - h * 0.55, cx + h * 0.72, cy - h * 0.05, cx + h * 0.72, cy + h * 0.32);
  ctx.arc(cx, cy + h * 0.32, h * 0.72, 0, Math.PI);
  ctx.bezierCurveTo(cx - h * 0.72, cy - h * 0.05, cx - h * 0.15, cy - h * 0.55, cx, cy - h);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#1e3a8a";
  ctx.lineWidth = Math.max(1, size * 0.07);
  ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,0.75)";
  ctx.beginPath();
  ctx.ellipse(cx - h * 0.28, cy + h * 0.2, h * 0.14, h * 0.24, 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** Töltési idő ikon: homokóra. (cx, cy) a közép, size a magasság. */
export function drawCooldownIcon(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number) {
  const h = size / 2;
  const w = h * 0.72;
  ctx.save();
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  // Üveg
  ctx.fillStyle = "rgba(233,213,255,0.25)";
  ctx.strokeStyle = "#e9d5ff";
  ctx.lineWidth = Math.max(1, size * 0.08);
  ctx.beginPath();
  ctx.moveTo(cx - w * 0.85, cy - h * 0.78);
  ctx.lineTo(cx + w * 0.85, cy - h * 0.78);
  ctx.quadraticCurveTo(cx + w * 0.8, cy - h * 0.2, cx + w * 0.12, cy);
  ctx.quadraticCurveTo(cx + w * 0.8, cy + h * 0.2, cx + w * 0.85, cy + h * 0.78);
  ctx.lineTo(cx - w * 0.85, cy + h * 0.78);
  ctx.quadraticCurveTo(cx - w * 0.8, cy + h * 0.2, cx - w * 0.12, cy);
  ctx.quadraticCurveTo(cx - w * 0.8, cy - h * 0.2, cx - w * 0.85, cy - h * 0.78);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Homok
  ctx.fillStyle = "#fbbf24";
  ctx.beginPath();
  ctx.moveTo(cx - w * 0.55, cy - h * 0.42);
  ctx.lineTo(cx + w * 0.55, cy - h * 0.42);
  ctx.lineTo(cx, cy - h * 0.05);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(cx, cy + h * 0.3);
  ctx.lineTo(cx + w * 0.62, cy + h * 0.72);
  ctx.lineTo(cx - w * 0.62, cy + h * 0.72);
  ctx.closePath();
  ctx.fill();
  // Fa keret fent és lent
  ctx.fillStyle = "#a16207";
  ctx.beginPath();
  ctx.roundRect(cx - w, cy - h, w * 2, h * 0.24, h * 0.08);
  ctx.roundRect(cx - w, cy + h * 0.76, w * 2, h * 0.24, h * 0.08);
  ctx.fill();
  ctx.restore();
}

/** Vonalas stopperóra ikon (letisztult HUD-hoz). (cx, cy) a közép, size a magasság. */
export function drawStopwatchLineIcon(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number, color: string) {
  const r = size * 0.36;
  const y = cy + size * 0.08;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(1.4, size * 0.08);
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.arc(cx, y, r, 0, Math.PI * 2);
  ctx.moveTo(cx - r * 0.35, y - r - size * 0.12);
  ctx.lineTo(cx + r * 0.35, y - r - size * 0.12);
  ctx.moveTo(cx, y - r - size * 0.12);
  ctx.lineTo(cx, y - r);
  ctx.moveTo(cx, y);
  ctx.lineTo(cx, y - r * 0.55);
  ctx.moveTo(cx, y);
  ctx.lineTo(cx + r * 0.4, y + r * 0.15);
  ctx.stroke();
  ctx.restore();
}

/** Vonalas koponya ikon (ölésszámláló). (cx, cy) a közép, size a magasság. */
export function drawSkullLineIcon(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number, color: string) {
  const r = size * 0.36;
  const y = cy - size * 0.06;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = Math.max(1.4, size * 0.08);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  // Koponya és állkapocs
  ctx.beginPath();
  ctx.arc(cx, y, r, Math.PI * 0.85, Math.PI * 2.15);
  ctx.lineTo(cx + r * 0.62, y + r * 0.95);
  ctx.lineTo(cx - r * 0.62, y + r * 0.95);
  ctx.closePath();
  ctx.stroke();
  // Szemüregek
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(cx + side * r * 0.4, y + r * 0.05, r * 0.2, 0, Math.PI * 2);
    ctx.fill();
  }
  // Fogak
  ctx.beginPath();
  for (const tx of [-0.22, 0.22]) {
    ctx.moveTo(cx + tx * r, y + r * 0.6);
    ctx.lineTo(cx + tx * r, y + r * 0.95);
  }
  ctx.stroke();
  ctx.restore();
}
