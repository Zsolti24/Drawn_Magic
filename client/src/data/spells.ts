export type SpellEffect =
  /** Lövedék a legközelebbi ellenfél felé, kicsit követi a célt */
  | { kind: "projectile"; damage: number; speed: number }
  /** Villám, ami ellenfélről ellenfélre ugrik */
  | { kind: "chain"; damage: number; targets: number; range: number; jump: number }
  /** Pajzs a mágus körül: ami hozzáér, elpusztul */
  | { kind: "shield"; duration: number }
  /** Forgószél: minden ellenfelet a pálya széléig sodor, utána egy kicsit szédülnek */
  | { kind: "tornado"; dizzy: number }
  /** Mérgező fiola a legsűrűbb csapatba: a tócsa egy ideig sebzi a benne állókat */
  | { kind: "poison"; radius: number; duration: number; tickDamage: number; tickEvery: number; throwTime: number }
  /** Gyógyítás: életerő vissza */
  | { kind: "heal"; amount: number }
  /** Jéghullám: a közeli ellenfeleket jégbe fagyasztja */
  | { kind: "freeze"; radius: number; duration: number }
  /** Meteor: rövid idő múlva becsapódik a legsűrűbb csapatba */
  | { kind: "meteor"; radius: number; damage: number; delay: number }
  /** Fekete lyuk: egy ideig magába szívja a közeli ellenfeleket, aztán összeomlik */
  | { kind: "blackhole"; radius: number; pull: number; duration: number; damage: number };

export interface SpellDef {
  id: string;
  name: string;
  /** Melyik rajzolt jel indítja (lásd glyphs.ts) */
  glyph: string;
  /** Rövid leírás a képességek menübe */
  description: string;
  color: string;
  mana: number;
  /** Töltési idő (mp): ennyi időnek kell eltelnie két elsütés között */
  cooldown: number;
  /** Ennyi ideig nem tud mozogni a mágus a varázslás közben (mp) */
  castLock: number;
  effect: SpellEffect;
}

export const SPELLS: SpellDef[] = [
  {
    id: "fireball",
    name: "Tűzgolyó",
    glyph: "v",
    description: "A legközelebbi ellenfél felé repül, és követi a célt.",
    color: "#fb923c",
    mana: 12,
    cooldown: 0.6,
    castLock: 0.2,
    effect: { kind: "projectile", damage: 16, speed: 1.8 },
  },
  {
    id: "lightning",
    name: "Villám",
    glyph: "zigzag",
    description: "Ellenfélről ellenfélre ugrik, legfeljebb 3 célpontig.",
    color: "#facc15",
    mana: 35,
    cooldown: 3,
    castLock: 0.45,
    effect: { kind: "chain", damage: 20, targets: 3, range: 1.1, jump: 0.6 },
  },
  {
    id: "shield",
    name: "Pajzs",
    glyph: "circle",
    description: "3 másodpercig véd, ami hozzáér, elpusztul.",
    color: "#5ee0ff",
    mana: 45,
    cooldown: 8,
    castLock: 0.55,
    effect: { kind: "shield", duration: 3 },
  },
  {
    id: "tornado",
    name: "Tornádó",
    glyph: "spiral",
    description: "Forgószél tör ki a mágusból, és minden ellenfelet pörögve a pálya széléig sodor. Utána egy kicsit szédülnek.",
    color: "#5eead4",
    mana: 50,
    cooldown: 12,
    castLock: 0.8,
    effect: { kind: "tornado", dizzy: 1.2 },
  },
  {
    id: "poison",
    name: "Méregbomba",
    glyph: "triangle",
    description: "Mérgező fiolát dob a legsűrűbb ellenfélcsoportba. A bugyborékoló tócsa 4 másodpercig sebzi, aki belelép.",
    color: "#a3e635",
    mana: 30,
    cooldown: 5,
    castLock: 0.35,
    effect: { kind: "poison", radius: 0.3, duration: 4, tickDamage: 6, tickEvery: 0.45, throwTime: 0.55 },
  },
  {
    id: "heal",
    name: "Gyógyítás",
    glyph: "heart",
    description: "Meleg fény járja át a mágust, és visszatölt 35 életerőt.",
    color: "#f9a8d4",
    mana: 40,
    cooldown: 10,
    castLock: 0.7,
    effect: { kind: "heal", amount: 35 },
  },
  {
    id: "freeze",
    name: "Fagyasztó nova",
    glyph: "caret",
    description: "Jégszilánkos hullám söpör végig a mágus körül, és a közeli ellenfeleket 3 másodpercre jégbe fagyasztja.",
    color: "#bae6fd",
    mana: 35,
    cooldown: 9,
    castLock: 0.55,
    effect: { kind: "freeze", radius: 0.75, duration: 3 },
  },
  {
    id: "meteor",
    name: "Meteor",
    glyph: "s",
    description: "Lángoló szikla zuhan az égből a legsűrűbb ellenfélcsoportra, és hatalmas robbanással mindent elsöpör.",
    color: "#ef4444",
    mana: 60,
    cooldown: 14,
    castLock: 0.75,
    effect: { kind: "meteor", radius: 0.38, damage: 60, delay: 0.9 },
  },
  {
    id: "blackhole",
    name: "Fekete lyuk",
    glyph: "infinity",
    description:
      "Örvénylő szingularitás nyílik a legsűrűbb ellenfélcsoport közepén. 2,5 másodpercig magába szív mindent a közelben, aztán hatalmas villanással összeomlik.",
    color: "#c084fc",
    mana: 70,
    cooldown: 18,
    castLock: 0.85,
    effect: { kind: "blackhole", radius: 0.75, pull: 0.55, duration: 2.5, damage: 60 },
  },
];

export const SPELL_BY_GLYPH = new Map(SPELLS.map((s) => [s.glyph, s]));
export const SPELL_BY_ID = new Map(SPELLS.map((s) => [s.id, s]));

/** Később tanulható varázslatok helye a képességek menüben (5. fázis); most minden varázslat kész */
export const UPCOMING_SPELLS: { id: string; name: string; description: string; color: string }[] = [];
