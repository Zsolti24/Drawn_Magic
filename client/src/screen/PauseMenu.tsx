import { useCallback } from "react";
import type { Game } from "../game/Game";
import type { LevelDef } from "../data/levels";
import { DrawnCanvas } from "../components/DrawnCanvas";
import { PhonePanel } from "../components/PhonePanel";
import { drawSkullLineIcon, drawStopwatchLineIcon } from "../draw/icons";

interface Props {
  level: LevelDef;
  game: Game | null;
  /** A telefon lecsatlakozott: csak újracsatlakozás után lehet folytatni */
  phoneMissing: boolean;
  onResume: () => void;
  onRestart: () => void;
  onLevels: () => void;
  onExit: () => void;
}

/** Szünetmenü játék közben (Esc) */
export function PauseMenu({ level, game, phoneMissing, onResume, onRestart, onLevels, onExit }: Props) {
  const seconds = Math.floor(game?.time ?? 0);
  const time = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  const hp = Math.max(0, Math.round(game?.wizard.hp ?? 0));
  const maxHp = game?.config.maxHp ?? 100;

  return (
    <div className="pause" role="dialog" aria-modal="true" aria-label="Szünet">
      <section className="pause__panel">
        <header className="pause__head">
          <span className="pause__chip">{level.code ?? "Gyakorlás"}</span>
          <span className="pause__level">{level.name}</span>
        </header>
        <h2 className="pause__title">Szünet</h2>

        <div className="pause__stats">
          <Stat icon={stopwatchIcon} label="Idő" value={time} />
          <Stat icon={skullIcon} label="Legyőzve" value={String(game?.kills ?? 0)} />
          <Stat icon={heartIcon} label="Élet" value={`${hp}`} sub={`/ ${maxHp}`} />
        </div>

        {phoneMissing ? (
          <div className="pause__phone">
            <p>A telefon lecsatlakozott. Olvasd be újra a kódot a folytatáshoz.</p>
            <PhonePanel qrSize={150} />
          </div>
        ) : (
          <button className="pause__btn pause__btn--primary" onClick={onResume} autoFocus>
            <MenuIcon draw={playIcon} />
            <span>Folytatás</span>
            <kbd>Esc</kbd>
          </button>
        )}

        <div className="pause__list">
          <button className="pause__btn" onClick={onRestart}>
            <MenuIcon draw={restartIcon} />
            <span>Újrakezdés</span>
          </button>
          <button className="pause__btn" onClick={onLevels}>
            <MenuIcon draw={mapIcon} />
            <span>Pályaválasztás</span>
          </button>
          <button className="pause__btn pause__btn--danger" onClick={onExit}>
            <MenuIcon draw={exitIcon} />
            <span>Kilépés a főmenübe</span>
          </button>
        </div>

        <footer className="pause__hint">
          <span>
            <kbd>W A S D</kbd> mozgás
          </span>
          <span>Rajzolj a telefonon a varázsláshoz</span>
        </footer>
      </section>
    </div>
  );
}

function Stat({ icon, label, value, sub }: { icon: Draw; label: string; value: string; sub?: string }) {
  return (
    <div className="pause__stat">
      <DrawnCanvas width={22} height={22} draw={icon} />
      <span className="pause__stat-value">
        {value}
        {sub && <small>{sub}</small>}
      </span>
      <span className="pause__stat-label">{label}</span>
    </div>
  );
}

type Draw = (ctx: CanvasRenderingContext2D, w: number, h: number) => void;

function MenuIcon({ draw }: { draw: Draw }) {
  const stable = useCallback(draw, [draw]);
  return <DrawnCanvas width={20} height={20} draw={stable} className="pause__icon" />;
}

const LINE = "rgba(255,255,255,0.9)";

const stopwatchIcon: Draw = (ctx, w, h) => drawStopwatchLineIcon(ctx, w / 2, h / 2, h * 0.95, "rgba(255,255,255,0.7)");
const skullIcon: Draw = (ctx, w, h) => drawSkullLineIcon(ctx, w / 2, h / 2, h * 0.95, "rgba(255,255,255,0.7)");

