import type { GameConfig } from "../game/Game";
import type { EnemyMixEntry } from "./enemies";

/** A pálya talaja és hangulata */
export type TerrainKind = "meadow" | "forest" | "swamp" | "cave" | "ash";

export interface ThemeDef {
  id: TerrainKind;
  /** Sorszám a pályajelben (1 = rét, 2 = erdő …) */
  index: number;
  name: string;
  description: string;
  /** Kiemelő szín a felületen */
  color: string;
  /** Az ellenfelek színe ebben a témában: test és perem */
  enemyTint: [body: string, rim: string];
  /** A téma pályáinak nevei, sorrendben */
  levelNames: string[];
  /** A téma pályáinak ellenfél-összetétele, pályánként (ha nincs: egyszerű szörnyek) */
  enemyMixes?: EnemyMixEntry[][];
}

export interface LevelDef {
  id: string;
  name: string;
  /** Pályajel: téma és azon belül a pálya sorszáma, pl. "1-1" (a gyakorlásnál nincs) */
  code?: string;
  /** Melyik témához tartozik (a gyakorlásnál nincs) */
  theme?: TerrainKind;
  description: string;
  /** A pálya saját beállításai, a többi az alapértelmezés */
  config: Partial<GameConfig>;
  /** Gyakorlópálya: álló célbábuk, nincs vége */
  practice?: boolean;
}

export const THEMES: ThemeDef[] = [
  {
    id: "meadow",
    index: 1,
    name: "Virágos rét",
    description: "Napfényes mezők és virágos dombok. Itt kezdődik a mágus útja.",
    color: "#84cc16",
    enemyTint: ["#3a2f5c", "#6b5a9e"],
    levelNames: ["Napfényes tisztás", "Pipacsos domb", "Szélfútta mező", "Darázsfészek", "A Rémmadárijesztő földje"],
    // A fajok pályáról pályára érkeznek, a pályán belül pedig az elejétől keverve jönnek.
    // A súly csoportonként számít: a nagy rajokban jövők (pók) kisebb súlyt kapnak, hogy darabra se nyomjanak el mindent.
    // from = mikortól jöhet a pályán belül (a pálya idejének aránya, 0..1)
    enemyMixes: [
      [
        { type: "imp", weight: 4 },
        { type: "spider", weight: 2 },
      ],
      [
        { type: "imp", weight: 3 },
        { type: "spider", weight: 1.5 },
        { type: "hornet", weight: 3 },
        { type: "bonetortoise", weight: 2.5 },
      ],
      [
        { type: "imp", weight: 3 },
        { type: "spider", weight: 1.5 },
        { type: "hornet", weight: 2.5 },
        { type: "bonetortoise", weight: 2 },
        { type: "toad", weight: 3 },
        { type: "slime", weight: 2.5 },
        { type: "graveworm", weight: 3 },
      ],
      [
        { type: "imp", weight: 3 },
        { type: "spider", weight: 1.5 },
        { type: "hornet", weight: 2.5 },
        { type: "bonetortoise", weight: 2 },
        { type: "toad", weight: 3 },
        { type: "slime", weight: 2 },
        { type: "graveworm", weight: 3 },
        { type: "boar", weight: 3 },
        { type: "bonecrow", weight: 3 },
      ],
      [
        { type: "imp", weight: 3 },
        { type: "spider", weight: 1.5 },
        { type: "hornet", weight: 2.5 },
        { type: "bonetortoise", weight: 2 },
        { type: "toad", weight: 3 },
        { type: "slime", weight: 2 },
        { type: "graveworm", weight: 3 },
        { type: "boar", weight: 3 },
        { type: "bonecrow", weight: 3 },
        { type: "scarecrow", weight: 0.4, from: 0.1 },
      ],
    ],
  },
  {
    id: "forest",
    index: 2,
    name: "Ködös erdő",
    description: "Sűrű fák, avar és köd. A sötétből farkasárnyak lesnek.",
    color: "#22c55e",
    enemyTint: ["#3d3324", "#7c6a46"],
    levelNames: ["Erdőszél", "Gombás liget", "Ködös ösvény", "Farkasvölgy", "Öreg Fapásztor tisztása"],
  },
  {
    id: "swamp",
    index: 3,
    name: "Holdfényes mocsár",
    description: "Éjszakai láp, tavirózsák és lidércfények a víz fölött.",
    color: "#2dd4bf",
    enemyTint: ["#1f3b3a", "#3f7f78"],
    levelNames: ["Nádas part", "Tavirózsás tó", "Lidércláp", "Békakirály öble", "Boszorkány kunyhója"],
  },
  {
    id: "cave",
    index: 4,
    name: "Kristálybarlang",
    description: "Sötét járatok, csepegő víz és derengő kristályok.",
    color: "#a78bfa",
    enemyTint: ["#2a2f45", "#5b6a9a"],
    levelNames: ["Barlangbejárat", "Csepegő csarnok", "Kristálykert", "Denevérjáratok", "Gólem szentélye"],
  },
  {
    id: "ash",
    index: 5,
    name: "Hamuvidék",
    description: "Izzó lávarepedések, hamueső és a vulkán árnyéka. A végső próba.",
    color: "#f97316",
    enemyTint: ["#3f1d17", "#8a3b22"],
    levelNames: ["Hamumező", "Izzó repedések", "Bazaltszirtek", "Vulkán lába", "Sárkányfészek"],
  },
];

