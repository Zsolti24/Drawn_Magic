import { useEffect, useRef } from "react";
import { Game } from "../game/Game";
import { drawWorld } from "../game/render";
import type { SpellDef } from "../data/spells";
import type { ResolvedLook } from "../data/wizardParts";

/** Egy varázslat bemutatója: hol áll a mágus, hol vannak az ellenfelek */
interface Scenario {
  wizard: [number, number];
  enemies: [number, number][];
  /** Az ellenfelek sebessége (egység/mp) és élete */
  enemySpeed?: number;
  enemyHp?: number;
  /** A mágus élete a varázslás előtt (gyógyításhoz) */
  wizardHp?: number;
  /** Mikor süti el a varázslatot, meddig tart egy kör (mp) */
  castAt?: number;
  loop: number;
  /** Az álló kép ennél az időpontnál készül */
  still: number;
}

const ring = (n: number, r: number, cx = 0, cy = 0.05): [number, number][] =>
  Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2 + 0.3;
    return [cx + Math.cos(a) * r * (1 + (i % 2) * 0.18), cy + Math.sin(a) * r * 0.75];
  });

const SCENARIOS: Record<string, Scenario> = {
  fireball: { wizard: [-0.5, 0.05], enemies: [[0.35, -0.02], [0.55, 0.18], [0.62, -0.2]], enemySpeed: 0.05, enemyHp: 16, loop: 2.2, still: 0.62 },
  lightning: { wizard: [-0.5, 0.05], enemies: [[0.0, -0.14], [0.3, 0.14], [0.55, -0.1], [0.72, 0.2]], enemySpeed: 0.04, enemyHp: 20, loop: 1.9, still: 0.42 },
  shield: { wizard: [0, 0.05], enemies: ring(5, 0.5), enemySpeed: 0.3, castAt: 0.15, loop: 3.2, still: 1.15 },
  tornado: { wizard: [0, 0.05], enemies: ring(7, 0.34), enemySpeed: 0.05, loop: 3.2, still: 1.0 },
  poison: { wizard: [-0.5, 0.05], enemies: [[0.3, 0.05], [0.4, -0.06], [0.24, -0.1], [0.43, 0.14]], enemySpeed: 0.02, enemyHp: 24, loop: 4.4, still: 1.45 },
  heal: { wizard: [0, 0.05], enemies: [], wizardHp: 35, loop: 2.4, still: 0.75 },
  freeze: { wizard: [0, 0.05], enemies: ring(6, 0.5), enemySpeed: 0.2, castAt: 0.55, loop: 3.8, still: 1.05 },
  meteor: { wizard: [-0.55, 0.05], enemies: [[0.3, 0.02], [0.42, -0.08], [0.36, 0.14], [0.22, -0.1]], enemySpeed: 0.02, loop: 3.6, still: 1.32 },
  blackhole: {
    wizard: [-0.6, 0.05],
    enemies: [[0.1, -0.25], [0.55, 0.25], [0.28, 0.08], [0.62, -0.18], [0.38, -0.06], [0.05, 0.2]],
    enemySpeed: 0,
    loop: 3.7,
    still: 1.9,
  },
};

const DEFAULT_SCENARIO: Scenario = { wizard: [-0.4, 0.05], enemies: [[0.35, 0], [0.5, 0.15]], loop: 2.5, still: 0.7 };

/** A látott terület fél magassága (egység): ekkora a jelenet "nagyítása" */
const VIEW_HALF_HEIGHT = 0.42;

