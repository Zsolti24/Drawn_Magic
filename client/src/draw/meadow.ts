// Füves rét saját rajzolással. Egyszer rajzoljuk meg egy háttérvászonra,
// a játék képkockánként csak ezt teszi ki, így nem lassít.

/** A rét a pálya széle körül ennyivel nagyobb (sövény és erdő) */
export const MEADOW_BORDER = 0.7;

const GRASS = "#4f8a34";
const OUTSIDE = "#1d3417";

const cache = new Map<string, HTMLCanvasElement>();

/** A rét vászna a megadott pályamérethez és felbontáshoz (képpont / egység) */
export function getMeadow(halfWidth: number, halfHeight: number, pxPerUnit: number): HTMLCanvasElement {
  // A felbontást lépcsőzzük, hogy átméretezéskor ne rajzoljuk újra folyton
  const scale = Math.min(420, Math.max(120, Math.round(pxPerUnit / 60) * 60));
  const key = `${halfWidth}x${halfHeight}@${scale}`;
  let canvas = cache.get(key);
  if (!canvas) {
    canvas = paintMeadow(halfWidth, halfHeight, scale);
    cache.set(key, canvas);
  }
  return canvas;
}

function paintMeadow(halfWidth: number, halfHeight: number, scale: number): HTMLCanvasElement {
  const outerW = halfWidth + MEADOW_BORDER;
  const outerH = halfHeight + MEADOW_BORDER;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(outerW * 2 * scale);
  canvas.height = Math.round(outerH * 2 * scale);
  const ctx = canvas.getContext("2d")!;
  // Világkoordinátában rajzolunk, mint a játékban
  ctx.setTransform(scale, 0, 0, scale, outerW * scale, outerH * scale);
  const rand = seeded(20261009);
  const area = (lo: number, hi: number) => lo + rand() * (hi - lo);

  // Erdő a pályán kívül
  ctx.fillStyle = OUTSIDE;
  ctx.fillRect(-outerW, -outerH, outerW * 2, outerH * 2);

  // Alap fű
  ctx.fillStyle = GRASS;
  ctx.fillRect(-halfWidth, -halfHeight, halfWidth * 2, halfHeight * 2);

  ctx.save();
  ctx.beginPath();
  ctx.rect(-halfWidth, -halfHeight, halfWidth * 2, halfHeight * 2);
  ctx.clip();

  // Világosabb és sötétebb foltok
  const patches = Math.round(halfWidth * halfHeight * 14);
  for (let i = 0; i < patches; i++) {
    const x = area(-halfWidth, halfWidth);
    const y = area(-halfHeight, halfHeight);
    const r = area(0.15, 0.55);
    const light = rand() < 0.5;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, light ? "rgba(140,190,80,0.28)" : "rgba(30,70,25,0.25)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * area(0.6, 1), area(0, Math.PI), 0, Math.PI * 2);
    ctx.fill();
  }

  // Fűcsomók: néhány ívelt fűszál egy tőből
  const tufts = Math.round(halfWidth * halfHeight * 4 * 110);
  ctx.lineCap = "round";
  for (let i = 0; i < tufts; i++) {
    const x = area(-halfWidth, halfWidth);
    const y = area(-halfHeight, halfHeight);
    const size = area(0.018, 0.04);
    const shade = rand();
    ctx.strokeStyle = shade < 0.5 ? "#3d7128" : shade < 0.85 ? "#62a03f" : "#82bd52";
    ctx.lineWidth = size * 0.16;
    const blades = 3 + Math.floor(rand() * 3);
    ctx.beginPath();
    for (let b = 0; b < blades; b++) {
      const lean = (b / (blades - 1) - 0.5) * 1.2 + area(-0.2, 0.2);
      const h = size * area(0.7, 1.2);
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + lean * h * 0.3, y - h * 0.6, x + lean * h * 0.7, y - h);
    }
    ctx.stroke();
  }

  // Virágcsoportok
  const flowerColors = ["#fdf6e3", "#facc15", "#f9a8d4", "#c4b5fd"];
  const clusters = Math.round(halfWidth * halfHeight * 4 * 4);
  for (let c = 0; c < clusters; c++) {
    const cx = area(-halfWidth, halfWidth);
    const cy = area(-halfHeight, halfHeight);
    const color = flowerColors[Math.floor(rand() * flowerColors.length)];
    const count = 3 + Math.floor(rand() * 6);
    for (let i = 0; i < count; i++) {
      drawFlower(ctx, cx + area(-0.08, 0.08), cy + area(-0.06, 0.06), area(0.008, 0.014), color, rand() * Math.PI);
    }
  }

  // Kövek
  const stones = Math.round(halfWidth * halfHeight * 4 * 0.8);
  for (let i = 0; i < stones; i++) {
    const x = area(-halfWidth, halfWidth);
    const y = area(-halfHeight, halfHeight);
    const r = area(0.015, 0.035);
    ctx.fillStyle = "rgba(0,0,0,0.22)";
    ctx.beginPath();
    ctx.ellipse(x + r * 0.15, y + r * 0.35, r, r * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#8f9a8c";
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * 0.7, area(-0.4, 0.4), 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.25)";
    ctx.beginPath();
    ctx.ellipse(x - r * 0.3, y - r * 0.25, r * 0.35, r * 0.2, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  drawHedge(ctx, halfWidth, halfHeight, rand);
  return canvas;
}

function drawFlower(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, rot: number) {
  ctx.fillStyle = color;
  for (let p = 0; p < 5; p++) {
    const a = rot + (p / 5) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(x + Math.cos(a) * r, y + Math.sin(a) * r, r * 0.75, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = color === "#facc15" ? "#b45309" : "#fbbf24";
  ctx.beginPath();
  ctx.arc(x, y, r * 0.6, 0, Math.PI * 2);
  ctx.fill();
}

/** Sövény a pálya szélén: egymásba érő bokrok, árnyékkal és fényekkel */
function drawHedge(ctx: CanvasRenderingContext2D, halfWidth: number, halfHeight: number, rand: () => number) {
  const bushes: { x: number; y: number; r: number }[] = [];
  const along = (from: [number, number], to: [number, number]) => {
    const len = Math.hypot(to[0] - from[0], to[1] - from[1]);
    const n = Math.ceil(len / 0.07);
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      bushes.push({
        x: from[0] + (to[0] - from[0]) * t + (rand() - 0.5) * 0.04,
        y: from[1] + (to[1] - from[1]) * t + (rand() - 0.5) * 0.04,
        r: 0.07 + rand() * 0.05,
      });
    }
  };
  const w = halfWidth + 0.04;
  const h = halfHeight + 0.04;
  along([-w, -h], [w, -h]);
  along([w, -h], [w, h]);
  along([w, h], [-w, h]);
  along([-w, h], [-w, -h]);

  // Árnyék a fűre
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  for (const b of bushes) {
    ctx.beginPath();
    ctx.arc(b.x + 0.015, b.y + 0.03, b.r * 1.05, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const [color, scale, dx, dy] of [
    ["#24461b", 1, 0, 0],
    ["#2f5d22", 0.8, -0.01, -0.015],
    ["#3f7a2c", 0.5, -0.02, -0.03],
  ] as const) {
    ctx.fillStyle = color;
    for (const b of bushes) {
      ctx.beginPath();
      ctx.arc(b.x + dx * (b.r / 0.1), b.y + dy * (b.r / 0.1), b.r * scale, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

/** Determinisztikus véletlen (mulberry32), hogy a rét mindig ugyanúgy nézzen ki */
function seeded(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
