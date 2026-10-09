import { WIZARD_FEET, WIZARD_FIGURE, type Game, type Enemy, type Bolt, type Projectile } from "./Game";
import type { Point } from "./types";
import { drawGlyph } from "../draw/shapes";
import { getTerrain, TERRAIN_BORDER, TERRAIN_OUTSIDE } from "../draw/terrain";
import { drawAtmosphere } from "../draw/atmosphere";
import { drawEnemySprite, hasSprite, SPRITE_TOP } from "../draw/enemies";
import { drawAirEffects, drawDizzyOverlay, drawFrozenOverlay, drawGroundEffects, drawPoisonOverlay } from "../draw/spellFx";
import { castAnimSeconds, drawWizardFigure } from "../draw/wizard";
import { drawCooldownIcon, drawManaIcon, drawSkullLineIcon, drawStopwatchLineIcon, drawTargetDummy } from "../draw/icons";
import type { ResolvedLook } from "../data/wizardParts";

/** Egy varázslat megjelenése a varázslatsávban */
export interface SpellLook {
  id: string;
  name: string;
  color: string;
  mana: number;
  /** Teljes töltési idő (mp) */
  cooldown: number;
  path: Point[];
}

const OUTSIDE = "#1d3417";

/** A teljes játékállás kirajzolása. A canvas mérete képpontban értendő. */
export function renderGame(
  ctx: CanvasRenderingContext2D,
  game: Game,
  spells: SpellLook[],
  look: ResolvedLook,
  /** A pálya jele a felső sávban, pl. "1-1" */
  levelLabel: string,
  width: number,
  height: number,
  now: number,
) {
  const unit = Math.min(width, height) / 2;
  const cam = game.camera;
  /** Világkoordináta → képernyő-képpont */
  const toScreen = (x: number, y: number) => ({
    x: width / 2 + (x - cam.x) * unit,
    y: height / 2 + (y - cam.y) * unit,
  });

  drawWorld(ctx, game, look, width, height, unit, now);
  drawAtmosphere(ctx, game.config.terrain, width, height, unit, now, toScreen(game.wizard.x, game.wizard.y - 0.1));

  // Képernyő-koordináták: feliratok, jelzők, sebződés és HUD
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.textAlign = "center";
  ctx.lineJoin = "round";
  for (const t of game.texts) {
    const p = toScreen(t.x, t.y);
    // Felugrik, majd elhalványul
    const age = 1 - t.life;
    const pop = age < 0.12 ? 0.7 + (age / 0.12) * 0.5 : 1.2 - Math.min(0.2, (age - 0.12) * 1.5);
    ctx.font = `800 ${Math.round(Math.max(14, unit * 0.05) * pop)}px ${HUD_FONT}`;
    ctx.globalAlpha = Math.min(1, t.life * 2.5);
    ctx.strokeStyle = "rgba(10,10,15,0.85)";
    ctx.lineWidth = Math.max(3, unit * 0.008);
    ctx.strokeText(t.text, p.x, p.y);
    ctx.fillStyle = t.color;
    ctx.fillText(t.text, p.x, p.y);
  }
  ctx.globalAlpha = 1;

  drawOffscreenMarkers(ctx, game, width, height, unit, toScreen);

  if (game.hurtFlash > 0) {
    const v = ctx.createRadialGradient(width / 2, height / 2, unit * 0.6, width / 2, height / 2, Math.hypot(width, height) / 2);
    v.addColorStop(0, "rgba(248,113,113,0)");
    v.addColorStop(1, `rgba(248,113,113,${0.55 * game.hurtFlash})`);
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, width, height);
  }
  drawTopHud(ctx, game, levelLabel, unit);
  drawSpellBar(ctx, game, spells, width, height, unit, now);
}

/** A pálya a kamerából nézve: rét, effektek, alakok (HUD nélkül). unit = képpont / egység */
export function drawWorld(
  ctx: CanvasRenderingContext2D,
  game: Game,
  look: ResolvedLook,
  width: number,
  height: number,
  unit: number,
  now: number,
) {
  const cam = game.camera;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = TERRAIN_OUTSIDE[game.config.terrain] ?? OUTSIDE;
  ctx.fillRect(0, 0, width, height);

  // Világkoordináták a kamerához igazítva, rázkódással
  const shake = Math.max(game.hurtFlash > 0.5 ? (game.hurtFlash - 0.5) * 0.03 : 0, game.shake * 0.035);
  ctx.setTransform(
    unit,
    0,
    0,
    unit,
    width / 2 - cam.x * unit + (Math.random() - 0.5) * shake * unit,
    height / 2 - cam.y * unit + (Math.random() - 0.5) * shake * unit,
  );

  const { worldHalfWidth: ww, worldHalfHeight: wh } = game.config;
  const ground = getTerrain(game.config.terrain, ww, wh, unit);
  ctx.drawImage(ground, -ww - TERRAIN_BORDER, -wh - TERRAIN_BORDER, (ww + TERRAIN_BORDER) * 2, (wh + TERRAIN_BORDER) * 2);
  drawGroundEffects(ctx, game, now);

  // Mélységi sorrend: ami lejjebb van, az kerül előre
  const actors: { y: number; draw: () => void }[] = game.enemies.map((enemy) => ({
    y: enemy.y,
    draw: () => drawEnemy(ctx, enemy, game, now),
  }));
  actors.push({ y: game.wizard.y, draw: () => drawWizard(ctx, game, look, now) });
  actors.sort((p, q) => p.y - q.y);
  for (const actor of actors) actor.draw();
  drawEffects(ctx, game, now);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}

