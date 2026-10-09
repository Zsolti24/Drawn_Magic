import { useEffect, useRef } from "react";
import type { Point } from "../game/types";

export type StrokeOutcome = { color: string } | null;

interface Props {
  /** A kész rajz. A visszaadott színnel halványul el a vonal; null esetén azonnal eltűnik. */
  onStroke: (points: Point[]) => StrokeOutcome;
}

const DRAW_COLOR = "#c4a5ff";
const FADE_MS = 450;

/** Teljes felületű rajzlap egyetlen vonalhoz, pointer eseményekkel. */
export function DrawPad({ onStroke }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const onStrokeRef = useRef(onStroke);
  onStrokeRef.current = onStroke;

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    let points: Point[] = [];
    let drawing = false;
    let pointerId: number | null = null;
    let fade: { color: string; start: number } | null = null;
    let frame = 0;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(canvas.clientWidth * dpr);
      canvas.height = Math.round(canvas.clientHeight * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      paint(1);
    };

    const paint = (alpha: number, color = DRAW_COLOR) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (points.length < 2) return;
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 18;
      ctx.lineWidth = 10;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
      ctx.stroke();
      ctx.globalAlpha = 1;
    };

    const animateFade = (now: number) => {
      if (!fade) return;
      const t = (now - fade.start) / FADE_MS;
      if (t >= 1) {
        fade = null;
        points = [];
        paint(1);
        return;
      }
      paint(1 - t, fade.color);
      frame = requestAnimationFrame(animateFade);
    };

    const toPoint = (e: PointerEvent): Point => {
      const rect = canvas.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    const onDown = (e: PointerEvent) => {
      if (drawing) return;
      e.preventDefault();
      cancelAnimationFrame(frame);
      fade = null;
      drawing = true;
      pointerId = e.pointerId;
      canvas.setPointerCapture(e.pointerId);
      points = [toPoint(e)];
      paint(1);
    };

    const onMove = (e: PointerEvent) => {
      if (!drawing || e.pointerId !== pointerId) return;
      e.preventDefault();
      // A sűrűbb, összevont események simább vonalat adnak
      const events = e.getCoalescedEvents?.() ?? [e];
      for (const ev of events.length ? events : [e]) points.push(toPoint(ev));
      paint(1);
    };

    const onUp = (e: PointerEvent) => {
      if (!drawing || e.pointerId !== pointerId) return;
      drawing = false;
      pointerId = null;
      const outcome = onStrokeRef.current(points);
      if (!outcome) {
        points = [];
        paint(1);
        return;
      }
      fade = { color: outcome.color, start: performance.now() };
      frame = requestAnimationFrame(animateFade);
    };

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointercancel", onUp);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onUp);
    };
  }, []);

  return <canvas ref={canvasRef} className="draw-pad" />;
}
