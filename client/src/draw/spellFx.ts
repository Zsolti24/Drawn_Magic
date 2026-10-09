// A varázslatok effektjei a pályán (világkoordinátában). Két réteg: a földön
// lévők az alakok alatt, a levegőben lévők fölöttük.
import type { BlackHole, Bomb, Enemy, FrostNova, Game, Impact, Meteor, PoisonCloud, Ring, Scorch, Tornado } from "../game/Game";

/** Földi effektek: perzselés, kráter, dér, méregtócsa, idézőkör, a fekete lyuk örvénye */
export function drawGroundEffects(ctx: CanvasRenderingContext2D, game: Game, now: number) {
  const t = now / 1000;
  for (const s of game.scorches) drawScorch(ctx, s, now);
  for (const im of game.impacts) drawImpactGround(ctx, im, t);
  for (const n of game.novas) drawNovaGround(ctx, n, t);
  for (const c of game.clouds) drawPoisonPool(ctx, c, t);
  for (const m of game.meteors) drawSummonCircle(ctx, m, t);
  for (const bh of game.blackholes) drawBlackHoleGround(ctx, bh, t);
  for (const tor of game.tornados) drawTornadoGround(ctx, tor, t);
}

/** Levegőben lévő effektek: forgószél, jégtüskék, fiola, meteor, robbanás, fekete lyuk */
export function drawAirEffects(ctx: CanvasRenderingContext2D, game: Game, now: number) {
  const t = now / 1000;
  for (const r of game.rings) drawRing(ctx, r);
  for (const n of game.novas) drawNovaSpikes(ctx, n, t);
  for (const c of game.clouds) drawPoisonFumes(ctx, c, t);
  for (const bh of game.blackholes) drawBlackHole(ctx, bh, t);
  for (const tor of game.tornados) drawTornado(ctx, tor, t);
  for (const b of game.bombs) drawBomb(ctx, b, t);
  for (const m of game.meteors) drawFallingMeteor(ctx, m, t);
  for (const im of game.impacts) drawImpactAir(ctx, im, t);
}

// ================================================================ tornádó

function tornadoFade(tor: Tornado) {
  const p = tor.age / tor.duration;
  return Math.min(1, tor.age / 0.25) * (p < 0.8 ? 1 : 1 - (p - 0.8) / 0.2);
}

