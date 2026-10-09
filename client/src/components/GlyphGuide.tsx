import { useEffect, useRef } from "react";
import type { GlyphDef } from "../data/glyphs";
import type { Point } from "../game/types";

const DRAW_SECONDS = 1.4;
const HOLD_SECONDS = 0.8;
const START_COLOR = "#4ade80";

interface Props {
  glyph: GlyphDef;
  /** Igaz esetén a toll végigrajzolja a jelet; különben a kész jel áll */
  active?: boolean;
  width?: number;
  height?: number;
}

/** Útmutató a jel rajzolásához: kezdőpont, irányjelző nyilak, és aktív állapotban animáció */
export function GlyphGuide({ glyph, active = false, width = 168, height = 112 }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current!;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    const ctx = canvas.getContext("2d")!;

    // A jel a dobozba illesztve, arányosan
    const pad = 18;
    const size = Math.min(width - pad * 2, height - pad * 2);
    const ox = (width - size) / 2;
    const oy = (height - size) / 2;
    const pts: Point[] = glyph.path.map((p) => ({ x: ox + p.x * size, y: oy + p.y * size }));
    const lengths = [0];
    for (let i = 1; i < pts.length; i++) {
      lengths.push(lengths[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
    }
    const total = lengths[lengths.length - 1];
    const pointAt = (d: number): { p: Point; angle: number } => {
      let i = 1;
      while (i < lengths.length - 1 && lengths[i] < d) i++;
      const a = pts[i - 1];
      const b = pts[i];
      const t = (d - lengths[i - 1]) / Math.max(1e-6, lengths[i] - lengths[i - 1]);
      return { p: { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }, angle: Math.atan2(b.y - a.y, b.x - a.x) };
    };

    let frame = 0;
    const start = performance.now();
    const paint = (now: number) => {
      const cycle = ((now - start) / 1000) % (DRAW_SECONDS + HOLD_SECONDS);
      const progress = active ? Math.min(1, cycle / DRAW_SECONDS) : 1;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      // Vezetővonal
      ctx.strokeStyle = "rgba(167,123,255,0.28)";
      ctx.lineWidth = 3;
      ctx.setLineDash([3, 6]);
      ctx.beginPath();
      pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
      ctx.stroke();
      ctx.setLineDash([]);

      // Irányjelző nyilak a vezetővonalon
      const arrows = glyph.closed ? 4 : Math.max(2, pts.length - 1);
      ctx.fillStyle = "rgba(196,181,253,0.75)";
      for (let k = 0; k < arrows; k++) {
        const { p, angle } = pointAt(((k + 0.5) / arrows) * total);
        drawArrowHead(ctx, p.x, p.y, angle, 7);
      }

      // Kirajzolt rész
      const drawn = progress * total;
      ctx.save();
      ctx.strokeStyle = glyph.color;
      ctx.lineWidth = 5;
      ctx.shadowColor = glyph.color;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length && lengths[i] <= drawn; i++) ctx.lineTo(pts[i].x, pts[i].y);
      const tip = pointAt(drawn);
      ctx.lineTo(tip.p.x, tip.p.y);
      ctx.stroke();
      ctx.restore();

      // Kezdőpont
      ctx.fillStyle = START_COLOR;
      ctx.strokeStyle = "rgba(74,222,128,0.4)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(pts[0].x, pts[0].y, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(pts[0].x, pts[0].y, 10, 0, Math.PI * 2);
      ctx.stroke();

      // Toll hegye
      if (progress < 1) {
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(tip.p.x, tip.p.y, 4.5, 0, Math.PI * 2);
        ctx.fill();
      }
    };
    if (!active) {
      paint(start);
      return;
    }
    const loop = (now: number) => {
      frame = requestAnimationFrame(loop);
      paint(now);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [glyph, active, width, height]);

  return (
    <canvas
      ref={ref}
      style={{ width, height }}
      className="glyph-guide"
      role="img"
      aria-label={`${glyph.name} jel rajzolása`}
    />
  );
}

function drawArrowHead(ctx: CanvasRenderingContext2D, x: number, y: number, angle: number, size: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.beginPath();
  ctx.moveTo(size * 0.6, 0);
  ctx.lineTo(-size * 0.5, -size * 0.55);
  ctx.lineTo(-size * 0.2, 0);
  ctx.lineTo(-size * 0.5, size * 0.55);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}
