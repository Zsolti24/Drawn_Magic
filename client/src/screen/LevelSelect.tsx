import { useCallback } from "react";
import { Link } from "react-router";
import { LEVELS, THEMES, isLevelUnlocked, type LevelDef, type ThemeDef } from "../data/levels";
import { MonsterList } from "./MonsterList";
import { usableSpells, useProfile } from "../profile/profile";
import { PageFrame } from "../components/PageFrame";
import { DrawnCanvas } from "../components/DrawnCanvas";
import { getTerrain } from "../draw/terrain";
import { drawLock } from "../draw/icons";

export function LevelSelect() {
  const { profile } = useProfile();
  const noSpells = usableSpells(profile).length === 0;

  return (
    <PageFrame title="Pályák">
      {noSpells && (
        <p className="warn">
          Még nincs megtanult varázslat, így nem tudsz varázsolni. <Link to="/spells">Képességek</Link>
        </p>
      )}

      {THEMES.map((theme) => (
        <ThemeSection key={theme.id} theme={theme} bestScores={profile.bestScores} completed={profile.completedLevels} />
      ))}
    </PageFrame>
  );
}

function ThemeSection({
  theme,
  bestScores,
  completed,
}: {
  theme: ThemeDef;
  bestScores: Record<string, number>;
  completed: string[];
}) {
  const levels = LEVELS.filter((l) => l.theme === theme.id);
  return (
    <section className="theme" style={{ "--theme-color": theme.color } as React.CSSProperties}>
      <header className="theme__head">
        <span className="theme__index">{theme.index}</span>
        <span className="theme__text">
          <h2 className="theme__name">{theme.name}</h2>
          <span className="theme__desc">{theme.description}</span>
        </span>
        <MonsterList theme={theme} completed={completed} />
      </header>
      <div className="theme__levels">
        {levels.map((level, i) => {
          const best = bestScores[level.id];
          const last = i === levels.length - 1 ? "level-tile--last" : "";
          if (!isLevelUnlocked(level.id, completed)) {
            return (
              <div key={level.id} className={`level-tile level-tile--locked ${last}`} aria-disabled="true">
                <span className="level-tile__art">
                  <LevelArt level={level} width={200} height={112} locked />
                  <span className="level-tile__code">{level.code}</span>
                </span>
                <span className="level-tile__name">{level.name}</span>
                <span className="level-tile__best">Teljesítsd az előző pályát</span>
              </div>
            );
          }
          const done = completed.includes(level.id);
          return (
            <Link key={level.id} to={`/play/${level.id}`} className={`level-tile ${done ? "level-tile--done" : ""} ${last}`}>
              <span className="level-tile__art">
                <LevelArt level={level} width={200} height={112} />
                <span className="level-tile__code">{level.code}</span>
                {done && <span className="level-tile__done">Teljesítve</span>}
              </span>
              <span className="level-tile__name">{level.name}</span>
              <span className="level-tile__best">{best ? `Legjobb: ${best}` : "Még nem játszott"}</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function LevelArt({ level, width, height, locked = false }: { level: LevelDef; width: number; height: number; locked?: boolean }) {
  const draw = useCallback(
    (ctx: CanvasRenderingContext2D, w: number, h: number) => {
      const ground = getTerrain(level.theme ?? "meadow", 2.8, 1.8, 240);
      // Pályánként más részlet a terepből
      const index = Number(level.code?.split("-")[1] ?? 1) - 1;
      const sw = ground.width * 0.3;
      const sh = (sw * h) / w;
      const sx = ground.width * (0.12 + index * 0.13);
      const sy = ground.height * (0.25 + (index % 2) * 0.15);
      ctx.drawImage(ground, sx, sy, sw, sh, 0, 0, w, h);
      // Halvány sötétítés alul a felirat alá
      const g = ctx.createLinearGradient(0, h * 0.5, 0, h);
      g.addColorStop(0, "rgba(0,0,0,0)");
      g.addColorStop(1, "rgba(0,0,0,0.45)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      // Lezárt pálya: elsötétítve, középen lakat
      if (locked) {
        ctx.fillStyle = "rgba(10,8,20,0.66)";
        ctx.fillRect(0, 0, w, h);
        drawLock(ctx, w / 2, h * 0.42, h * 0.4, "#d4d4d8");
      }
    },
    [level, locked],
  );
  return <DrawnCanvas width={width} height={height} draw={draw} className="level-art" />;
}
