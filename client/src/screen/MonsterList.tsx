import { useCallback } from "react";
import { isLevelUnlocked, type ThemeDef } from "../data/levels";
import { ENEMY_BY_ID, type EnemyDef } from "../data/enemies";
import type { Enemy } from "../game/Game";
import { DrawnCanvas } from "../components/DrawnCanvas";
import { drawEnemySprite, hasSprite, SPRITE_TOP } from "../draw/enemies";
import { drawLock } from "../draw/icons";

/** A téma szörnyei: ha ráviszed az egeret, felsorolja, kik jöhetnek ezen a fajta pályán */
export function MonsterList({
  theme,
  completed,
}: {
  theme: ThemeDef;
  completed: string[];
}) {
  // Amivel még nem lehet találkozni (a pályája le van zárva), az titok marad
  const entries = monstersOf(theme).map((m) => ({
    ...m,
    locked: !isLevelUnlocked(m.levelId, completed),
  }));
  const first = entries[0];
  return (
    <div className="monsters" tabIndex={0}>
      <span className="monsters__button">
        {first && !first.locked ? (
          <MonsterIcon def={first.def} tint={theme.enemyTint} size={26} />
        ) : (
          <LockIcon size={26} />
        )}
        Szörnyek
        <span className="monsters__count">{entries.length}</span>
      </span>
      <div className="monsters__panel" role="tooltip">
        <h3 className="monsters__title">{theme.name}: szörnyek</h3>
        {!theme.enemyMixes && (
          <p className="monsters__note">
            Ennek a témának a saját szörnyei hamarosan érkeznek.
          </p>
        )}
        <ul className="monsters__list">
          {entries.map(({ def, firstLevel, locked }) =>
            locked ? (
              <li key={def.id} className="monster monster--locked">
                <LockIcon size={64} />
                <span className="monster__text">
                  <span className="monster__name">
                    Ismeretlen szörny
                    {firstLevel && (
                      <span className="monster__from">{firstLevel}-tól</span>
                    )}
                  </span>
                  <span className="monster__desc">
                    Teljesítsd az előző pályákat, hogy megismerd.
                  </span>
                </span>
              </li>
            ) : (
              <li key={def.id} className="monster">
                <MonsterIcon def={def} tint={theme.enemyTint} size={64} />
                <span className="monster__text">
                  <span className="monster__name">
                    {def.name}
                    {firstLevel && (
                      <span className="monster__from">{firstLevel}-tól</span>
                    )}
                  </span>
                  <span className="monster__desc">{def.description}</span>
                  <span className="monster__tags">
                    <span className="tag">Élet {def.hp}</span>
                    <span className="tag">{speedLabel(def.speed)}</span>
                    {def.pack[1] > 1 && (
                      <span className="tag">
                        Csapat {def.pack[0]}–{def.pack[1]}
                      </span>
                    )}
                    {specialLabel(def) && (
                      <span className="tag tag--special">
                        {specialLabel(def)}
                      </span>
                    )}
                  </span>
                </span>
              </li>
            ),
          )}
        </ul>
      </div>
    </div>
  );
}

/** A téma pályáin előforduló fajok, első megjelenésük sorrendjében */
function monstersOf(theme: ThemeDef) {
  if (!theme.enemyMixes)
    return [
      {
        def: ENEMY_BY_ID.get("blob")!,
        firstLevel: null as string | null,
        levelId: `${theme.id}-1`,
      },
    ];
  const seen = new Map<string, number>();
  theme.enemyMixes.forEach((mix, i) => {
    for (const m of mix) if (!seen.has(m.type)) seen.set(m.type, i + 1);
  });
  return [...seen.entries()].flatMap(([id, n]) => {
    const def = ENEMY_BY_ID.get(id);
    return def
      ? [
          {
            def,
            firstLevel: `${theme.index}-${n}` as string | null,
            levelId: `${theme.id}-${n}`,
          },
        ]
      : [];
  });
}

function speedLabel(speed: number) {
  if (speed < 0.1) return "Nagyon lassú";
  if (speed < 0.16) return "Lassú";
  if (speed < 0.25) return "Közepes";
  if (speed < 0.33) return "Gyors";
  return "Nagyon gyors";
}

function specialLabel(def: EnemyDef) {
  if (def.splitInto) return "Szétesik";
  switch (def.behavior) {
    case "fly":
      return "Repül";
    case "burrow":
      return "Föld alatt túr";
    case "leap":
      return "Ugrik";
    case "charge":
      return "Rohamoz";
    case "swoop":
      return "Lecsap";
  }
  if (def.hp >= 100) return "Tank";
  return null;
}

/** A faj saját rajza kis képként (egy álló pillanat a mozgásából) */
function MonsterIcon({
  def,
  tint,
  size,
}: {
  def: EnemyDef;
  tint: [string, string];
  size: number;
}) {
  const draw = useCallback(
    (ctx: CanvasRenderingContext2D, w: number, h: number) => {
      const top = (SPRITE_TOP[def.id] ?? 2.2) + 0.2;
      const r = h / (top + 0.6);
      if (!hasSprite(def.id)) {
        ctx.fillStyle = tint[0];
        ctx.strokeStyle = tint[1];
        ctx.lineWidth = r * 0.12;
        ctx.beginPath();
        ctx.arc(w / 2, h * 0.55, r * 1.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "#ffe08a";
        ctx.beginPath();
        ctx.arc(w / 2 - r * 0.4, h * 0.5, r * 0.2, 0, Math.PI * 2);
        ctx.arc(w / 2 + r * 0.4, h * 0.5, r * 0.2, 0, Math.PI * 2);
        ctx.fill();
        return;
      }
      const fake = {
        type: def.id,
        behavior: def.behavior,
        mode:
          def.behavior === "burrow"
            ? "walk"
            : def.behavior === "swoop"
              ? "circle"
              : "walk",
        timer: 1,
        walk: 1.2,
        height: 0,
        facing: 1,
        phase: 0.5,
        spin: 0,
        hitFlash: 0,
        attackAnim: 0,
      } as unknown as Enemy;
      drawEnemySprite(ctx, fake, w / 2 - r * 0.1, h - r * 0.45, r, 0.3, 0);
    },
    [def, tint],
  );
  return (
    <DrawnCanvas width={size} height={size} draw={draw} label={def.name} />
  );
}

/** Lezárt szörny helye: lakat */
function LockIcon({ size }: { size: number }) {
  const draw = useCallback(
    (ctx: CanvasRenderingContext2D, w: number, h: number) => {
      drawLock(ctx, w / 2, h * 0.42, h * 0.5, "#a1a1aa");
    },
    [],
  );
  return <DrawnCanvas width={size} height={size} draw={draw} label="Lezárva" />;
}
