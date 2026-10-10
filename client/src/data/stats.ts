// Statok és szintezés: a kampány egészén átível. A szörnyekért és a teljesített
// pályákért tapasztalat (XP) jár; szintlépéskor statpontok, amiket a játékos a
// statokra oszt. A statok a pálya beállításait módosítják (GameConfig).
import type { GameConfig } from "../game/Game";
import { DEFAULT_CONFIG } from "../game/Game";
import { LEVELS } from "./levels";

export type StatId = "power" | "vitality" | "wisdom" | "spirit" | "agility" | "focus";

export interface StatDef {
  id: StatId;
  name: string;
  description: string;
  color: string;
  /** Legfeljebb ennyi pont tehető bele */
  max: number;
  /** A hatás köznapi szavakkal adott pontszámnál; negatív pontnál a veszteség (pl. "+15% sebzés", "4%-kal rövidebb töltési idő") */
  effect: (points: number) => string;
}

/** Pontonkénti hatások */
const PER_POINT = {
  power: 0.05, // +5% sebzés
  vitality: 10, // +10 élet
  wisdom: 10, // +10 mana
  spirit: 0.6, // +0,6 mana/mp
  agility: 0.03, // +3% mozgási sebesség
  focus: 0.02, // −2% töltési idő
};

/** Előjeles szám: "+" vagy "−" (nyomdai mínusz) */
const signed = (n: number, text: string) => `${n < 0 ? "−" : "+"}${text}`;
const pct = (n: number) => `${Math.round(Math.abs(n) * 100)}%`;
const num = (n: number) => Math.abs(n).toLocaleString("hu-HU", { maximumFractionDigits: 1 });

export const STATS: StatDef[] = [
  {
    id: "power",
    name: "Varázserő",
    description: "Minden varázslat többet sebez.",
    color: "#f97316",
    max: 30,
    effect: (p) => signed(p, `${pct(p * PER_POINT.power)} sebzés`),
  },
  {
    id: "vitality",
    name: "Életerő",
    description: "Több életerővel kezdesz, és többet bírsz.",
    color: "#fb7185",
    max: 30,
    effect: (p) => signed(p, `${num(p * PER_POINT.vitality)} életerő`),
  },
  {
    id: "wisdom",
    name: "Bölcsesség",
    description: "Nagyobb manatartály: több varázslat egymás után.",
    color: "#60a5fa",
    max: 30,
    effect: (p) => signed(p, `${num(p * PER_POINT.wisdom)} maximális mana`),
  },
  {
    id: "spirit",
    name: "Szellem",
    description: "Gyorsabban töltődik vissza a mana.",
    color: "#22d3ee",
    max: 30,
    effect: (p) => signed(p, `${num(p * PER_POINT.spirit)} mana másodpercenként`),
  },
  {
    id: "agility",
    name: "Fürgeség",
    description: "Gyorsabban mozogsz a pályán, könnyebb elmenekülni.",
    color: "#a3e635",
    max: 20,
    effect: (p) => `${pct(p * PER_POINT.agility)}-kal ${p < 0 ? "lassabb" : "gyorsabb"} mozgás`,
  },
  {
    id: "focus",
    name: "Összpontosítás",
    description: "Rövidebb töltési idő minden varázslatnál.",
    color: "#c084fc",
    max: 20,
    effect: (p) => `${pct(p * PER_POINT.focus)}-kal ${p < 0 ? "hosszabb" : "rövidebb"} töltési idő`,
  },
];

export type StatPoints = Record<StatId, number>;

export const NO_STATS: StatPoints = { power: 0, vitality: 0, wisdom: 0, spirit: 0, agility: 0, focus: 0 };

/** Szintenként ennyi statpont jár */
export const POINTS_PER_LEVEL = 3;
export const MAX_LEVEL = 50;

/** Ennyi XP kell a következő szinthez a megadott szintről */
export function xpToNext(level: number) {
  return 300 + (level - 1) * 120;
}

/** Két statkészlet összege (pl. elosztott pontok + a felszerelés bónusza) */
export function addStats(a: StatPoints, b: StatPoints): StatPoints {
  const sum = { ...a };
  for (const id of Object.keys(b) as StatId[]) sum[id] = (sum[id] ?? 0) + b[id];
  return sum;
}

/** Az elosztott statok hatása a pályára */
export function statConfig(stats: StatPoints): Partial<GameConfig> {
  return {
    maxHp: DEFAULT_CONFIG.maxHp + stats.vitality * PER_POINT.vitality,
    maxMana: DEFAULT_CONFIG.maxMana + stats.wisdom * PER_POINT.wisdom,
    manaRegen: DEFAULT_CONFIG.manaRegen + stats.spirit * PER_POINT.spirit,
    wizardSpeed: DEFAULT_CONFIG.wizardSpeed * (1 + stats.agility * PER_POINT.agility),
    damageMult: 1 + stats.power * PER_POINT.power,
    cooldownMult: 1 - stats.focus * PER_POINT.focus,
  };
}

/** XP hozzáadása: szintlépéskor statpontok. Visszaadja az új állást és a lépett szintek számát. */
export function gainXp(level: number, xp: number, statPoints: number, gained: number) {
  let lvl = level;
  let rest = xp + gained;
  let points = statPoints;
  let levelsGained = 0;
  while (lvl < MAX_LEVEL && rest >= xpToNext(lvl)) {
    rest -= xpToNext(lvl);
    lvl++;
    points += POINTS_PER_LEVEL;
    levelsGained++;
  }
  if (lvl >= MAX_LEVEL) rest = 0;
  return { level: lvl, xp: rest, statPoints: points, levelsGained };
}

/** A pálya végén járó jutalom: a szörnyekért gyűjtött XP mellé teljesítéskor bónusz XP és arany */
export function levelRewards(levelId: string, killXp: number, kills: number, won: boolean) {
  const n = Math.max(0, LEVELS.findIndex((l) => l.id === levelId));
  const bonusXp = won ? 150 + n * 60 : 0;
  return {
    xp: killXp + bonusXp,
    bonusXp,
    gold: Math.round(kills * 0.5) + (won ? 25 + n * 10 : 0),
  };
}
