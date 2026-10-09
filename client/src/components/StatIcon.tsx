import { DrawnCanvas } from "./DrawnCanvas";
import { drawCooldownIcon, drawManaIcon } from "../draw/icons";

const drawMana = (ctx: CanvasRenderingContext2D, w: number, h: number) => drawManaIcon(ctx, w / 2, h / 2, h * 0.92);
const drawCooldown = (ctx: CanvasRenderingContext2D, w: number, h: number) =>
  drawCooldownIcon(ctx, w / 2, h / 2, h * 0.92);

/** Mana vagy töltési idő ikon a szöveg mellé */
export function StatIcon({ kind, size = 16 }: { kind: "mana" | "cooldown"; size?: number }) {
  return (
    <DrawnCanvas
      width={size}
      height={size}
      draw={kind === "mana" ? drawMana : drawCooldown}
      className="stat-icon"
      label={kind === "mana" ? "mana" : "töltési idő"}
    />
  );
}
