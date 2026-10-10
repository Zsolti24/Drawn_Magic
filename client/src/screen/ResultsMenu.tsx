import type { Game } from "../game/Game";
import type { LevelDef } from "../data/levels";
import { POINTS_PER_LEVEL } from "../data/stats";
import { DrawnCanvas } from "../components/DrawnCanvas";
import { MenuIcon, Stat, exitIcon, mapIcon, playIcon, restartIcon, skullIcon, stopwatchIcon, type Draw } from "./PauseMenu";

export interface Reward {
  xp: number;
  bonusXp: number;
  gold: number;
  levelsGained: number;
  /** Az új szint (szintlépés után) */
  level: number;
}

interface Props {
  level: LevelDef;
  game: Game | null;
  won: boolean;
  score: number;
  newRecord: boolean;
  reward: Reward | null;
  /** A következő pálya (ha van) */
  next: LevelDef | undefined;
  onRetry: () => void;
  onNext: () => void;
  onLevels: () => void;
  onExit: () => void;
  onStats: () => void;
}

/** A pálya vége: győzelem vagy bukás, eredmények és jutalom, a szünetmenü stílusában */
export function ResultsMenu({ level, game, won, score, newRecord, reward, next, onRetry, onNext, onLevels, onExit, onStats }: Props) {
  const seconds = Math.floor(game?.time ?? 0);
  const time = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  const goNext = won && next;

  return (
    <div className={`pause results results--${won ? "won" : "lost"}`} role="dialog" aria-modal="true" aria-label={won ? "Pálya teljesítve" : "Elbuktál"}>
      <section className="pause__panel results__panel">
        <header className="pause__head">
          <span className="pause__chip">{level.code ?? "Gyakorlás"}</span>
          <span className="pause__level">{level.name}</span>
        </header>

        <div className="results__hero">
          <DrawnCanvas width={132} height={104} draw={won ? victoryEmblem : defeatEmblem} className="results__emblem" />
          <h2 className="results__title">{won ? "Pálya teljesítve!" : "Elbuktál"}</h2>
          <p className="results__subtitle">
            {won ? "Szép munka, mágus! A vidék fellélegezhet." : "A hordák ezúttal erősebbek voltak. A megszerzett tapasztalat megmarad."}
          </p>
        </div>

        <div className="pause__stats">
          <Stat icon={stopwatchIcon} label="Idő" value={time} />
          <Stat icon={skullIcon} label="Legyőzve" value={String(game?.kills ?? 0)} />
          <Stat icon={starIcon} label={newRecord ? "Új rekord!" : "Pont"} value={String(score)} />
        </div>

        {reward && (
          <div className="results__rewards">
            <div className="results__reward results__reward--xp">
              <span className="results__reward-value">+{reward.xp} XP</span>
              <span className="results__reward-label">{reward.bonusXp > 0 ? `${reward.bonusXp} teljesítési bónusszal` : "a felvett tapasztalatgyöngyökért"}</span>
            </div>
            <div className="results__reward results__reward--gold">
              <span className="results__reward-value">+{reward.gold}</span>
              <span className="results__reward-label">arany</span>
            </div>
          </div>
        )}

        {reward && reward.levelsGained > 0 && (
          <button className="results__levelup" onClick={onStats}>
            <span className="results__levelup-badge">{reward.level}</span>
            <span className="results__levelup-text">
              <strong>Szintlépés!</strong>
              <span>+{reward.levelsGained * POINTS_PER_LEVEL} statpont vár elosztásra</span>
            </span>
            <span className="results__levelup-go">Statok →</span>
          </button>
        )}

        <button className="pause__btn pause__btn--primary" onClick={goNext ? onNext : onRetry}>
          <MenuIcon draw={goNext ? playIcon : restartIconDark} />
          <span>{goNext ? `Következő pálya: ${next.code}` : won ? "Újra" : "Újrapróbálom"}</span>
          <kbd>Enter</kbd>
        </button>

        <div className="pause__list">
          {goNext && (
            <button className="pause__btn" onClick={onRetry}>
              <MenuIcon draw={restartIcon} />
              <span>Pálya újrajátszása</span>
            </button>
          )}
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
          <span>Az újrakezdés a telefonról is indítható</span>
        </footer>
      </section>
    </div>
  );
}

// ---------------------------------------------------------------- ikonok és címerek

const starIcon: Draw = (ctx, w, h) => {
  ctx.fillStyle = "rgba(253,224,71,0.85)";
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const r = i % 2 ? w * 0.2 : w * 0.46;
    ctx.lineTo(w / 2 + Math.cos(a) * r, h / 2 + 1 + Math.sin(a) * r);
  }
  ctx.closePath();
  ctx.fill();
};

