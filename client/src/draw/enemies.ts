// Az ellenféltípusok saját rajza és animációja. Minden rajzoló helyi
// koordinátában dolgozik: (0, 0) a talppont, 1 egység = az ellenfél sugara,
// a fej felfelé (negatív y) van, és jobbra néz (a tükrözést a hívó intézi).
import type { Enemy } from "../game/Game";

type Drawer = (ctx: CanvasRenderingContext2D, e: Enemy, t: number) => void;

/** Az ellenfél rajzának magassága sugárban (az életerőcsík fölé kerül) */
export const SPRITE_TOP: Record<string, number> = {
  imp: 2.4,
  spider: 1.3,
  hornet: 2.6,
  bonetortoise: 2.1,
  graveworm: 2.9,
  slime: 2.0,
  slimelet: 2.0,
  toad: 2.0,
  boar: 2.0,
  bonecrow: 3.2,
  scarecrow: 3.6,
};

/** Rajzol-e saját sprite-ot ez a típus (a "blob" a régi, egyszerű rajzot kapja) */
export function hasSprite(type: string) {
  return type in DRAWERS;
}

/** Az ellenfél kirajzolása a (gx, gy) talpponttal; lift = extra emelés (pl. forgószél) */
export function drawEnemySprite(ctx: CanvasRenderingContext2D, e: Enemy, gx: number, gy: number, r: number, t: number, lift: number) {
  const drawer = DRAWERS[e.type];
  if (!drawer) return;
  ctx.save();
  ctx.translate(gx, gy);
  ctx.scale(r * e.facing, r);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  // Árnyék a földön: a magassággal kisebb és halványabb
  const air = (e.height + lift) / r;
  ctx.fillStyle = `rgba(0,0,0,${Math.max(0.12, 0.38 - air * 0.05)})`;
  ctx.beginPath();
  ctx.ellipse(0, 0.1, Math.max(0.4, 1.0 - air * 0.06), Math.max(0.15, 0.32 - air * 0.02), 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.translate(0, -air);
  if (e.spin !== 0) {
    ctx.translate(0, -0.8);
    ctx.rotate(e.spin);
    ctx.translate(0, 0.8);
  }
  // Találatkor csak maga a lény világosodik ki
  if (e.hitFlash > 0) ctx.filter = `brightness(${1 + e.hitFlash * 1.6}) saturate(${1 - e.hitFlash * 0.5})`;
  drawer(ctx, e, t);
  ctx.filter = "none";
  ctx.restore();
}

// ---------------------------------------------------------------- segédek

const OUT = "rgba(10,5,10,0.85)";

/** Izzó, ferde démonszem résnyi pupillával */
function evilEye(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, color = "#fde047", slant = 0.35) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, s * 2.6);
  g.addColorStop(0, hexA(color, 0.55));
  g.addColorStop(1, hexA(color, 0));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, s * 2.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(slant);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(-s * 1.3, 0);
  ctx.quadraticCurveTo(0, -s * 1.1, s * 1.3, 0);
  ctx.quadraticCurveTo(0, s * 0.7, -s * 1.3, 0);
  ctx.fill();
  ctx.fillStyle = "#1a0505";
  ctx.beginPath();
  ctx.ellipse(s * 0.15, -s * 0.05, s * 0.18, s * 0.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** Fogsor egy vonal mentén */
function teeth(ctx: CanvasRenderingContext2D, x1: number, x2: number, y: number, size: number, count: number, down = true) {
  ctx.fillStyle = "#f5f0e1";
  const w = (x2 - x1) / count;
  for (let i = 0; i < count; i++) {
    const x = x1 + i * w;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + w / 2, y + (down ? size : -size));
    ctx.lineTo(x + w, y);
    ctx.closePath();
    ctx.fill();
  }
}

function glow(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, alpha: number) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, hexA(color, alpha));
  g.addColorStop(1, hexA(color, 0));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

