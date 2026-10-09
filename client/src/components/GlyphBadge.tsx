import { useCallback } from "react";
import type { GlyphDef } from "../data/glyphs";
import { drawGlowingGlyph } from "../draw/shapes";
import { DrawnCanvas } from "./DrawnCanvas";

/** Egy jel saját rajzolással, a felületen használt kis méretben */
export function GlyphBadge({ glyph, size = 28 }: { glyph: GlyphDef; size?: number }) {
  const draw = useCallback(
    (ctx: CanvasRenderingContext2D, w: number, h: number) =>
      drawGlowingGlyph(ctx, glyph.path, w / 2, h / 2, w * 0.66, glyph.color, Math.max(2, w * 0.09)),
    [glyph],
  );
  return <DrawnCanvas width={size} height={size} draw={draw} label={glyph.name} />;
}
