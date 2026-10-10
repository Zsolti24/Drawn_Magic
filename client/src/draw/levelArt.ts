// A pályaválasztó képeslapjai: minden pálya saját kis jelenetet kap a téma
// hangulatával (ég, látóhatár), egy a pálya nevéhez illő tereptárggyal és a
// pálya szörnyeivel az előtérben. Képpont-koordinátában rajzol (w × h).
import type { Enemy } from "../game/Game";
import { ENEMY_BY_ID } from "../data/enemies";
import { drawEnemySprite, hasSprite, SPRITE_TOP } from "./enemies";
import { getTerrain } from "./terrain";

export interface LevelArtInput {
  theme: string;
  /** A pálya sorszáma a témán belül (0..4) */
  index: number;
  /** A szörnyek színe a témában (a saját rajz nélküli szörnyekhez) */
  tint: [string, string];
  /** Az előtérben álló szörnyek; az újonnan érkező faj nagyobb */
  monsters: { type: string; isNew: boolean }[];
  /** Lezárt pálya: a szörnyek csak sziluettek */
  locked: boolean;
}

type Ctx = CanvasRenderingContext2D;

export function drawLevelArt(ctx: Ctx, w: number, h: number, input: LevelArtInput) {
  const { theme, index } = input;
  const horizon = h * 0.46;
  const rand = seeded(theme.length * 131 + index * 17 + 7);

  ctx.save();
  // Talaj: a téma terepe, a látóhatár felé ködbe vész
  const ground = getTerrain(theme, 2.8, 1.8, 240);
  const sw = ground.width * 0.34;
  const sh = (sw * (h - horizon)) / w;
  ctx.drawImage(ground, ground.width * (0.14 + index * 0.12), ground.height * (0.3 + (index % 2) * 0.12), sw, sh, 0, horizon, w, h - horizon);

  const scene = SCENES[theme] ?? SCENES.meadow;
  scene.sky(ctx, w, horizon, index, rand);
  scene.horizon(ctx, w, horizon, index, rand);
  const haze = ctx.createLinearGradient(0, horizon - 2, 0, horizon + h * 0.16);
  haze.addColorStop(0, scene.haze);
  haze.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = haze;
  ctx.fillRect(0, horizon - 2, w, h * 0.16 + 2);

  scene.ground(ctx, w, h, horizon, index, rand);
  scene.landmarks[index]?.(ctx, w, h, horizon, rand);
  drawMonsters(ctx, w, h, input);
  scene.foreground(ctx, w, h, horizon, index, rand);

  // Sarkok sötétedése és alul sötétedés a pályajel alá
  const vignette = ctx.createRadialGradient(w / 2, h * 0.45, h * 0.35, w / 2, h * 0.45, Math.hypot(w, h) * 0.6);
  vignette.addColorStop(0, "rgba(0,0,0,0)");
  vignette.addColorStop(1, "rgba(0,0,0,0.42)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, w, h);
  const shade = ctx.createLinearGradient(0, h * 0.62, 0, h);
  shade.addColorStop(0, "rgba(0,0,0,0)");
  shade.addColorStop(1, "rgba(0,0,0,0.45)");
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

/** Távlatos szórás a talajon: a látóhatár felé ritkább és kisebb (s: 0..1 méretarány) */
function scatter(
  w: number,
  h: number,
  hz: number,
  count: number,
  rand: () => number,
  draw: (x: number, y: number, s: number) => void,
) {
  const spots = Array.from({ length: count }, () => {
    const t = Math.pow(rand(), 0.8);
    return { x: rand() * w, y: hz + (h - hz) * t, s: 0.25 + 0.75 * t };
  });
  spots.sort((a, b) => a.y - b.y);
  for (const p of spots) draw(p.x, p.y, p.s);
}

// ================================================================ szörnyek

function drawMonsters(ctx: Ctx, w: number, h: number, input: LevelArtInput) {
  // Az új faj elöl, középen jobbra; a többiek mögötte
  const list = [...input.monsters].sort((a, b) => Number(a.isNew) - Number(b.isNew));
  const spots = [
    { x: 0.9, y: 0.8, s: 0.85 },
    { x: 0.6, y: 0.83, s: 0.9 },
    { x: 0.75, y: 0.93, s: 1 },
  ];
  const base = h * 0.1;
  let next = 0;
  list.slice(-3).forEach((m, _i, arr) => {
    // A kiemelt új faj mindig elöl áll, a többiek a hátsó helyeket töltik ki
    const spot = m.isNew ? spots[2] : spots[next++];
    const top = (SPRITE_TOP[m.type] ?? 2.2) + 0.2;
    // A nagy fajok (pl. főellenség) se lógjanak ki a képből
    const r = Math.min(base * spot.s * (m.isNew ? 1.4 : 1), (h * (spot.y - 0.08)) / top);
    ctx.save();
    if (input.locked) ctx.filter = "brightness(0) opacity(0.85)";
    if (m.isNew && !input.locked) {
      // Az új faj mögött izzás, hogy kiemelkedjen
      const g = ctx.createRadialGradient(w * spot.x, h * spot.y - r, 0, w * spot.x, h * spot.y - r, r * 2.6);
      g.addColorStop(0, "rgba(255,240,200,0.35)");
      g.addColorStop(1, "rgba(255,240,200,0)");
      ctx.fillStyle = g;
      ctx.fillRect(w * spot.x - r * 3, h * spot.y - r * 4, r * 6, r * 6);
    }
    drawMonster(ctx, m.type, w * spot.x, h * spot.y, r, input.tint, arr.length > 1 && !m.isNew ? 1 : -1);
    ctx.restore();
  });
}

function drawMonster(ctx: Ctx, type: string, x: number, y: number, r: number, tint: [string, string], facing: 1 | -1) {
  if (!hasSprite(type)) {
    // Saját rajz nélküli szörny: kerek test, sárga szemek
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.beginPath();
    ctx.ellipse(x, y, r * 1.1, r * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = tint[0];
    ctx.strokeStyle = tint[1];
    ctx.lineWidth = r * 0.12;
    ctx.beginPath();
    ctx.arc(x, y - r * 1.1, r * 1.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#ffe08a";
    ctx.beginPath();
    ctx.arc(x - r * 0.38, y - r * 1.2, r * 0.18, 0, Math.PI * 2);
    ctx.arc(x + r * 0.38, y - r * 1.2, r * 0.18, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  const def = ENEMY_BY_ID.get(type);
  const flying = def?.behavior === "fly" || def?.behavior === "swoop";
  const fake = {
    type,
    behavior: def?.behavior ?? "walk",
    mode: def?.behavior === "swoop" ? "circle" : "walk",
    timer: 1,
    walk: 1.2,
    height: flying ? r * 1.6 : 0,
    facing,
    phase: 0.5,
    spin: 0,
    hitFlash: 0,
    attackAnim: 0,
    burrowed: false,
  } as unknown as Enemy;
  drawEnemySprite(ctx, fake, x, y, r, 0.3, 0);
}

// ================================================================ jelenetek

interface Scene {
  sky: (ctx: Ctx, w: number, horizon: number, index: number, rand: () => number) => void;
  horizon: (ctx: Ctx, w: number, horizon: number, index: number, rand: () => number) => void;
  /** A látóhatárnál a talaj fölötti köd színe */
  haze: string;
  /** A talaj apró részletei távlatban (fű, kövek, avar …) */
  ground: (ctx: Ctx, w: number, h: number, horizon: number, index: number, rand: () => number) => void;
  /** Pályánként egy tereptárgy (a pálya nevéhez illően) */
  landmarks: ((ctx: Ctx, w: number, h: number, horizon: number, rand: () => number) => void)[];
  /** A képet keretező előtér a szörnyek előtt (fűszálak, páfrány, nád …) */
  foreground: (ctx: Ctx, w: number, h: number, horizon: number, index: number, rand: () => number) => void;
}

const SCENES: Record<string, Scene> = {
  // ------------------------------------------------------------ Virágos rét
  meadow: {
    haze: "rgba(225,240,220,0.55)",
    sky(ctx, w, hz, index, rand) {
      // A pályákon előre haladva a nap lemegy: reggel → vérvörös alkony
      const skies = [
        ["#4fa8f0", "#d6f0fd"],
        ["#5aa9e6", "#fde2b8"],
        ["#6cb4ee", "#e0f2fe"],
        ["#e7894a", "#fde68a"],
        ["#2a0b25", "#e8571c"],
      ];
      const [top, bottom] = skies[index];
      skyGradient(ctx, w, hz, top, bottom);
      const sunY = hz * (0.3 + index * 0.13);
      const sunColor = index === 4 ? "#ff6b3d" : index === 3 ? "#fdba74" : "#fff7c2";
      sunRays(ctx, w * 0.8, sunY, hz * 1.6, sunColor, rand);
      sun(ctx, w * 0.8, sunY, hz * 0.14, sunColor);
      const [cloudColor, cloudShadow] = index === 4 ? ["rgba(60,15,40,0.85)", "rgba(25,5,20,0.9)"] : index === 3 ? ["#fff1dc", "#e9a87a"] : ["#ffffff", "#c9d8ea"];
      for (let i = 0; i < 3 + (index === 2 ? 3 : 0); i++) cloud(ctx, rand() * w, hz * (0.15 + rand() * 0.4), hz * (0.1 + rand() * 0.08), cloudColor, cloudShadow);
      // Madárcsapat a távolban (az alkonyi pályán varjak)
      birds(ctx, w * (0.3 + rand() * 0.2), hz * (0.25 + rand() * 0.2), hz * 0.04, index === 4 ? "#120508" : "rgba(40,50,70,0.7)", 3 + Math.floor(rand() * 3), rand);
    },
    horizon(ctx, w, hz, index) {
      // Távoli kékes hegyek, előttük a dombok
      hills(ctx, w, hz, hz * 0.42, index === 4 ? "#3a1a2c" : mix("#9db8d6", "#c99c8a", index / 4), 1.3, 2.2);
      hills(ctx, w, hz, hz * 0.22, index === 4 ? "#2f3d1f" : "#6aa84f", 2.1, 0.3);
      hills(ctx, w, hz, hz * 0.12, index === 4 ? "#1f2a15" : "#4b8a35", 3.3, 1.7);
    },
    ground(ctx, w, h, hz, index, rand) {
      // Kaszált sávok, fűcsomók és apró virágok távlatban
      scatter(w, h, hz, 70, rand, (x, y, s) => {
        if (rand() < 0.35) flower(ctx, x, y, h * 0.008 * s, ["#f472b6", "#fde047", "#ffffff", "#c084fc"][Math.floor(rand() * 4)]);
        else grassTuft(ctx, x, y, h * 0.035 * s, index === 4 ? "#2c4a1c" : "#3e7a2a", index === 4 ? "#4a6b2a" : "#7cc35a");
      });
    },
    foreground(ctx, w, h, _hz, index, rand) {
      grassFringe(ctx, w, h, h * 0.13, index === 4 ? "#16240f" : "#2d5a1f", index === 4 ? "#2f4a1c" : "#5fa843", rand);
      // Magas virágok az alsó sarkokban
      for (const x of [0.03, 0.07, 0.95]) tallFlower(ctx, w * x, h, h * (0.22 + rand() * 0.08), index === 4 ? "#7f1d1d" : ["#f472b6", "#fde047", "#c084fc"][Math.floor(rand() * 3)]);
      // Pillangók napos időben
      if (index < 3) for (let i = 0; i < 2; i++) butterfly(ctx, w * (0.42 + rand() * 0.2), h * (0.55 + rand() * 0.15), h * 0.018, i ? "#fde047" : "#f9a8d4");
    },
    landmarks: [
      // Napfényes tisztás: nagy, terebélyes fa virágokkal
      (ctx, w, h, hz) => {
        const x = w * 0.27;
        const y = hz + h * 0.2;
        ctx.fillStyle = "rgba(0,0,0,0.25)";
        ctx.beginPath();
        ctx.ellipse(x, y, h * 0.2, h * 0.04, 0, 0, Math.PI * 2);
        ctx.fill();
        // Törzs gyökerekkel, árnyalt kéreggel
        const bark = ctx.createLinearGradient(x - h * 0.03, 0, x + h * 0.03, 0);
        bark.addColorStop(0, "#4a2c18");
        bark.addColorStop(0.6, "#7a4c2c");
        bark.addColorStop(1, "#5a3620");
        ctx.fillStyle = bark;
        ctx.beginPath();
        ctx.moveTo(x - h * 0.06, y);
        ctx.quadraticCurveTo(x - h * 0.025, y - h * 0.03, x - h * 0.022, y - h * 0.26);
        ctx.lineTo(x + h * 0.022, y - h * 0.26);
        ctx.quadraticCurveTo(x + h * 0.025, y - h * 0.03, x + h * 0.065, y);
        ctx.closePath();
        ctx.fill();
        // Lomb: sötét alsó réteg, középső tömeg, világos napsütötte foltok fent
        const crown: [number, number, number][] = [
          [-0.11, -0.29, 0.11],
          [0.11, -0.3, 0.11],
          [0, -0.27, 0.1],
          [-0.06, -0.4, 0.12],
          [0.07, -0.41, 0.12],
          [0, -0.48, 0.1],
        ];
        for (const [color, shift, scale] of [
          ["#2c5e20", 0.02, 1],
          ["#45922f", 0, 0.88],
          ["#6cbf4a", -0.025, 0.5],
        ] as const) {
          ctx.fillStyle = color;
          ctx.beginPath();
          for (const [dx, dy, r] of crown) {
            ctx.moveTo(x + (dx - 0.01) * h + r * h * scale, y + (dy + shift) * h);
            ctx.arc(x + (dx - (scale < 1 ? 0.02 : 0)) * h, y + (dy + shift) * h, r * h * scale, 0, Math.PI * 2);
          }
          ctx.fill();
        }
        // Piros almák a lombban
        for (const [dx, dy] of [
          [-0.08, -0.33],
          [0.06, -0.36],
          [0.12, -0.28],
          [-0.02, -0.44],
        ]) {
          ctx.fillStyle = "#dc2626";
          ctx.beginPath();
          ctx.arc(x + dx * h, y + dy * h, h * 0.013, 0, Math.PI * 2);
          ctx.fill();
        }
        for (let i = 0; i < 9; i++) flower(ctx, x + (i - 4) * h * 0.05, y + h * 0.015 * ((i * 7) % 3), h * 0.013, ["#f472b6", "#fde047", "#ffffff"][i % 3]);
      },
      // Pipacsos domb: piros pipacsokkal borított domb
      (ctx, w, h, hz, rand) => {
        ctx.fillStyle = "#5d9a3c";
        ctx.beginPath();
        ctx.ellipse(w * 0.3, hz + h * 0.12, w * 0.32, h * 0.13, 0, Math.PI, 0);
        ctx.fill();
        for (let i = 0; i < 40; i++) {
          const a = Math.PI + rand() * Math.PI;
          const d = Math.sqrt(rand());
          flower(ctx, w * 0.3 + Math.cos(a) * w * 0.3 * d, hz + h * 0.12 + Math.sin(a) * h * 0.12 * d, h * (0.008 + rand() * 0.008), "#ef4444");
        }
      },
      // Szélfútta mező: szélmalom és szélcsíkok
      (ctx, w, h, hz) => {
        const x = w * 0.26;
        const base = hz + h * 0.1;
        ctx.fillStyle = "#e7d8b8";
        ctx.beginPath();
        ctx.moveTo(x - h * 0.06, base);
        ctx.lineTo(x - h * 0.035, base - h * 0.3);
        ctx.lineTo(x + h * 0.035, base - h * 0.3);
        ctx.lineTo(x + h * 0.06, base);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "#9a3412";
        ctx.beginPath();
        ctx.moveTo(x - h * 0.05, base - h * 0.3);
        ctx.lineTo(x, base - h * 0.37);
        ctx.lineTo(x + h * 0.05, base - h * 0.3);
        ctx.fill();
        ctx.save();
        ctx.translate(x, base - h * 0.3);
        ctx.rotate(0.35);
        ctx.fillStyle = "#f5f5f4";
        ctx.strokeStyle = "#78350f";
        ctx.lineWidth = h * 0.006;
        for (let i = 0; i < 4; i++) {
          ctx.rotate(Math.PI / 2);
          ctx.fillRect(-h * 0.015, -h * 0.2, h * 0.03, h * 0.18);
          ctx.strokeRect(-h * 0.015, -h * 0.2, h * 0.03, h * 0.18);
        }
        ctx.restore();
        ctx.strokeStyle = "rgba(255,255,255,0.7)";
        ctx.lineWidth = h * 0.008;
        ctx.lineCap = "round";
        for (let i = 0; i < 4; i++) {
          const y = hz - h * (0.05 + i * 0.07);
          ctx.beginPath();
          ctx.moveTo(w * (0.45 + i * 0.08), y);
          ctx.bezierCurveTo(w * (0.55 + i * 0.08), y - h * 0.03, w * (0.62 + i * 0.08), y + h * 0.03, w * (0.7 + i * 0.08), y);
          ctx.stroke();
        }
      },
      // Darázsfészek: kiszáradt fa, rajta lógó fészek, körülötte darazsak
      (ctx, w, h, hz, rand) => {
        const x = w * 0.24;
        const y = hz + h * 0.2;
        ctx.strokeStyle = "#4a3222";
        ctx.lineCap = "round";
        ctx.lineWidth = h * 0.04;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + h * 0.02, y - h * 0.38);
        ctx.stroke();
        ctx.lineWidth = h * 0.02;
        ctx.beginPath();
        ctx.moveTo(x + h * 0.015, y - h * 0.3);
        ctx.lineTo(x + h * 0.2, y - h * 0.4);
        ctx.moveTo(x + h * 0.02, y - h * 0.22);
        ctx.lineTo(x - h * 0.13, y - h * 0.33);
        ctx.stroke();
        const nx = x + h * 0.16;
        const ny = y - h * 0.27;
        ctx.strokeStyle = "#4a3222";
        ctx.lineWidth = h * 0.006;
        ctx.beginPath();
        ctx.moveTo(nx, y - h * 0.38);
        ctx.lineTo(nx, ny - h * 0.07);
        ctx.stroke();
        ctx.fillStyle = "#c9a66b";
        ctx.beginPath();
        ctx.ellipse(nx, ny, h * 0.06, h * 0.085, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#8a6a3a";
        ctx.lineWidth = h * 0.006;
        for (let i = -2; i <= 2; i++) {
          ctx.beginPath();
          ctx.ellipse(nx, ny + i * h * 0.03, h * 0.06 * Math.sqrt(1 - (i / 3) ** 2), h * 0.008, 0, 0, Math.PI);
          ctx.stroke();
        }
        ctx.fillStyle = "#2a1a0e";
        ctx.beginPath();
        ctx.arc(nx, ny + h * 0.06, h * 0.012, 0, Math.PI * 2);
        ctx.fill();
        for (let i = 0; i < 9; i++) {
          const a = rand() * Math.PI * 2;
          const d = h * (0.08 + rand() * 0.1);
          ctx.fillStyle = i % 2 ? "#facc15" : "#1c1917";
          ctx.beginPath();
          ctx.arc(nx + Math.cos(a) * d * 1.4, ny + Math.sin(a) * d, h * 0.008, 0, Math.PI * 2);
          ctx.fill();
        }
      },
      // A Rémmadárijesztő földje: korhadt kerítés, varjak, izzó tökök
      (ctx, w, h, hz) => {
        ctx.strokeStyle = "#3b2a1a";
        ctx.lineWidth = h * 0.012;
        for (let i = 0; i < 5; i++) {
          const x = w * (0.05 + i * 0.09);
          const tilt = ((i * 37) % 5) * 0.01 - 0.02;
          ctx.beginPath();
          ctx.moveTo(x, hz + h * 0.14);
          ctx.lineTo(x + tilt * h * 4, hz - h * 0.02);
          ctx.stroke();
          if (i % 2 === 0) crow(ctx, x + tilt * h * 4, hz - h * 0.02, h * 0.03);
        }
        ctx.lineWidth = h * 0.008;
        ctx.beginPath();
        ctx.moveTo(w * 0.03, hz + h * 0.05);
        ctx.lineTo(w * 0.43, hz + h * 0.04);
        ctx.moveTo(w * 0.03, hz + h * 0.1);
        ctx.lineTo(w * 0.43, hz + h * 0.1);
        ctx.stroke();
        for (const [x, s] of [
          [0.14, 1],
          [0.3, 0.8],
        ]) {
          pumpkin(ctx, w * x, hz + h * 0.27, h * 0.05 * s);
        }
      },
    ],
  },

  // ------------------------------------------------------------ Ködös erdő
  forest: {
    haze: "rgba(200,220,205,0.4)",
    sky(ctx, w, hz, index) {
      const dark = index / 4;
      skyGradient(ctx, w, hz, mix("#2e5a45", "#0b1712", dark), mix("#9cc2a6", "#3b5546", dark));
      if (index >= 3) sun(ctx, w * 0.78, hz * 0.3, hz * 0.1, "#f1f5d0");
    },
    horizon(ctx, w, hz, index, rand) {
      pines(ctx, w, hz, hz * 0.7, mix("#3d6b55", "#1c3328", index / 4), rand, 18);
      fog(ctx, w, hz - hz * 0.2, hz * 0.3, 0.2 + index * 0.05);
      pines(ctx, w, hz, hz * 0.55, mix("#28503a", "#13251b", index / 4), rand, 14);
      pines(ctx, w, hz, hz * 0.4, mix("#1a3a28", "#0a1710", index / 4), rand, 10);
      fog(ctx, w, hz, hz * 0.25, 0.25 + index * 0.06);
      // Ferde fénysávok a lombok közül (a sötétebb pályákon halványabban)
      ctx.save();
      for (let i = 0; i < 4; i++) {
        const x = w * (0.1 + i * 0.22 + rand() * 0.08);
        const g = ctx.createLinearGradient(x, 0, x + w * 0.12, hz * 1.4);
        g.addColorStop(0, `rgba(240,255,220,${0.16 * (1 - index / 5)})`);
        g.addColorStop(1, "rgba(240,255,220,0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x + w * 0.05, 0);
        ctx.lineTo(x + w * 0.2, hz * 1.4);
        ctx.lineTo(x + w * 0.1, hz * 1.4);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    },
    ground(ctx, w, h, hz, index, rand) {
      // Avar és apró páfrányok
      scatter(w, h, hz, 60, rand, (x, y, s) => {
        if (rand() < 0.3) fern(ctx, x, y, h * 0.06 * s, (rand() - 0.5) * 1.4, mix("#2f5a3a", "#1a3324", index / 4));
        else {
          ctx.fillStyle = ["#7c4a1e", "#a16207", "#5b3a1e", "#854d0e"][Math.floor(rand() * 4)];
          ctx.beginPath();
          ctx.ellipse(x, y, h * 0.01 * s, h * 0.005 * s, rand() * Math.PI, 0, Math.PI * 2);
          ctx.fill();
        }
      });
    },
    foreground(ctx, w, h, _hz, index, rand) {
      // Mohás fatörzs a bal szélen, páfrányok az alsó sarkokban
      const trunk = ctx.createLinearGradient(0, 0, w * 0.06, 0);
      trunk.addColorStop(0, "#0d0906");
      trunk.addColorStop(1, mix("#3b2a1c", "#1e150e", index / 4));
      ctx.fillStyle = trunk;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(w * 0.045, 0);
      ctx.quadraticCurveTo(w * 0.035, h * 0.5, w * 0.07, h);
      ctx.lineTo(0, h);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "rgba(101,163,13,0.45)";
      for (let i = 0; i < 6; i++) {
        ctx.beginPath();
        ctx.ellipse(w * 0.035, h * (0.3 + i * 0.11), w * 0.012, h * 0.03, 0.2, 0, Math.PI * 2);
        ctx.fill();
      }
      const leaf = mix("#1f4a2a", "#0f2416", index / 4);
      for (let i = 0; i < 5; i++) fern(ctx, w * (0.02 + rand() * 0.08), h + 2, h * (0.25 + rand() * 0.12), -0.9 + i * 0.35, leaf);
      for (let i = 0; i < 4; i++) fern(ctx, w * (0.94 + rand() * 0.05), h + 2, h * (0.22 + rand() * 0.1), -1.6 + i * 0.3, leaf);
    },
    landmarks: [
      // Erdőszél: útjelző tábla
      (ctx, w, h, hz) => {
        const x = w * 0.25;
        const y = hz + h * 0.24;
        ctx.fillStyle = "#5b3b22";
        ctx.fillRect(x - h * 0.012, y - h * 0.26, h * 0.024, h * 0.26);
        ctx.fillStyle = "#8b5a2b";
        for (const [dy, dir] of [
          [-0.24, 1],
          [-0.16, -1],
        ]) {
          ctx.beginPath();
          const by = y + dy * h;
          ctx.moveTo(x - dir * h * 0.02, by);
          ctx.lineTo(x + dir * h * 0.14, by);
          ctx.lineTo(x + dir * h * 0.17, by + h * 0.03);
          ctx.lineTo(x + dir * h * 0.14, by + h * 0.06);
          ctx.lineTo(x - dir * h * 0.02, by + h * 0.06);
          ctx.closePath();
          ctx.fill();
        }
      },
      // Gombás liget: óriási pöttyös gombák
      (ctx, w, h, hz) => {
        for (const [x, s, c] of [
          [0.18, 1, "#dc2626"],
          [0.33, 0.7, "#f97316"],
          [0.08, 0.55, "#dc2626"],
        ] as const) {
          mushroom(ctx, w * x, hz + h * (0.2 + s * 0.05), h * 0.16 * s, c);
        }
      },
      // Ködös ösvény: a ködbe vesző út lámpásokkal
      (ctx, w, h, hz) => {
        ctx.fillStyle = "rgba(160,130,90,0.55)";
        ctx.beginPath();
        ctx.moveTo(w * 0.45, hz);
        ctx.lineTo(w * 0.5, hz);
        ctx.lineTo(w * 0.62, h);
        ctx.lineTo(w * 0.2, h);
        ctx.closePath();
        ctx.fill();
        for (const [x, y, s] of [
          [0.38, 0.6, 0.6],
          [0.28, 0.75, 0.85],
          [0.16, 0.92, 1.1],
        ]) {
          lantern(ctx, w * x, h * y, h * 0.05 * s);
        }
        fog(ctx, w, hz + h * 0.05, h * 0.12, 0.35);
      },
      // Farkasvölgy: izzó szemek a sötét bokrokban
      (ctx, w, h, hz, rand) => {
        ctx.fillStyle = "#0c1a12";
        for (let i = 0; i < 5; i++) {
          ctx.beginPath();
          ctx.arc(w * (0.05 + i * 0.1), hz + h * 0.1, h * (0.08 + rand() * 0.05), Math.PI, 0);
          ctx.fill();
        }
        for (let i = 0; i < 4; i++) {
          const x = w * (0.08 + i * 0.11);
          const y = hz + h * (0.05 + (i % 2) * 0.03);
          glowDot(ctx, x, y, h * 0.012, "#fde047");
          glowDot(ctx, x + h * 0.035, y, h * 0.012, "#fde047");
        }
      },
      // Öreg Fapásztor tisztása: hatalmas, göcsörtös fa arccal
      (ctx, w, h, hz) => {
        const x = w * 0.25;
        const y = hz + h * 0.26;
        ctx.fillStyle = "#3b2a1c";
        ctx.beginPath();
        ctx.moveTo(x - h * 0.16, y);
        ctx.quadraticCurveTo(x - h * 0.08, y - h * 0.15, x - h * 0.09, y - h * 0.45);
        ctx.lineTo(x + h * 0.09, y - h * 0.45);
        ctx.quadraticCurveTo(x + h * 0.08, y - h * 0.15, x + h * 0.16, y);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "#1e3a24";
        for (const [dx, dy, r] of [
          [-0.14, -0.5, 0.13],
          [0.14, -0.52, 0.13],
          [0, -0.6, 0.15],
        ]) {
          ctx.beginPath();
          ctx.arc(x + dx * h, y + dy * h, r * h, 0, Math.PI * 2);
          ctx.fill();
        }
        glowDot(ctx, x - h * 0.035, y - h * 0.3, h * 0.016, "#a3e635");
        glowDot(ctx, x + h * 0.035, y - h * 0.3, h * 0.016, "#a3e635");
        ctx.strokeStyle = "#160e08";
        ctx.lineWidth = h * 0.01;
        ctx.beginPath();
        ctx.arc(x, y - h * 0.2, h * 0.04, 0.2, Math.PI - 0.2);
        ctx.stroke();
      },
    ],
  },

  // ------------------------------------------------------------ Holdfényes mocsár
  swamp: {
    haze: "rgba(120,170,190,0.35)",
    sky(ctx, w, hz, index, rand) {
      skyGradient(ctx, w, hz, "#070d24", mix("#1e3a5f", "#2a1f4a", index / 4));
      for (let i = 0; i < 30; i++) {
        ctx.fillStyle = `rgba(255,255,255,${0.3 + rand() * 0.6})`;
        ctx.fillRect(rand() * w, rand() * hz * 0.8, 1.2, 1.2);
      }
      sun(ctx, w * 0.78, hz * 0.32, hz * 0.13, "#fef3c7");
      // Holdkráterek és vékony felhőcsík a hold előtt
      ctx.fillStyle = "rgba(180,170,140,0.35)";
      for (const [dx, dy, r] of [
        [-0.04, -0.03, 0.03],
        [0.04, 0.02, 0.022],
        [0.0, 0.05, 0.015],
      ]) {
        ctx.beginPath();
        ctx.arc(w * 0.78 + dx * hz * 1.4, hz * 0.32 + dy * hz * 1.4, r * hz * 1.4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = "rgba(30,40,80,0.55)";
      ctx.beginPath();
      ctx.ellipse(w * 0.74, hz * 0.37, hz * 0.3, hz * 0.025, 0, 0, Math.PI * 2);
      ctx.fill();
    },
    horizon(ctx, w, hz, _index, rand) {
      pines(ctx, w, hz, hz * 0.32, "#0b1a22", rand, 9);
      // Kiszáradt fa csüngő mohával
      deadTree(ctx, w * 0.6, hz + 1, hz * 0.55);
      ctx.strokeStyle = "rgba(60,90,70,0.7)";
      ctx.lineWidth = 1;
      for (let i = 0; i < 6; i++) {
        const x = w * 0.6 + (i - 3) * hz * 0.04;
        ctx.beginPath();
        ctx.moveTo(x, hz - hz * (0.35 + (i % 3) * 0.05));
        ctx.lineTo(x + 1, hz - hz * (0.18 + (i % 2) * 0.05));
        ctx.stroke();
      }
      reeds(ctx, w, hz, hz * 0.18, "#0e2228", rand);
      fog(ctx, w, hz + 2, hz * 0.18, 0.18);
    },
    ground(ctx, w, h, hz, _index, rand) {
      // Víztükör-csíkok és a hold csillogó visszfénye
      ctx.fillStyle = "rgba(20,45,75,0.55)";
      for (let i = 0; i < 6; i++) {
        const y = hz + (h - hz) * (0.08 + i * 0.13);
        ctx.beginPath();
        ctx.ellipse(w * (0.2 + rand() * 0.6), y, w * (0.12 + rand() * 0.2), (h - hz) * 0.035 * (1 + i * 0.3), 0, 0, Math.PI * 2);
        ctx.fill();
      }
      for (let i = 0; i < 14; i++) {
        const t = i / 14;
        const y = hz + (h - hz) * t * 0.8;
        const len = w * (0.01 + t * 0.04) * (0.5 + rand());
        ctx.fillStyle = `rgba(254,243,199,${0.55 * (1 - t)})`;
        ctx.fillRect(w * 0.78 - len / 2 + (rand() - 0.5) * w * 0.03, y, len, Math.max(1, (h - hz) * 0.008));
      }
      scatter(w, h, hz, 18, rand, (x, y, s) => {
        ctx.fillStyle = "#2f6b3a";
        ctx.beginPath();
        ctx.ellipse(x, y, h * 0.022 * s, h * 0.008 * s, 0, 0.3, Math.PI * 2 - 0.3);
        ctx.lineTo(x, y);
        ctx.fill();
      });
    },
    foreground(ctx, w, h, _hz, _index, rand) {
      for (let i = 0; i < 7; i++) cattail(ctx, w * (0.01 + rand() * 0.1), h + 2, h * (0.3 + rand() * 0.2), (rand() - 0.3) * h * 0.06);
      for (let i = 0; i < 4; i++) cattail(ctx, w * (0.93 + rand() * 0.06), h + 2, h * (0.25 + rand() * 0.15), (rand() - 0.7) * h * 0.06);
      reeds(ctx, w * 0.14, h + 2, h * 0.2, "#0f2a20", rand);
      for (let i = 0; i < 8; i++) glowDot(ctx, w * (0.35 + rand() * 0.6), h * (0.5 + rand() * 0.4), h * 0.006, "#d9f99d");
    },
    landmarks: [
      // Nádas part: kikötött csónak
      (ctx, w, h, hz) => {
        const x = w * 0.25;
        const y = hz + h * 0.2;
        ctx.fillStyle = "#5b3b22";
        ctx.beginPath();
        ctx.moveTo(x - h * 0.15, y - h * 0.04);
        ctx.lineTo(x + h * 0.15, y - h * 0.04);
        ctx.quadraticCurveTo(x + h * 0.1, y + h * 0.04, x, y + h * 0.04);
        ctx.quadraticCurveTo(x - h * 0.1, y + h * 0.04, x - h * 0.15, y - h * 0.04);
        ctx.fill();
        ctx.strokeStyle = "#7c5a3a";
        ctx.lineWidth = h * 0.008;
        ctx.beginPath();
        ctx.moveTo(x + h * 0.05, y - h * 0.03);
        ctx.lineTo(x + h * 0.2, y - h * 0.16);
        ctx.stroke();
        reeds(ctx, w * 0.45, hz + h * 0.22, h * 0.14, "#173a2c", seeded(5));
      },
      // Tavirózsás tó: tavirózsalevelek és virágok a vízen
      (ctx, w, h, hz) => {
        ctx.fillStyle = "rgba(30,60,90,0.75)";
        ctx.beginPath();
        ctx.ellipse(w * 0.3, hz + h * 0.2, w * 0.27, h * 0.1, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "rgba(254,243,199,0.25)";
        ctx.beginPath();
        ctx.ellipse(w * 0.36, hz + h * 0.2, w * 0.06, h * 0.012, 0, 0, Math.PI * 2);
        ctx.fill();
        for (const [x, y, s] of [
          [0.15, 0.2, 1],
          [0.3, 0.25, 1.2],
          [0.42, 0.17, 0.8],
          [0.22, 0.14, 0.7],
        ]) {
          ctx.fillStyle = "#2f7a3e";
          ctx.beginPath();
          ctx.ellipse(w * x, hz + h * y, h * 0.04 * s, h * 0.015 * s, 0, 0.3, Math.PI * 2 - 0.3);
          ctx.lineTo(w * x, hz + h * y);
          ctx.fill();
          flower(ctx, w * x, hz + h * y - h * 0.008, h * 0.014 * s, "#f9a8d4");
        }
      },
      // Lidércláp: lebegő lidércfények
      (ctx, w, h, hz, rand) => {
        for (let i = 0; i < 9; i++) {
          glowDot(ctx, w * (0.05 + rand() * 0.45), hz + h * (-0.08 + rand() * 0.3), h * (0.01 + rand() * 0.012), i % 3 ? "#5eead4" : "#a3e635");
        }
      },
      // Békakirály öble: szikla a víz közepén, rajta arany korona
      (ctx, w, h, hz) => {
        const x = w * 0.27;
        const y = hz + h * 0.18;
        ctx.fillStyle = "rgba(30,60,90,0.7)";
        ctx.beginPath();
        ctx.ellipse(x, y + h * 0.03, w * 0.2, h * 0.06, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#3f4a4f";
        ctx.beginPath();
        ctx.ellipse(x, y, h * 0.12, h * 0.07, 0, Math.PI, 0);
        ctx.fill();
        const cy = y - h * 0.07;
        ctx.fillStyle = "#fbbf24";
        ctx.beginPath();
        ctx.moveTo(x - h * 0.05, cy);
        ctx.lineTo(x - h * 0.05, cy - h * 0.05);
        ctx.lineTo(x - h * 0.025, cy - h * 0.025);
        ctx.lineTo(x, cy - h * 0.06);
        ctx.lineTo(x + h * 0.025, cy - h * 0.025);
        ctx.lineTo(x + h * 0.05, cy - h * 0.05);
        ctx.lineTo(x + h * 0.05, cy);
        ctx.closePath();
        ctx.fill();
        glowDot(ctx, x, cy - h * 0.03, h * 0.01, "#f43f5e");
      },
      // Boszorkány kunyhója: cölöpökön álló kunyhó világító ablakkal és füsttel
      (ctx, w, h, hz) => {
        const x = w * 0.25;
        const y = hz + h * 0.14;
        ctx.strokeStyle = "#2a1c12";
        ctx.lineWidth = h * 0.012;
        for (const dx of [-0.08, 0, 0.08]) {
          ctx.beginPath();
          ctx.moveTo(x + dx * h, y);
          ctx.lineTo(x + dx * h, y + h * 0.1);
          ctx.stroke();
        }
        ctx.fillStyle = "#3b2a1c";
        ctx.fillRect(x - h * 0.11, y - h * 0.13, h * 0.22, h * 0.13);
        ctx.fillStyle = "#1c1917";
        ctx.beginPath();
        ctx.moveTo(x - h * 0.14, y - h * 0.12);
        ctx.lineTo(x + h * 0.02, y - h * 0.28);
        ctx.lineTo(x + h * 0.15, y - h * 0.12);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "#facc15";
        ctx.fillRect(x - h * 0.03, y - h * 0.09, h * 0.05, h * 0.045);
        glowDot(ctx, x - h * 0.005, y - h * 0.068, h * 0.03, "#fbbf24");
        for (let i = 0; i < 4; i++) {
          ctx.fillStyle = `rgba(170,190,180,${0.35 - i * 0.07})`;
          ctx.beginPath();
          ctx.arc(x + h * (0.07 + i * 0.03), y - h * (0.26 + i * 0.07), h * (0.025 + i * 0.012), 0, Math.PI * 2);
          ctx.fill();
        }
      },
    ],
  },

  // ------------------------------------------------------------ Kristálybarlang
  cave: {
    haze: "rgba(120,100,180,0.35)",
    sky(ctx, w, hz, index, rand) {
      // Ég helyett barlangmennyezet cseppkövekkel
      skyGradient(ctx, w, hz, "#0d0a17", mix("#2a2140", "#1a1430", index / 4));
      // Mennyezet sávja, ahonnan a cseppkövek lelógnak
      ctx.fillStyle = "#1a1428";
      ctx.beginPath();
      ctx.moveTo(0, 0);
      for (let x = 0; x <= w; x += w / 20) ctx.lineTo(x, hz * (0.06 + rand() * 0.08));
      ctx.lineTo(w, 0);
      ctx.closePath();
      ctx.fill();
      for (let i = 0; i < 9; i++) {
        const x = ((i + 0.2 + rand() * 0.6) / 9) * w;
        const len = hz * (0.25 + rand() * 0.45);
        const half = hz * (0.07 + rand() * 0.07);
        // Árnyalt kő: a bal oldal sötét, a jobb világosabb, nedves él, a hegyén csepp
        const g = ctx.createLinearGradient(x - half, 0, x + half, 0);
        g.addColorStop(0, "#120e1d");
        g.addColorStop(0.6, "#2e2545");
        g.addColorStop(1, "#4a3d6b");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(x - half, 0);
        ctx.quadraticCurveTo(x - half * 0.4, len * 0.5, x, len);
        ctx.quadraticCurveTo(x + half * 0.4, len * 0.5, x + half, 0);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = "rgba(196,181,253,0.35)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x + half * 0.7, hz * 0.05);
        ctx.quadraticCurveTo(x + half * 0.3, len * 0.5, x + 0.5, len * 0.92);
        ctx.stroke();
        if (rand() < 0.45) glowDot(ctx, x, len + hz * 0.025, hz * 0.008, "#7dd3fc");
      }
      // Derengő moha a mennyezeten
      for (let i = 0; i < 16; i++) glowDot(ctx, rand() * w, rand() * hz * 0.12, hz * 0.008, i % 3 ? "#5eead4" : "#a78bfa");
    },
    horizon(ctx, w, hz, _index, rand) {
      for (let i = 0; i < 6; i++) glowDot(ctx, rand() * w, hz - rand() * hz * 0.1, hz * 0.03, i % 2 ? "#a78bfa" : "#5ee0ff");
      rocks(ctx, w, hz, hz * 0.28, "#1d1730", rand);
      rocks(ctx, w, hz, hz * 0.18, "#15111f", rand);
    },
    ground(ctx, w, h, hz, _index, rand) {
      // Kavicsok és apró kristályszilánkok
      scatter(w, h, hz, 50, rand, (x, y, s) => {
        if (rand() < 0.3) crystal(ctx, x, y, h * 0.05 * s, (rand() - 0.5) * 0.8, rand() < 0.5 ? "#a78bfa" : "#5ee0ff");
        else {
          ctx.fillStyle = rand() < 0.5 ? "#2a2338" : "#1f1a2c";
          ctx.beginPath();
          ctx.ellipse(x, y, h * 0.014 * s, h * 0.008 * s, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "rgba(167,139,250,0.25)";
          ctx.beginPath();
          ctx.ellipse(x - h * 0.004 * s, y - h * 0.003 * s, h * 0.006 * s, h * 0.003 * s, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      });
    },
    foreground(ctx, w, h, _hz, _index, rand) {
      // Cseppkövek a sarkokban, sötét sziluettként
      for (const [x, s] of [
        [0.02, 1],
        [0.08, 0.65],
        [0.13, 0.4],
        [0.96, 0.85],
        [0.91, 0.5],
      ]) {
        const half = h * 0.06 * s;
        const top = h * (1 - 0.5 * s);
        ctx.fillStyle = "#06040c";
        ctx.beginPath();
        ctx.moveTo(w * x - half, h + 2);
        ctx.quadraticCurveTo(w * x - half * 0.4, top + (h - top) * 0.4, w * x, top);
        ctx.quadraticCurveTo(w * x + half * 0.4, top + (h - top) * 0.4, w * x + half, h + 2);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = "rgba(94,224,255,0.25)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(w * x + half * 0.5, h);
        ctx.quadraticCurveTo(w * x + half * 0.2, top + (h - top) * 0.4, w * x, top + 2);
        ctx.stroke();
      }
      for (let i = 0; i < 3; i++) crystal(ctx, w * (0.04 + i * 0.04), h + 2, h * (0.12 + rand() * 0.08), (i - 1) * 0.4, "#5ee0ff");
    },
    landmarks: [
      // Barlangbejárat: kőív, mögötte a külvilág fénye
      (ctx, w, h, hz) => {
        const x = w * 0.27;
        const y = hz + h * 0.18;
        const g = ctx.createRadialGradient(x, y - h * 0.15, 0, x, y - h * 0.15, h * 0.2);
        g.addColorStop(0, "rgba(254,243,199,0.9)");
        g.addColorStop(1, "rgba(254,243,199,0.1)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.ellipse(x, y, h * 0.13, h * 0.3, 0, Math.PI, 0);
        ctx.fill();
        ctx.strokeStyle = "#2a2338";
        ctx.lineWidth = h * 0.06;
        ctx.beginPath();
        ctx.ellipse(x, y, h * 0.16, h * 0.33, 0, Math.PI, 0);
        ctx.stroke();
      },
      // Csepegő csarnok: cseppkövek, cseppek és tócsa
      (ctx, w, h, hz) => {
        ctx.fillStyle = "#2a2338";
        for (const [x, s] of [
          [0.12, 1],
          [0.24, 0.6],
          [0.36, 0.85],
        ]) {
          ctx.beginPath();
          ctx.moveTo(w * x - h * 0.04 * s, hz + h * 0.22);
          ctx.lineTo(w * x, hz + h * (0.22 - 0.3 * s));
          ctx.lineTo(w * x + h * 0.04 * s, hz + h * 0.22);
          ctx.closePath();
          ctx.fill();
        }
        ctx.fillStyle = "rgba(125,211,252,0.35)";
        ctx.beginPath();
        ctx.ellipse(w * 0.3, hz + h * 0.28, w * 0.1, h * 0.03, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#bae6fd";
        for (const [x, y] of [
          [0.3, 0.1],
          [0.3, 0.2],
          [0.18, 0.05],
        ]) {
          ctx.beginPath();
          ctx.ellipse(w * x, hz + h * y, h * 0.006, h * 0.012, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      },
      // Kristálykert: izzó kristálycsoport
      (ctx, w, h, hz) => {
        for (const [x, s, a, c] of [
          [0.22, 1, -0.15, "#a78bfa"],
          [0.3, 0.75, 0.2, "#5ee0ff"],
          [0.14, 0.6, -0.4, "#5ee0ff"],
          [0.37, 0.5, 0.45, "#c4b5fd"],
        ] as const) {
          crystal(ctx, w * x, hz + h * 0.25, h * 0.28 * s, a, c);
        }
      },
      // Denevérjáratok: denevérraj a sötétben
      (ctx, w, h, hz, rand) => {
        ctx.fillStyle = "#050308";
        ctx.beginPath();
        ctx.ellipse(w * 0.27, hz + h * 0.05, h * 0.14, h * 0.18, 0, Math.PI, 0);
        ctx.fill();
        for (let i = 0; i < 9; i++) bat(ctx, w * (0.1 + rand() * 0.4), hz - h * (0.05 + rand() * 0.3), h * (0.025 + rand() * 0.02));
      },
      // Gólem szentélye: rúnás kőoltár izzó jelekkel
      (ctx, w, h, hz) => {
        const x = w * 0.26;
        const y = hz + h * 0.24;
        ctx.fillStyle = "#3a3450";
        ctx.fillRect(x - h * 0.12, y - h * 0.08, h * 0.24, h * 0.08);
        ctx.fillStyle = "#4a4366";
        ctx.fillRect(x - h * 0.07, y - h * 0.38, h * 0.14, h * 0.3);
        ctx.strokeStyle = "#5ee0ff";
        ctx.shadowColor = "#5ee0ff";
        ctx.shadowBlur = h * 0.04;
        ctx.lineWidth = h * 0.01;
        ctx.beginPath();
        ctx.moveTo(x - h * 0.03, y - h * 0.32);
        ctx.lineTo(x + h * 0.03, y - h * 0.27);
        ctx.lineTo(x - h * 0.03, y - h * 0.22);
        ctx.moveTo(x, y - h * 0.18);
        ctx.lineTo(x, y - h * 0.12);
        ctx.stroke();
        ctx.shadowBlur = 0;
      },
    ],
  },

  // ------------------------------------------------------------ Hamuvidék
  ash: {
    haze: "rgba(120,60,40,0.4)",
    sky(ctx, w, hz, index, rand) {
      skyGradient(ctx, w, hz, mix("#2b0f0b", "#140504", index / 4), mix("#b4532a", "#e2421b", index / 4));
      // Alulról izzó füstrétegek
      for (let i = 0; i < 4; i++) {
        const y = hz * (0.15 + i * 0.12);
        const g = ctx.createLinearGradient(0, y - hz * 0.06, 0, y + hz * 0.06);
        g.addColorStop(0, "rgba(30,12,10,0)");
        g.addColorStop(0.6, "rgba(40,16,12,0.55)");
        g.addColorStop(1, "rgba(234,88,12,0.25)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.ellipse(w * (0.15 + rand() * 0.5), y, w * (0.3 + rand() * 0.2), hz * 0.06, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      // Távoli második vulkán
      ctx.fillStyle = "#2a110c";
      ctx.beginPath();
      ctx.moveTo(w * 0.02, hz);
      ctx.lineTo(w * 0.2, hz - hz * 0.28);
      ctx.lineTo(w * 0.26, hz - hz * 0.28);
      ctx.lineTo(w * 0.45, hz);
      ctx.closePath();
      ctx.fill();
      glowDot(ctx, w * 0.23, hz - hz * 0.28, hz * 0.03, "#ea580c");
      // A vulkán a háttérben, pályáról pályára közelebb
      const vh = hz * (0.35 + index * 0.1);
      const vx = w * 0.72;
      ctx.fillStyle = "#1a0c0a";
      ctx.beginPath();
      ctx.moveTo(vx - vh * 1.4, hz);
      ctx.lineTo(vx - vh * 0.25, hz - vh);
      ctx.lineTo(vx + vh * 0.25, hz - vh);
      ctx.lineTo(vx + vh * 1.4, hz);
      ctx.closePath();
      ctx.fill();
      glowDot(ctx, vx, hz - vh, vh * 0.35, "#f97316");
      ctx.strokeStyle = "rgba(249,115,22,0.8)";
      ctx.lineWidth = hz * 0.02;
      ctx.beginPath();
      ctx.moveTo(vx - vh * 0.1, hz - vh);
      ctx.lineTo(vx - vh * 0.35, hz - vh * 0.4);
      ctx.stroke();
      for (let i = 0; i < 4; i++) {
        ctx.fillStyle = `rgba(60,40,40,${0.5 - i * 0.1})`;
        ctx.beginPath();
        ctx.arc(vx + i * vh * 0.15, hz - vh - i * vh * 0.25, vh * (0.15 + i * 0.07), 0, Math.PI * 2);
        ctx.fill();
      }
      for (let i = 0; i < 18; i++) {
        ctx.fillStyle = `rgba(253,186,116,${0.4 + rand() * 0.6})`;
        ctx.fillRect(rand() * w, rand() * hz, 1.5, 1.5);
      }
    },
    horizon(ctx, w, hz, _index, rand) {
      rocks(ctx, w, hz, hz * 0.14, "#1f0d0a", rand);
    },
    ground(ctx, w, h, hz, _index, rand) {
      // Hamukupacok, izzó kövek, apró repedések
      scatter(w, h, hz, 55, rand, (x, y, s) => {
        const r = rand();
        if (r < 0.2) {
          glowDot(ctx, x, y, h * 0.005 * s, "#fb923c");
        } else if (r < 0.4) {
          ctx.strokeStyle = "rgba(249,115,22,0.75)";
          ctx.lineWidth = Math.max(0.8, h * 0.004 * s);
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + h * 0.02 * s, y + h * 0.004 * s);
          ctx.lineTo(x + h * 0.035 * s, y - h * 0.003 * s);
          ctx.stroke();
        } else {
          ctx.fillStyle = rand() < 0.5 ? "#2a1712" : "#3a2620";
          ctx.beginPath();
          ctx.ellipse(x, y, h * 0.016 * s, h * 0.009 * s, 0, Math.PI, 0);
          ctx.fill();
        }
      });
    },
    foreground(ctx, w, h, _hz, _index, rand) {
      // Megszenesedett sziklák a sarkokban, izzó erekkel
      for (const [x, s] of [
        [0.03, 1],
        [0.11, 0.6],
        [0.97, 0.8],
      ]) {
        const r = h * 0.14 * s;
        ctx.fillStyle = "#120806";
        ctx.beginPath();
        ctx.moveTo(w * x - r * 1.2, h + 2);
        ctx.lineTo(w * x - r * 0.9, h - r * 0.8);
        ctx.lineTo(w * x - r * 0.2, h - r * 1.2);
        ctx.lineTo(w * x + r * 0.7, h - r * 0.9);
        ctx.lineTo(w * x + r * 1.2, h + 2);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = "rgba(249,115,22,0.8)";
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(w * x - r * 0.5, h - r * 0.5);
        ctx.lineTo(w * x - r * 0.1, h - r * 0.3);
        ctx.lineTo(w * x + r * 0.2, h - r * 0.6);
        ctx.stroke();
      }
      // Felszálló parázs
      for (let i = 0; i < 16; i++) {
        ctx.fillStyle = `rgba(253,186,116,${0.4 + rand() * 0.6})`;
        const s = 1 + rand() * 1.5;
        ctx.fillRect(rand() * w, h * (0.3 + rand() * 0.7), s, s);
      }
    },
    landmarks: [
      // Hamumező: megszenesedett fák
      (ctx, w, h, hz) => {
        for (const [x, s] of [
          [0.12, 1],
          [0.3, 0.75],
          [0.42, 0.55],
        ]) {
          deadTree(ctx, w * x, hz + h * (0.12 + s * 0.1), h * 0.3 * s);
        }
      },
      // Izzó repedések: lávacsíkok a földön
      (ctx, w, h, hz, rand) => {
        ctx.strokeStyle = "#fb923c";
        ctx.shadowColor = "#f97316";
        ctx.shadowBlur = h * 0.03;
        ctx.lineCap = "round";
        for (let k = 0; k < 4; k++) {
          ctx.lineWidth = h * (0.008 + rand() * 0.008);
          ctx.beginPath();
          let x = w * (0.05 + rand() * 0.4);
          let y = hz + h * (0.08 + rand() * 0.3);
          ctx.moveTo(x, y);
          for (let i = 0; i < 5; i++) {
            x += (rand() - 0.3) * w * 0.06;
            y += (rand() - 0.5) * h * 0.06;
            ctx.lineTo(x, y);
          }
          ctx.stroke();
        }
        ctx.shadowBlur = 0;
      },
      // Bazaltszirtek: hatszögletű kőoszlopok
      (ctx, w, h, hz) => {
        // Hatszögletű oszlopok: fedőlap felülről, sötét és világos oldal, függőleges bordák
        const cw = w * 0.055;
        const base = hz + h * 0.26;
        for (let i = 0; i < 7; i++) {
          const x = w * (0.04 + i * 0.058);
          const top = base - h * (0.14 + ((i * 7) % 5) * 0.06);
          const cap = cw * 0.28;
          ctx.fillStyle = "#1f1210";
          ctx.fillRect(x, top, cw * 0.5, base - top);
          ctx.fillStyle = "#3a2622";
          ctx.fillRect(x + cw * 0.5, top, cw * 0.5, base - top);
          ctx.strokeStyle = "rgba(0,0,0,0.45)";
          ctx.lineWidth = 1;
          for (const k of [0.25, 0.5, 0.75]) {
            ctx.beginPath();
            ctx.moveTo(x + cw * k, top + cap);
            ctx.lineTo(x + cw * k, base);
            ctx.stroke();
          }
          ctx.fillStyle = "#5a3f36";
          ctx.beginPath();
          ctx.moveTo(x, top);
          ctx.lineTo(x + cw * 0.25, top - cap * 0.5);
          ctx.lineTo(x + cw * 0.75, top - cap * 0.5);
          ctx.lineTo(x + cw, top);
          ctx.lineTo(x + cw * 0.75, top + cap * 0.5);
          ctx.lineTo(x + cw * 0.25, top + cap * 0.5);
          ctx.closePath();
          ctx.fill();
          // Izzó fény a tövénél
          glowDot(ctx, x + cw / 2, base, cw * 0.15, "#ea580c");
        }
      },
      // Vulkán lába: kitörő láva és lávafolyam
      (ctx, w, h, hz) => {
        // Kanyargó, kiszélesedő lávafolyam elágazással: széles izzás, narancs mag, sárga közép
        const river = (path: [number, number][], width: number) => {
          for (const [lw, color] of [
            [width * 3, "rgba(234,88,12,0.25)"],
            [width, "#ea580c"],
            [width * 0.45, "#fde047"],
          ] as const) {
            ctx.strokeStyle = color;
            ctx.lineWidth = lw;
            ctx.lineCap = "round";
            ctx.lineJoin = "round";
            ctx.beginPath();
            ctx.moveTo(w * path[0][0], hz + h * path[0][1]);
            for (let i = 1; i < path.length - 1; i++) {
              const mx = (path[i][0] + path[i + 1][0]) / 2;
              const my = (path[i][1] + path[i + 1][1]) / 2;
              ctx.quadraticCurveTo(w * path[i][0], hz + h * path[i][1], w * mx, hz + h * my);
            }
            const last = path[path.length - 1];
            ctx.lineTo(w * last[0], hz + h * last[1]);
            ctx.stroke();
          }
        };
        river(
          [
            [0.64, 0],
            [0.55, 0.06],
            [0.5, 0.14],
            [0.38, 0.2],
            [0.3, 0.3],
            [0.18, 0.42],
          ],
          h * 0.03,
        );
        river(
          [
            [0.45, 0.17],
            [0.4, 0.26],
            [0.46, 0.36],
          ],
          h * 0.018,
        );
        // Kihűlt kéreg-darabok a folyamon
        ctx.fillStyle = "rgba(40,15,10,0.85)";
        for (const [x, y] of [
          [0.5, 0.13],
          [0.36, 0.22],
          [0.27, 0.32],
        ]) {
          ctx.beginPath();
          ctx.ellipse(w * x, hz + h * y, h * 0.012, h * 0.006, 0.4, 0, Math.PI * 2);
          ctx.fill();
        }
        for (let i = 0; i < 6; i++) glowDot(ctx, w * (0.6 + i * 0.03), hz - h * (0.3 + (i % 3) * 0.06), h * 0.012, "#fde047");
      },
      // Sárkányfészek: repülő sárkány sziluett és izzó tojások
      (ctx, w, h, hz) => {
        dragon(ctx, w * 0.32, hz * 0.45, h * 0.22);
        const nx = w * 0.22;
        const ny = hz + h * 0.22;
        ctx.fillStyle = "#2a1b18";
        ctx.beginPath();
        ctx.ellipse(nx, ny, h * 0.13, h * 0.04, 0, 0, Math.PI * 2);
        ctx.fill();
        for (const dx of [-0.05, 0, 0.05]) {
          ctx.fillStyle = "#7f1d1d";
          ctx.beginPath();
          ctx.ellipse(nx + dx * h, ny - h * 0.04, h * 0.025, h * 0.035, 0, 0, Math.PI * 2);
          ctx.fill();
          glowDot(ctx, nx + dx * h, ny - h * 0.045, h * 0.012, "#fb923c");
        }
      },
    ],
  },
};

// ================================================================ építőelemek

function skyGradient(ctx: Ctx, w: number, hz: number, top: string, bottom: string) {
  const g = ctx.createLinearGradient(0, 0, 0, hz);
  g.addColorStop(0, top);
  g.addColorStop(1, bottom);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, hz + 1);
}

function sun(ctx: Ctx, x: number, y: number, r: number, color: string) {
  glowDot(ctx, x, y, r * 2.4, color);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

/** Bodros felhő: árnyékos alj, világos test, csillanó tető */
function cloud(ctx: Ctx, x: number, y: number, s: number, color: string, shadow: string) {
  const puffs: [number, number, number][] = [
    [0, 0, 1],
    [0.9, 0.15, 0.75],
    [-0.9, 0.2, 0.65],
    [0.45, -0.35, 0.6],
    [-0.4, -0.25, 0.55],
  ];
  ctx.fillStyle = shadow;
  ctx.beginPath();
  for (const [dx, dy, r] of puffs) {
    ctx.moveTo(x + dx * s + r * s, y + dy * s + s * 0.18);
    ctx.arc(x + dx * s, y + dy * s + s * 0.18, r * s, 0, Math.PI * 2);
  }
  ctx.fill();
  ctx.fillStyle = color;
  ctx.beginPath();
  for (const [dx, dy, r] of puffs) {
    ctx.moveTo(x + dx * s + r * s * 0.92, y + dy * s);
    ctx.arc(x + dx * s, y + dy * s, r * s * 0.92, 0, Math.PI * 2);
  }
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.beginPath();
  ctx.arc(x - s * 0.15, y - s * 0.3, s * 0.45, 0, Math.PI * 2);
  ctx.fill();
}

/** Halvány fénysugarak a napból/holdból */
function sunRays(ctx: Ctx, x: number, y: number, len: number, color: string, rand: () => number) {
  ctx.save();
  for (let i = 0; i < 9; i++) {
    const a = rand() * Math.PI * 2;
    const spread = 0.05 + rand() * 0.06;
    const g = ctx.createRadialGradient(x, y, 0, x, y, len);
    g.addColorStop(0, hexA(color, 0.22));
    g.addColorStop(1, hexA(color, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.arc(x, y, len, a - spread, a + spread);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

/** V alakú madarak csapatban */
function birds(ctx: Ctx, x: number, y: number, s: number, color: string, count: number, rand: () => number) {
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(1, s * 0.18);
  ctx.lineCap = "round";
  for (let i = 0; i < count; i++) {
    const bx = x + i * s * 2.2 + (rand() - 0.5) * s;
    const by = y + Math.abs(i - count / 2) * s * 0.7 + (rand() - 0.5) * s * 0.5;
    const k = s * (0.7 + rand() * 0.5);
    ctx.beginPath();
    ctx.moveTo(bx - k, by - k * 0.3);
    ctx.quadraticCurveTo(bx - k * 0.4, by - k * 0.6, bx, by);
    ctx.quadraticCurveTo(bx + k * 0.4, by - k * 0.6, bx + k, by - k * 0.3);
    ctx.stroke();
  }
}

/** Kis fűcsomó: néhány hajló fűszál, a csúcsuk világosabb */
function grassTuft(ctx: Ctx, x: number, y: number, s: number, dark: string, light: string) {
  ctx.lineCap = "round";
  ctx.lineWidth = Math.max(0.8, s * 0.12);
  for (let i = -2; i <= 2; i++) {
    const g = ctx.createLinearGradient(x, y, x, y - s);
    g.addColorStop(0, dark);
    g.addColorStop(1, light);
    ctx.strokeStyle = g;
    ctx.beginPath();
    ctx.moveTo(x + i * s * 0.08, y);
    ctx.quadraticCurveTo(x + i * s * 0.12, y - s * 0.6, x + i * s * 0.3, y - s * (0.8 + (i % 2) * 0.2));
    ctx.stroke();
  }
}

/** Sűrű fűszálak a kép alján (keret) */
function grassFringe(ctx: Ctx, w: number, h: number, height: number, dark: string, light: string, rand: () => number) {
  ctx.lineCap = "round";
  const count = Math.round(w / 3);
  for (let i = 0; i < count; i++) {
    const x = (i / count) * w + (rand() - 0.5) * 4;
    // A széleken magasabb, középen alacsonyabb, hogy ne takarja a szörnyeket
    const edge = Math.pow(Math.abs(x / w - 0.5) * 2, 2);
    const bh = height * (0.25 + edge * 0.75) * (0.5 + rand() * 0.6);
    const bend = (rand() - 0.5) * bh * 0.6;
    const g = ctx.createLinearGradient(x, h, x, h - bh);
    g.addColorStop(0, dark);
    g.addColorStop(1, light);
    ctx.strokeStyle = g;
    ctx.lineWidth = 1 + rand() * 1.5;
    ctx.beginPath();
    ctx.moveTo(x, h + 2);
    ctx.quadraticCurveTo(x + bend * 0.3, h - bh * 0.6, x + bend, h - bh);
    ctx.stroke();
  }
}

/** Magas szárú virág (előtér) */
function tallFlower(ctx: Ctx, x: number, base: number, height: number, color: string) {
  ctx.strokeStyle = "#2f5a22";
  ctx.lineWidth = height * 0.025;
  ctx.beginPath();
  ctx.moveTo(x, base);
  ctx.quadraticCurveTo(x + height * 0.08, base - height * 0.5, x + height * 0.04, base - height);
  ctx.stroke();
  ctx.fillStyle = "#3f7a2c";
  ctx.beginPath();
  ctx.ellipse(x + height * 0.07, base - height * 0.45, height * 0.08, height * 0.025, -0.6, 0, Math.PI * 2);
  ctx.fill();
  flower(ctx, x + height * 0.04, base - height, height * 0.06, color);
}

function butterfly(ctx: Ctx, x: number, y: number, s: number, color: string) {
  ctx.fillStyle = color;
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(x + side * s * 0.55, y - s * 0.25, s * 0.55, s * 0.4, side * 0.5, 0, Math.PI * 2);
    ctx.ellipse(x + side * s * 0.4, y + s * 0.3, s * 0.35, s * 0.28, -side * 0.4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = "#1c1917";
  ctx.fillRect(x - s * 0.06, y - s * 0.45, s * 0.12, s * 0.9);
}

/** Páfránylevél: ívelő szár, két oldalán levélkék */
function fern(ctx: Ctx, x: number, y: number, len: number, angle: number, color: string) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = len * 0.025;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(len * 0.2, -len * 0.6, len * 0.5, -len);
  ctx.stroke();
  for (let i = 1; i < 12; i++) {
    const t = i / 12;
    const px = len * (0.2 * 2 * t * (1 - t) + 0.5 * t * t);
    const py = -len * (0.6 * 2 * t * (1 - t) + t * t);
    const leaf = len * 0.16 * (1 - t * 0.7);
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(px + side * leaf * 0.5, py + leaf * 0.15, leaf * 0.55, leaf * 0.16, side * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

/** Buzogányos nádszál (mocsár előtere) */
function cattail(ctx: Ctx, x: number, base: number, height: number, lean: number) {
  ctx.strokeStyle = "#1d3a24";
  ctx.lineWidth = height * 0.02;
  ctx.beginPath();
  ctx.moveTo(x, base);
  ctx.quadraticCurveTo(x + lean * 0.3, base - height * 0.6, x + lean, base - height);
  ctx.stroke();
  ctx.fillStyle = "#5b3a1e";
  ctx.beginPath();
  ctx.ellipse(x + lean * 0.95, base - height * 0.88, height * 0.035, height * 0.11, lean / height, 0, Math.PI * 2);
  ctx.fill();
}

/** Hullámzó dombvonulat a látóhatáron */
function hills(ctx: Ctx, w: number, hz: number, height: number, color: string, freq: number, phase: number) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, hz + 1);
  for (let x = 0; x <= w; x += w / 40) {
    ctx.lineTo(x, hz - height * (0.55 + 0.45 * Math.sin((x / w) * Math.PI * freq + phase)));
  }
  ctx.lineTo(w, hz + 1);
  ctx.closePath();
  ctx.fill();
}

function pines(ctx: Ctx, w: number, hz: number, height: number, color: string, rand: () => number, count: number) {
  ctx.fillStyle = color;
  for (let i = 0; i < count; i++) {
    const x = (i / (count - 1)) * w + (rand() - 0.5) * (w / count);
    const th = height * (0.6 + rand() * 0.4);
    const tw = th * 0.32;
    ctx.beginPath();
    ctx.moveTo(x - tw, hz + 1);
    ctx.lineTo(x, hz - th);
    ctx.lineTo(x + tw, hz + 1);
    ctx.closePath();
    ctx.fill();
  }
}

function reeds(ctx: Ctx, w: number, base: number, height: number, color: string, rand: () => number) {
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(1, height * 0.04);
  ctx.lineCap = "round";
  const count = Math.round(w / (height * 0.12));
  for (let i = 0; i < count; i++) {
    const x = rand() * w;
    const rh = height * (0.4 + rand() * 0.6);
    ctx.beginPath();
    ctx.moveTo(x, base + 1);
    ctx.quadraticCurveTo(x + rh * 0.1, base - rh * 0.5, x + (rand() - 0.5) * rh * 0.3, base - rh);
    ctx.stroke();
  }
}

function rocks(ctx: Ctx, w: number, hz: number, height: number, color: string, rand: () => number) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, hz + 1);
  for (let x = 0; x <= w; x += w / 16) ctx.lineTo(x, hz - height * (0.3 + rand() * 0.7));
  ctx.lineTo(w, hz + 1);
  ctx.closePath();
  ctx.fill();
}

function fog(ctx: Ctx, w: number, y: number, height: number, alpha: number) {
  const g = ctx.createLinearGradient(0, y - height, 0, y + height * 0.3);
  g.addColorStop(0, "rgba(220,235,225,0)");
  g.addColorStop(0.7, `rgba(220,235,225,${alpha})`);
  g.addColorStop(1, "rgba(220,235,225,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, y - height, w, height * 1.3);
}

function glowDot(ctx: Ctx, x: number, y: number, r: number, color: string) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r * 3);
  g.addColorStop(0, color);
  g.addColorStop(0.3, hexA(color, 0.5));
  g.addColorStop(1, hexA(color, 0));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r * 3, 0, Math.PI * 2);
  ctx.fill();
}

function flower(ctx: Ctx, x: number, y: number, r: number, color: string) {
  ctx.fillStyle = color;
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(x + Math.cos(a) * r, y + Math.sin(a) * r, r * 0.75, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = "#facc15";
  ctx.beginPath();
  ctx.arc(x, y, r * 0.6, 0, Math.PI * 2);
  ctx.fill();
}

function crow(ctx: Ctx, x: number, y: number, s: number) {
  ctx.fillStyle = "#0c0a0a";
  ctx.beginPath();
  ctx.ellipse(x, y - s * 0.5, s * 0.5, s * 0.35, 0, 0, Math.PI * 2);
  ctx.arc(x + s * 0.35, y - s * 0.95, s * 0.25, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x + s * 0.55, y - s * 0.95);
  ctx.lineTo(x + s * 0.85, y - s * 0.88);
  ctx.lineTo(x + s * 0.55, y - s * 0.85);
  ctx.fill();
  glowDot(ctx, x + s * 0.42, y - s * 1.0, s * 0.06, "#ef4444");
}

function pumpkin(ctx: Ctx, x: number, y: number, r: number) {
  glowDot(ctx, x, y - r * 0.6, r * 0.9, "#fb923c");
  ctx.fillStyle = "#c2410c";
  for (const dx of [-0.45, 0.45, 0]) {
    ctx.beginPath();
    ctx.ellipse(x + dx * r, y - r * 0.6, r * 0.55, r * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = "#fde047";
  ctx.beginPath();
  ctx.moveTo(x - r * 0.35, y - r * 0.75);
  ctx.lineTo(x - r * 0.15, y - r * 0.55);
  ctx.lineTo(x - r * 0.45, y - r * 0.55);
  ctx.moveTo(x + r * 0.35, y - r * 0.75);
  ctx.lineTo(x + r * 0.45, y - r * 0.55);
  ctx.lineTo(x + r * 0.15, y - r * 0.55);
  ctx.fill();
  ctx.fillRect(x - r * 0.35, y - r * 0.38, r * 0.7, r * 0.1);
}

function mushroom(ctx: Ctx, x: number, y: number, s: number, color: string) {
  ctx.fillStyle = "#f5f0e1";
  ctx.fillRect(x - s * 0.12, y - s * 0.55, s * 0.24, s * 0.55);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(x, y - s * 0.55, s * 0.45, s * 0.32, 0, Math.PI, 0);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  for (const [dx, dy, r] of [
    [-0.2, -0.68, 0.06],
    [0.12, -0.75, 0.07],
    [0.28, -0.62, 0.05],
    [-0.02, -0.62, 0.04],
  ]) {
    ctx.beginPath();
    ctx.arc(x + dx * s, y + dy * s, r * s, 0, Math.PI * 2);
    ctx.fill();
  }
}

function lantern(ctx: Ctx, x: number, y: number, s: number) {
  ctx.strokeStyle = "#2a1c12";
  ctx.lineWidth = s * 0.12;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x, y - s * 2.2);
  ctx.stroke();
  glowDot(ctx, x, y - s * 2.2, s * 0.5, "#fbbf24");
  ctx.fillStyle = "#fde68a";
  ctx.fillRect(x - s * 0.2, y - s * 2.45, s * 0.4, s * 0.5);
}

function crystal(ctx: Ctx, x: number, y: number, len: number, angle: number, color: string) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  glowDot(ctx, 0, -len * 0.5, len * 0.25, color);
  const g = ctx.createLinearGradient(-len * 0.12, 0, len * 0.12, 0);
  g.addColorStop(0, hexA(color, 0.95));
  g.addColorStop(1, "#ffffff");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-len * 0.12, 0);
  ctx.lineTo(-len * 0.12, -len * 0.75);
  ctx.lineTo(0, -len);
  ctx.lineTo(len * 0.12, -len * 0.75);
  ctx.lineTo(len * 0.12, 0);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function bat(ctx: Ctx, x: number, y: number, s: number) {
  ctx.fillStyle = "#0a0710";
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(x - s * 0.6, y - s * 0.6, x - s * 1.2, y - s * 0.2);
  ctx.quadraticCurveTo(x - s * 0.7, y - s * 0.05, x - s * 0.6, y + s * 0.2);
  ctx.quadraticCurveTo(x - s * 0.3, y, x, y + s * 0.15);
  ctx.quadraticCurveTo(x + s * 0.3, y, x + s * 0.6, y + s * 0.2);
  ctx.quadraticCurveTo(x + s * 0.7, y - s * 0.05, x + s * 1.2, y - s * 0.2);
  ctx.quadraticCurveTo(x + s * 0.6, y - s * 0.6, x, y);
  ctx.fill();
}

function deadTree(ctx: Ctx, x: number, y: number, s: number) {
  ctx.strokeStyle = "#140a08";
  ctx.lineCap = "round";
  ctx.lineWidth = s * 0.08;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + s * 0.03, y - s);
  ctx.moveTo(x + s * 0.02, y - s * 0.6);
  ctx.lineTo(x + s * 0.3, y - s * 0.85);
  ctx.moveTo(x + s * 0.02, y - s * 0.45);
  ctx.lineTo(x - s * 0.25, y - s * 0.7);
  ctx.stroke();
  ctx.lineWidth = s * 0.04;
  ctx.beginPath();
  ctx.moveTo(x + s * 0.2, y - s * 0.78);
  ctx.lineTo(x + s * 0.25, y - s * 1.0);
  ctx.moveTo(x - s * 0.15, y - s * 0.62);
  ctx.lineTo(x - s * 0.3, y - s * 0.6);
  ctx.stroke();
}

function dragon(ctx: Ctx, x: number, y: number, s: number) {
  ctx.fillStyle = "#0d0504";
  // Szárnyak
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(x - s * 0.4, y - s * 0.6, x - s * 1.1, y - s * 0.5);
  ctx.lineTo(x - s * 0.8, y - s * 0.3);
  ctx.lineTo(x - s * 0.9, y - s * 0.15);
  ctx.lineTo(x - s * 0.55, y - s * 0.1);
  ctx.lineTo(x - s * 0.5, y + s * 0.05);
  ctx.closePath();
  ctx.moveTo(x + s * 0.1, y);
  ctx.quadraticCurveTo(x + s * 0.4, y - s * 0.7, x + s * 1.0, y - s * 0.65);
  ctx.lineTo(x + s * 0.75, y - s * 0.4);
  ctx.lineTo(x + s * 0.85, y - s * 0.25);
  ctx.lineTo(x + s * 0.5, y - s * 0.15);
  ctx.lineTo(x + s * 0.45, y + s * 0.02);
  ctx.closePath();
  ctx.fill();
  // Test, nyak, fej, farok
  ctx.beginPath();
  ctx.ellipse(x + s * 0.05, y + s * 0.02, s * 0.32, s * 0.1, -0.15, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineCap = "round";
  ctx.strokeStyle = "#0d0504";
  ctx.lineWidth = s * 0.07;
  ctx.beginPath();
  ctx.moveTo(x + s * 0.3, y - s * 0.03);
  ctx.quadraticCurveTo(x + s * 0.5, y - s * 0.2, x + s * 0.62, y - s * 0.12);
  ctx.moveTo(x - s * 0.25, y + s * 0.06);
  ctx.quadraticCurveTo(x - s * 0.6, y + s * 0.2, x - s * 0.8, y + s * 0.08);
  ctx.stroke();
  glowDot(ctx, x + s * 0.63, y - s * 0.14, s * 0.02, "#fb923c");
}

// ================================================================ segédek

function mix(a: string, b: string, t: number) {
  const na = parseInt(a.slice(1), 16);
  const nb = parseInt(b.slice(1), 16);
  const ch = (shift: number) => Math.round(((na >> shift) & 255) * (1 - t) + ((nb >> shift) & 255) * t);
  return `#${((ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).padStart(6, "0")}`;
}

function hexA(hex: string, alpha: number) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}

function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