/** A képernyőn kívüli közeli ellenfelek jelzése a képernyő szélén */
function drawOffscreenMarkers(
  ctx: CanvasRenderingContext2D,
  game: Game,
  width: number,
  height: number,
  unit: number,
  toScreen: (x: number, y: number) => Point,
) {
  const pad = Math.max(18, unit * 0.06);
  const size = Math.max(12, unit * 0.035);
  const cx = width / 2;
  const cy = height / 2;
  for (const enemy of game.enemies) {
    if (game.isVisible(enemy.x, enemy.y)) continue;
    const p = toScreen(enemy.x, enemy.y);
    const dx = p.x - cx;
    const dy = p.y - cy;
    // A képernyő közepéből az ellenfél felé húzott egyenes metszése a kerettel
    const t = Math.min((cx - pad) / Math.abs(dx || 1e-6), (cy - pad) / Math.abs(dy || 1e-6));
    const mx = cx + dx * t;
    const my = cy + dy * t;
    const dist = Math.hypot(enemy.x - game.wizard.x, enemy.y - game.wizard.y);
    const angle = Math.atan2(dy, dx);

    ctx.save();
    ctx.translate(mx, my);
    ctx.rotate(angle);
    ctx.globalAlpha = Math.max(0.55, Math.min(1, 1.8 - dist * 0.5));
    ctx.fillStyle = "#ef4444";
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = Math.max(2, size * 0.25);
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(size, 0);
    ctx.lineTo(-size * 0.7, -size * 0.8);
    ctx.lineTo(-size * 0.35, 0);
    ctx.lineTo(-size * 0.7, size * 0.8);
    ctx.closePath();
    ctx.stroke();
    ctx.fill();
    ctx.restore();
  }
}