export const THEME_BY_ID = new Map(THEMES.map((t) => [t.id, t]));

/** Ennyi pálya van témánként */
export const LEVELS_PER_THEME = 5;

/** A téma pályáinak hossza percben, sorrendben (a játék nem írja ki) */
const LEVEL_MINUTES = [4, 5, 6, 8, 10];

/** A pálya beállításai a nehézség szerint (0 = az első pálya, 1 = az utolsó) */
function levelConfig(theme: ThemeDef, d: number, index: number, n: number): Partial<GameConfig> {
  const lerp = (a: number, b: number) => a + (b - a) * d;
  const mix = theme.enemyMixes?.[index];
  const common: Partial<GameConfig> = {
    terrain: theme.id,
    enemyTint: theme.enemyTint,
    duration: LEVEL_MINUTES[index] * 60,
    // Érkező szörnyek másodpercenként a pálya elején és végén; pályáról pályára több
    spawnRate: [2 + n * 0.12, 4.4 + n * 0.18],
    maxEnemies: Math.round(60 + n * 3),
  };
  if (mix) {
    // Saját fajok: a típusok adatai + pályánként erősödő szorzók
    return {
      ...common,
      enemyMix: mix,
      enemyHpScale: 1 + n * 0.12,
      enemySpeedScale: 1 + n * 0.04,
    };
  }
  return {
    ...common,
    enemySpeed: [lerp(0.19, 0.26), lerp(0.29, 0.38)],
    enemyHp: Math.round(lerp(24, 60)),
    enemyDamage: Math.round(lerp(4, 8)),
  };
}

const THEMED_LEVELS: LevelDef[] = THEMES.flatMap((theme) =>
  theme.levelNames.map((name, i): LevelDef => {
    const n = (theme.index - 1) * LEVELS_PER_THEME + i;
    const d = n / (THEMES.length * LEVELS_PER_THEME - 1);
    return {
      id: `${theme.id}-${i + 1}`,
      name,
      code: `${theme.index}-${i + 1}`,
      theme: theme.id,
      description: i === LEVELS_PER_THEME - 1 ? `${theme.name}: a téma utolsó pályája.` : theme.description,
      config: levelConfig(theme, d, i, n),
    };
  }),
);

export const LEVELS: LevelDef[] = THEMED_LEVELS;

export const LEVEL_BY_ID = new Map(LEVELS.map((l) => [l.id, l]));

/** Játszható-e a pálya: az első mindig, a többi az előző teljesítése után */
export function isLevelUnlocked(levelId: string, completed: string[]) {
  const i = LEVELS.findIndex((l) => l.id === levelId);
  return i === 0 || (i > 0 && completed.includes(LEVELS[i - 1].id));
}

/** A pálya képeslapjára: legfeljebb 3 szörny, köztük kiemelve (isNew) az a faj, amelyik ezen a pályán jelenik meg először */
export function levelShowcase(level: LevelDef): { type: string; isNew: boolean }[] {
  const theme = level.theme ? THEME_BY_ID.get(level.theme) : undefined;
  const index = Number(level.code?.split("-")[1] ?? 1) - 1;
  const mix = theme?.enemyMixes?.[index];
  if (!mix) return [{ type: "blob", isNew: false }, { type: "blob", isNew: false }, { type: "blob", isNew: false }];
  const before = new Set(theme!.enemyMixes!.slice(0, index).flatMap((m) => m.map((e) => e.type)));
  const fresh = mix.filter((e) => !before.has(e.type)).map((e) => e.type);
  const featured = fresh[fresh.length - 1];
  // A többiek: a többi új faj, aztán a korábbiak közül a legutóbb érkezettek
  const others = [...fresh.slice(0, -1), ...mix.map((e) => e.type).filter((t) => before.has(t)).reverse()].slice(0, 2);
  return [...others.map((type) => ({ type, isNew: false })), ...(featured ? [{ type: featured, isNew: true }] : [])];
}

/** A pálya utáni következő pálya (ha van) */
export function nextLevel(levelId: string) {
  const i = LEVELS.findIndex((l) => l.id === levelId);
  return i >= 0 ? LEVELS[i + 1] : undefined;
}
