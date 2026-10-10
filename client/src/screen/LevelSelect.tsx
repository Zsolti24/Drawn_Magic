import { useCallback } from "react";
import { Link } from "react-router";
import { LEVELS, THEMES, THEME_BY_ID, isLevelUnlocked, levelShowcase, type LevelDef, type ThemeDef } from "../data/levels";
import { ENEMY_BY_ID } from "../data/enemies";
import { MonsterList } from "./MonsterList";
import { usableSpells, useProfile } from "../profile/profile";
import { PageFrame } from "../components/PageFrame";
import { DrawnCanvas } from "../components/DrawnCanvas";
import { drawLevelArt } from "../draw/levelArt";
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
                  <LevelArt level={level} width={320} height={180} locked />
                  <span className="level-tile__code">{level.code}</span>
                </span>
                <span className="level-tile__name">{level.name}</span>
                <NewMonster level={level} locked />
                <span className="level-tile__best">Teljesítsd az előző pályát</span>
              </div>
            );
          }
          const done = completed.includes(level.id);
          return (
            <Link key={level.id} to={`/play/${level.id}`} className={`level-tile ${done ? "level-tile--done" : ""} ${last}`}>
              <span className="level-tile__art">
                <LevelArt level={level} width={320} height={180} />
                <span className="level-tile__code">{level.code}</span>
                {done && <span className="level-tile__done">Teljesítve</span>}
              </span>
              <span className="level-tile__name">{level.name}</span>
              <NewMonster level={level} locked={false} />
              <span className="level-tile__best">{best ? `Legjobb: ${best}` : "Még nem játszott"}</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

/** A pálya képeslapja: saját jelenet a téma hangulatával, tereptárggyal és a pálya szörnyeivel */
function LevelArt({ level, width, height, locked = false }: { level: LevelDef; width: number; height: number; locked?: boolean }) {
  const draw = useCallback(
    (ctx: CanvasRenderingContext2D, w: number, h: number) => {
      const theme = THEME_BY_ID.get(level.theme ?? "meadow")!;
      drawLevelArt(ctx, w, h, {
        theme: theme.id,
        index: Number(level.code?.split("-")[1] ?? 1) - 1,
        tint: theme.enemyTint,
        monsters: levelShowcase(level),
        locked,
      });
      // Lezárt pálya: elsötétítve (a jelenet sejlik), középen lakat
      if (locked) {
        ctx.fillStyle = "rgba(10,8,20,0.38)";
        ctx.fillRect(0, 0, w, h);
        drawLock(ctx, w / 2, h * 0.4, h * 0.24, "#e4e4e7");
      }
    },
    [level, locked],
  );
  return <DrawnCanvas width={width} height={height} draw={draw} className="level-art" />;
}

/** "Új szörny" felirat a kártyán: lezárt pályán titok */
function NewMonster({ level, locked }: { level: LevelDef; locked: boolean }) {
  const featured = levelShowcase(level).find((m) => m.isNew);
  const def = featured && ENEMY_BY_ID.get(featured.type);
  if (!def) return null;
  return <span className="level-tile__new">Új szörny: {locked ? "???" : def.name}</span>;
}