/** Újrakezdés ikon sötétben (a világos elsődleges gombra) */
const restartIconDark: Draw = (ctx, w, h) => {
  ctx.strokeStyle = "#0b0d12";
  ctx.fillStyle = "#0b0d12";
  ctx.lineWidth = w * 0.1;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.arc(w / 2, h / 2, w * 0.32, -Math.PI * 0.35, Math.PI * 1.45);
  ctx.stroke();
  const ax = w / 2 + Math.cos(-Math.PI * 0.35) * w * 0.32;
  const ay = h / 2 + Math.sin(-Math.PI * 0.35) * w * 0.32;
  ctx.beginPath();
  ctx.moveTo(ax + w * 0.16, ay - h * 0.02);
  ctx.lineTo(ax - w * 0.04, ay - h * 0.18);
  ctx.lineTo(ax - w * 0.06, ay + h * 0.08);
  ctx.closePath();
  ctx.fill();
};

function glow(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, inner: string) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, inner);
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
}

/** Győzelem: arany csillag fénysugarakkal és szikrákkal */
const victoryEmblem: Draw = (ctx, w, h) => {
  const cx = w / 2;
  const cy = h * 0.52;
  glow(ctx, cx, cy, h * 0.6, "rgba(253,224,71,0.55)");
  // Fénysugarak
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const g = ctx.createLinearGradient(cx, cy, cx + Math.cos(a) * h * 0.55, cy + Math.sin(a) * h * 0.55);
    g.addColorStop(0, "rgba(254,240,138,0.5)");
    g.addColorStop(1, "rgba(254,240,138,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(a - 0.08) * h * 0.55, cy + Math.sin(a - 0.08) * h * 0.55);
    ctx.lineTo(cx + Math.cos(a + 0.08) * h * 0.55, cy + Math.sin(a + 0.08) * h * 0.55);
    ctx.closePath();
    ctx.fill();
  }
  // Csillag: aranyszínátmenet, világos perem
  const R = h * 0.34;
  const star = new Path2D();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const r = i % 2 ? R * 0.45 : R;
    star.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
  }
  star.closePath();
  const fill = ctx.createLinearGradient(cx, cy - R, cx, cy + R);
  fill.addColorStop(0, "#fef3c7");
  fill.addColorStop(0.45, "#fcd34d");
  fill.addColorStop(1, "#d97706");
  ctx.fillStyle = fill;
  ctx.fill(star);
  ctx.strokeStyle = "#fffbeb";
  ctx.lineWidth = 2;
  ctx.lineJoin = "round";
  ctx.stroke(star);
  // Szikrák
  for (const [dx, dy, s] of [
    [-0.36, -0.28, 1],
    [0.38, -0.2, 0.8],
    [0.3, 0.32, 0.6],
    [-0.32, 0.3, 0.7],
  ]) {
    sparkle(ctx, cx + dx * w * 0.9, cy + dy * h, h * 0.06 * s, "#ffffff");
  }
};

/** Bukás: megrepedt, kihunyó varázsgömb vörös izzással és lehulló szilánkokkal */
const defeatEmblem: Draw = (ctx, w, h) => {
  const cx = w / 2;
  const cy = h * 0.46;
  const R = h * 0.36;
  glow(ctx, cx, cy, h * 0.58, "rgba(244,63,94,0.45)");
  const orb = ctx.createRadialGradient(cx - R * 0.35, cy - R * 0.35, R * 0.1, cx, cy, R);
  orb.addColorStop(0, "#fda4af");
  orb.addColorStop(0.5, "#be123c");
  orb.addColorStop(1, "#4c0519");
  ctx.fillStyle = orb;
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,228,230,0.6)";
  ctx.lineWidth = 1.5;
  ctx.stroke();
  // Repedések a gömbön
  ctx.strokeStyle = "#1c0208";
  ctx.lineWidth = 2.2;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(cx - R * 0.15, cy - R * 0.98);
  ctx.lineTo(cx + R * 0.05, cy - R * 0.45);
  ctx.lineTo(cx - R * 0.2, cy - R * 0.05);
  ctx.lineTo(cx + R * 0.15, cy + R * 0.4);
  ctx.lineTo(cx - R * 0.05, cy + R * 0.95);
  ctx.moveTo(cx + R * 0.05, cy - R * 0.45);
  ctx.lineTo(cx + R * 0.55, cy - R * 0.3);
  ctx.moveTo(cx - R * 0.2, cy - R * 0.05);
  ctx.lineTo(cx - R * 0.65, cy + R * 0.15);
  ctx.stroke();
  // Csillanás
  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.beginPath();
  ctx.ellipse(cx - R * 0.4, cy - R * 0.45, R * 0.18, R * 0.1, -0.6, 0, Math.PI * 2);
  ctx.fill();
  // Lehulló szilánkok
  ctx.fillStyle = "#e11d48";
  for (const [dx, dy, s, rot] of [
    [-0.42, 0.95, 1, 0.4],
    [0.38, 1.05, 0.8, -0.6],
    [0.05, 1.3, 0.6, 1.2],
  ]) {
    ctx.save();
    ctx.translate(cx + dx * R * 1.6, cy + dy * R);
    ctx.rotate(rot);
    ctx.beginPath();
    ctx.moveTo(0, -5 * s);
    ctx.lineTo(4 * s, 3 * s);
    ctx.lineTo(-3 * s, 4 * s);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
};

function sparkle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.quadraticCurveTo(x, y, x, y + r);
  ctx.quadraticCurveTo(x, y, x - r, y);
  ctx.quadraticCurveTo(x, y, x, y - r);
  ctx.fill();
}
