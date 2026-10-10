import { useEffect, useRef } from "react";
import { resolveLook, type WizardLook } from "../data/wizardParts";
import { castAnimSeconds, drawWizardFigure } from "../draw/wizard";
import { getMeadow } from "../draw/meadow";
import { drawSparkleAt } from "../draw/icons";
import { drawEffects, drawShieldBubble, empoweredStrength } from "../game/render";
import { drawGroundEffects } from "../draw/spellFx";
import { Game, WIZARD_FEET, WIZARD_FIGURE } from "../game/Game";
import { SPELLS } from "../data/spells";

export interface StageCast {
  /** performance.now() idő, hogy ugyanaz a varázslat újra is elsüthető legyen */
  at: number;
  spellId: string;
}

/** A próbához: nincs töltési idő, a lövedék lassabb és a területi hatások kisebbek,
 *  hogy a közeli képen is elférjenek */
const PREVIEW_SPELLS = SPELLS.map((s) => {
  const e = s.effect;
  const effect =
    e.kind === "projectile"
      ? { ...e, speed: e.speed * 0.12 }
      : e.kind === "poison" || e.kind === "freeze" || e.kind === "meteor" || e.kind === "firering"
        ? { ...e, radius: e.radius * 0.35 }
        : e.kind === "blackhole"
          ? { ...e, radius: e.radius * 0.22 }
          : e.kind === "blink"
            ? { ...e, distance: 0, radius: e.radius * 0.35 }
            : e;
  return { ...s, cooldown: 0, effect };
});

/** Ellenfél nélküli játék, amiben a próba varázslatai a valódi játéklogikával futnak */
function createPreviewGame() {
  const game = new Game(PREVIEW_SPELLS, () => {}, { maxEnemies: 0, manaRegen: 1000, noTargetDistance: 0.14 });
  game.wizard.facing = { x: 1, y: 0 };
  return game;
}

interface Props {
  look: WizardLook;
  walking?: boolean;
  /** Az utolsó varázslat (performance.now() idő és szín) */
  cast?: StageCast | null;
  /** Lebegő szikrák a háttérben (menühöz) */
  sparkles?: boolean;
  /** Hol álljon a mágus vízszintesen (0..1 a szélesség arányában) */
  focusX?: number;
  className?: string;
}

/** Animált jelenet: a mágus a réten, a megadott kinézettel */
export function WizardStage({ look, walking = false, cast = null, sparkles = false, focusX = 0.5, className }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const propsRef = useRef({ look, walking, sparkles, focusX });
  propsRef.current = { look, walking, sparkles, focusX };
  const gameRef = useRef<Game | null>(null);

  // Új varázslat a próbában: a játéklogika süti el
  useEffect(() => {
    if (!cast) return;
    const spell = PREVIEW_SPELLS.find((s) => s.id === cast.spellId);
    if (!spell) return;
    gameRef.current ??= createPreviewGame();
    const game = gameRef.current;
    game.wizard.mana = game.config.maxMana;
    game.cast(spell.glyph);
  }, [cast]);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    let frame = 0;
    let walk = 0;
    let last = performance.now();
    const loop = (now: number) => {
      frame = requestAnimationFrame(loop);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const dpr = window.devicePixelRatio || 1;
      const w = Math.round(canvas.clientWidth * dpr);
      const h = Math.round(canvas.clientHeight * dpr);
      if (w === 0 || h === 0) return;
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      const p = propsRef.current;
      if (p.walking) walk += dt * 11;
      const game = gameRef.current;
      game?.update(dt);

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      // A rét egy darabja, a vászon arányában kivágva
      const meadow = getMeadow(2.8, 1.8, 240);
      const srcH = meadow.height * 0.3;
      const srcW = Math.min(meadow.width * 0.8, (srcH * w) / h);
      ctx.drawImage(meadow, (meadow.width - srcW) / 2, meadow.height * 0.35, srcW, srcH, 0, 0, w, h);
      const vignette = ctx.createRadialGradient(w / 2, h * 0.55, h * 0.2, w / 2, h * 0.55, Math.max(w, h) * 0.75);
      vignette.addColorStop(0, "rgba(10,7,22,0)");
      vignette.addColorStop(1, "rgba(10,7,22,0.6)");
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, w, h);

      if (p.sparkles) {
        const t = now / 1000;
        for (let i = 0; i < 14; i++) {
          const x = ((i * 0.137 + 0.05) % 1) * w;
          const y = h * (0.9 - ((t * 0.05 + i * 0.071) % 1) * 0.9);
          ctx.globalAlpha = 0.35 + 0.35 * Math.sin(t * 2 + i);
          drawSparkleAt(ctx, x, y, h * 0.012, i % 2 ? "#fde68a" : "#c4b5fd");
        }
        ctx.globalAlpha = 1;
      }

      const size = h / 4.4;
      const feetY = h * 0.86;
      ctx.fillStyle = "rgba(0,0,0,0.3)";
      ctx.beginPath();
      const fx = w * p.focusX;
      ctx.ellipse(fx, feetY, size * 0.85, size * 0.3, 0, 0, Math.PI * 2);
      ctx.fill();
      // A játék effektjei a mágushoz igazítva (a figura mérete a játékbeli arányokat követi)
      const toWorld = () => {
        if (!game) return;
        const r = game.config.wizardRadius;
        const unit = size / (r * WIZARD_FIGURE);
        ctx.setTransform(unit, 0, 0, unit, fx, feetY - r * WIZARD_FEET * unit);
      };
      if (game) {
        toWorld();
        drawGroundEffects(ctx, game, now);
        ctx.setTransform(1, 0, 0, 1, 0, 0);
      }

      const castLength = game?.lastCast ? castAnimSeconds(game.lastCast.spell.id) : 1;
      const lastCast = game?.lastCast && game.lastCast.age < castLength ? game.lastCast : null;
      drawWizardFigure(
        ctx,
        resolveLook(p.look),
        {
          facing: 1,
          walk,
          moving: p.walking,
          time: now / 1000,
          cast: lastCast ? 1 - lastCast.age / castLength : 0,
          castColor: lastCast?.spell.color ?? null,
          castKind: lastCast?.spell.id ?? null,
          aura: game ? empoweredStrength(game) : 0,
        },
        fx,
        feetY,
        size,
      );

      if (game) {
        toWorld();
        drawShieldBubble(ctx, game, now);
        drawEffects(ctx, game, now);
        ctx.setTransform(1, 0, 0, 1, 0, 0);
      }
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, []);

  return <canvas ref={canvasRef} className={className} />;
}