const heartIcon: Draw = (ctx, w, h) => {
  const s = w * 0.42;
  const x = w / 2;
  const y = h / 2;
  ctx.fillStyle = "#fb7185";
  ctx.beginPath();
  ctx.moveTo(x, y + s * 0.9);
  ctx.bezierCurveTo(x - s * 1.2, y, x - s, y - s, x - s * 0.5, y - s);
  ctx.bezierCurveTo(x - s * 0.2, y - s, x, y - s * 0.7, x, y - s * 0.4);
  ctx.bezierCurveTo(x, y - s * 0.7, x + s * 0.2, y - s, x + s * 0.5, y - s);
  ctx.bezierCurveTo(x + s, y - s, x + s * 1.2, y, x, y + s * 0.9);
  ctx.fill();
};

const playIcon: Draw = (ctx, w, h) => {
  ctx.fillStyle = "#0b0d12";
  ctx.beginPath();
  ctx.moveTo(w * 0.3, h * 0.2);
  ctx.lineTo(w * 0.82, h * 0.5);
  ctx.lineTo(w * 0.3, h * 0.8);
  ctx.closePath();
  ctx.fill();
};

const restartIcon: Draw = (ctx, w, h) => {
  ctx.strokeStyle = LINE;
  ctx.lineWidth = w * 0.1;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.arc(w / 2, h / 2, w * 0.32, -Math.PI * 0.35, Math.PI * 1.45);
  ctx.stroke();
  ctx.fillStyle = LINE;
  ctx.beginPath();
  const ax = w / 2 + Math.cos(-Math.PI * 0.35) * w * 0.32;
  const ay = h / 2 + Math.sin(-Math.PI * 0.35) * w * 0.32;
  ctx.moveTo(ax + w * 0.16, ay - h * 0.02);
  ctx.lineTo(ax - w * 0.04, ay - h * 0.18);
  ctx.lineTo(ax - w * 0.06, ay + h * 0.08);
  ctx.closePath();
  ctx.fill();
};

const mapIcon: Draw = (ctx, w, h) => {
  ctx.strokeStyle = LINE;
  ctx.lineWidth = w * 0.09;
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(w * 0.12, h * 0.25);
  ctx.lineTo(w * 0.38, h * 0.15);
  ctx.lineTo(w * 0.62, h * 0.25);
  ctx.lineTo(w * 0.88, h * 0.15);
  ctx.lineTo(w * 0.88, h * 0.75);
  ctx.lineTo(w * 0.62, h * 0.85);
  ctx.lineTo(w * 0.38, h * 0.75);
  ctx.lineTo(w * 0.12, h * 0.85);
  ctx.closePath();
  ctx.moveTo(w * 0.38, h * 0.15);
  ctx.lineTo(w * 0.38, h * 0.75);
  ctx.moveTo(w * 0.62, h * 0.25);
  ctx.lineTo(w * 0.62, h * 0.85);
  ctx.stroke();
};

const exitIcon: Draw = (ctx, w, h) => {
  ctx.strokeStyle = "#fda4af";
  ctx.lineWidth = w * 0.09;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  // Ajtókeret
  ctx.moveTo(w * 0.55, h * 0.15);
  ctx.lineTo(w * 0.15, h * 0.15);
  ctx.lineTo(w * 0.15, h * 0.85);
  ctx.lineTo(w * 0.55, h * 0.85);
  // Kifelé mutató nyíl
  ctx.moveTo(w * 0.4, h * 0.5);
  ctx.lineTo(w * 0.88, h * 0.5);
  ctx.moveTo(w * 0.72, h * 0.34);
  ctx.lineTo(w * 0.88, h * 0.5);
  ctx.lineTo(w * 0.72, h * 0.66);
  ctx.stroke();
};
