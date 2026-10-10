// A mágus cserélhető részei (felszerelés): kinézet és stat bónusz tárgyanként.
import { NO_STATS, type StatPoints } from "./stats";

export type HatStyle = "pointed" | "wide" | "hood";
export type RobePattern = "plain" | "stars" | "runes";
export type StaffTop = "orb" | "crystal" | "curl";
export type AmuletShape = "round" | "diamond" | "moon";

/** Minden tárgy közös adatai */
export interface ItemBase {
  id: string;
  name: string;
  /** Hogyan lehet megszerezni (a lezárt tárgyaknál látszik) */
  obtain: string;
  /** Felvéve ennyi statponttal erősíti a mágust (a helyen belül a későbbi tárgy egy kicsit többel) */
  bonus: Partial<StatPoints>;
}

export interface HatDef extends ItemBase {
  style: HatStyle;
  color: string;
  bandColor: string;
  /** Díszítés a kalapon */
  decoration: "none" | "stars" | "moon";
}

export interface RobeDef extends ItemBase {
  color: string;
  /** Szegély, öv és köpeny bélése */
  trimColor: string;
  pattern: RobePattern;
}

export interface StaffDef extends ItemBase {
  woodColor: string;
  top: StaffTop;
  gemColor: string;
}

export interface AmuletDef extends ItemBase {
  shape: AmuletShape;
  color: string;
}

export interface WizardLook {
  hat: string;
  robe: string;
  staff: string;
  amulet: string | null;
  skin: string;
  beard: string;
}

const START = "Alapfelszerelés";

export const HATS: HatDef[] = [
  { id: "apprentice", name: "Tanonc süveg", obtain: START, bonus: { power: 1 }, style: "pointed", color: "#3b2a7a", bandColor: "#fbbf24", decoration: "stars" },
  { id: "wanderer", name: "Vándor kalap", obtain: "Bolt: 150 arany", bonus: { agility: 1, vitality: 1 }, style: "wide", color: "#5b4636", bandColor: "#9a3412", decoration: "none" },
  { id: "hood", name: "Csuklya", obtain: "Bolt: 200 arany", bonus: { focus: 2, agility: 1 }, style: "hood", color: "#2f4a3a", bandColor: "#a3e635", decoration: "none" },
  { id: "night", name: "Éjféli süveg", obtain: "Virágos rét: 1000 pont", bonus: { wisdom: 2, spirit: 2 }, style: "pointed", color: "#111c44", bandColor: "#c4b5fd", decoration: "moon" },
  { id: "flame", name: "Lángsüveg", obtain: "Főellenség jutalma", bonus: { power: 4, focus: 1 }, style: "pointed", color: "#9a1f1f", bandColor: "#fb923c", decoration: "stars" },
  { id: "swamp", name: "Mocsári kalap", obtain: "Holdfényes mocsár", bonus: { spirit: 3, vitality: 3 }, style: "wide", color: "#3f4a2a", bandColor: "#c4b5fd", decoration: "moon" },
];

export const ROBES: RobeDef[] = [
  { id: "apprentice", name: "Tanonc köpeny", obtain: START, bonus: { vitality: 1 }, color: "#4c2a91", trimColor: "#fbbf24", pattern: "stars" },
  { id: "traveler", name: "Úti köpeny", obtain: "Bolt: 150 arany", bonus: { vitality: 1, agility: 1 }, color: "#7c4a2d", trimColor: "#e7c48a", pattern: "plain" },
  { id: "forest", name: "Erdei köpeny", obtain: "Ködös erdő", bonus: { vitality: 2, spirit: 1 }, color: "#2f5d3a", trimColor: "#d9f99d", pattern: "plain" },
  { id: "arcane", name: "Rúnás köpeny", obtain: "Bolt: 400 arany", bonus: { wisdom: 2, focus: 2 }, color: "#14335c", trimColor: "#5ee0ff", pattern: "runes" },
  { id: "flame", name: "Lángköpeny", obtain: "Főellenség jutalma", bonus: { power: 3, vitality: 2 }, color: "#7f1d1d", trimColor: "#fb923c", pattern: "stars" },
  { id: "moonlight", name: "Holdfény köpeny", obtain: "Kristálybarlang", bonus: { wisdom: 3, spirit: 3 }, color: "#334155", trimColor: "#e2e8f0", pattern: "runes" },
];

export const STAFFS: StaffDef[] = [
  { id: "oak", name: "Tölgyfa pálca", obtain: START, bonus: { power: 1 }, woodColor: "#8b5a2b", top: "orb", gemColor: "#fbbf24" },
  { id: "druid", name: "Druida bot", obtain: "Bolt: 200 arany", bonus: { spirit: 1, power: 1 }, woodColor: "#6b4f2a", top: "curl", gemColor: "#86efac" },
  { id: "crystal", name: "Kristálypálca", obtain: "Kristálybarlang", bonus: { focus: 2, wisdom: 2 }, woodColor: "#5b6b8c", top: "crystal", gemColor: "#5ee0ff" },
  { id: "ember", name: "Parázspálca", obtain: "Főellenség jutalma", bonus: { power: 4, focus: 1 }, woodColor: "#3b2416", top: "orb", gemColor: "#ef4444" },
  { id: "frost", name: "Jégpálca", obtain: "Bolt: 500 arany", bonus: { power: 3, focus: 2, wisdom: 2 }, woodColor: "#94a3b8", top: "crystal", gemColor: "#e0f2fe" },
];