/** Talaj: örvénylő porfelhő és kifelé száguldó szélcsíkok */
function drawTornadoGround(ctx: CanvasRenderingContext2D, tor: Tornado, t: number) {
  const fade = tornadoFade(tor);
  const reach = Math.min(1.6, 0.2 + tor.age * 2.2);
  ctx.save();
  ctx.lineCap = "round";

  // Porfelhő a tölcsér talpánál
  const dust = ctx.createRadialGradient(tor.x, tor.y, 0, tor.x, tor.y, 0.32);
  dust.addColorStop(0, `rgba(180,160,120,${0.45 * fade})`);
  dust.addColorStop(1, "rgba(180,160,120,0)");
  ctx.fillStyle = dust;
  ctx.beginPath();
  ctx.ellipse(tor.x, tor.y, 0.32, 0.17, 0, 0, Math.PI * 2);
  ctx.fill();
  for (let i = 0; i < 6; i++) {
    const a = t * 7 + i * 1.05;
    ctx.strokeStyle = `rgba(214,200,160,${0.5 * fade})`;
    ctx.lineWidth = 0.008;
    ctx.beginPath();
    ctx.ellipse(tor.x, tor.y, 0.1 + i * 0.035, (0.1 + i * 0.035) * 0.45, 0, a, a + 1.6);
    ctx.stroke();
  }

  // Szélcsíkok: spirálpályán kifelé száguldanak, elvékonyodó farokkal
  for (let i = 0; i < 46; i++) {
    const s = (t * 0.9 + i * 0.137) % 1;
    const r = 0.12 + s * reach;
    const a0 = i * 2.39 + t * 2.5 + s * 3.2;
    ctx.strokeStyle = i % 4 === 0 ? `rgba(255,255,255,${0.55 * fade * (1 - s)})` : hexToRgba(tor.color, 0.55 * fade * (1 - s));
    ctx.lineWidth = 0.006 + (1 - s) * 0.006;
    ctx.beginPath();
    for (let k = 0; k <= 6; k++) {
      const kk = k / 6;
      const rr = r - kk * 0.06;
      const aa = a0 - kk * 0.5;
      const x = tor.x + Math.cos(aa) * rr;
      const y = tor.y + Math.sin(aa) * rr * 0.55;
      if (k === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.restore();
}

/** A tölcsér: csavarodó szalagok, kígyózó tengely, keringő törmelék, villódzás */
function drawTornado(ctx: CanvasRenderingContext2D, tor: Tornado, t: number) {
  const fade = tornadoFade(tor);
  const grow = easeOut(Math.min(1, tor.age / 0.45));
  const H = 0.85 * grow;
  const bands = 22;
  const axis = (k: number) => tor.x + Math.sin(t * 2.3 + k * 2.4) * 0.05 * k + Math.sin(t * 5 + k * 6) * 0.01;
  const radiusAt = (k: number) => 0.035 + Math.pow(k, 1.6) * 0.26;

  ctx.save();
  ctx.lineCap = "round";

  // Tölcsér teste: áttetsző sziluett függőleges színátmenettel
  const body = ctx.createLinearGradient(0, tor.y, 0, tor.y - H);
  body.addColorStop(0, hexToRgba(tor.color, 0.35 * fade));
  body.addColorStop(1, `rgba(240,253,250,${0.18 * fade})`);
  ctx.fillStyle = body;
  ctx.beginPath();
  for (let i = 0; i <= bands; i++) {
    const k = i / bands;
    ctx.lineTo(axis(k) - radiusAt(k), tor.y - k * H);
  }
  for (let i = bands; i >= 0; i--) {
    const k = i / bands;
    ctx.lineTo(axis(k) + radiusAt(k), tor.y - k * H);
  }
  ctx.closePath();
  ctx.fill();

  // Hátsó ívek (halványabbak), majd a csavarodó szálak, végül az elülső ívek
  const drawBandArcs = (front: boolean) => {
    for (let i = 0; i < bands; i++) {
      const k = i / bands;
      const rx = radiusAt(k);
      const cy = tor.y - k * H;
      const off = t * 9 + k * 5;
      ctx.strokeStyle = front
        ? i % 3 === 0
          ? `rgba(255,255,255,${0.7 * fade})`
          : hexToRgba(tor.color, 0.75 * fade)
        : hexToRgba(tor.color, 0.25 * fade);
      ctx.lineWidth = (front ? 0.012 : 0.008) * (1 - k * 0.4);
      ctx.beginPath();
      const a0 = front ? 0 : Math.PI;
      ctx.ellipse(axis(k), cy, rx, rx * 0.28, 0, a0 + Math.sin(off) * 0.4, a0 + Math.PI - 0.2 + Math.sin(off) * 0.4);
      ctx.stroke();
    }
  };
  drawBandArcs(false);

  // Csavarodó szálak: hélixek a tölcsér felületén
  for (let s = 0; s < 5; s++) {
    ctx.strokeStyle = s % 2 ? `rgba(240,253,250,${0.55 * fade})` : hexToRgba(tor.color, 0.65 * fade);
    ctx.lineWidth = 0.007;
    ctx.beginPath();
    for (let i = 0; i <= 40; i++) {
      const k = i / 40;
      const a = t * 11 + s * ((Math.PI * 2) / 5) + k * 9;
      const x = axis(k) + Math.cos(a) * radiusAt(k);
      const y = tor.y - k * H + Math.sin(a) * radiusAt(k) * 0.28;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  drawBandArcs(true);

  // Villódzás a tölcsér tetején
  if (Math.sin(t * 23) > 0.85) {
    const k = 0.75;
    ctx.strokeStyle = `rgba(255,255,255,${0.9 * fade})`;
    ctx.lineWidth = 0.006;
    ctx.beginPath();
    ctx.moveTo(axis(k) - 0.08, tor.y - k * H);
    ctx.lineTo(axis(k) - 0.02, tor.y - k * H + 0.05);
    ctx.lineTo(axis(k) + 0.03, tor.y - k * H + 0.02);
    ctx.lineTo(axis(k) + 0.08, tor.y - k * H + 0.08);
    ctx.stroke();
  }

  // Keringő törmelék: levelek, fűcsomók, kövek különböző magasságokban
  for (let i = 0; i < 18; i++) {
    const k = ((i * 0.618 + t * 0.12) % 1) * 0.9 + 0.05;
    const a = t * (6 + (i % 3)) + i * 1.9;
    const r = radiusAt(k) * 1.25;
    const x = axis(k) + Math.cos(a) * r;
    const y = tor.y - k * H + Math.sin(a) * r * 0.28;
    const depth = (Math.sin(a) + 1) / 2; // 1 = elöl
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(t * 8 + i);
    ctx.globalAlpha = fade * (0.45 + depth * 0.55);
    const size = 0.008 + depth * 0.008;
    ctx.fillStyle = i % 3 === 0 ? "#78716c" : i % 3 === 1 ? "#4d7c0f" : "#84cc16";
    ctx.beginPath();
    if (i % 3 === 0) ctx.arc(0, 0, size * 0.8, 0, Math.PI * 2);
    else ctx.ellipse(0, 0, size * 1.4, size * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

// ================================================================ méregbomba

function drawBomb(ctx: CanvasRenderingContext2D, b: Bomb, t: number) {
  const x = b.fromX + (b.toX - b.fromX) * b.t;
  const groundY = b.fromY + (b.toY - b.fromY) * b.t;
  // Rövid dobásnál laposabb ív
  const arc = Math.min(0.32, Math.hypot(b.toX - b.fromX, b.toY - b.fromY) * 0.5);
  const height = Math.sin(Math.PI * b.t) * arc;
  const y = groundY - height;
  const r = 0.03;

  // Árnyék és célfolt a földön
  ctx.fillStyle = `rgba(0,0,0,${Math.max(0.1, 0.32 - height)})`;
  ctx.beginPath();
  ctx.ellipse(x, groundY + 0.02, r * 1.1, r * 0.4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = hexToRgba(b.color, 0.35 + 0.35 * Math.sin(t * 20));
  ctx.lineWidth = 0.004;
  ctx.setLineDash([0.012, 0.01]);
  ctx.beginPath();
  ctx.ellipse(b.toX, b.toY, b.radius * 0.7, b.radius * 0.42, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  // Mérges füstcsík a fiola mögött
  for (let i = 1; i <= 8; i++) {
    const tt = Math.max(0, b.t - i * 0.04);
    const tx = b.fromX + (b.toX - b.fromX) * tt;
    const ty = b.fromY + (b.toY - b.fromY) * tt - Math.sin(Math.PI * tt) * arc;
    const pr = r * (0.5 + i * 0.12);
    const puff = ctx.createRadialGradient(tx, ty, 0, tx, ty, pr);
    puff.addColorStop(0, hexToRgba(b.color, 0.45 * (1 - i / 9)));
    puff.addColorStop(1, hexToRgba(b.color, 0));
    ctx.fillStyle = puff;
    ctx.beginPath();
    ctx.arc(tx, ty, pr, 0, Math.PI * 2);
    ctx.fill();
  }

  // Pörgő fiola
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(t * 14);
  glowAt(ctx, 0, 0, r * 2.8, b.color, 0.55);
  ctx.fillStyle = "rgba(217,249,157,0.35)";
  ctx.strokeStyle = "rgba(255,255,255,0.8)";
  ctx.lineWidth = 0.004;
  ctx.beginPath();
  ctx.arc(0, r * 0.2, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, r * 0.2, r * 0.9, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = b.color;
  ctx.beginPath();
  ctx.moveTo(-r, r * 0.1 + Math.sin(t * 20) * r * 0.1);
  ctx.quadraticCurveTo(0, r * 0.4, r, r * 0.1 - Math.sin(t * 20) * r * 0.1);
  ctx.lineTo(r, r * 1.3);
  ctx.lineTo(-r, r * 1.3);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = "rgba(217,249,157,0.5)";
  ctx.fillRect(-r * 0.3, -r * 1.2, r * 0.6, r * 0.5);
  ctx.fillStyle = "#92400e";
  ctx.fillRect(-r * 0.36, -r * 1.48, r * 0.72, r * 0.32);
  // Koponyajel a fiolán
  ctx.fillStyle = "rgba(20,40,10,0.8)";
  ctx.beginPath();
  ctx.arc(0, r * 0.15, r * 0.28, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = b.color;
  ctx.beginPath();
  ctx.arc(-r * 0.1, r * 0.12, r * 0.07, 0, Math.PI * 2);
  ctx.arc(r * 0.1, r * 0.12, r * 0.07, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.8)";
  ctx.beginPath();
  ctx.ellipse(-r * 0.45, -r * 0.15, r * 0.15, r * 0.28, -0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** A tócsa szabálytalan, hullámzó pereme */
function poolRadius(c: PoisonCloud, a: number, t: number, grow: number) {
  return c.radius * grow * (1 + 0.1 * Math.sin(3 * a + t * 1.7) + 0.06 * Math.sin(5 * a - t * 1.3) + 0.04 * Math.sin(8 * a + t * 2.6));
}

function drawPoisonPool(ctx: CanvasRenderingContext2D, c: PoisonCloud, t: number) {
  const age = c.maxLife - c.life;
  const grow = 0.35 + 0.65 * easeOutBack(Math.min(1, age / 0.35));
  const fade = Math.min(1, c.life / 0.7);
  const shape = (scale: number) => {
    ctx.beginPath();
    for (let i = 0; i <= 48; i++) {
      const a = (i / 48) * Math.PI * 2;
      const r = poolRadius(c, a, t, grow) * scale;
      const x = c.x + Math.cos(a) * r;
      const y = c.y + Math.sin(a) * r * 0.6;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
  };

  ctx.save();
  ctx.globalAlpha = fade;

  // Fröccsenés a becsapódáskor: koronaszerű csöppek kifelé
  if (age < 0.5) {
    const s = age / 0.5;
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2 + i * 0.3;
      const d = c.radius * (0.3 + s * (0.9 + (i % 3) * 0.25));
      const h = Math.sin(Math.PI * s) * (0.06 + (i % 4) * 0.02);
      ctx.fillStyle = hexToRgba(i % 2 ? c.color : "#ecfccb", 1 - s);
      ctx.beginPath();
      ctx.arc(c.x + Math.cos(a) * d, c.y + Math.sin(a) * d * 0.6 - h, 0.01 * (1 - s * 0.5), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Sötét perem, izzó belső rész
  ctx.fillStyle = "rgba(26,46,5,0.75)";
  shape(1.08);
  ctx.fill();
  const pool = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, c.radius * grow);
  const pulse = 0.85 + 0.15 * Math.sin(t * 4);
  pool.addColorStop(0, hexToRgba("#ecfccb", 0.85 * pulse));
  pool.addColorStop(0.35, hexToRgba(c.color, 0.95));
  pool.addColorStop(1, hexToRgba("#3f6212", 0.95));
  ctx.fillStyle = pool;
  shape(0.95);
  ctx.fill();
  ctx.strokeStyle = hexToRgba("#d9f99d", 0.7);
  ctx.lineWidth = 0.004;
  shape(0.95);
  ctx.stroke();

  // Vándorló csillanások a felszínen
  ctx.save();
  shape(0.95);
  ctx.clip();
  for (let i = 0; i < 3; i++) {
    const a = t * 0.6 + i * 2.1;
    ctx.fillStyle = "rgba(255,255,255,0.22)";
    ctx.beginPath();
    ctx.ellipse(c.x + Math.cos(a) * c.radius * 0.4, c.y + Math.sin(a) * c.radius * 0.2, c.radius * 0.22, c.radius * 0.06, a, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // Bugyborékok: nőnek, majd elpattannak
  for (let i = 0; i < 12; i++) {
    const phase = (t * 1.1 + i * 0.29) % 1;
    const a = i * 2.39;
    const d = ((i * 0.618) % 1) * c.radius * grow * 0.75;
    const bx = c.x + Math.cos(a) * d;
    const by = c.y + Math.sin(a) * d * 0.6;
    if (phase < 0.8) {
      const br = 0.005 + phase * 0.018;
      ctx.fillStyle = hexToRgba(c.color, 0.75);
      ctx.strokeStyle = "rgba(236,252,203,0.9)";
      ctx.lineWidth = 0.003;
      ctx.beginPath();
      ctx.arc(bx, by - br * 0.5, br, Math.PI, 0);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      ctx.beginPath();
      ctx.arc(bx - br * 0.35, by - br * 0.9, br * 0.25, 0, Math.PI * 2);
      ctx.fill();
    } else {
      const p = (phase - 0.8) / 0.2;
      ctx.strokeStyle = `rgba(236,252,203,${1 - p})`;
      ctx.lineWidth = 0.003;
      for (let k = 0; k < 5; k++) {
        const ang = (k / 5) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(bx + Math.cos(ang) * 0.01, by + Math.sin(ang) * 0.006);
        ctx.lineTo(bx + Math.cos(ang) * (0.01 + p * 0.02), by + Math.sin(ang) * (0.006 + p * 0.012) - p * 0.01);
        ctx.stroke();
      }
    }
  }
  ctx.restore();
}

/** Felszálló, kígyózó mérges pára, benne néha egy halvány koponya */
function drawPoisonFumes(ctx: CanvasRenderingContext2D, c: PoisonCloud, t: number) {
  const fade = Math.min(1, c.life / 0.7) * Math.min(1, (c.maxLife - c.life) / 0.4);
  ctx.save();
  for (let i = 0; i < 8; i++) {
    const phase = (t * 0.35 + i / 8) % 1;
    const a = i * 1.9;
    const px = c.x + Math.cos(a) * c.radius * 0.45 + Math.sin(t * 2 + i + phase * 5) * 0.035;
    const py = c.y - phase * 0.32;
    const pr = 0.035 + phase * 0.06;
    const mist = ctx.createRadialGradient(px, py, 0, px, py, pr);
    mist.addColorStop(0, hexToRgba(c.color, 0.32 * (1 - phase) * fade));
    mist.addColorStop(1, hexToRgba(c.color, 0));
    ctx.fillStyle = mist;
    ctx.beginPath();
    ctx.arc(px, py, pr, 0, Math.PI * 2);
    ctx.fill();
    if (i % 4 === 0 && phase > 0.2 && phase < 0.75) {
      drawSkull(ctx, px, py, pr * 0.45, `rgba(236,252,203,${0.5 * fade * Math.sin(Math.PI * phase)})`);
    }
  }
  ctx.restore();
}

function drawSkull(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, color: string) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, s, Math.PI * 0.9, Math.PI * 2.1);
  ctx.lineTo(x + s * 0.55, y + s * 0.85);
  ctx.lineTo(x - s * 0.55, y + s * 0.85);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "rgba(26,46,5,0.7)";
  ctx.beginPath();
  ctx.arc(x - s * 0.38, y + s * 0.05, s * 0.22, 0, Math.PI * 2);
  ctx.arc(x + s * 0.38, y + s * 0.05, s * 0.22, 0, Math.PI * 2);
  ctx.fill();
}

/** Mérgezett ellenfél: zöld áttűnés és bugyborékok a feje fölött */
export function drawPoisonOverlay(ctx: CanvasRenderingContext2D, enemy: Enemy, now: number) {
  const r = enemy.radius;
  const fade = Math.min(1, enemy.poisoned / 0.3);
  const t = now / 1000;
  ctx.save();
  ctx.globalAlpha = fade;
  ctx.fillStyle = "rgba(132,204,22,0.45)";
  ctx.beginPath();
  ctx.arc(enemy.x, enemy.y, r, 0, Math.PI * 2);
  ctx.fill();
  for (let i = 0; i < 3; i++) {
    const p = (t * 1.3 + i / 3 + enemy.phase) % 1;
    ctx.fillStyle = `rgba(190,242,100,${1 - p})`;
    ctx.beginPath();
    ctx.arc(enemy.x + (i - 1) * r * 0.5, enemy.y - r * 1.1 - p * r * 1.2, r * (0.12 + p * 0.1), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// ================================================================ fagyasztó nova

function novaFront(n: FrostNova) {
  return n.radius * easeOut(Math.min(1, n.age / 0.4));
}

/** Terjedő dér és szétágazó jégrepedések a földön */
function drawNovaGround(ctx: CanvasRenderingContext2D, n: FrostNova, t: number) {
  const front = novaFront(n);
  const fade = n.age < n.duration - 0.6 ? 1 : (n.duration - n.age) / 0.6;
  ctx.save();
  ctx.globalAlpha = Math.max(0, fade);

  const frost = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, Math.max(0.001, front));
  frost.addColorStop(0, "rgba(240,249,255,0.75)");
  frost.addColorStop(0.75, "rgba(186,230,253,0.45)");
  frost.addColorStop(1, "rgba(186,230,253,0)");
  ctx.fillStyle = frost;
  ctx.beginPath();
  ctx.ellipse(n.x, n.y, front, front * 0.6, 0, 0, Math.PI * 2);
  ctx.fill();

  // Elágazó repedések
  ctx.strokeStyle = "rgba(255,255,255,0.9)";
  ctx.lineCap = "round";
  ctx.lineWidth = 0.004;
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2 + (i % 2) * 0.12;
    const len = front * (0.75 + ((i * 7) % 5) * 0.05);
    ctx.beginPath();
    ctx.moveTo(n.x, n.y);
    for (let k = 1; k <= 4; k++) {
      const jitter = (((i * 13 + k * 7) % 9) - 4) * 0.02;
      const x = n.x + (Math.cos(a + jitter) * (len * k)) / 4;
      const y = n.y + ((Math.sin(a + jitter) * (len * k)) / 4) * 0.6;
      ctx.lineTo(x, y);
      if (k === 2 || k === 3) {
        const ba = a + (k % 2 ? 0.6 : -0.6);
        ctx.lineTo(x + Math.cos(ba) * len * 0.15, y + Math.sin(ba) * len * 0.15 * 0.6);
        ctx.moveTo(x, y);
      }
    }
    ctx.stroke();
  }

  // Hideg köd a hullámfronton
  if (n.age < 0.6) {
    ctx.strokeStyle = `rgba(255,255,255,${0.8 * (1 - n.age / 0.6)})`;
    ctx.lineWidth = 0.03;
    ctx.shadowColor = "#e0f2fe";
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.ellipse(n.x, n.y, front, front * 0.6, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;
  }
  // Szálló jégkristályok
  for (let i = 0; i < 14; i++) {
    const p = (t * 0.5 + i * 0.071) % 1;
    const a = i * 2.39 + t * 0.4;
    const d = front * ((i * 0.37) % 1);
    drawSnowflake(ctx, n.x + Math.cos(a) * d, n.y + Math.sin(a) * d * 0.6 - p * 0.15, 0.008, `rgba(255,255,255,${0.9 * (1 - p)})`);
  }
  ctx.restore();
}

/** Kitörő jégtüskék két gyűrűben; a végén szilánkokra törnek */
function drawNovaSpikes(ctx: CanvasRenderingContext2D, n: FrostNova, t: number) {
  const front = novaFront(n);
  const spikes: { x: number; y: number; h: number; w: number; shatter: number; i: number }[] = [];
  for (let i = 0; i < 26; i++) {
    const ring = i % 2;
    const a = (i / 26) * Math.PI * 2 + ring * 0.12;
    const d = n.radius * (ring ? 0.92 : 0.6) * (0.92 + ((i * 7) % 5) * 0.03);
    if (front < d) continue;
    const born = (d / n.radius) * 0.4;
    const grow = easeOutBack(Math.min(1, (n.age - born) / 0.14));
    const shatterStart = n.duration - 0.55 + (i % 5) * 0.04;
    const shatter = Math.max(0, Math.min(1, (n.age - shatterStart) / 0.25));
    const hmax = (ring ? 0.1 : 0.14) * (0.8 + ((i * 3) % 4) * 0.12) * Math.min(1, n.radius / 0.5);
    spikes.push({ x: n.x + Math.cos(a) * d, y: n.y + Math.sin(a) * d * 0.6, h: hmax * grow, w: hmax * 0.28, shatter, i });
  }
  spikes.sort((p, q) => p.y - q.y);
  for (const s of spikes) {
    if (s.shatter >= 1) continue;
    if (s.shatter > 0) {
      // Szilánkokra törés
      for (let k = 0; k < 5; k++) {
        const a = k * 1.3 + s.i;
        const dist = s.shatter * 0.07;
        ctx.save();
        ctx.translate(s.x + Math.cos(a) * dist, s.y - s.h * 0.5 + Math.sin(a) * dist * 0.6 - Math.sin(Math.PI * s.shatter) * 0.04);
        ctx.rotate(a + s.shatter * 6);
        ctx.fillStyle = `rgba(224,242,254,${1 - s.shatter})`;
        ctx.beginPath();
        ctx.moveTo(0, -0.014);
        ctx.lineTo(0.007, 0.006);
        ctx.lineTo(-0.006, 0.008);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
      continue;
    }
    // Tüske: kétszínű lapok, fehér él, csillanás
    const { x, y, h, w } = s;
    ctx.fillStyle = "rgba(0,0,0,0.18)";
    ctx.beginPath();
    ctx.ellipse(x + w * 0.4, y + 0.006, w * 1.1, w * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(240,249,255,0.95)";
    ctx.beginPath();
    ctx.moveTo(x - w, y);
    ctx.lineTo(x - w * 0.15, y - h);
    ctx.lineTo(x, y + w * 0.15);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "rgba(125,211,252,0.9)";
    ctx.beginPath();
    ctx.moveTo(x, y + w * 0.15);
    ctx.lineTo(x - w * 0.15, y - h);
    ctx.lineTo(x + w, y);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.95)";
    ctx.lineWidth = 0.003;
    ctx.beginPath();
    ctx.moveTo(x - w, y);
    ctx.lineTo(x - w * 0.15, y - h);
    ctx.lineTo(x + w, y);
    ctx.stroke();
    const glint = 0.5 + 0.5 * Math.sin(t * 6 + s.i);
    ctx.fillStyle = `rgba(255,255,255,${glint})`;
    ctx.beginPath();
    ctx.arc(x - w * 0.15, y - h, 0.004, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawSnowflake(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string) {
  ctx.strokeStyle = color;
  ctx.lineWidth = r * 0.35;
  ctx.beginPath();
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * Math.PI;
    ctx.moveTo(x - Math.cos(a) * r, y - Math.sin(a) * r);
    ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
  }
  ctx.stroke();
}

/** Fagyott ellenfél: csiszolt jégkristály, alul jégcsapokkal; olvadás előtt remeg */
export function drawFrozenOverlay(ctx: CanvasRenderingContext2D, enemy: Enemy, now: number) {
  const r = enemy.radius;
  const fade = Math.min(1, enemy.frozen / 0.3);
  const tremble = enemy.frozen < 0.6 ? Math.sin(now / 25) * r * 0.06 : 0;
  ctx.save();
  ctx.globalAlpha = fade;
  ctx.translate(enemy.x + tremble, enemy.y);
  const pts: [number, number][] = [
    [-1.3, -0.5],
    [-0.75, -1.45],
    [0.45, -1.55],
    [1.35, -0.7],
    [1.3, 0.75],
    [0.25, 1.4],
    [-1.1, 1.05],
  ];
  const shades = ["rgba(240,249,255,0.7)", "rgba(186,230,253,0.55)", "rgba(125,211,252,0.5)"];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    ctx.fillStyle = shades[i % 3];
    ctx.beginPath();
    ctx.moveTo(0, -0.1 * r);
    ctx.lineTo(a[0] * r, a[1] * r);
    ctx.lineTo(b[0] * r, b[1] * r);
    ctx.closePath();
    ctx.fill();
  }
  ctx.strokeStyle = "rgba(255,255,255,0.95)";
  ctx.lineWidth = 0.004;
  ctx.beginPath();
  pts.forEach(([px, py], i) => (i === 0 ? ctx.moveTo(px * r, py * r) : ctx.lineTo(px * r, py * r)));
  ctx.closePath();
  ctx.stroke();
  // Jégcsapok
  ctx.fillStyle = "rgba(224,242,254,0.85)";
  for (const [ix, len] of [
    [-0.6, 0.45],
    [0.0, 0.6],
    [0.55, 0.38],
  ]) {
    ctx.beginPath();
    ctx.moveTo((ix - 0.12) * r, 1.15 * r);
    ctx.lineTo((ix + 0.12) * r, 1.15 * r);
    ctx.lineTo(ix * r, (1.15 + len) * r);
    ctx.closePath();
    ctx.fill();
  }
  const sparkle = 0.5 + 0.5 * Math.sin(now / 180 + enemy.phase);
  drawSnowflake(ctx, r * 0.9, -r * 1.1, r * 0.22, `rgba(255,255,255,${sparkle})`);
  ctx.restore();
}

// ================================================================ meteor

/** Forgó idézőkör a becsapódás helyén, egyre fényesebb, parázs száll belőle */
function drawSummonCircle(ctx: CanvasRenderingContext2D, m: Meteor, t: number) {
  const p = Math.min(1, m.t / m.delay);
  const R = m.radius;
  ctx.save();
  ctx.fillStyle = `rgba(0,0,0,${0.15 + p * 0.4})`;
  ctx.beginPath();
  ctx.ellipse(m.x, m.y, R * (0.2 + p * 0.6), R * (0.2 + p * 0.6) * 0.6, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.translate(m.x, m.y);
  ctx.scale(1, 0.6);
  const appear = easeOut(Math.min(1, p * 3));
  ctx.globalAlpha = appear;
  ctx.shadowColor = m.color;
  ctx.shadowBlur = 0;
  ctx.strokeStyle = hexToRgba("#fb923c", 0.6 + p * 0.4);
  ctx.lineWidth = 0.008;
  ctx.beginPath();
  ctx.arc(0, 0, R * appear, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, R * 0.78 * appear, 0, Math.PI * 2);
  ctx.stroke();
  // Forgó csillag
  ctx.save();
  ctx.rotate(t * 1.5);
  ctx.strokeStyle = hexToRgba(m.color, 0.7 + p * 0.3);
  ctx.lineWidth = 0.006;
  ctx.beginPath();
  for (let i = 0; i <= 5; i++) {
    const a = ((i * 2) / 5) * Math.PI * 2 - Math.PI / 2;
    const x = Math.cos(a) * R * 0.76 * appear;
    const y = Math.sin(a) * R * 0.76 * appear;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.restore();
  // Rúnák a gyűrűk között, ellentétes irányba forogva
  ctx.rotate(-t * 1.1);
  ctx.strokeStyle = "rgba(253,224,71,0.95)";
  ctx.lineWidth = 0.005;
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    ctx.save();
    ctx.translate(Math.cos(a) * R * 0.89 * appear, Math.sin(a) * R * 0.89 * appear);
    ctx.rotate(a + Math.PI / 2);
    ctx.beginPath();
    if (i % 3 === 0) {
      ctx.moveTo(-0.01, -0.012);
      ctx.lineTo(0, 0.012);
      ctx.lineTo(0.01, -0.012);
    } else if (i % 3 === 1) {
      ctx.moveTo(0, -0.013);
      ctx.lineTo(0, 0.013);
      ctx.moveTo(-0.009, 0);
      ctx.lineTo(0.009, -0.006);
    } else {
      ctx.arc(0, 0, 0.009, 0.4, Math.PI * 1.6);
    }
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();

  // Felszálló parázs
  for (let i = 0; i < 10; i++) {
    const k = (t * 0.8 + i * 0.1) % 1;
    const a = i * 2.4;
    const d = R * 0.8 * ((i * 0.37) % 1);
    ctx.fillStyle = `rgba(253,186,116,${(1 - k) * p})`;
    ctx.beginPath();
    ctx.arc(m.x + Math.cos(a) * d, m.y + Math.sin(a) * d * 0.6 - k * 0.2, 0.005, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** A zuhanó, lángoló szikla izzó csóvával */
function drawFallingMeteor(ctx: CanvasRenderingContext2D, m: Meteor, t: number) {
  const p = Math.min(1, m.t / m.delay);
  const e = p * p * p;
  const dist = m.radius * 5.5;
  const dirX = 0.48;
  const dirY = -0.88;
  const sx = m.x + dirX * dist * (1 - e);
  const sy = m.y + dirY * dist * (1 - e);
  const r = (0.05 + p * 0.03) * (m.radius / 0.38);

  // Csóva: egymásra rakott izzó körök, a végén füstbe vált
  ctx.save();
  for (let i = 18; i >= 0; i--) {
    const k = i / 18;
    const tx = sx + dirX * k * dist * 0.55 + Math.sin(t * 30 + i) * r * 0.15 * k;
    const ty = sy + dirY * k * dist * 0.55;
    const rr = r * (1.05 - k * 0.55) * (1 + 0.15 * Math.sin(t * 40 + i * 2));
    const color = k < 0.15 ? "rgba(255,251,235," : k < 0.4 ? "rgba(253,224,71," : k < 0.7 ? "rgba(249,115,22," : "rgba(80,60,60,";
    ctx.fillStyle = `${color}${(1 - k) * 0.8})`;
    ctx.beginPath();
    ctx.arc(tx, ty, rr, 0, Math.PI * 2);
    ctx.fill();
  }
  glowAt(ctx, sx, sy, r * 3.5, "#fb923c", 0.75);

  // Szikla lávarepedésekkel
  ctx.translate(sx, sy);
  ctx.rotate(t * 5);
  ctx.fillStyle = "#3b1d10";
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const rr = r * (0.8 + ((i * 7) % 5) * 0.06);
    ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#fdba74";
  ctx.shadowColor = "#f97316";
  ctx.shadowBlur = 0;
  ctx.lineWidth = r * 0.12;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-r * 0.55, -r * 0.2);
  ctx.lineTo(-r * 0.05, r * 0.12);
  ctx.lineTo(r * 0.4, -r * 0.4);
  ctx.moveTo(-r * 0.05, r * 0.12);
  ctx.lineTo(-r * 0.12, r * 0.6);
  ctx.moveTo(r * 0.15, -r * 0.05);
  ctx.lineTo(r * 0.55, r * 0.25);
  ctx.stroke();
  ctx.restore();
}

/** A becsapódáskor szétrepülő kődarabok (determinisztikusan a seed-ből) */
function debris(im: Impact) {
  const out: { gx: number; gy: number; size: number; flight: number; spin: number; a: number; d: number; up: number }[] = [];
  for (let i = 0; i < 16; i++) {
    const rnd = (k: number) => {
      const v = Math.sin(im.seed * 12.9898 + i * 78.233 + k * 37.719) * 43758.5453;
      return v - Math.floor(v);
    };
    const a = rnd(1) * Math.PI * 2;
    const d = im.radius * (0.7 + rnd(2) * 1.1);
    out.push({
      a,
      d,
      gx: im.x + Math.cos(a) * d,
      gy: im.y + Math.sin(a) * d * 0.6,
      size: (0.008 + rnd(3) * 0.012) * Math.min(1, im.radius / 0.3),
      flight: 0.45 + rnd(4) * 0.4,
      spin: rnd(5) * 6,
      up: (0.12 + rnd(6) * 0.18) * Math.min(1, im.radius / 0.3),
    });
  }
  return out;
}

/** Becsapódás a földön: izzó kráter lávarepedésekkel, lehullott kövek */
function drawImpactGround(ctx: CanvasRenderingContext2D, im: Impact, t: number) {
  const fade = Math.min(1, (im.duration - im.age) / 1.2);
  const heat = Math.max(0, 1 - im.age / im.duration);
  const R = im.radius;
  ctx.save();
  ctx.globalAlpha = fade;
  const scorch = ctx.createRadialGradient(im.x, im.y, 0, im.x, im.y, R * 1.3);
  scorch.addColorStop(0, "rgba(20,10,5,0.85)");
  scorch.addColorStop(0.6, "rgba(50,25,10,0.5)");
  scorch.addColorStop(1, "rgba(50,25,10,0)");
  ctx.fillStyle = scorch;
  ctx.beginPath();
  ctx.ellipse(im.x, im.y, R * 1.3, R * 0.78, 0, 0, Math.PI * 2);
  ctx.fill();
  // Kráter
  ctx.fillStyle = "#1c120c";
  ctx.beginPath();
  ctx.ellipse(im.x, im.y, R * 0.55, R * 0.33, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(120,80,50,0.8)";
  ctx.lineWidth = 0.01;
  ctx.stroke();
  // Izzó lávarepedések, lassan kihűlnek
  const pulse = 0.7 + 0.3 * Math.sin(t * 6);
  ctx.strokeStyle = `rgba(251,146,60,${heat * pulse})`;
  ctx.shadowColor = "#f97316";
  ctx.shadowBlur = 0;
  ctx.lineWidth = 0.006;
  ctx.lineCap = "round";
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2 + ((im.seed + i) % 3) * 0.2;
    const mid = R * (0.55 + ((i * 3) % 4) * 0.08);
    ctx.beginPath();
    ctx.moveTo(im.x + Math.cos(a) * R * 0.2, im.y + Math.sin(a) * R * 0.12);
    ctx.lineTo(im.x + Math.cos(a + 0.15) * mid, im.y + Math.sin(a + 0.15) * mid * 0.6);
    ctx.lineTo(im.x + Math.cos(a - 0.05) * mid * 1.45, im.y + Math.sin(a - 0.05) * mid * 1.45 * 0.6);
    ctx.stroke();
  }
  ctx.shadowBlur = 0;
  const core = ctx.createRadialGradient(im.x, im.y, 0, im.x, im.y, R * 0.45);
  core.addColorStop(0, `rgba(253,224,71,${0.9 * heat})`);
  core.addColorStop(1, "rgba(249,115,22,0)");
  ctx.fillStyle = core;
  ctx.beginPath();
  ctx.ellipse(im.x, im.y, R * 0.45, R * 0.27, 0, 0, Math.PI * 2);
  ctx.fill();
  // Lehullott, még izzó törmelék
  for (const d of debris(im)) {
    if (im.age < d.flight) continue;
    ctx.fillStyle = "#44403c";
    ctx.beginPath();
    ctx.ellipse(d.gx, d.gy, d.size, d.size * 0.65, d.spin, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = `rgba(251,146,60,${heat * 0.8})`;
    ctx.beginPath();
    ctx.arc(d.gx, d.gy, d.size * 0.35, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** Becsapódás a levegőben: villanás, tűzgömb, lökéshullám, repülő kövek, füstoszlop */
function drawImpactAir(ctx: CanvasRenderingContext2D, im: Impact, t: number) {
  const a = im.age;
  const R = im.radius;
  ctx.save();
  if (a < 0.18) glowAt(ctx, im.x, im.y - 0.04, R * 2.2, "#ffffff", 0.95 * (1 - a / 0.18));
  // Tűzgömb, ami felfelé gomolyog és elsötétül
  if (a < 0.9) {
    const p = a / 0.9;
    const rr = R * (0.35 + easeOut(p) * 0.75);
    const cy = im.y - p * 0.12;
    const fire = ctx.createRadialGradient(im.x, cy, 0, im.x, cy, rr);
    fire.addColorStop(0, `rgba(255,251,235,${(1 - p) * 0.95})`);
    fire.addColorStop(0.35, `rgba(253,186,116,${(1 - p) * 0.9})`);
    fire.addColorStop(0.7, `rgba(239,68,68,${(1 - p) * 0.7})`);
    fire.addColorStop(1, "rgba(127,29,29,0)");
    ctx.fillStyle = fire;
    ctx.beginPath();
    ctx.ellipse(im.x, cy, rr, rr * 0.8, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // Kettős lökéshullám és porgyűrű
  const waves: [number, number, string, number][] = [
    [0, 1, "rgba(255,247,237,", 0.035],
    [0.08, 0.8, "rgba(251,146,60,", 0.02],
    [0.05, 0.55, "rgba(168,140,110,", 0.05],
  ];
  for (const [delay, speed, color, width] of waves) {
    const p = (a - delay) / 0.6;
    if (p <= 0 || p >= 1) continue;
    const rr = R * (0.2 + easeOut(p) * 2.1 * speed);
    ctx.strokeStyle = `${color}${1 - p})`;
    ctx.lineWidth = width * (1 - p * 0.7) * Math.min(1, R / 0.3);
    ctx.beginPath();
    ctx.ellipse(im.x, im.y, rr, rr * 0.6, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  // Repülő kődarabok parabolapályán, árnyékkal
  for (const d of debris(im)) {
    if (a >= d.flight) continue;
    const p = a / d.flight;
    const gx = im.x + Math.cos(d.a) * d.d * p;
    const gy = im.y + Math.sin(d.a) * d.d * 0.6 * p;
    const h = d.up * 4 * p * (1 - p);
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.beginPath();
    ctx.ellipse(gx, gy, d.size, d.size * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.save();
    ctx.translate(gx, gy - h);
    ctx.rotate(d.spin + a * 12);
    ctx.fillStyle = "#57534e";
    ctx.fillRect(-d.size, -d.size * 0.7, d.size * 2, d.size * 1.4);
    ctx.fillStyle = "rgba(251,146,60,0.9)";
    ctx.fillRect(-d.size * 0.4, -d.size * 0.3, d.size * 0.8, d.size * 0.6);
    ctx.restore();
  }
  // Gomolygó füstoszlop
  const fade = Math.min(1, (im.duration - a) / 1.2);
  for (let i = 0; i < 9; i++) {
    const start = 0.15 + i * 0.06;
    if (a < start) continue;
    const p = Math.min(1, (a - start) / 2.6);
    const ang = i * 2.1;
    const px = im.x + Math.cos(ang) * R * 0.4 * p + Math.sin(t * 0.8 + i) * 0.02;
    const py = im.y - p * R * 1.2 + Math.sin(ang) * 0.03;
    const pr = R * (0.18 + p * 0.45);
    const smoke = ctx.createRadialGradient(px, py, 0, px, py, pr);
    smoke.addColorStop(0, `rgba(70,62,58,${0.5 * (1 - p) * fade})`);
    smoke.addColorStop(1, "rgba(70,62,58,0)");
    ctx.fillStyle = smoke;
    ctx.beginPath();
    ctx.arc(px, py, pr, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// ================================================================ fekete lyuk

function holeScale(bh: BlackHole) {
  const grow = easeOutBack(Math.min(1, bh.age / 0.35));
  const collapse = bh.age > bh.duration - 0.25 ? 1 - (bh.age - (bh.duration - 0.25)) / 0.25 : 1;
  return grow * Math.max(0, collapse);
}

/** Talaj: befelé csavarodó porkarok és sötétülés */
function drawBlackHoleGround(ctx: CanvasRenderingContext2D, bh: BlackHole, t: number) {
  const s = holeScale(bh);
  const R = bh.radius;
  ctx.save();
  const dark = ctx.createRadialGradient(bh.x, bh.y, 0, bh.x, bh.y, R);
  dark.addColorStop(0, `rgba(10,0,20,${0.75 * s})`);
  dark.addColorStop(1, "rgba(10,0,20,0)");
  ctx.fillStyle = dark;
  ctx.beginPath();
  ctx.ellipse(bh.x, bh.y, R, R * 0.6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineCap = "round";
  for (let arm = 0; arm < 7; arm++) {
    let prev: [number, number] | null = null;
    for (let i = 0; i <= 30; i++) {
      const k = i / 30;
      const r = R * (1 - k) * s;
      const a = -t * 3 + arm * ((Math.PI * 2) / 7) + k * 5;
      const x = bh.x + Math.cos(a) * r;
      const y = bh.y + Math.sin(a) * r * 0.6;
      if (prev) {
        ctx.strokeStyle = hexToRgba(bh.color, 0.55 * k * s);
        ctx.lineWidth = 0.004 + k * 0.01;
        ctx.beginPath();
        ctx.moveTo(prev[0], prev[1]);
        ctx.lineTo(x, y);
        ctx.stroke();
      }
      prev = [x, y];
    }
  }
  ctx.restore();
}

/** A szingularitás: pörgő akkréciós korong, fénygyűrű és fekete mag */
function drawBlackHole(ctx: CanvasRenderingContext2D, bh: BlackHole, t: number) {
  const s = holeScale(bh);
  if (s <= 0) return;
  const cy = bh.y - 0.1 * Math.min(1, bh.radius / 0.5);
  const core = 0.06 * s * (1 + 0.06 * Math.sin(t * 12)) * Math.min(1, bh.radius / 0.5);
  ctx.save();
  glowAt(ctx, bh.x, cy, core * 4.5, bh.color, 0.55);
  const disk = (front: boolean) => {
    for (let i = 0; i < 26; i++) {
      const rr = core * (1.4 + (i / 26) * 1.8);
      const a0 = t * (6 - i * 0.12) + i * 0.7;
      const color = i % 3 === 0 ? "#fde68a" : i % 3 === 1 ? "#f472b6" : bh.color;
      ctx.strokeStyle = hexToRgba(color, (front ? 0.85 : 0.4) * (1 - i / 30));
      ctx.lineWidth = (0.004 + (1 - i / 26) * 0.004) * Math.min(1, bh.radius / 0.5);
      ctx.beginPath();
      const start = front ? 0 : Math.PI;
      ctx.ellipse(bh.x, cy, rr, rr * 0.3, -0.25, start + Math.sin(a0) * 0.3, start + Math.PI + Math.sin(a0) * 0.3);
      ctx.stroke();
    }
  };
  disk(false);
  ctx.strokeStyle = "rgba(255,237,213,0.9)";
  ctx.lineWidth = core * 0.22;
  ctx.shadowColor = bh.color;
  ctx.shadowBlur = 0;
  ctx.beginPath();
  ctx.arc(bh.x, cy, core * 1.15, 0, Math.PI * 2);
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.fillStyle = "#050007";
  ctx.beginPath();
  ctx.arc(bh.x, cy, core, 0, Math.PI * 2);
  ctx.fill();
  disk(true);
  ctx.restore();
}

// ================================================================ gyűrűk, egyéb

function drawRing(ctx: CanvasRenderingContext2D, ring: Ring) {
  const p = 1 - ring.life / ring.maxLife;
  const r = ring.from + (ring.to - ring.from) * easeOut(p);
  ctx.save();
  ctx.strokeStyle = hexToRgba(ring.color, 1 - p);
  ctx.lineWidth = ring.width * (1 - p * 0.6);
  ctx.shadowColor = ring.color;
  ctx.shadowBlur = 0;
  ctx.beginPath();
  ctx.ellipse(ring.x, ring.y, r, r * 0.62, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawScorch(ctx: CanvasRenderingContext2D, s: Scorch, now: number) {
  const fade = Math.min(1, s.life / 1.5);
  const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.radius);
  g.addColorStop(0, `rgba(30,15,8,${0.75 * fade})`);
  g.addColorStop(0.6, `rgba(60,30,12,${0.45 * fade})`);
  g.addColorStop(1, "rgba(60,30,12,0)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(s.x, s.y, s.radius, s.radius * 0.62, 0, 0, Math.PI * 2);
  ctx.fill();
  for (let i = 0; i < 7; i++) {
    const a = i * 2.2;
    const d = ((i * 0.37) % 1) * s.radius * 0.7;
    const flicker = 0.5 + 0.5 * Math.sin(now / 120 + i * 3);
    ctx.fillStyle = `rgba(251,146,60,${fade * flicker * 0.9})`;
    ctx.beginPath();
    ctx.arc(s.x + Math.cos(a) * d, s.y + Math.sin(a) * d * 0.6, 0.006, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Szédült ellenfél: csillagok köröznek a feje fölött */
export function drawDizzyOverlay(ctx: CanvasRenderingContext2D, enemy: Enemy, now: number) {
  const r = enemy.radius;
  const fade = Math.min(1, enemy.dizzy / 0.3);
  ctx.save();
  ctx.globalAlpha = fade;
  for (let i = 0; i < 3; i++) {
    const a = now / 200 + (i / 3) * Math.PI * 2;
    const x = enemy.x + Math.cos(a) * r * 1.1;
    const y = enemy.y - r * 1.25 + Math.sin(a) * r * 0.35;
    ctx.fillStyle = "#fde68a";
    ctx.beginPath();
    for (let k = 0; k < 10; k++) {
      const ang = (k / 10) * Math.PI * 2 - Math.PI / 2;
      const rr = k % 2 === 0 ? r * 0.28 : r * 0.12;
      ctx.lineTo(x + Math.cos(ang) * rr, y + Math.sin(ang) * rr);
    }
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function glowAt(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, alpha: number) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, Math.max(0.0001, r));
  g.addColorStop(0, hexToRgba(color, alpha));
  g.addColorStop(1, hexToRgba(color, 0));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

function easeOut(t: number) {
  return 1 - Math.pow(1 - Math.max(0, Math.min(1, t)), 3);
}

function easeOutBack(t: number) {
  const c = 1.70158;
  const x = Math.max(0, Math.min(1, t));
  return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2);
}

function hexToRgba(hex: string, alpha: number) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${Math.max(0, Math.min(1, alpha))})`;
}