function hexA(hex: string, alpha: number) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${Math.max(0, Math.min(1, alpha))})`;
}

// ---------------------------------------------------------------- rajzolók

/** Ördögfióka: vigyorgó kis démon szarvakkal, denevérszárnyakkal, villás farokkal */
const imp: Drawer = (ctx, e, t) => {
  const air = e.height > 0.004;
  const squash = air ? 1.06 : 0.93;
  // Farok
  const wag = Math.sin(t * 6 + e.phase) * 0.3;
  ctx.strokeStyle = "#4a0d0d";
  ctx.lineWidth = 0.1;
  ctx.beginPath();
  ctx.moveTo(-0.6, -0.6);
  ctx.quadraticCurveTo(-1.3, -0.4 + wag, -1.3, -1.1 + wag);
  ctx.stroke();
  ctx.fillStyle = "#4a0d0d";
  ctx.beginPath();
  ctx.moveTo(-1.3, -1.35 + wag);
  ctx.lineTo(-1.12, -1.05 + wag);
  ctx.lineTo(-1.48, -1.05 + wag);
  ctx.closePath();
  ctx.fill();
  // Denevérszárnyak hátul
  const flap = air ? 0.25 : Math.sin(t * 5 + e.phase) * 0.08;
  ctx.fillStyle = "#2a0606";
  ctx.beginPath();
  ctx.moveTo(-0.3, -1.25);
  ctx.lineTo(-1.15, -1.75 - flap);
  ctx.lineTo(-0.95, -1.35 - flap * 0.5);
  ctx.lineTo(-1.2, -1.15);
  ctx.lineTo(-0.85, -1.05);
  ctx.lineTo(-0.95, -0.85);
  ctx.closePath();
  ctx.fill();
  // Lábak karmokkal
  ctx.strokeStyle = "#3b0a0a";
  ctx.lineWidth = 0.16;
  for (const [x, k] of [
    [-0.25, 0],
    [0.3, Math.PI],
  ] as const) {
    const lift = air ? 0.15 : Math.max(0, Math.sin(e.walk + k)) * 0.1;
    ctx.beginPath();
    ctx.moveTo(x, -0.5);
    ctx.lineTo(x + 0.05, -lift);
    ctx.stroke();
  }
  ctx.save();
  ctx.scale(1 / squash, squash);
  // Test
  const g = ctx.createRadialGradient(0.15, -1.25, 0.1, 0, -1.0, 0.85);
  g.addColorStop(0, "#c2282b");
  g.addColorStop(1, "#5c0e10");
  ctx.fillStyle = g;
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 0.06;
  ctx.beginPath();
  ctx.ellipse(0, -1.0, 0.72, 0.68, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // Szarvak
  ctx.fillStyle = "#e7dcc4";
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(side * 0.25 + 0.05, -1.55);
    ctx.quadraticCurveTo(side * 0.55 + 0.05, -1.75, side * 0.5 + 0.1, -2.15);
    ctx.quadraticCurveTo(side * 0.4 + 0.05, -1.8, side * 0.05 + 0.05, -1.6);
    ctx.closePath();
    ctx.fill();
  }
  // Arc: izzó szemek és fogas vigyor
  evilEye(ctx, 0.08, -1.15, 0.14, "#fde047", 0.4);
  evilEye(ctx, 0.48, -1.12, 0.13, "#fde047", -0.4);
  ctx.fillStyle = "#1a0505";
  ctx.beginPath();
  ctx.moveTo(-0.05, -0.85);
  ctx.quadraticCurveTo(0.3, -0.62 - (e.attackAnim > 0 ? 0.15 : 0), 0.65, -0.88);
  ctx.quadraticCurveTo(0.3, -0.78, -0.05, -0.85);
  ctx.fill();
  teeth(ctx, 0.02, 0.6, -0.83, 0.1, 5);
  ctx.restore();
};

/** Vérpók: fekete pók vörös homokórával, sok izzó szemmel, szőrös lábakkal */
const spider: Drawer = (ctx, e, t) => {
  // Nyolc láb, hullámzó lépéssel
  ctx.strokeStyle = "#0b0b0d";
  ctx.lineWidth = 0.09;
  for (let i = 0; i < 4; i++) {
    for (const side of [-1, 1]) {
      const ph = e.walk * 3 + i * 1.3 + (side > 0 ? Math.PI : 0);
      const reach = 0.5 + i * 0.12;
      const baseX = 0.25 - i * 0.18;
      const lift = Math.max(0, Math.sin(ph)) * 0.18;
      ctx.beginPath();
      ctx.moveTo(baseX, -0.55);
      ctx.lineTo(baseX + side * 0.1 + (i < 2 ? 0.35 : -0.35) * reach, -0.95 - lift);
      ctx.lineTo(baseX + (i < 2 ? 0.55 : -0.55) * reach + Math.cos(ph) * 0.08, side > 0 ? 0 : -0.08);
      ctx.stroke();
    }
  }
  // Potroh vörös homokórával
  const g = ctx.createRadialGradient(-0.45, -0.8, 0.05, -0.35, -0.6, 0.65);
  g.addColorStop(0, "#2a2a30");
  g.addColorStop(1, "#050506");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(-0.35, -0.62, 0.62, 0.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#dc2626";
  ctx.beginPath();
  ctx.moveTo(-0.5, -0.88);
  ctx.lineTo(-0.2, -0.88);
  ctx.lineTo(-0.35, -0.65);
  ctx.lineTo(-0.2, -0.42);
  ctx.lineTo(-0.5, -0.42);
  ctx.lineTo(-0.35, -0.65);
  ctx.closePath();
  ctx.fill();
  // Fejtor és csáprágók
  ctx.fillStyle = "#0b0b0d";
  ctx.beginPath();
  ctx.ellipse(0.42, -0.55, 0.36, 0.3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#5c0e10";
  ctx.lineWidth = 0.07;
  const bite = e.attackAnim > 0 ? 0.12 : Math.sin(t * 8) * 0.03;
  ctx.beginPath();
  ctx.moveTo(0.7, -0.45);
  ctx.quadraticCurveTo(0.9, -0.35, 0.82 - bite, -0.18);
  ctx.moveTo(0.6, -0.4);
  ctx.quadraticCurveTo(0.75, -0.25, 0.62 + bite, -0.12);
  ctx.stroke();
  // Izzó szemcsoport
  for (const [x, y, s] of [
    [0.55, -0.68, 0.07],
    [0.68, -0.64, 0.06],
    [0.47, -0.58, 0.05],
    [0.62, -0.54, 0.045],
    [0.74, -0.52, 0.04],
  ]) {
    glow(ctx, x, y, s * 2.5, "#ef4444", 0.6);
    ctx.fillStyle = "#ff3b3b";
    ctx.beginPath();
    ctx.arc(x, y, s, 0, Math.PI * 2);
    ctx.fill();
  }
};

/** Pokoli darázs: sötétvörös test koponyamintával, izzó fullánk, rongyos szárnyak */
const hornet: Drawer = (ctx, e, t) => {
  const flap = Math.abs(Math.sin(t * 50 + e.phase));
  const ragged = (cx: number, cy: number, w: number, h: number, rot: number) => {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rot);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(-w * 0.4, -h, -w, -h * 0.9);
    ctx.lineTo(-w * 0.8, -h * 0.6);
    ctx.lineTo(-w * 0.95, -h * 0.45);
    ctx.lineTo(-w * 0.6, -h * 0.3);
    ctx.lineTo(-w * 0.7, -h * 0.1);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  };
  ctx.fillStyle = "rgba(120,20,20,0.45)";
  ctx.strokeStyle = "rgba(255,120,80,0.6)";
  ctx.lineWidth = 0.03;
  ragged(-0.1, -1.2, 1.0, 0.6 + flap * 0.5, -0.2);
  // Potroh csíkokkal és koponyamintával
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(-0.45, -0.8, 0.7, 0.48, 0.25, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = "#7f1d1d";
  ctx.fillRect(-1.2, -1.4, 1.6, 1.2);
  ctx.fillStyle = "#0a0a0a";
  for (const x of [-0.95, -0.6, -0.25]) ctx.fillRect(x, -1.4, 0.16, 1.2);
  ctx.restore();
  ctx.fillStyle = "rgba(245,240,225,0.85)";
  ctx.beginPath();
  ctx.arc(-0.42, -0.86, 0.17, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#0a0a0a";
  ctx.beginPath();
  ctx.arc(-0.48, -0.88, 0.05, 0, Math.PI * 2);
  ctx.arc(-0.36, -0.88, 0.05, 0, Math.PI * 2);
  ctx.fill();
  // Izzó fullánk
  glow(ctx, -1.2, -0.55, 0.35, "#f97316", 0.7);
  ctx.fillStyle = "#fdba74";
  ctx.beginPath();
  ctx.moveTo(-1.0, -0.66);
  ctx.lineTo(-1.42, -0.48);
  ctx.lineTo(-0.98, -0.5);
  ctx.closePath();
  ctx.fill();
  // Tor és fej
  ctx.fillStyle = "#1a0a0a";
  ctx.beginPath();
  ctx.ellipse(0.25, -0.95, 0.32, 0.3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(0.75, -1.0, 0.32, 0, Math.PI * 2);
  ctx.fill();
  evilEye(ctx, 0.85, -1.08, 0.13, "#ef4444", 0.3);
  // Rágók
  ctx.strokeStyle = "#e7dcc4";
  ctx.lineWidth = 0.06;
  ctx.beginPath();
  ctx.moveTo(1.0, -0.85);
  ctx.lineTo(1.18, -0.72);
  ctx.moveTo(0.92, -0.78);
  ctx.lineTo(1.05, -0.62);
  ctx.stroke();
  // Elülső rongyos szárny
  ctx.fillStyle = "rgba(160,30,30,0.5)";
  ctx.strokeStyle = "rgba(255,140,90,0.7)";
  ragged(0.15, -1.15, 0.9, 0.55 + flap * 0.55, 0.1);
};

/** Csontteknős: tüskés csontpáncél, koponyafej zölden izzó szemüreggel, kísértetpára */
const bonetortoise: Drawer = (ctx, e, t) => {
  const step = Math.sin(e.walk * 0.8);
  // Csontos lábak
  ctx.strokeStyle = "#cfc6ae";
  ctx.lineWidth = 0.16;
  for (const [x, k] of [
    [-0.6, 0],
    [0.55, Math.PI],
  ] as const) {
    ctx.beginPath();
    ctx.moveTo(x, -0.45);
    ctx.lineTo(x + Math.sin(e.walk * 0.8 + k) * 0.1, -Math.max(0, Math.sin(e.walk * 0.8 + k)) * 0.1);
    ctx.stroke();
  }
  // Koponyafej
  const hx = 1.05 + step * 0.04;
  ctx.fillStyle = "#e7dcc4";
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 0.05;
  ctx.beginPath();
  ctx.ellipse(hx, -0.7, 0.42, 0.36, 0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#14140f";
  ctx.beginPath();
  ctx.ellipse(hx + 0.12, -0.78, 0.13, 0.11, 0, 0, Math.PI * 2);
  ctx.fill();
  glow(ctx, hx + 0.12, -0.78, 0.3, "#4ade80", 0.7);
  ctx.fillStyle = "#86efac";
  ctx.beginPath();
  ctx.arc(hx + 0.13, -0.78, 0.05, 0, Math.PI * 2);
  ctx.fill();
  teeth(ctx, hx + 0.05, hx + 0.4, -0.55, 0.09, 4);
  // Páncél: csontlapok és tüskék
  const g = ctx.createRadialGradient(-0.2, -1.35, 0.1, -0.1, -0.9, 1.1);
  g.addColorStop(0, "#efe7d2");
  g.addColorStop(1, "#8a8170");
  ctx.fillStyle = g;
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 0.06;
  ctx.beginPath();
  ctx.ellipse(-0.1, -0.75, 1.0, 0.72, 0, Math.PI, 0);
  ctx.lineTo(0.9, -0.5);
  ctx.lineTo(-1.1, -0.5);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = "rgba(60,50,40,0.6)";
  ctx.lineWidth = 0.05;
  ctx.beginPath();
  ctx.moveTo(-0.6, -0.55);
  ctx.lineTo(-0.45, -1.2);
  ctx.moveTo(0.3, -0.55);
  ctx.lineTo(0.2, -1.25);
  ctx.moveTo(-0.95, -0.95);
  ctx.lineTo(0.75, -0.95);
  ctx.stroke();
  ctx.fillStyle = "#d6cdb5";
  for (const x of [-0.75, -0.3, 0.15, 0.55]) {
    ctx.beginPath();
    ctx.moveTo(x - 0.12, -1.3 + Math.abs(x) * 0.25);
    ctx.lineTo(x, -1.75 + Math.abs(x) * 0.3);
    ctx.lineTo(x + 0.12, -1.3 + Math.abs(x) * 0.25);
    ctx.closePath();
    ctx.fill();
  }
  // Felszálló kísértetpára
  for (let i = 0; i < 2; i++) {
    const k = (t * 0.5 + i * 0.5 + e.phase) % 1;
    ctx.fillStyle = `rgba(134,239,172,${0.35 * (1 - k)})`;
    ctx.beginPath();
    ctx.arc(-0.2 + i * 0.4 + Math.sin(t * 2 + i) * 0.1, -1.5 - k * 1.1, 0.12 + k * 0.15, 0, Math.PI * 2);
    ctx.fill();
  }
};

/** Sírféreg: föld alatt túr, majd kör alakú fogsoros szájjal tör elő */
const graveworm: Drawer = (ctx, e, t) => {
  if (e.mode === "under") {
    for (let i = 0; i < 3; i++) {
      const bump = Math.sin(e.walk * 2 + i * 2) * 0.14;
      ctx.fillStyle = i === 1 ? "#3b2a1c" : "#2e2016";
      ctx.beginPath();
      ctx.ellipse(-0.55 + i * 0.55, -0.15 - bump, 0.6, 0.38 + bump, 0, Math.PI, 0);
      ctx.fill();
    }
    ctx.fillStyle = "#5b4330";
    for (let i = 0; i < 6; i++) {
      ctx.beginPath();
      ctx.arc(-0.9 + i * 0.36, -0.4 - Math.abs(Math.sin(t * 6 + i)) * 0.3, 0.07, 0, Math.PI * 2);
      ctx.fill();
    }
    return;
  }
  const rise = e.mode === "emerge" ? Math.min(1, e.timer / 0.45) : 1;
  // Lyuk
  ctx.fillStyle = "#140c08";
  ctx.beginPath();
  ctx.ellipse(0, 0, 0.95, 0.32, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.beginPath();
  ctx.rect(-3, -4, 6, 4);
  ctx.clip();
  ctx.translate(0, (1 - rise) * 2.6);
  const sway = Math.sin(t * 2.2 + e.phase) * 0.15;
  // Gyűrűs test
  for (let i = 0; i < 5; i++) {
    const y = -0.2 - i * 0.42;
    const x = sway * (i / 4);
    ctx.fillStyle = i % 2 ? "#b58b8b" : "#c99a98";
    ctx.strokeStyle = "rgba(60,20,25,0.7)";
    ctx.lineWidth = 0.05;
    ctx.beginPath();
    ctx.ellipse(x, y, 0.55 - i * 0.03, 0.3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  // Fogsoros kör alakú száj
  const open = 0.32 + (e.attackAnim > 0 ? Math.sin(Math.PI * (1 - e.attackAnim)) * 0.15 : Math.sin(t * 3) * 0.03);
  const mx = sway + 0.15;
  const my = -2.25;
  ctx.fillStyle = "#c99a98";
  ctx.beginPath();
  ctx.ellipse(mx, my, 0.55, 0.45, 0.25, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#3b0508";
  ctx.beginPath();
  ctx.ellipse(mx + 0.05, my, open, open * 0.85, 0.25, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#f5f0e1";
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const ox = mx + 0.05 + Math.cos(a) * open;
    const oy = my + Math.sin(a) * open * 0.85;
    ctx.beginPath();
    ctx.moveTo(ox + Math.cos(a + 0.35) * 0.08, oy + Math.sin(a + 0.35) * 0.07);
    ctx.lineTo(ox - Math.cos(a) * 0.14, oy - Math.sin(a) * 0.12);
    ctx.lineTo(ox + Math.cos(a - 0.35) * 0.08, oy + Math.sin(a - 0.35) * 0.07);
    ctx.closePath();
    ctx.fill();
  }
  glow(ctx, mx + 0.05, my, open * 0.8, "#ef4444", 0.45);
  ctx.restore();
};

/** Dögnyálka: mérgező zöld nyálka, benne lebegő koponya; a csepp kisebb, koponya nélkül */
const slime: Drawer = (ctx, e, t) => {
  const small = e.type === "slimelet";
  const wob = Math.sin(e.walk * 1.3) * 0.08;
  const h = 1.5 - wob;
  // Csöpögés a földön
  ctx.fillStyle = "rgba(132,204,22,0.35)";
  ctx.beginPath();
  ctx.ellipse(-0.6, 0.05, 0.5, 0.12, 0, 0, Math.PI * 2);
  ctx.fill();
  // Test
  const g = ctx.createRadialGradient(-0.2, -h * 0.75, 0.1, 0, -h * 0.4, 1.1);
  g.addColorStop(0, "rgba(217,249,157,0.95)");
  g.addColorStop(0.5, "rgba(101,163,13,0.9)");
  g.addColorStop(1, "rgba(54,83,20,0.95)");
  ctx.fillStyle = g;
  ctx.strokeStyle = "rgba(26,46,5,0.9)";
  ctx.lineWidth = 0.06;
  ctx.beginPath();
  ctx.moveTo(-1.0 - wob, 0);
  ctx.bezierCurveTo(-1.05, -h * 0.9, 1.05, -h * 0.9, 1.0 + wob, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  if (!small) {
    // Lebegő koponya a nyálkában
    const bob = Math.sin(t * 2 + e.phase) * 0.08;
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = "#efe7d2";
    ctx.beginPath();
    ctx.arc(0.1, -0.75 + bob, 0.36, Math.PI * 0.85, Math.PI * 2.15);
    ctx.lineTo(0.3, -0.42 + bob);
    ctx.lineTo(-0.1, -0.42 + bob);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#1a2e05";
    ctx.beginPath();
    ctx.arc(-0.02, -0.75 + bob, 0.09, 0, Math.PI * 2);
    ctx.arc(0.24, -0.75 + bob, 0.09, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  // Izzó szemek a felszínen
  evilEye(ctx, 0.25, -h * 0.62, small ? 0.17 : 0.12, "#facc15", 0.35);
  evilEye(ctx, 0.6, -h * 0.58, small ? 0.15 : 0.11, "#facc15", -0.35);
  // Buborékok és csillanás
  ctx.fillStyle = "rgba(236,252,203,0.7)";
  for (let i = 0; i < 3; i++) {
    const k = (t * 0.7 + i / 3 + e.phase) % 1;
    ctx.beginPath();
    ctx.arc(-0.5 + i * 0.35, -0.2 - k * h * 0.6, 0.05 + k * 0.03, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.beginPath();
  ctx.ellipse(-0.45, -h * 0.65, 0.18, 0.08, -0.6, 0, Math.PI * 2);
  ctx.fill();
};

/** Varangydémon: szarvas, bibircsókos varangy agyarakkal; ütéskor kicsapja a nyelvét */
const toad: Drawer = (ctx, e) => {
  const air = e.mode === "air";
  ctx.fillStyle = "#2f3a1c";
  if (air) {
    ctx.beginPath();
    ctx.ellipse(-0.95, -0.35, 0.7, 0.18, 0.35, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.ellipse(-0.5, -0.25, 0.5, 0.3, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // Test
  const g = ctx.createRadialGradient(-0.1, -1.0, 0.1, 0, -0.7, 1.05);
  g.addColorStop(0, "#5b6b2e");
  g.addColorStop(1, "#262d12");
  ctx.fillStyle = g;
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 0.06;
  ctx.beginPath();
  ctx.ellipse(0.05, -0.72, 1.0, air ? 0.56 : 0.7, air ? -0.15 : 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // Bibircsókok
  ctx.fillStyle = "#7c3a2d";
  for (const [x, y, s] of [
    [-0.5, -1.05, 0.09],
    [-0.15, -1.25, 0.07],
    [-0.65, -0.7, 0.07],
    [0.15, -0.95, 0.06],
    [-0.3, -0.55, 0.06],
  ]) {
    ctx.beginPath();
    ctx.arc(x, y, s, 0, Math.PI * 2);
    ctx.fill();
  }
  // Szarvak
  ctx.fillStyle = "#1c1410";
  for (const x of [0.25, 0.7]) {
    ctx.beginPath();
    ctx.moveTo(x - 0.1, -1.35);
    ctx.quadraticCurveTo(x - 0.2, -1.75, x - 0.4, -1.85);
    ctx.quadraticCurveTo(x - 0.05, -1.7, x + 0.08, -1.38);
    ctx.closePath();
    ctx.fill();
  }
  evilEye(ctx, 0.32, -1.25, 0.15, "#ef4444", 0.35);
  evilEye(ctx, 0.75, -1.2, 0.14, "#ef4444", -0.2);
  // Száj agyarakkal
  ctx.strokeStyle = "#0d1006";
  ctx.lineWidth = 0.07;
  ctx.beginPath();
  ctx.moveTo(0.2, -0.85);
  ctx.quadraticCurveTo(0.6, -0.65, 1.0, -0.88);
  ctx.stroke();
  ctx.fillStyle = "#f5f0e1";
  for (const x of [0.4, 0.8]) {
    ctx.beginPath();
    ctx.moveTo(x - 0.06, -0.78);
    ctx.lineTo(x, -0.55);
    ctx.lineTo(x + 0.06, -0.78);
    ctx.closePath();
    ctx.fill();
  }
  // Kicsapódó nyelv ütéskor
  if (e.attackAnim > 0) {
    const k = Math.sin(Math.PI * (1 - e.attackAnim));
    ctx.strokeStyle = "#be123c";
    ctx.lineWidth = 0.12;
    ctx.beginPath();
    ctx.moveTo(0.95, -0.82);
    ctx.quadraticCurveTo(1.4 * k + 0.95, -1.0, 1.0 + 1.8 * k, -0.7);
    ctx.stroke();
  }
  ctx.fillStyle = "#262d12";
  ctx.beginPath();
  ctx.ellipse(0.6, air ? -0.3 : -0.08, 0.24, 0.12, 0, 0, Math.PI * 2);
  ctx.fill();
};

/** Pokoli vadkan: lángoló sörény, agyarak; kapál, majd tűzcsíkot húzva nekiront */
const boar: Drawer = (ctx, e, t) => {
  const charging = e.mode === "roll";
  const windup = e.mode === "windup";
  if (charging) {
    // Tűzcsík mögötte
    for (let i = 1; i <= 5; i++) {
      const k = i / 5;
      ctx.fillStyle = `rgba(${k < 0.5 ? "253,186,116" : "239,68,68"},${0.6 * (1 - k)})`;
      ctx.beginPath();
      ctx.arc(-0.8 - i * 0.4, -0.5 + Math.sin(t * 30 + i) * 0.1, 0.35 * (1 - k * 0.5), 0, Math.PI * 2);
      ctx.fill();
    }
  }
  const shake = windup ? Math.sin(e.timer * 80) * 0.06 : 0;
  ctx.translate(shake, charging ? 0.1 : 0);
  // Lábak (rohamnál elmosódva, kapáláskor az egyik első láb kapar)
  ctx.strokeStyle = "#1c120c";
  ctx.lineWidth = 0.18;
  const gait = charging ? e.walk * 3 : e.walk;
  for (const [x, k] of [
    [-0.55, 0],
    [-0.25, Math.PI],
    [0.45, Math.PI],
    [0.7, 0],
  ] as const) {
    const scrape = windup && x > 0.6 ? Math.sin(e.timer * 25) * 0.25 : 0;
    ctx.beginPath();
    ctx.moveTo(x, -0.5);
    ctx.lineTo(x + Math.sin(gait + k) * 0.15 + scrape, -Math.max(0, Math.sin(gait + k)) * 0.12);
    ctx.stroke();
  }
  // Test
  const g = ctx.createRadialGradient(0, -0.95, 0.1, 0, -0.75, 1.05);
  g.addColorStop(0, "#4a2f22");
  g.addColorStop(1, "#1e120c");
  ctx.fillStyle = g;
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 0.06;
  ctx.beginPath();
  ctx.ellipse(-0.05, -0.75, 0.95, 0.5, charging ? 0.08 : 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // Lángoló sörény a hátán
  for (let i = 0; i < 6; i++) {
    const x = -0.75 + i * 0.27;
    const flick = Math.sin(t * 14 + i * 1.7) * 0.12;
    const fh = 0.45 + (i % 2) * 0.15 + flick;
    ctx.fillStyle = i % 2 ? "#f97316" : "#fbbf24";
    ctx.beginPath();
    ctx.moveTo(x - 0.15, -1.1);
    ctx.quadraticCurveTo(x - 0.1 - (charging ? 0.2 : 0), -1.1 - fh, x - (charging ? 0.3 : 0.05), -1.2 - fh);
    ctx.quadraticCurveTo(x + 0.05, -1.15 - fh * 0.5, x + 0.15, -1.1);
    ctx.closePath();
    ctx.fill();
  }
  // Fej, ormány, agyarak, izzó szem
  ctx.fillStyle = "#2c1a12";
  ctx.beginPath();
  ctx.ellipse(0.85, -0.8, 0.42, 0.35, 0.25, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#5c3a2c";
  ctx.beginPath();
  ctx.ellipse(1.22, -0.7, 0.14, 0.17, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#f5f0e1";
  ctx.beginPath();
  ctx.moveTo(1.05, -0.62);
  ctx.quadraticCurveTo(1.35, -0.6, 1.3, -1.0);
  ctx.quadraticCurveTo(1.2, -0.72, 1.0, -0.72);
  ctx.closePath();
  ctx.fill();
  evilEye(ctx, 0.92, -0.95, 0.11, "#ef4444", 0.4);
  // Kapáláskor füst az orrából
  if (windup) {
    for (let i = 0; i < 2; i++) {
      const k = (e.timer * 2 + i * 0.5) % 1;
      ctx.fillStyle = `rgba(120,110,105,${0.5 * (1 - k)})`;
      ctx.beginPath();
      ctx.arc(1.4 + k * 0.4, -0.65 - k * 0.2, 0.1 + k * 0.12, 0, Math.PI * 2);
      ctx.fill();
    }
  }
};

/** Csontholló: élőhalott holló kilátszó bordákkal, koponyafejjel, rongyos szárnyakkal */
const bonecrow: Drawer = (ctx, e, t) => {
  const diving = e.mode === "dive";
  const flap = diving ? -0.9 : Math.sin(t * 13 + e.phase);
  const wing = (front: boolean) => {
    ctx.fillStyle = front ? "#1f1a24" : "#0f0c12";
    ctx.beginPath();
    ctx.moveTo(0.05, -0.85);
    ctx.quadraticCurveTo(-0.4, -0.9 - flap * 1.0, -1.25, -1.05 - flap * 1.25);
    // Rongyos szárnyvég
    ctx.lineTo(-1.05, -0.88 - flap * 0.9);
    ctx.lineTo(-1.2, -0.78 - flap * 0.7);
    ctx.lineTo(-0.85, -0.7 - flap * 0.4);
    ctx.lineTo(-0.9, -0.6);
    ctx.quadraticCurveTo(-0.4, -0.55, 0.05, -0.7);
    ctx.closePath();
    ctx.fill();
    // Kilátszó szárnycsont
    ctx.strokeStyle = "rgba(231,220,196,0.7)";
    ctx.lineWidth = 0.04;
    ctx.beginPath();
    ctx.moveTo(0, -0.8);
    ctx.quadraticCurveTo(-0.45, -0.88 - flap * 0.8, -1.1, -1.0 - flap * 1.15);
    ctx.stroke();
  };
  wing(false);
  // Test kilátszó bordákkal
  ctx.fillStyle = "#14101a";
  ctx.beginPath();
  ctx.ellipse(0, -0.8, 0.8, 0.42, diving ? 0.35 : 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#e7dcc4";
  ctx.lineWidth = 0.05;
  for (let i = 0; i < 4; i++) {
    const x = -0.35 + i * 0.2;
    ctx.beginPath();
    ctx.moveTo(x, -1.05);
    ctx.quadraticCurveTo(x + 0.08, -0.8, x, -0.58);
    ctx.stroke();
  }
  // Rongyos farok
  ctx.fillStyle = "#14101a";
  ctx.beginPath();
  ctx.moveTo(-0.7, -0.9);
  ctx.lineTo(-1.35, -1.05);
  ctx.lineTo(-1.2, -0.85);
  ctx.lineTo(-1.4, -0.7);
  ctx.lineTo(-0.7, -0.68);
  ctx.closePath();
  ctx.fill();
  // Koponyafej, izzó szemüreg, csontcsőr
  ctx.fillStyle = "#e7dcc4";
  ctx.beginPath();
  ctx.arc(0.75, -0.95, 0.34, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(1.0, -1.05);
  ctx.lineTo(1.55, -0.9);
  ctx.lineTo(1.0, -0.8);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#14101a";
  ctx.beginPath();
  ctx.arc(0.8, -1.0, 0.12, 0, Math.PI * 2);
  ctx.fill();
  glow(ctx, 0.8, -1.0, 0.3, "#ef4444", 0.75);
  ctx.fillStyle = "#ff4d4d";
  ctx.beginPath();
  ctx.arc(0.82, -1.0, 0.05, 0, Math.PI * 2);
  ctx.fill();
  wing(true);
  if (diving) {
    ctx.strokeStyle = "rgba(239,68,68,0.6)";
    ctx.lineWidth = 0.05;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(-1.0 - i * 0.2, -0.5 - i * 0.25);
      ctx.lineTo(-2.1 - i * 0.2, -0.5 - i * 0.25);
      ctx.stroke();
    }
  }
};

/** Rémmadárijesztő: izzó tökfej, rongyos kabát, szalma, kasza */
const scarecrow: Drawer = (ctx, e, t) => {
  const hop = Math.abs(Math.sin(e.walk * 0.7)) * 0.12;
  const sway = Math.sin(e.walk * 0.7) * 0.06;
  // Karó
  ctx.strokeStyle = "#4a3320";
  ctx.lineWidth = 0.14;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, -1.0 - hop);
  ctx.stroke();
  ctx.translate(0, -hop);
  ctx.rotate(sway);
  // Kasza a hátsó kézben (ütéskor suhint)
  const swing = e.attackAnim > 0 ? Math.sin(Math.PI * (1 - e.attackAnim)) : 0;
  ctx.save();
  ctx.translate(0.95, -1.9);
  ctx.rotate(-0.4 + swing * 1.6);
  ctx.strokeStyle = "#3b2a1a";
  ctx.lineWidth = 0.09;
  ctx.beginPath();
  ctx.moveTo(0, 0.9);
  ctx.lineTo(0, -1.1);
  ctx.stroke();
  ctx.fillStyle = "#9ca3af";
  ctx.strokeStyle = "#4b5563";
  ctx.lineWidth = 0.03;
  ctx.beginPath();
  ctx.moveTo(0, -1.1);
  ctx.quadraticCurveTo(0.9, -1.15, 1.2, -0.5);
  ctx.quadraticCurveTo(0.8, -0.95, 0, -0.9);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  // Rongyos kabát
  ctx.fillStyle = "#3a2a3f";
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 0.06;
  ctx.beginPath();
  ctx.moveTo(-0.55, -2.3);
  ctx.lineTo(0.55, -2.3);
  ctx.lineTo(0.75, -0.95);
  ctx.lineTo(0.5, -1.1);
  ctx.lineTo(0.35, -0.85);
  ctx.lineTo(0.1, -1.05);
  ctx.lineTo(-0.15, -0.8);
  ctx.lineTo(-0.4, -1.05);
  ctx.lineTo(-0.75, -0.9);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Foltok
  ctx.fillStyle = "#6b4a2d";
  ctx.fillRect(-0.35, -1.8, 0.25, 0.22);
  ctx.fillStyle = "#4a3a5a";
  ctx.fillRect(0.15, -1.45, 0.22, 0.2);
  // Karok kifeszítve, szalma a ruhaujjakból
  ctx.strokeStyle = "#3a2a3f";
  ctx.lineWidth = 0.3;
  ctx.beginPath();
  ctx.moveTo(-0.5, -2.15);
  ctx.lineTo(-1.25, -2.0 + Math.sin(t * 2) * 0.05);
  ctx.moveTo(0.5, -2.15);
  ctx.lineTo(0.95, -1.95);
  ctx.stroke();
  ctx.strokeStyle = "#d4b25a";
  ctx.lineWidth = 0.04;
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    ctx.moveTo(-1.25, -2.0);
    ctx.lineTo(-1.5 - (i % 2) * 0.08, -2.15 + i * 0.08);
    ctx.stroke();
  }
  for (let i = 0; i < 7; i++) {
    ctx.beginPath();
    ctx.moveTo(-0.6 + i * 0.2, -0.95);
    ctx.lineTo(-0.65 + i * 0.2 + Math.sin(t * 3 + i) * 0.04, -0.7);
    ctx.stroke();
  }
  // Tökfej: faragott, belülről izzó
  const flicker = 0.75 + 0.25 * Math.sin(t * 9 + e.phase) * Math.sin(t * 4.3);
  glow(ctx, 0.05, -2.75, 1.0, "#f97316", 0.35 * flicker);
  const pg = ctx.createRadialGradient(-0.15, -2.95, 0.1, 0.05, -2.7, 0.6);
  pg.addColorStop(0, "#fb923c");
  pg.addColorStop(1, "#9a3412");
  ctx.fillStyle = pg;
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 0.05;
  ctx.beginPath();
  ctx.ellipse(0.05, -2.7, 0.6, 0.48, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = "rgba(124,45,18,0.6)";
  ctx.beginPath();
  ctx.ellipse(0.05, -2.7, 0.25, 0.48, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = `rgba(253,224,71,${flicker})`;
  for (const x of [-0.12, 0.3]) {
    ctx.beginPath();
    ctx.moveTo(x - 0.13, -2.72);
    ctx.lineTo(x + 0.13, -2.72);
    ctx.lineTo(x, -2.95);
    ctx.closePath();
    ctx.fill();
  }
  ctx.beginPath();
  ctx.moveTo(-0.32, -2.52);
  for (let i = 0; i <= 6; i++) ctx.lineTo(-0.32 + i * 0.12, i % 2 ? -2.42 : -2.55);
  ctx.lineTo(0.4, -2.38);
  ctx.quadraticCurveTo(0.05, -2.28, -0.3, -2.42);
  ctx.closePath();
  ctx.fill();
  // Szakadt kalap
  ctx.fillStyle = "#1c1424";
  ctx.beginPath();
  ctx.ellipse(0.05, -3.1, 0.75, 0.13, -0.08, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-0.35, -3.12);
  ctx.lineTo(-0.15, -3.75);
  ctx.lineTo(0.05, -3.6);
  ctx.lineTo(0.15, -3.8);
  ctx.lineTo(0.45, -3.12);
  ctx.closePath();
  ctx.fill();
};

const DRAWERS: Record<string, Drawer> = {
  imp,
  spider,
  hornet,
  bonetortoise,
  graveworm,
  slime,
  slimelet: slime,
  toad,
  boar,
  bonecrow,
  scarecrow,
};