export const AMULETS: AmuletDef[] = [
  { id: "sun", name: "Napkő", obtain: "Virágos rét: 500 pont", bonus: { vitality: 2 }, shape: "round", color: "#fb923c" },
  { id: "frost", name: "Fagykő", obtain: "Bolt: 250 arany", bonus: { focus: 2, wisdom: 1 }, shape: "diamond", color: "#93c5fd" },
  { id: "moon", name: "Holdsarló", obtain: "Holdfényes mocsár", bonus: { spirit: 2, wisdom: 2 }, shape: "moon", color: "#e9d5ff" },
  { id: "emerald", name: "Smaragd", obtain: "Ködös erdő", bonus: { vitality: 3, spirit: 2 }, shape: "round", color: "#34d399" },
  { id: "ruby", name: "Rubin", obtain: "Főellenség jutalma", bonus: { power: 4, vitality: 2 }, shape: "diamond", color: "#f43f5e" },
];

export const DEFAULT_LOOK: WizardLook = {
  hat: "apprentice",
  robe: "apprentice",
  staff: "oak",
  amulet: null,
  skin: "#f1c27d",
  beard: "#e5e7eb",
};

export type GearSlot = "hat" | "robe" | "staff" | "amulet";

export const GEAR: Record<GearSlot, ItemBase[]> = {
  hat: HATS,
  robe: ROBES,
  staff: STAFFS,
  amulet: AMULETS,
};

/** A felvett tárgyak bónuszai összeadva (statpontban) */
export function gearBonus(look: WizardLook): StatPoints {
  const total = { ...NO_STATS };
  for (const slot of Object.keys(GEAR) as GearSlot[]) {
    const id = look[slot];
    const item = id ? GEAR[slot].find((i) => i.id === id) : undefined;
    for (const [stat, points] of Object.entries(item?.bonus ?? {}) as [keyof StatPoints, number][]) total[stat] += points;
  }
  return total;
}

/** A tárgy ritkasága a helyén belüli sorszámából: a későbbi ritkább (0 = ritka, 1 = epikus, 2 = legendás) */
function rarityOf(index: number): 0 | 1 | 2 {
  return index >= 4 ? 2 : index >= 2 ? 1 : 0;
}

export const RARITY_NAMES = ["Ritka", "Epikus", "Legendás"] as const;

/** Tárgy a kulcsából ("hely:azonosító"): a hely, maga a tárgy és a ritkasága */
export function findItem(key: string): { slot: GearSlot; item: ItemBase; rarity: 0 | 1 | 2 } | undefined {
  const [slot, id] = key.split(":") as [GearSlot, string];
  const index = GEAR[slot]?.findIndex((i) => i.id === id) ?? -1;
  return index >= 0 ? { slot, item: GEAR[slot][index], rarity: rarityOf(index) } : undefined;
}

/** A pályán leeshető tárgyak: amit a játékos még nem szerzett meg */
export function lootableItems(unlocked: string[]): { item: string; rarity: 0 | 1 | 2 }[] {
  return (Object.keys(GEAR) as GearSlot[]).flatMap((slot) =>
    GEAR[slot].flatMap((item, index) => {
      const key = itemKey(slot, item.id);
      return unlocked.includes(key) ? [] : [{ item: key, rarity: rarityOf(index) }];
    }),
  );
}

export function itemKey(slot: GearSlot, id: string) {
  return `${slot}:${id}`;
}

/** Kezdéskor feloldott tárgyak ("hely:azonosító"): helyenként csak az első, a többit meg kell szerezni */
export const STARTING_ITEMS = (Object.keys(GEAR) as GearSlot[]).map((slot) => itemKey(slot, GEAR[slot][0].id));

export const SKIN_COLORS = ["#f1c27d", "#e0ac69", "#c68642", "#8d5524", "#ffdbac"];
export const BEARD_COLORS = ["#e5e7eb", "#9ca3af", "#7c4a2d", "#1f2937", "#fbbf24"];

/** A kinézet feloldott részei, a rajzoló ezt kapja */
export interface ResolvedLook {
  hat: HatDef;
  robe: RobeDef;
  staff: StaffDef;
  amulet: AmuletDef | null;
  skin: string;
  beard: string;
}

export function resolveLook(look: WizardLook): ResolvedLook {
  const find = <T extends { id: string }>(list: T[], id: string) => list.find((p) => p.id === id) ?? list[0];
  return {
    hat: find(HATS, look.hat),
    robe: find(ROBES, look.robe),
    staff: find(STAFFS, look.staff),
    amulet: look.amulet ? find(AMULETS, look.amulet) : null,
    skin: look.skin,
    beard: look.beard,
  };
}
