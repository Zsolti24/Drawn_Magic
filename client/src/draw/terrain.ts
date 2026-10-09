// A pályák talaja témánként, saját rajzolással. Mint a rét: egyszer
// rajzoljuk meg egy háttérvászonra, a játék csak ezt teszi ki.
import { getMeadow, MEADOW_BORDER } from "./meadow";

/** A talaj a pálya széle körül ennyivel nagyobb (szegély) */
export const TERRAIN_BORDER = MEADOW_BORDER;

/** A szegélyen túli szín témánként */
export const TERRAIN_OUTSIDE: Record<string, string> = {
  meadow: "#1d3417",
  forest: "#0f1a0d",
  swamp: "#08161a",
  cave: "#0b0a12",
  ash: "#120807",
};

const cache = new Map<string, HTMLCanvasElement>();

/** A téma talajvászna a megadott pályamérethez és felbontáshoz (képpont / egység) */
export function getTerrain(kind: string, halfWidth: number, halfHeight: number, pxPerUnit: number): HTMLCanvasElement {
  if (kind === "meadow" || !PAINTERS[kind]) return getMeadow(halfWidth, halfHeight, pxPerUnit);
  const scale = Math.min(420, Math.max(120, Math.round(pxPerUnit / 60) * 60));
  const key = `${kind}:${halfWidth}x${halfHeight}@${scale}`;
  let canvas = cache.get(key);
  if (!canvas) {
    canvas = paint(kind, halfWidth, halfHeight, scale);
    cache.set(key, canvas);
  }
  return canvas;
}

interface Painter {
  ground: (ctx: CanvasRenderingContext2D, w: number, h: number, rand: () => number) => void;
  border: (ctx: CanvasRenderingContext2D, w: number, h: number, rand: () => number) => void;
}

function paint(kind: string, halfWidth: number, halfHeight: number, scale: number): HTMLCanvasElement {
  const outerW = halfWidth + TERRAIN_BORDER;
  const outerH = halfHeight + TERRAIN_BORDER;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(outerW * 2 * scale);
  canvas.height = Math.round(outerH * 2 * scale);
  const ctx = canvas.getContext("2d")!;
  ctx.setTransform(scale, 0, 0, scale, outerW * scale, outerH * scale);
  const rand = seeded(1234 + kind.length * 77);
  ctx.fillStyle = TERRAIN_OUTSIDE[kind];
  ctx.fillRect(-outerW, -outerH, outerW * 2, outerH * 2);
  ctx.save();
  ctx.beginPath();
  ctx.rect(-halfWidth, -halfHeight, halfWidth * 2, halfHeight * 2);
  ctx.clip();
  PAINTERS[kind].ground(ctx, halfWidth, halfHeight, rand);
  ctx.restore();
  PAINTERS[kind].border(ctx, halfWidth, halfHeight, rand);
  return canvas;
}

// ---------------------------------------------------------------- közös

const between = (rand: () => number, lo: number, hi: number) => lo + rand() * (hi - lo);

function patches(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  rand: () => number,
  count: number,
  colors: string[],
  size: [number, number],
) {
  for (let i = 0; i < count; i++) {
    const x = between(rand, -w, w);
    const y = between(rand, -h, h);
    const r = between(rand, size[0], size[1]);
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, colors[Math.floor(rand() * colors.length)]);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * between(rand, 0.55, 1), between(rand, 0, Math.PI), 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Pontok a pálya szélén körben (a szegély elemeihez) */
function edgePoints(w: number, h: number, spacing: number, rand: () => number) {
  const pts: { x: number; y: number }[] = [];
  const along = (ax: number, ay: number, bx: number, by: number) => {
    const n = Math.ceil(Math.hypot(bx - ax, by - ay) / spacing);
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      pts.push({ x: ax + (bx - ax) * t + (rand() - 0.5) * spacing * 0.6, y: ay + (by - ay) * t + (rand() - 0.5) * spacing * 0.6 });
    }
  };
  along(-w, -h, w, -h);
  along(w, -h, w, h);
  along(w, h, -w, h);
  along(-w, h, -w, -h);
  return pts;
}

