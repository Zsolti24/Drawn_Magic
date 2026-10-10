import { useEffect, useMemo, useRef, type RefObject } from "react";
import type { Game } from "../game/Game";
import { hudHitAreas, renderGame, type PlayerHud, type SpellLook } from "../game/render";
import { GLYPH_BY_ID } from "../data/glyphs";
import type { SpellDef } from "../data/spells";
import type { ResolvedLook } from "../data/wizardParts";

interface Props {
  gameRef: RefObject<Game | null>;
  /** A felszerelt varázslatok (a varázslatsávhoz) */
  spells: SpellDef[];
  look: ResolvedLook;
  /** A pálya jele a felső sávban, pl. "1-1" */
  levelLabel: string;
  /** A mágus szintje és tapasztalata a stat-panelhez */
  player: PlayerHud;
  /** Ha hamis, a játék áll (visszaszámlálás, szünet), de a kép frissül */
  running: boolean;
  /** Kattintás a bal felső sávra */
  onMenu?: () => void;
}

/** A játékciklus requestAnimationFrame-mel. A játék állapota a gameRef-ben
 *  van, nem React state-ben, így képkockánként nincs újrarenderelés. */
export function GameCanvas({ gameRef, spells, look, levelLabel, player, running, onMenu }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const spellLooks = useMemo<SpellLook[]>(
    () =>
      spells.map((s) => ({
        id: s.id,
        name: s.name,
        color: s.color,
        mana: s.mana,
        cooldown: s.cooldown,
        path: GLYPH_BY_ID.get(s.glyph)?.path ?? [],
      })),
    [spells],
  );
  const live = useRef({ running, spellLooks, look, levelLabel, player });
  live.current = { running, spellLooks, look, levelLabel, player };

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    let frame = 0;
    let last = performance.now();

    const loop = (now: number) => {
      frame = requestAnimationFrame(loop);
      // Nagy kihagyásnál (pl. háttérbe tett fül) ne ugorjon előre a játék
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;

      const dpr = Math.min(1.5, window.devicePixelRatio || 1);
      const w = Math.round(canvas.clientWidth * dpr);
      const h = Math.round(canvas.clientHeight * dpr);
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }

      const game = gameRef.current;
      if (!game || w === 0 || h === 0) return;
      const unit = Math.min(w, h) / 2;
      game.resize(w / 2 / unit, h / 2 / unit);
      const { running, spellLooks, look, levelLabel, player } = live.current;
      if (running) game.update(dt);
      renderGame(ctx, game, spellLooks, look, levelLabel, player, w, h, now);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [gameRef]);

  const onMenuRef = useRef(onMenu);
  onMenuRef.current = onMenu;

  // A kattintás képernyő-képpontját a canvas felbontására váltjuk, és megnézzük, a menüre esik-e
  useEffect(() => {
    const canvas = canvasRef.current!;
    const overMenu = (e: PointerEvent) => {
      const area = hudHitAreas.menu;
      if (!area) return false;
      const rect = canvas.getBoundingClientRect();
      const sx = canvas.width / rect.width;
      const sy = canvas.height / rect.height;
      const px = (e.clientX - rect.left) * sx;
      const py = (e.clientY - rect.top) * sy;
      return px >= area.x && px <= area.x + area.w && py >= area.y && py <= area.y + area.h;
    };
    const onDown = (e: PointerEvent) => {
      if (overMenu(e)) onMenuRef.current?.();
    };
    const onMove = (e: PointerEvent) => {
      canvas.style.cursor = overMenu(e) ? "pointer" : "";
    };
    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    return () => {
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
    };
  }, []);

  return <canvas ref={canvasRef} className="game-canvas" />;
}
