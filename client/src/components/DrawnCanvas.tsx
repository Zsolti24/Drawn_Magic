import { useEffect, useRef } from "react";

interface Props {
  width: number;
  height: number;
  /** Rajzolás CSS-képpontban; a nagy felbontású kijelzőt a komponens kezeli */
  draw: (ctx: CanvasRenderingContext2D, width: number, height: number) => void;
  className?: string;
  label?: string;
}

/** Kis, statikus, saját rajzolású elem (ikon helyett) */
export function DrawnCanvas({ width, height, draw, className, label }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current!;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    const ctx = canvas.getContext("2d")!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    draw(ctx, width, height);
  }, [width, height, draw]);

  return (
    <canvas
      ref={ref}
      className={className}
      style={{ width, height }}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    />
  );
}