/** Lövedékek, villámok, levegőben lévő varázslat-effektek és részecskék (világkoordinátában) */
export function drawEffects(ctx: CanvasRenderingContext2D, game: Game, now: number) {
  for (const p of game.projectiles) drawProjectile(ctx, p);
  for (const b of game.bolts) drawBolt(ctx, b);
  drawAirEffects(ctx, game, now);
  for (const p of game.particles) {
    ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

/** Pajzsbuborék; a vászon a mágus középpontjára van eltolva */
export function drawShieldBubble(ctx: CanvasRenderingContext2D, game: Game, now: number) {
  const w = game.wizard;
  if (w.shield <= 0) return;
  const r = game.config.wizardRadius;
  const fadeOut = Math.min(1, w.shield / 0.5);
  const pulse = 1 + Math.sin(now / 120) * 0.04;
  ctx.globalAlpha = fadeOut;
  ctx.fillStyle = "rgba(94,224,255,0.14)";
  ctx.strokeStyle = "#5ee0ff";
  ctx.lineWidth = 0.008;
  ctx.shadowColor = "#5ee0ff";
  ctx.shadowBlur = 0;
  ctx.beginPath();
  ctx.arc(0, -r * 0.85, r * 2.4 * pulse, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1;
}

function drawWizard(ctx: CanvasRenderingContext2D, game: Game, look: ResolvedLook, now: number) {
  const w = game.wizard;
  const r = game.config.wizardRadius;
  const castLength = game.lastCast ? castAnimSeconds(game.lastCast.spell.id) : 1;
  const cast = game.lastCast && game.lastCast.age < castLength ? game.lastCast : null;
  /** A figura talppontja és mérete a mágus középpontjához képest */
  const feetY = r * WIZARD_FEET;
  const figureSize = r * WIZARD_FIGURE;

  ctx.save();
  ctx.translate(w.x, w.y);

  // Árnyék
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.beginPath();
  ctx.ellipse(0, feetY, r * 0.85, r * 0.32, 0, 0, Math.PI * 2);
  ctx.fill();

  // Varázslás fénye a talaj körül
  if (cast) {
    const t = cast.age / castLength;
    const aura = ctx.createRadialGradient(0, feetY, 0, 0, feetY, r * (1.5 + t));
    aura.addColorStop(0, hexToRgba(cast.spell.color, 0.45 * (1 - t)));
    aura.addColorStop(1, hexToRgba(cast.spell.color, 0));
    ctx.fillStyle = aura;
    ctx.beginPath();
    ctx.ellipse(0, feetY, r * (1.5 + t), r * (0.7 + t * 0.4), 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Sérthetetlenség alatt villog
  if (w.invulnerable > 0 && Math.floor(now / 90) % 2 === 0) ctx.globalAlpha = 0.4;
  drawWizardFigure(
    ctx,
    look,
    {
      facing: w.side,
      walk: w.walk,
      moving: w.moving,
      time: now / 1000,
      cast: cast ? 1 - cast.age / castLength : 0,
      castColor: cast?.spell.color ?? null,
      castKind: cast?.spell.id ?? null,
    },
    0,
    feetY,
    figureSize,
  );
  ctx.globalAlpha = 1;

  drawShieldBubble(ctx, game, now);

  ctx.restore();
}

function drawEnemy(ctx: CanvasRenderingContext2D, enemy: Enemy, game: Game, now: number) {
  if (game.config.enemyLook === "dummy") {
    const s = easeOutBack(enemy.appear);
    drawTargetDummy(ctx, enemy.x, enemy.y + enemy.radius, enemy.radius * 3.2 * s, enemy.hitFlash);
    drawEnemyHpBar(ctx, enemy, enemy.x, enemy.y - enemy.radius * 2.3);
    return;
  }
  const s = easeOutBack(enemy.appear);
  const r = enemy.radius * s;
  // Fagyva nem billeg
  const bob = enemy.frozen > 0 ? 0 : Math.sin(now / 180 + enemy.phase) * 0.005;
  // Forgószél: a sodródás közben a levegőbe emelkedik
  const lift = enemy.push && enemy.push.delay <= 0 ? Math.sin(Math.PI * enemy.push.t) * 0.16 : 0;
  // Ütés: gyors nekilendülés a mágus felé, majd vissza
  let lungeX = 0;
  let lungeY = 0;
  if (enemy.attackAnim > 0) {
    const ddx = game.wizard.x - enemy.x;
    const ddy = game.wizard.y - enemy.y;
    const dd = Math.hypot(ddx, ddy) || 1;
    const k = Math.sin(Math.PI * (1 - enemy.attackAnim)) * r * 0.8;
    lungeX = (ddx / dd) * k;
    lungeY = (ddy / dd) * k;
  }
  const x = enemy.x + lungeX;
  const y = enemy.y + bob - lift + lungeY;

  // Saját rajzú fajok (rét): a rajzoló intézi a testet, az animációt és az árnyékot
  if (hasSprite(enemy.type)) {
    const gy = enemy.y + r * 0.6 + lungeY;
    drawEnemySprite(ctx, enemy, x, gy, r, now / 1000, lift);
    const top = gy - lift - enemy.height - r * (SPRITE_TOP[enemy.type] ?? 2);
    if (!enemy.burrowed) drawEnemyHpBar(ctx, enemy, x, top);
    if (enemy.poisoned > 0) drawPoisonOverlay(ctx, enemy, now);
    if (enemy.frozen > 0) drawFrozenOverlay(ctx, enemy, now);
    if (enemy.dizzy > 0 && !enemy.push) drawDizzyOverlay(ctx, enemy, now);
    return;
  }

  // Árnyék
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.beginPath();
  ctx.ellipse(enemy.x, enemy.y + r * 0.9, r * 0.9, r * 0.3, 0, 0, Math.PI * 2);
  ctx.fill();

  // Sodródás közben pörög a teste
  ctx.save();
  if (enemy.spin !== 0) {
    ctx.translate(x, y);
    ctx.rotate(enemy.spin);
    ctx.translate(-x, -y);
  }

  // Test
  const [bodyColor, rimColor] = game.config.enemyTint;
  ctx.fillStyle = enemy.hitFlash > 0 ? mixHex(bodyColor, "#ffffff", enemy.hitFlash) : bodyColor;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 0.005;
  ctx.strokeStyle = rimColor;
  ctx.stroke();

  // Szemek a mágus felé néznek
  const dx = game.wizard.x - enemy.x;
  const dy = game.wizard.y - enemy.y;
  const d = Math.hypot(dx, dy) || 1;
  const lx = (dx / d) * r * 0.25;
  const ly = (dy / d) * r * 0.25;
  ctx.fillStyle = "#ffe08a";
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(x + side * r * 0.35 + lx, y - r * 0.1 + ly, r * 0.17, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // Ütés közben haragos szemöldök
  if (enemy.attackAnim > 0) {
    ctx.strokeStyle = "#1e1b2e";
    ctx.lineWidth = r * 0.12;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x - r * 0.6, y - r * 0.45);
    ctx.lineTo(x - r * 0.15, y - r * 0.28);
    ctx.moveTo(x + r * 0.6, y - r * 0.45);
    ctx.lineTo(x + r * 0.15, y - r * 0.28);
    ctx.stroke();
  }
  drawEnemyHpBar(ctx, enemy, x, y - r * 1.55);
  if (enemy.poisoned > 0) drawPoisonOverlay(ctx, enemy, now);
  if (enemy.frozen > 0) drawFrozenOverlay(ctx, enemy, now);
  if (enemy.dizzy > 0 && !enemy.push) drawDizzyOverlay(ctx, enemy, now);
}

function drawProjectile(ctx: CanvasRenderingContext2D, p: Projectile) {
  // Fényudvar (elmosott árnyék helyett)
  const halo = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 0.06);
  halo.addColorStop(0, hexToRgba(p.color, 0.6));
  halo.addColorStop(1, hexToRgba(p.color, 0));
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(p.x, p.y, 0.06, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = p.color;
  ctx.shadowColor = p.color;
  ctx.shadowBlur = 0;
  ctx.beginPath();
  ctx.arc(p.x, p.y, 0.02, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#fff7d6";
  ctx.beginPath();
  ctx.arc(p.x, p.y, 0.009, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
}

function drawBolt(ctx: CanvasRenderingContext2D, bolt: Bolt) {
  ctx.globalAlpha = Math.max(0, bolt.life);
  ctx.strokeStyle = bolt.color;
  ctx.lineWidth = 0.012 * bolt.life + 0.003;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.shadowColor = bolt.color;
  ctx.shadowBlur = 0;
  ctx.beginPath();
  ctx.moveTo(bolt.points[0].x, bolt.points[0].y);
  for (let i = 1; i < bolt.points.length; i++) {
    const a = bolt.points[i - 1];
    const b = bolt.points[i];
    // Cikázó szakaszok, minden képkockán másképp
    const steps = 6;
    for (let k = 1; k <= steps; k++) {
      const t = k / steps;
      const jitter = k === steps ? 0 : (Math.random() - 0.5) * 0.05;
      const nx = -(b.y - a.y);
      const ny = b.x - a.x;
      const len = Math.hypot(nx, ny) || 1;
      ctx.lineTo(a.x + (b.x - a.x) * t + (nx / len) * jitter, a.y + (b.y - a.y) * t + (ny / len) * jitter);
    }
  }
  // Fény: ugyanaz a vonal szélesen és halványan
  const lw = ctx.lineWidth;
  ctx.globalAlpha = Math.max(0, bolt.life) * 0.3;
  ctx.lineWidth = lw * 4;
  ctx.stroke();
  ctx.globalAlpha = Math.max(0, bolt.life);
  ctx.lineWidth = lw;
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1;
}

// ---------------------------------------------------------------- HUD
// Letisztult, modern stílus: áttetsző sötét üvegpanelek vékony világos
// szegéllyel, vonalas ikonok, gyűrűs mérők.

const HUD_TEXT = "rgba(255,255,255,0.94)";
const HUD_MUTED = "rgba(255,255,255,0.55)";
const HUD_FONT = "Inter, system-ui, -apple-system, 'Segoe UI', sans-serif";

/** Kattintható HUD-területek képpontban (a legutóbb kirajzolt képkockából) */
export const hudHitAreas: { menu: { x: number; y: number; w: number; h: number } | null } = { menu: null };

const panelCache = new Map<string, HTMLCanvasElement>();
const PANEL_MARGIN = 40;

/** Áttetsző üvegpanel lágy árnyékkal és vékony szegéllyel (a drága árnyék miatt gyorsítótárból) */
function drawGlassPanel(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, radius: number) {
  const key = `${Math.round(w)}x${Math.round(h)}x${Math.round(radius)}`;
  let img = panelCache.get(key);
  if (!img) {
    if (panelCache.size > 40) panelCache.clear();
    img = document.createElement("canvas");
    img.width = Math.ceil(w) + PANEL_MARGIN * 2;
    img.height = Math.ceil(h) + PANEL_MARGIN * 2;
    paintGlassPanel(img.getContext("2d")!, PANEL_MARGIN, PANEL_MARGIN, w, h, radius);
    panelCache.set(key, img);
  }
  ctx.drawImage(img, Math.round(x) - PANEL_MARGIN, Math.round(y) - PANEL_MARGIN);
}

function paintGlassPanel(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, radius: number) {
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.35)";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 6;
  const bg = ctx.createLinearGradient(0, y, 0, y + h);
  bg.addColorStop(0, "rgba(22,24,32,0.72)");
  bg.addColorStop(1, "rgba(12,13,18,0.78)");
  ctx.fillStyle = bg;
  roundRect(ctx, x, y, w, h, radius);
  ctx.fill();
  ctx.restore();
  ctx.strokeStyle = "rgba(255,255,255,0.12)";
  ctx.lineWidth = 1;
  roundRect(ctx, x + 0.5, y + 0.5, w - 1, h - 1, radius);
  ctx.stroke();
  // Halvány felső fény
  const sheen = ctx.createLinearGradient(0, y, 0, y + h * 0.5);
  sheen.addColorStop(0, "rgba(255,255,255,0.06)");
  sheen.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = sheen;
  roundRect(ctx, x, y, w, h * 0.5, radius);
  ctx.fill();
}

/** Ellenfél életerőcsíkja a feje fölött (csak ha már sérült) */
function drawEnemyHpBar(ctx: CanvasRenderingContext2D, enemy: Enemy, cx: number, cy: number) {
  if (enemy.hp >= enemy.maxHp || enemy.maxHp <= 0) return;
  const w = enemy.radius * 2.3;
  const h = Math.max(0.008, enemy.radius * 0.24);
  const x = cx - w / 2;
  const frac = Math.max(0, enemy.hp / enemy.maxHp);
  const trail = Math.max(frac, Math.min(1, enemy.hpTrail / enemy.maxHp));
  ctx.fillStyle = "rgba(10,10,15,0.8)";
  roundRect(ctx, x - h * 0.25, cy - h * 0.25, w + h * 0.5, h * 1.5, h);
  ctx.fill();
  if (trail > frac) {
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    roundRect(ctx, x, cy, w * trail, h, h / 2);
    ctx.fill();
  }
  ctx.fillStyle = frac > 0.5 ? "#f43f5e" : frac > 0.25 ? "#fb923c" : "#facc15";
  roundRect(ctx, x, cy, w * frac, h, h / 2);
  ctx.fill();
}

/** Adatsáv a bal felső sarokban: menü, pályajel, eltelt idő és az elpusztított ellenfelek száma */
function drawTopHud(ctx: CanvasRenderingContext2D, game: Game, label: string, unit: number) {
  const h = Math.max(38, unit * 0.095);
  const y = Math.max(12, unit * 0.03);
  const icon = h * 0.5;
  const pad = h * 0.38;
  const gap = h * 0.2;
  const divider = h * 0.6;
  const font = `600 ${Math.round(h * 0.4)}px ${HUD_FONT}`;
  const labelFont = `700 ${Math.round(h * 0.34)}px ${HUD_FONT}`;

  const seconds = Math.floor(game.time);
  const time = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  const goal = game.config.killGoal;
  const kills = goal > 0 ? `${game.defeated} / ${goal}` : String(game.kills);

  ctx.font = labelFont;
  const chipW = ctx.measureText(label).width + h * 0.5;
  ctx.font = font;
  // Az időt a leghosszabb számjegyekkel mérjük, hogy a sáv ne ugráljon
  const timeW = ctx.measureText(time.replace(/\d/g, "0")).width;
  const killsW = Math.max(ctx.measureText(goal > 0 ? `000 / ${goal}` : "000").width, ctx.measureText(kills).width);
  const menuW = icon * 1.1;
  const totalW = pad * 2 + menuW + divider + chipW + divider * 2 + icon + gap + timeW + icon + gap + killsW;
  const x = y;
  const cy = y + h / 2;

  drawGlassPanel(ctx, x, y, totalW, h, h / 2);
  hudHitAreas.menu = { x, y, w: totalW, h };

  ctx.save();
  ctx.textBaseline = "middle";
  let cursor = x + pad;

  // Menü ikon: három vonal
  ctx.strokeStyle = HUD_TEXT;
  ctx.lineWidth = Math.max(2, h * 0.07);
  ctx.lineCap = "round";
  ctx.beginPath();
  for (const k of [-1, 0, 1]) {
    ctx.moveTo(cursor + menuW * 0.1, cy + k * h * 0.17);
    ctx.lineTo(cursor + menuW * 0.9, cy + k * h * 0.17);
  }
  ctx.stroke();
  cursor += menuW;
  ctx.fillStyle = "rgba(255,255,255,0.12)";
  ctx.fillRect(cursor + divider / 2 - 0.5, y + h * 0.28, 1, h * 0.44);
  cursor += divider;

  // Pályajel finom chipben
  const chipH = h * 0.58;
  ctx.fillStyle = "rgba(255,255,255,0.1)";
  roundRect(ctx, cursor, cy - chipH / 2, chipW, chipH, chipH / 2);
  ctx.fill();
  ctx.font = labelFont;
  ctx.fillStyle = HUD_TEXT;
  ctx.textAlign = "center";
  ctx.fillText(label, cursor + chipW / 2, cy + 1);
  ctx.textAlign = "left";
  cursor += chipW;

  const drawDivider = () => {
    ctx.fillStyle = "rgba(255,255,255,0.12)";
    ctx.fillRect(cursor + divider / 2 - 0.5, y + h * 0.28, 1, h * 0.44);
    cursor += divider;
  };

  drawDivider();
  drawStopwatchLineIcon(ctx, cursor + icon / 2, cy, icon, HUD_MUTED);
  cursor += icon + gap;
  ctx.font = font;
  ctx.fillStyle = HUD_TEXT;
  ctx.fillText(time, cursor, cy + 1);
  cursor += timeW;

  drawDivider();
  drawSkullLineIcon(ctx, cursor + icon / 2, cy, icon, HUD_MUTED);
  cursor += icon + gap;
  ctx.fillStyle = HUD_TEXT;
  ctx.fillText(kills, cursor, cy + 1);
  // Haladás a pálya végéig: vékony csík a panel alján
  if (goal > 0) {
    const inset = h * 0.45;
    const barW = totalW - inset * 2;
    ctx.fillStyle = "rgba(255,255,255,0.1)";
    roundRect(ctx, x + inset, y + h - 4, barW, 2.5, 1.25);
    ctx.fill();
    ctx.fillStyle = "#a3e635";
    roundRect(ctx, x + inset, y + h - 4, Math.max(2.5, barW * Math.min(1, game.defeated / goal)), 2.5, 1.25);
    ctx.fill();
  }
  ctx.restore();
}

/** A mérők "utóhúzása": sebzés vagy költés után lassan követi a valódi értéket */
const trails = new WeakMap<Game, { hp: number; mana: number }>();

/** A mérő sugara és a mérő–gombok távolság a HUD alapméretéhez képest */
const GAUGE_RATIO = 0.6;
const GAUGE_GAP_RATIO = 0.2;

interface Gauge {
  cx: number;
  cy: number;
  r: number;
  frac: number;
  trailFrac: number;
  color: string;
  colorEnd: string;
  value: string;
  caption: string;
  /** 0..1, izzás (alacsony életerő) */
  glow: number;
  /** 0..1, ütés: rázkódás és fehér villanás */
  hit: number;
  /** 0..1, rövid lüktetés (pl. varázslás) */
  pulse: number;
  time: number;
}

/** Kerek mérő: a kört a szintnek megfelelő folyadék tölti ki, középen a szám */
function drawGauge(ctx: CanvasRenderingContext2D, g: Gauge) {
  const shake = g.hit > 0 ? g.hit * g.r * 0.08 : 0;
  const cx = g.cx + Math.sin(g.time * 70) * shake;
  const cy = g.cy + Math.cos(g.time * 53) * shake * 0.6;
  const r = g.r * 0.9 * (1 + g.pulse * 0.06);
  const frac = Math.max(0, Math.min(1, g.frac));
  const trailFrac = Math.max(frac, Math.min(1, g.trailFrac));

  // Izzás a mérő körül (alacsony életerő, ütés, lüktetés)
  const halo = Math.max(g.glow, g.hit, g.pulse * 0.6);
  if (halo > 0) {
    const hg = ctx.createRadialGradient(cx, cy, r * 0.8, cx, cy, r * 1.5);
    hg.addColorStop(0, hexToRgba(g.color, 0.5 * halo));
    hg.addColorStop(1, hexToRgba(g.color, 0));
    ctx.fillStyle = hg;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 1.5, 0, Math.PI * 2);
    ctx.fill();
  }

  const surface = (level: number) => (x: number) =>
    level + Math.sin((x - cx) / (r * 0.4) + g.time * 2.2) * r * 0.04;
  const fillTo = (f: number, style: string | CanvasGradient) => {
    const s = surface(cy + r - r * 2 * f);
    ctx.fillStyle = style;
    ctx.beginPath();
    ctx.moveTo(cx - r, cy + r);
    for (let x = cx - r; x <= cx + r + 1; x += r / 10) ctx.lineTo(x, s(x));
    ctx.lineTo(cx + r, cy + r);
    ctx.closePath();
    ctx.fill();
  };

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();
  // Üres rész: sötét, áttetsző
  ctx.fillStyle = "rgba(255,255,255,0.06)";
  ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  // Nemrég elvesztett rész: halvány, lassan húzódik le
  if (trailFrac > frac + 0.002) fillTo(trailFrac, "rgba(255,255,255,0.28)");
  // Folyadék
  if (frac > 0) {
    const level = cy + r - r * 2 * frac;
    const liquid = ctx.createLinearGradient(0, level, 0, cy + r);
    liquid.addColorStop(0, hexToRgba(g.color, 0.85));
    liquid.addColorStop(1, hexToRgba(g.colorEnd, 0.95));
    fillTo(frac, liquid);
    // Fényes felszín
    const s = surface(level);
    ctx.strokeStyle = "rgba(255,255,255,0.55)";
    ctx.lineWidth = Math.max(1.5, r * 0.03);
    ctx.beginPath();
    for (let x = cx - r; x <= cx + r + 1; x += r / 10) {
      if (x === cx - r) ctx.moveTo(x, s(x));
      else ctx.lineTo(x, s(x));
    }
    ctx.stroke();
  }
  // Ütéskor fehér villanás
  if (g.hit > 0) {
    ctx.fillStyle = `rgba(255,255,255,${0.35 * g.hit})`;
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  }
  ctx.restore();

  // Vékony szegély
  ctx.strokeStyle = hexToRgba(g.color, 0.45 + halo * 0.4);
  ctx.lineWidth = Math.max(1.5, r * 0.035);
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();

  // Szám és felirat
  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `800 ${Math.round(r * 0.62)}px ${HUD_FONT}`;
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.fillText(g.value, cx + 1, cy - r * 0.08 + 2);
  ctx.fillStyle = "#ffffff";
  ctx.fillText(g.value, cx, cy - r * 0.08);
  ctx.font = `700 ${Math.round(r * 0.18)}px ${HUD_FONT}`;
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.fillText(spaced(g.caption), cx, cy + r * 0.48);
  ctx.restore();
}

/** Ritkított betűközű felirat (kis kapitális hatás) */
function spaced(text: string) {
  return text.split("").join(" ");
}

/** Az életerő és a mana mérője a varázslatcsempék két oldalán, közös panelen */
function drawHudGauges(
  ctx: CanvasRenderingContext2D,
  game: Game,
  layout: { left: number; bandTop: number; totalW: number; base: number },
  now: number,
) {
  const { maxHp, maxMana } = game.config;
  const hp = Math.max(0, game.wizard.hp);
  const mana = game.wizard.mana;

  const trail = trails.get(game) ?? { hp, mana };
  trail.hp = hp >= trail.hp ? hp : Math.max(hp, trail.hp - maxHp * 0.008);
  trail.mana = mana >= trail.mana ? mana : Math.max(mana, trail.mana - maxMana * 0.012);
  trails.set(game, trail);

  const { left, bandTop, totalW, base } = layout;
  const r = base * GAUGE_RATIO;
  const gap = base * GAUGE_GAP_RATIO;
  const pad = base * 0.16;
  const cy = bandTop + base / 2;
  const hpX = left - gap - r;
  const manaX = left + totalW + gap + r;

  drawGlassPanel(ctx, hpX - r - pad, bandTop - pad, manaX - hpX + (r + pad) * 2, base + pad * 2, base * 0.28);

  const lowHp = hp > 0 && hp / maxHp <= 0.3;
  drawGauge(ctx, {
    cx: hpX,
    cy,
    r,
    frac: hp / maxHp,
    trailFrac: trail.hp / maxHp,
    color: "#fb7185",
    colorEnd: "#e11d48",
    value: String(hp),
    caption: "ÉLET",
    glow: lowHp ? 0.5 + 0.5 * Math.sin(now / 130) : 0,
    hit: game.hurtFlash,
    pulse: 0,
    time: now / 1000,
  });
  drawGauge(ctx, {
    cx: manaX,
    cy,
    r,
    frac: mana / maxMana,
    trailFrac: trail.mana / maxMana,
    color: "#60a5fa",
    colorEnd: "#2563eb",
    value: String(Math.floor(mana)),
    caption: "MANA",
    glow: 0,
    hit: latestAttempt(game, null, "no_mana", 0.5) ? 1 - latestAttempt(game, null, "no_mana", 0.5)!.age / 0.5 : 0,
    pulse: game.lastCast ? Math.max(0, 1 - game.lastCast.age / 0.35) : 0,
    time: now / 1000 + 1.3,
  });
}

/** A varázslatcsempék egymás mellett, középen alul. Akárhány varázslat lehet:
 *  ha nem férnek ki teljes méretben, kisebbek és egyszerűbbek lesznek. */
function drawSpellBar(
  ctx: CanvasRenderingContext2D,
  game: Game,
  spells: SpellLook[],
  width: number,
  height: number,
  unit: number,
  now: number,
) {
  const mana = game.wizard.mana;
  // A HUD alapmérete (mérők, panel); a csempék legfeljebb ekkorák
  const base = Math.max(72, unit * 0.19);
  const margin = Math.max(16, unit * 0.04);
  const gaugeSpace = base * GAUGE_RATIO * 2 + base * GAUGE_GAP_RATIO + base * 0.16;
  const maxRowW = Math.max(base, width - 2 * (margin + gaugeSpace));
  const n = spells.length;
  const gapRatio = 0.14;
  const slot = n > 0 ? Math.max(34, Math.min(base, maxRowW / (n + (n - 1) * gapRatio))) : base;
  const gap = slot * gapRatio;
  const totalW = n > 0 ? n * slot + (n - 1) * gap : base * 0.6;
  const bandTop = height - base - Math.max(26, unit * 0.07);
  const top = bandTop + (base - slot) / 2;
  const left = (width - totalW) / 2;
  // Teljes: jel, név, mana és idő; kompakt: név nélkül; mini: csak a jel
  const mode = slot >= 66 ? "full" : slot >= 48 ? "compact" : "mini";

  drawHudGauges(ctx, game, { left, bandTop, totalW, base }, now);

  spells.forEach((spell, i) => {
    const x = left + i * (slot + gap);
    const cooling = game.cooldownLeft(spell.id);
    const ready = mana >= spell.mana && cooling <= 0;
    const radius = slot * 0.16;

    // A legutóbbi kísérlet ezzel a varázslattal: elsütéskor kiugrik, sikertelennél megrázkódik
    const attempt = latestAttempt(game, spell.id, null, 0.9);
    const castAnim = attempt?.result === "cast" ? attempt.age : -1;
    const failAnim = attempt && attempt.result !== "cast" && attempt.age < 0.5 ? attempt.age : -1;
    ctx.save();
    if (castAnim >= 0 && castAnim < 0.4) {
      const pop = 1 + 0.2 * Math.sin(Math.PI * (castAnim / 0.4));
      ctx.translate(x + slot / 2, top + slot / 2);
      ctx.scale(pop, pop);
      ctx.translate(-(x + slot / 2), -(top + slot / 2) - slot * 0.12 * Math.sin(Math.PI * (castAnim / 0.4)));
    }
    if (failAnim >= 0) ctx.translate(Math.sin(failAnim * 70) * slot * 0.07 * (1 - failAnim / 0.5), 0);

    // Csempe
    ctx.fillStyle = ready ? hexToRgba(spell.color, 0.1) : "rgba(255,255,255,0.04)";
    roundRect(ctx, x, top, slot, slot, radius);
    ctx.fill();
    ctx.strokeStyle = ready ? hexToRgba(spell.color, 0.55) : "rgba(255,255,255,0.1)";
    ctx.lineWidth = 1;
    roundRect(ctx, x + 0.5, top + 0.5, slot - 1, slot - 1, radius);
    ctx.stroke();

    // Mana: alulról halványan telik a hiányzó mana arányában
    if (mana < spell.mana) {
      ctx.save();
      roundRect(ctx, x, top, slot, slot, radius);
      ctx.clip();
      ctx.fillStyle = hexToRgba(spell.color, 0.12);
      const fill = (slot * mana) / spell.mana;
      ctx.fillRect(x, top + slot - fill, slot, fill);
      ctx.restore();
    }

    // Jel: használható állapotban a varázslat színében izzik
    ctx.save();
    ctx.strokeStyle = ready ? spell.color : "rgba(255,255,255,0.3)";
    ctx.lineWidth = Math.max(2, slot * 0.045);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    if (ready) {
      // Fény: széles, áttetsző vonal a jel alatt
      const lw = ctx.lineWidth;
      ctx.strokeStyle = hexToRgba(spell.color, 0.25);
      ctx.lineWidth = lw * 3;
      if (mode === "full") drawGlyph(ctx, spell.path, x + slot / 2, top + slot * 0.34, slot * 0.34);
      else if (mode === "compact") drawGlyph(ctx, spell.path, x + slot / 2, top + slot * 0.38, slot * 0.42);
      else drawGlyph(ctx, spell.path, x + slot / 2, top + slot / 2, slot * 0.5);
      ctx.strokeStyle = spell.color;
      ctx.lineWidth = lw;
    }
    if (mode === "full") drawGlyph(ctx, spell.path, x + slot / 2, top + slot * 0.34, slot * 0.34);
    else if (mode === "compact") drawGlyph(ctx, spell.path, x + slot / 2, top + slot * 0.38, slot * 0.42);
    else drawGlyph(ctx, spell.path, x + slot / 2, top + slot / 2, slot * 0.5);
    ctx.restore();

    if (mode === "full") {
      ctx.fillStyle = ready ? HUD_TEXT : HUD_MUTED;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = `500 ${Math.max(10, slot * 0.14)}px ${HUD_FONT}`;
      ctx.fillText(spell.name, x + slot / 2, top + slot * 0.68);
    }

    // Alsó sor: mana és töltési idő, a csempe közepére igazítva
    if (mode !== "mini") {
      const statY = top + slot * (mode === "full" ? 0.86 : 0.82);
      const iconSize = Math.max(8, slot * 0.13);
      const iconGap = iconSize * 0.3;
      const groupGap = slot * 0.08;
      ctx.font = `600 ${Math.max(8, slot * 0.12)}px ${HUD_FONT}`;
      ctx.textBaseline = "middle";
      ctx.textAlign = "left";
      const manaText = String(spell.mana);
      const timeText = spell.cooldown.toLocaleString("hu-HU");
      const manaW = ctx.measureText(manaText).width;
      const timeW = ctx.measureText(timeText).width;
      const rowW = iconSize + iconGap + manaW + groupGap + iconSize + iconGap + timeW;
      let cursor = x + (slot - rowW) / 2;
      ctx.globalAlpha = ready ? 1 : 0.55;
      drawManaIcon(ctx, cursor + iconSize / 2, statY, iconSize);
      cursor += iconSize + iconGap;
      ctx.fillStyle = HUD_MUTED;
      ctx.fillText(manaText, cursor, statY);
      cursor += manaW + groupGap;
      drawCooldownIcon(ctx, cursor + iconSize / 2, statY, iconSize);
      cursor += iconSize + iconGap;
      ctx.fillText(timeText, cursor, statY);
      ctx.globalAlpha = 1;
      ctx.textAlign = "center";
      ctx.textBaseline = "alphabetic";
    }

    // Töltési idő: körbe fogyó sötét takarás és a hátralévő másodpercek
    if (cooling > 0) {
      const frac = Math.min(1, cooling / spell.cooldown);
      const cx = x + slot / 2;
      const cy = top + slot / 2;
      ctx.save();
      roundRect(ctx, x, top, slot, slot, radius);
      ctx.clip();
      ctx.fillStyle = "rgba(8,9,12,0.62)";
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, slot, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      ctx.fillStyle = HUD_TEXT;
      ctx.font = `600 ${Math.max(12, slot * 0.28)}px ${HUD_FONT}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(cooling >= 1 ? String(Math.ceil(cooling)) : cooling.toFixed(1), cx, cy);
      ctx.textBaseline = "alphabetic";
    }

    // Elsütés: színes villanás, felizzó jel és kitáguló fénykeret
    if (castAnim >= 0 && castAnim < 0.9) {
      if (castAnim < 0.35) {
        ctx.save();
        roundRect(ctx, x, top, slot, slot, radius);
        ctx.clip();
        ctx.fillStyle = hexToRgba(spell.color, 0.55 * (1 - castAnim / 0.35));
        ctx.fillRect(x, top, slot, slot);
        ctx.restore();
        ctx.save();
        ctx.strokeStyle = "#ffffff";
        ctx.globalAlpha = 1 - castAnim / 0.35;
        ctx.lineWidth = Math.max(2, slot * 0.05);
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.shadowColor = spell.color;
        ctx.shadowBlur = 0;
        const gy = mode === "full" ? top + slot * 0.34 : mode === "compact" ? top + slot * 0.38 : top + slot / 2;
        const gs = mode === "full" ? slot * 0.34 : mode === "compact" ? slot * 0.42 : slot * 0.5;
        drawGlyph(ctx, spell.path, x + slot / 2, gy, gs);
        ctx.restore();
      }
      for (const [delay, grow] of [
        [0, 0.55],
        [0.12, 0.85],
      ]) {
        const q = (castAnim - delay) / (0.9 - delay);
        if (q <= 0 || q >= 1) continue;
        const e = 1 - Math.pow(1 - q, 3);
        const pad = slot * grow * e;
        ctx.save();
        ctx.strokeStyle = hexToRgba(spell.color, (1 - q) * 0.9);
        ctx.lineWidth = Math.max(1.5, slot * 0.05 * (1 - q));
        ctx.shadowColor = spell.color;
        ctx.shadowBlur = 0;
        roundRect(ctx, x - pad / 2, top - pad / 2, slot + pad, slot + pad, radius + pad / 2);
        ctx.stroke();
        ctx.restore();
      }
    }
    // Sikertelen: címke a csempe fölött az okkal (pl. "6,3 mp" vagy "még 7 mana")
    if (attempt && attempt.result !== "cast" && attempt.age < 0.9) {
      const a = attempt.age;
      const appear = Math.min(1, a / 0.12);
      const fade = a < 0.65 ? 1 : 1 - (a - 0.65) / 0.25;
      const label =
        attempt.result === "no_mana"
          ? `még ${Math.ceil(attempt.missing)} mana`
          : `${attempt.missing.toFixed(1).replace(".", ",")} mp`;
      ctx.save();
      ctx.globalAlpha = fade;
      ctx.font = `700 ${Math.max(11, slot * 0.17)}px ${HUD_FONT}`;
      const lw = ctx.measureText(label).width + slot * 0.22;
      const lh = Math.max(18, slot * 0.28);
      const lx = x + slot / 2;
      const ly = top - lh * 0.5 - slot * 0.1 - (1 - appear) * 6 - Math.max(0, a - 0.4) * 10;
      ctx.fillStyle = attempt.result === "no_mana" ? "#1d4ed8" : "#6d28d9";
      roundRect(ctx, lx - lw / 2, ly - lh / 2, lw, lh, lh / 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.35)";
      ctx.lineWidth = 1;
      roundRect(ctx, lx - lw / 2 + 0.5, ly - lh / 2 + 0.5, lw - 1, lh - 1, lh / 2);
      ctx.stroke();
      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(label, lx, ly + 1);
      ctx.restore();
    }
    // Sikertelen: piros villanás a csempén
    if (failAnim >= 0) {
      const q = 1 - failAnim / 0.5;
      ctx.save();
      ctx.strokeStyle = `rgba(248,113,113,${q})`;
      ctx.lineWidth = Math.max(2, slot * 0.05);
      ctx.shadowColor = "#ef4444";
      ctx.shadowBlur = 0;
      roundRect(ctx, x, top, slot, slot, radius);
      ctx.stroke();
      ctx.fillStyle = `rgba(239,68,68,${0.25 * q})`;
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  });
}

/** A legutóbbi varázslási kísérlet (varázslat és eredmény szerint szűrve), ha elég friss */
function latestAttempt(game: Game, spellId: string | null, result: string | null, maxAge: number) {
  for (let i = game.attempts.length - 1; i >= 0; i--) {
    const a = game.attempts[i];
    if (spellId && a.spellId !== spellId) continue;
    if (result && a.result !== result) continue;
    return a.age <= maxAge ? a : null;
  }
  return null;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, Math.max(0, w), h, Math.min(r, h / 2));
}

function easeOutBack(t: number) {
  const c = 1.70158;
  return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2);
}

function hexToRgba(hex: string, alpha: number) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}

function mixHex(a: string, b: string, t: number) {
  const na = parseInt(a.slice(1), 16);
  const nb = parseInt(b.slice(1), 16);
  const ch = (shift: number) => Math.round(((na >> shift) & 255) * (1 - t) + ((nb >> shift) & 255) * t);
  return `rgb(${ch(16)},${ch(8)},${ch(0)})`;
}