function createScene(spell: SpellDef, scenario: Scenario, aspect: number) {
  const viewHalfWidth = VIEW_HALF_HEIGHT * aspect;
  const game = new Game([{ ...spell, cooldown: 0 }], () => {}, {
    worldHalfWidth: viewHalfWidth + 0.06,
    worldHalfHeight: VIEW_HALF_HEIGHT + 0.06,
    maxEnemies: 0,
    manaRegen: 1000,
    enemyDamage: 0,
    invulnerableTime: 0,
    cameraDeadZone: 2,
    noTargetDistance: 0.35,
  });
  game.resize(viewHalfWidth, VIEW_HALF_HEIGHT);
  game.camera = { x: 0, y: 0 };
  game.wizard.x = scenario.wizard[0];
  game.wizard.y = scenario.wizard[1];
  game.wizard.side = scenario.wizard[0] > 0.1 ? -1 : 1;
  game.wizard.facing = { x: game.wizard.side, y: 0 };
  if (scenario.wizardHp !== undefined) game.wizard.hp = scenario.wizardHp;
  // A bemutatóban a rét alap szörnye, a jelenet saját életerejével és sebességével
  game.enemies = scenario.enemies.map(([x, y], i) => {
    const e = game.makeEnemy("imp", x, y);
    const hp = scenario.enemyHp ?? 30;
    e.hp = hp;
    e.maxHp = hp;
    e.hpTrail = hp;
    e.speed = scenario.enemySpeed ?? 0.04;
    e.appear = 1;
    e.attackCd = 1;
    e.phase = i * 1.7;
    return e;
  });
  return game;
}

interface Props {
  spell: SpellDef;
  look: ResolvedLook;
  /** Igaz esetén a jelenet ismétlődve lejátszódik; különben egy álló pillanatkép */
  active: boolean;
  className?: string;
}

/** A varázslat valódi játéklogikával, egy kis jelenetben, ellenfelekkel */
export function SpellDemo({ spell, look, active, className }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const scenario = SCENARIOS[spell.id] ?? DEFAULT_SCENARIO;
    const castAt = scenario.castAt ?? 0.35;
    const dpr = window.devicePixelRatio || 1;
    const cssW = canvas.clientWidth || 300;
    const cssH = canvas.clientHeight || cssW / 2;
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    const w = canvas.width;
    const h = canvas.height;
    const unit = h / (VIEW_HALF_HEIGHT * 2);

    let game = createScene(spell, scenario, w / h);
    let time = 0;
    let cast = false;
    const step = (dt: number) => {
      if (!cast && time >= castAt) {
        game.cast(spell.glyph);
        cast = true;
      }
      game.update(dt);
      time += dt;
    };
    const paint = (now: number) => {
      drawWorld(ctx, game, look, w, h, unit, now);
      if (spell.effect.kind === "heal") drawHpBar(ctx, game, w, h, unit);
    };

    if (!active) {
      // Álló pillanatkép a varázslat közepéből
      while (time < scenario.still) step(1 / 60);
      paint(scenario.still * 1000);
      return;
    }

    let frame = 0;
    let last = performance.now();
    const loop = (now: number) => {
      frame = requestAnimationFrame(loop);
      step(Math.min(0.05, (now - last) / 1000));
      last = now;
      if (time >= scenario.loop) {
        game = createScene(spell, scenario, w / h);
        time = 0;
        cast = false;
      }
      paint(now);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [spell, look, active]);

  return <canvas ref={canvasRef} className={className} role="img" aria-label={`${spell.name} bemutató`} />;
}

/** Kis életerő-csík a mágus fölött (a gyógyítás bemutatójához) */
function drawHpBar(ctx: CanvasRenderingContext2D, game: Game, w: number, h: number, unit: number) {
  const wz = game.wizard;
  const frac = Math.max(0, Math.min(1, wz.hp / game.config.maxHp));
  const bw = unit * 0.24;
  const bh = Math.max(4, unit * 0.025);
  const x = w / 2 + (wz.x - game.camera.x) * unit - bw / 2;
  const y = h / 2 + (wz.y - game.camera.y) * unit - unit * 0.3;
  ctx.fillStyle = "rgba(10,10,15,0.75)";
  ctx.beginPath();
  ctx.roundRect(x - 2, y - 2, bw + 4, bh + 4, bh);
  ctx.fill();
  const g = ctx.createLinearGradient(x, 0, x + bw, 0);
  g.addColorStop(0, "#e11d48");
  g.addColorStop(1, "#fb7185");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.roundRect(x, y, bw * frac, bh, bh / 2);
  ctx.fill();
}
