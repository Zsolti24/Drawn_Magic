// A mágus cserélhető részei. Később a felszerelés (6. fázis) ezekből választ,
// most mindegyikből van néhány változat a kinézet kipróbálásához.

export type HatStyle = "pointed" | "wide" | "hood";
export type RobePattern = "plain" | "stars" | "runes";
export type StaffTop = "orb" | "crystal" | "curl";
export type AmuletShape = "round" | "diamond" | "moon";

/** Minden tárgy közös adatai */
interface ItemBase {
  id: string;
  name: string;
  /** Hogyan lehet megszerezni (a lezárt tárgyaknál látszik) */
  obtain: string;
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
  { id: "apprentice", name: "Tanonc süveg", obtain: START, style: "pointed", color: "#3b2a7a", bandColor: "#fbbf24", decoration: "stars" },
  { id: "wanderer", name: "Vándor kalap", obtain: "Bolt: 150 arany", style: "wide", color: "#5b4636", bandColor: "#9a3412", decoration: "none" },
  { id: "hood", name: "Csuklya", obtain: "Bolt: 200 arany", style: "hood", color: "#2f4a3a", bandColor: "#a3e635", decoration: "none" },
  { id: "night", name: "Éjféli süveg", obtain: "Virágos rét: 1000 pont", style: "pointed", color: "#111c44", bandColor: "#c4b5fd", decoration: "moon" },
  { id: "flame", name: "Lángsüveg", obtain: "Főellenség jutalma", style: "pointed", color: "#9a1f1f", bandColor: "#fb923c", decoration: "stars" },
  { id: "swamp", name: "Mocsári kalap", obtain: "Holdfényes mocsár", style: "wide", color: "#3f4a2a", bandColor: "#c4b5fd", decoration: "moon" },
];

export const ROBES: RobeDef[] = [
  { id: "apprentice", name: "Tanonc köpeny", obtain: START, color: "#4c2a91", trimColor: "#fbbf24", pattern: "stars" },
  { id: "traveler", name: "Úti köpeny", obtain: "Bolt: 150 arany", color: "#7c4a2d", trimColor: "#e7c48a", pattern: "plain" },
  { id: "forest", name: "Erdei köpeny", obtain: "Ködös erdő", color: "#2f5d3a", trimColor: "#d9f99d", pattern: "plain" },
  { id: "arcane", name: "Rúnás köpeny", obtain: "Bolt: 400 arany", color: "#14335c", trimColor: "#5ee0ff", pattern: "runes" },
  { id: "flame", name: "Lángköpeny", obtain: "Főellenség jutalma", color: "#7f1d1d", trimColor: "#fb923c", pattern: "stars" },
  { id: "moonlight", name: "Holdfény köpeny", obtain: "Kristálybarlang", color: "#334155", trimColor: "#e2e8f0", pattern: "runes" },
];

export const STAFFS: StaffDef[] = [
  { id: "oak", name: "Tölgyfa pálca", obtain: START, woodColor: "#8b5a2b", top: "orb", gemColor: "#fbbf24" },
  { id: "druid", name: "Druida bot", obtain: "Bolt: 200 arany", woodColor: "#6b4f2a", top: "curl", gemColor: "#86efac" },
  { id: "crystal", name: "Kristálypálca", obtain: "Kristálybarlang", woodColor: "#5b6b8c", top: "crystal", gemColor: "#5ee0ff" },
  { id: "ember", name: "Parázspálca", obtain: "Főellenség jutalma", woodColor: "#3b2416", top: "orb", gemColor: "#ef4444" },
  { id: "frost", name: "Jégpálca", obtain: "Bolt: 500 arany", woodColor: "#94a3b8", top: "crystal", gemColor: "#e0f2fe" },
];

export const AMULETS: AmuletDef[] = [
  { id: "sun", name: "Napkő", obtain: "Virágos rét: 500 pont", shape: "round", color: "#fb923c" },
  { id: "frost", name: "Fagykő", obtain: "Bolt: 250 arany", shape: "diamond", color: "#93c5fd" },
  { id: "moon", name: "Holdsarló", obtain: "Holdfényes mocsár", shape: "moon", color: "#e9d5ff" },
  { id: "emerald", name: "Smaragd", obtain: "Ködös erdő", shape: "round", color: "#34d399" },
  { id: "ruby", name: "Rubin", obtain: "Főellenség jutalma", shape: "diamond", color: "#f43f5e" },
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

export function itemKey(slot: GearSlot, id: string) {
  return `${slot}:${id}`;
}

/** Kezdéskor feloldott tárgyak ("hely:azonosító"). Egyelőre minden ruha nyitva,
 *  amíg nincs bolt és jutalom; később csak az alapfelszerelés lesz itt. */
export const STARTING_ITEMS = (Object.keys(GEAR) as GearSlot[]).flatMap((slot) =>
  GEAR[slot].map((item) => itemKey(slot, item.id)),
);

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
