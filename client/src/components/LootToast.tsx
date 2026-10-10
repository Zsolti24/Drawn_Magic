import { useCallback, useMemo } from "react";
import { DrawnCanvas } from "./DrawnCanvas";
import { BonusChips } from "./StatBonus";
import { drawItemIcon } from "../draw/wizard";
import { RARITY_NAMES, findItem, type AmuletDef, type HatDef, type RobeDef, type StaffDef } from "../data/wizardParts";

export interface LootToastData {
  /** Egyedi azonosító (ugyanaz a tárgy kétszer nem jön, de a sorrendhez kell) */
  id: number;
  /** A felvett tárgy ("hely:azonosító") */
  item: string;
}

const SLOT_NAMES = { hat: "Kalap", robe: "Köpeny", staff: "Pálca", amulet: "Amulett" } as const;
const RARITY_COLORS = ["#60a5fa", "#c084fc", "#fbbf24"] as const;

/** Új tárgy értesítések a jobb felső sarokban: beúsznak, felvillannak, pár másodperc múlva elhalványulnak */
export function LootToasts({ toasts }: { toasts: LootToastData[] }) {
  return (
    <div className="loot-toasts" aria-live="polite">
      {toasts.map((t) => (
        <LootToast key={t.id} item={t.item} />
      ))}
    </div>
  );
}

function LootToast({ item: key }: { item: string }) {
  const found = useMemo(() => findItem(key), [key]);
  const draw = useCallback(
    (ctx: CanvasRenderingContext2D, w: number, h: number) => {
      if (!found) return;
      const color = RARITY_COLORS[found.rarity];
      const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w * 0.6);
      g.addColorStop(0, color + "66");
      g.addColorStop(1, "#160f2e");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.roundRect(0, 0, w, h, w * 0.2);
      ctx.fill();
      drawItemIcon(ctx, found.slot, found.item as HatDef | RobeDef | StaffDef | AmuletDef, w, h);
    },
    [found],
  );
  if (!found) return null;
  const color = RARITY_COLORS[found.rarity];
  return (
    <div className={`loot-toast loot-toast--r${found.rarity}`} style={{ "--rarity": color } as React.CSSProperties} role="status">
      <span className="loot-toast__shine" aria-hidden="true" />
      <DrawnCanvas width={64} height={64} draw={draw} className="loot-toast__icon" label={found.item.name} />
      <div className="loot-toast__text">
        <span className="loot-toast__kicker">Új tárgy!</span>
        <span className="loot-toast__name">{found.item.name}</span>
        <span className="loot-toast__meta">
          {RARITY_NAMES[found.rarity]} · {SLOT_NAMES[found.slot]}
        </span>
        <BonusChips bonus={found.item.bonus} />
      </div>
    </div>
  );
}