// ---------------------------------------------------------------- erdő

const forest: Painter = {
  ground(ctx, w, h, rand) {
    ctx.fillStyle = "#2f3f22";
    ctx.fillRect(-w, -h, w * 2, h * 2);
    patches(ctx, w, h, rand, Math.round(w * h * 14), ["rgba(70,90,40,0.35)", "rgba(20,28,14,0.4)", "rgba(90,70,40,0.25)"], [0.15, 0.5]);
    // Gyökerek
    ctx.lineCap = "round";
    for (let i = 0; i < w * h * 6; i++) {
      let x = between(rand, -w, w);
      let y = between(rand, -h, h);
      let a = rand() * Math.PI * 2;
      ctx.strokeStyle = "rgba(60,42,24,0.7)";
      ctx.lineWidth = between(rand, 0.008, 0.016);
      ctx.beginPath();
      ctx.moveTo(x, y);
      for (let k = 0; k < 6; k++) {
        a += (rand() - 0.5) * 0.9;
        x += Math.cos(a) * 0.05;
        y += Math.sin(a) * 0.05;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    // Avar: levelek
    const leafColors = ["#a16207", "#c2410c", "#65a30d", "#854d0e", "#b45309"];
    for (let i = 0; i < w * h * 4 * 180; i++) {
      const x = between(rand, -w, w);
      const y = between(rand, -h, h);
      ctx.fillStyle = leafColors[Math.floor(rand() * leafColors.length)];
      ctx.globalAlpha = between(rand, 0.4, 0.85);
      ctx.beginPath();
      ctx.ellipse(x, y, between(rand, 0.008, 0.014), between(rand, 0.004, 0.007), rand() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    // Gombák csoportokban
    for (let c = 0; c < w * h * 4 * 3; c++) {
      const cx = between(rand, -w, w);
      const cy = between(rand, -h, h);
      for (let i = 0; i < 2 + Math.floor(rand() * 3); i++) {
        const x = cx + between(rand, -0.04, 0.04);
        const y = cy + between(rand, -0.03, 0.03);
        const r = between(rand, 0.01, 0.018);
        ctx.fillStyle = "#e7e5e4";
        ctx.fillRect(x - r * 0.25, y - r * 0.2, r * 0.5, r * 0.9);
        ctx.fillStyle = rand() < 0.5 ? "#dc2626" : "#a16207";
        ctx.beginPath();
        ctx.ellipse(x, y - r * 0.2, r, r * 0.6, 0, Math.PI, 0);
        ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,0.8)";
        ctx.beginPath();
        ctx.arc(x - r * 0.35, y - r * 0.45, r * 0.15, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // Moha
    patches(ctx, w, h, rand, Math.round(w * h * 6), ["rgba(101,163,13,0.35)"], [0.05, 0.12]);
  },
  border(ctx, w, h, rand) {
    // Fák: árnyék, egymásba érő lombkoronák több rétegben
    const trees = edgePoints(w + 0.08, h + 0.08, 0.16, rand).map((p) => ({ ...p, r: between(rand, 0.13, 0.22) }));
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    for (const t of trees) {
      ctx.beginPath();
      ctx.arc(t.x + 0.03, t.y + 0.05, t.r, 0, Math.PI * 2);
      ctx.fill();
    }
    for (const [color, s, dx, dy] of [
      ["#14301a", 1, 0, 0],
      ["#1e4424", 0.78, -0.015, -0.02],
      ["#2d5e2f", 0.5, -0.03, -0.04],
    ] as const) {
      ctx.fillStyle = color;
      for (const t of trees) {
        ctx.beginPath();
        ctx.arc(t.x + dx, t.y + dy, t.r * s, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  },
};

// ---------------------------------------------------------------- mocsár

const swamp: Painter = {
  ground(ctx, w, h, rand) {
    ctx.fillStyle = "#24392f";
    ctx.fillRect(-w, -h, w * 2, h * 2);
    patches(ctx, w, h, rand, Math.round(w * h * 12), ["rgba(60,80,40,0.35)", "rgba(10,25,25,0.4)"], [0.15, 0.45]);
    // Víztócsák holdfény-tükröződéssel
    for (let i = 0; i < w * h * 4 * 1.8; i++) {
      const x = between(rand, -w, w);
      const y = between(rand, -h, h);
      const rx = between(rand, 0.12, 0.32);
      const ry = rx * between(rand, 0.45, 0.65);
      ctx.fillStyle = "#1d3b44";
      ctx.beginPath();
      ctx.ellipse(x, y, rx * 1.08, ry * 1.1, 0, 0, Math.PI * 2);
      ctx.fill();
      const water = ctx.createLinearGradient(x, y - ry, x, y + ry);
      water.addColorStop(0, "#1e5866");
      water.addColorStop(1, "#103038");
      ctx.fillStyle = water;
      ctx.beginPath();
      ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(186,230,253,0.35)";
      ctx.lineWidth = 0.004;
      for (let k = 0; k < 3; k++) {
        ctx.beginPath();
        ctx.ellipse(x + between(rand, -rx * 0.4, rx * 0.4), y + between(rand, -ry * 0.4, ry * 0.4), rx * 0.25, ry * 0.08, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      // Tavirózsák
      for (let k = 0; k < 2 + Math.floor(rand() * 3); k++) {
        const lx = x + between(rand, -rx * 0.6, rx * 0.6);
        const ly = y + between(rand, -ry * 0.6, ry * 0.6);
        const lr = between(rand, 0.018, 0.03);
        const notch = rand() * Math.PI * 2;
        ctx.fillStyle = "#3f7f3a";
        ctx.beginPath();
        ctx.moveTo(lx, ly);
        ctx.arc(lx, ly, lr, notch + 0.35, notch + Math.PI * 2 - 0.35);
        ctx.closePath();
        ctx.fill();
        if (rand() < 0.35) {
          ctx.fillStyle = "#f9a8d4";
          ctx.beginPath();
          ctx.arc(lx, ly, lr * 0.35, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
    // Nádcsomók
    ctx.lineCap = "round";
    for (let i = 0; i < w * h * 4 * 22; i++) {
      const x = between(rand, -w, w);
      const y = between(rand, -h, h);
      for (let k = 0; k < 4; k++) {
        const lean = (k - 1.5) * 0.008 + between(rand, -0.004, 0.004);
        const hh = between(rand, 0.04, 0.07);
        ctx.strokeStyle = k % 2 ? "#4d7c3a" : "#6b8f3a";
        ctx.lineWidth = 0.004;
        ctx.beginPath();
        ctx.moveTo(x + k * 0.004, y);
        ctx.quadraticCurveTo(x + k * 0.004 + lean, y - hh * 0.6, x + k * 0.004 + lean * 2, y - hh);
        ctx.stroke();
      }
      if (rand() < 0.4) {
        ctx.fillStyle = "#5b3a1e";
        ctx.beginPath();
        ctx.ellipse(x + 0.006, y - 0.065, 0.004, 0.012, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  },
  border(ctx, w, h, rand) {
    // Sűrű, sötét nádas és bokrok
    const clumps = edgePoints(w + 0.06, h + 0.06, 0.1, rand);
    for (const p of clumps) {
      const r = between(rand, 0.09, 0.15);
      ctx.fillStyle = "rgba(0,0,0,0.3)";
      ctx.beginPath();
      ctx.arc(p.x + 0.02, p.y + 0.04, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#1c3326";
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#3d6b3a";
      ctx.lineWidth = 0.006;
      for (let k = 0; k < 6; k++) {
        const a = -Math.PI / 2 + between(rand, -0.8, 0.8);
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x + Math.cos(a) * r * 1.3, p.y + Math.sin(a) * r * 1.3);
        ctx.stroke();
      }
    }
  },
};

// ---------------------------------------------------------------- barlang

const cave: Painter = {
  ground(ctx, w, h, rand) {
    ctx.fillStyle = "#2a2833";
    ctx.fillRect(-w, -h, w * 2, h * 2);
    patches(ctx, w, h, rand, Math.round(w * h * 14), ["rgba(70,64,90,0.35)", "rgba(10,10,15,0.4)"], [0.15, 0.5]);
    // Kőlapok: halvány szabálytalan sokszögek
    for (let i = 0; i < w * h * 4 * 10; i++) {
      const x = between(rand, -w, w);
      const y = between(rand, -h, h);
      const r = between(rand, 0.06, 0.13);
      ctx.fillStyle = rand() < 0.5 ? "rgba(60,58,75,0.6)" : "rgba(40,38,50,0.6)";
      ctx.beginPath();
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * Math.PI * 2 + rand() * 0.4;
        const rr = r * between(rand, 0.7, 1);
        ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.65);
      }
      ctx.closePath();
      ctx.fill();
    }
    // Repedések
    ctx.strokeStyle = "rgba(10,8,15,0.8)";
    ctx.lineWidth = 0.005;
    for (let i = 0; i < w * h * 8; i++) {
      let x = between(rand, -w, w);
      let y = between(rand, -h, h);
      let a = rand() * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(x, y);
      for (let k = 0; k < 5; k++) {
        a += (rand() - 0.5) * 1.2;
        x += Math.cos(a) * 0.04;
        y += Math.sin(a) * 0.04;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    // Kavicsok
    for (let i = 0; i < w * h * 4 * 30; i++) {
      ctx.fillStyle = rand() < 0.5 ? "#4b4760" : "#36334a";
      ctx.beginPath();
      ctx.ellipse(between(rand, -w, w), between(rand, -h, h), between(rand, 0.005, 0.012), 0.005, rand(), 0, Math.PI * 2);
      ctx.fill();
    }
    // Világító kristálycsoportok
    for (let c = 0; c < w * h * 4 * 2.5; c++) {
      const cx = between(rand, -w, w);
      const cy = between(rand, -h, h);
      const color = ["#a78bfa", "#67e8f9", "#f0abfc"][Math.floor(rand() * 3)];
      const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, 0.2);
      glow.addColorStop(0, hexToRgba(color, 0.35));
      glow.addColorStop(1, hexToRgba(color, 0));
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(cx, cy, 0.2, 0, Math.PI * 2);
      ctx.fill();
      for (let i = 0; i < 3 + Math.floor(rand() * 3); i++) {
        const x = cx + between(rand, -0.035, 0.035);
        const y = cy + between(rand, -0.02, 0.02);
        const hh = between(rand, 0.04, 0.08);
        const ww = hh * 0.3;
        const lean = between(rand, -0.3, 0.3);
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(lean);
        ctx.fillStyle = hexToRgba(color, 0.95);
        ctx.beginPath();
        ctx.moveTo(-ww, 0);
        ctx.lineTo(-ww * 0.6, -hh * 0.8);
        ctx.lineTo(0, -hh);
        ctx.lineTo(ww * 0.6, -hh * 0.8);
        ctx.lineTo(ww, 0);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,0.45)";
        ctx.beginPath();
        ctx.moveTo(-ww * 0.6, -hh * 0.8);
        ctx.lineTo(0, -hh);
        ctx.lineTo(-ww * 0.1, 0);
        ctx.lineTo(-ww, 0);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
    }
  },
  border(ctx, w, h, rand) {
    // Sziklafal: egymásra torlódó, árnyalt kőtömbök
    const rocks = edgePoints(w + 0.08, h + 0.08, 0.13, rand).map((p) => ({ ...p, r: between(rand, 0.12, 0.2) }));
    for (const [color, s, dx, dy] of [
      ["#14121c", 1, 0.02, 0.04],
      ["#2b2838", 1, 0, 0],
      ["#3d3950", 0.7, -0.02, -0.03],
    ] as const) {
      ctx.fillStyle = color;
      for (const r of rocks) {
        ctx.beginPath();
        for (let k = 0; k < 7; k++) {
          const a = (k / 7) * Math.PI * 2;
          const rr = r.r * s * (0.85 + ((k * 7 + Math.round(r.x * 100)) % 4) * 0.06);
          ctx.lineTo(r.x + dx + Math.cos(a) * rr, r.y + dy + Math.sin(a) * rr * 0.8);
        }
        ctx.closePath();
        ctx.fill();
      }
    }
  },
};

// ---------------------------------------------------------------- hamuvidék

const ash: Painter = {
  ground(ctx, w, h, rand) {
    ctx.fillStyle = "#2a1f1c";
    ctx.fillRect(-w, -h, w * 2, h * 2);
    patches(ctx, w, h, rand, Math.round(w * h * 14), ["rgba(70,50,45,0.4)", "rgba(10,6,5,0.45)", "rgba(120,60,30,0.15)"], [0.15, 0.5]);
    // Bazaltlapok
    for (let i = 0; i < w * h * 4 * 8; i++) {
      const x = between(rand, -w, w);
      const y = between(rand, -h, h);
      const r = between(rand, 0.06, 0.12);
      ctx.fillStyle = rand() < 0.5 ? "rgba(35,28,26,0.7)" : "rgba(55,42,38,0.6)";
      ctx.beginPath();
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * Math.PI * 2;
        ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r * 0.62);
      }
      ctx.closePath();
      ctx.fill();
    }
    // Izzó lávarepedések: sötét mélyedés, benne fénylő láva
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (let i = 0; i < w * h * 4 * 1.6; i++) {
      let x = between(rand, -w, w);
      let y = between(rand, -h, h);
      let a = rand() * Math.PI * 2;
      const pts: [number, number][] = [[x, y]];
      for (let k = 0; k < 7; k++) {
        a += (rand() - 0.5) * 1.1;
        x += Math.cos(a) * 0.06;
        y += Math.sin(a) * 0.06;
        pts.push([x, y]);
      }
      for (const [color, width] of [
        ["rgba(249,115,22,0.25)", 0.05],
        ["#1a0d08", 0.022],
        ["#f97316", 0.01],
        ["#fde047", 0.004],
      ] as const) {
        ctx.strokeStyle = color;
        ctx.lineWidth = width;
        ctx.beginPath();
        pts.forEach(([px, py], k) => (k === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py)));
        ctx.stroke();
      }
    }
    // Hamupettyek és parázs
    for (let i = 0; i < w * h * 4 * 60; i++) {
      const ember = rand() < 0.15;
      ctx.fillStyle = ember ? "#fb923c" : "rgba(160,150,145,0.35)";
      ctx.beginPath();
      ctx.arc(between(rand, -w, w), between(rand, -h, h), ember ? 0.004 : between(rand, 0.003, 0.008), 0, Math.PI * 2);
      ctx.fill();
    }
  },
  border(ctx, w, h, rand) {
    // Éles bazaltszirtek izzó élekkel
    const rocks = edgePoints(w + 0.08, h + 0.08, 0.12, rand).map((p) => ({ ...p, r: between(rand, 0.11, 0.19) }));
    for (const r of rocks) {
      ctx.fillStyle = "rgba(0,0,0,0.4)";
      ctx.beginPath();
      ctx.ellipse(r.x + 0.02, r.y + 0.04, r.r, r.r * 0.6, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    for (const r of rocks) {
      ctx.fillStyle = "#1c1412";
      ctx.beginPath();
      ctx.moveTo(r.x - r.r, r.y + r.r * 0.4);
      ctx.lineTo(r.x - r.r * 0.4, r.y - r.r * 0.9);
      ctx.lineTo(r.x + r.r * 0.1, r.y - r.r * 0.5);
      ctx.lineTo(r.x + r.r * 0.5, r.y - r.r * 1.1);
      ctx.lineTo(r.x + r.r, r.y + r.r * 0.4);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "rgba(249,115,22,0.55)";
      ctx.lineWidth = 0.006;
      ctx.beginPath();
      ctx.moveTo(r.x - r.r * 0.4, r.y - r.r * 0.9);
      ctx.lineTo(r.x + r.r * 0.1, r.y - r.r * 0.5);
      ctx.lineTo(r.x + r.r * 0.5, r.y - r.r * 1.1);
      ctx.stroke();
    }
  },
};

const PAINTERS: Record<string, Painter> = { forest, swamp, cave, ash };

function hexToRgba(hex: string, alpha: number) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}

/** Determinisztikus véletlen (mulberry32), hogy a talaj mindig ugyanúgy nézzen ki */
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
