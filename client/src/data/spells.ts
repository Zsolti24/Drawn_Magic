export type SpellEffect =
  /** Lövedék a legközelebbi ellenfél felé, kicsit követi a célt */
  | { kind: "projectile"; damage: number; speed: number }
  /** Rakétaraj: mindegyik más ellenfelet vesz célba, és követi */
  | { kind: "missiles"; count: number; damage: number; speed: number }
  /** Villám: az első célponttól minden egymás mellett álló ellenfélen végigugrik (jump távolságon belül) */
  | { kind: "chain"; damage: number; range: number; jump: number }
  /** Pajzs a mágus körül: ami hozzáér, elpusztul */
  | { kind: "shield"; duration: number }
  /** Tűzgyűrű: a mágus körül kitörő lánggyűrű megperzseli és hátralöki a közelieket */
  | { kind: "firering"; radius: number; damage: number; push: number }
  /** Villanás: a mágus a mozgás irányába ugrik, a helyén arkán robbanás marad */
  | { kind: "blink"; distance: number; damage: number; radius: number }
  /** Forgószél: minden ellenfelet a pálya széléig sodor, utána egy kicsit szédülnek */
  | { kind: "tornado"; dizzy: number }
  /** Mérgező fiola a legsűrűbb csapatba: a tócsa egy ideig sebzi a benne állókat */
  | { kind: "poison"; radius: number; duration: number; tickDamage: number; tickEvery: number; throwTime: number }
  /** Gyógyítás: életerő vissza */
  | { kind: "heal"; amount: number }
  /** Életszívás: a közeli ellenfelekből életerőt szív, a sebzés egy része gyógyít */
  | { kind: "drain"; targets: number; range: number; damage: number; lifesteal: number }
  /** Jéghullám: a közeli ellenfeleket jégbe fagyasztja */
  | { kind: "freeze"; radius: number; duration: number }
  /** Meteor: rövid idő múlva becsapódik a legsűrűbb csapatba */
  | { kind: "meteor"; radius: number; damage: number; delay: number }
  /** Fekete lyuk: egy ideig magába szívja a közeli ellenfeleket, aztán összeomlik */
  | { kind: "blackhole"; radius: number; pull: number; duration: number; damage: number }
  /** Felemelkedés: a mágus egy időre megtáltosodik: többet sebez, gyorsabban tölt a mana és a varázslatok, és gyógyul */
  | { kind: "ascend"; duration: number; damageMult: number; manaRegenMult: number; cooldownMult: number; heal: number };

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

// A sorrend a képességtár, a varázslatsáv és a billentyűk sorrendje is.
// A jel bonyolultsága nagyjából a varázslat erejét követi: a tűzgolyó egy vonás, a Felemelkedés egy csillag.
export const SPELLS: SpellDef[] = [
  {
    id: "fireball",
    name: "Tűzgolyó",
    glyph: "line",
    description: "Egy húzás bármelyik irányba: a legközelebbi ellenfél felé repül, és követi a célt.",
    color: "#fb923c",
    mana: 2,
    cooldown: 0.5,
    castLock: 0.2,
    effect: { kind: "projectile", damage: 26, speed: 1.8 },
  },
  {
    id: "lightning",
    name: "Villám",
    glyph: "zigzag",
    description: "A legközelebbi ellenfélbe csap, és onnan minden egymás mellett állón végigugrik, ameddig csak össze tudja kapcsolni őket.",
    color: "#facc15",
    mana: 8,
    cooldown: 3,
    castLock: 0.45,
    effect: { kind: "chain", damage: 22, range: 1.1, jump: 0.4 },
  },
  {
    id: "missiles",
    name: "Arkán rakéták",
    glyph: "sigma",
    description: "Öt lila rakéta röppen ki a pálcából, mindegyik más ellenfelet vesz üldözőbe.",
    color: "#a78bfa",
    mana: 6,
    cooldown: 2.5,
    castLock: 0.3,
    effect: { kind: "missiles", count: 5, damage: 14, speed: 1.3 },
  },
  {
    id: "shield",
    name: "Pajzs",
    glyph: "omega",
    description: "4 másodpercig véd, ami hozzáér, elpusztul.",
    color: "#5ee0ff",
    mana: 10,
    cooldown: 8,
    castLock: 0.55,
    effect: { kind: "shield", duration: 4 },
  },
  {
    id: "firering",
    name: "Tűzgyűrű",
    glyph: "circle",
    description: "Lánggyűrű tör ki a mágus körül: megperzseli és messzire hátralöki a közeli ellenfeleket.",
    color: "#f97316",
    mana: 10,
    cooldown: 6,
    castLock: 0.4,
    effect: { kind: "firering", radius: 0.55, damage: 30, push: 0.45 },
  },
  {
    id: "blink",
    name: "Villanás",
    glyph: "z",
    description: "A mágus egy szempillantás alatt elugrik a mozgás irányába, a helyén arkán robbanás marad.",
    color: "#e879f9",
    mana: 5,
    cooldown: 4,
    castLock: 0.05,
    effect: { kind: "blink", distance: 0.75, damage: 25, radius: 0.3 },
  },
  {
    id: "poison",
    name: "Méregbomba",
    glyph: "hourglass",
    description: "Mérgező fiolát dob a legsűrűbb ellenfélcsoportba. A hatalmas, bugyborékoló tócsa 6 másodpercig sebzi, aki belelép.",
    color: "#a3e635",
    mana: 8,
    cooldown: 5,
    castLock: 0.35,
    effect: { kind: "poison", radius: 0.65, duration: 6, tickDamage: 8, tickEvery: 0.45, throwTime: 0.6 },
  },
  {
    id: "freeze",
    name: "Fagyasztó nova",
    glyph: "triangle",
    description: "Jégszilánkos hullám söpör végig a mágus körül, és a közeli ellenfeleket 3 másodpercre jégbe fagyasztja.",
    color: "#bae6fd",
    mana: 10,
    cooldown: 9,
    castLock: 0.55,
    effect: { kind: "freeze", radius: 0.75, duration: 3 },
  },
  {
    id: "heal",
    name: "Gyógyítás",
    glyph: "heart",
    description: "Meleg fény járja át a mágust, és visszatölt 35 életerőt.",
    color: "#f9a8d4",
    mana: 10,
    cooldown: 10,
    castLock: 0.7,
    effect: { kind: "heal", amount: 35 },
  },
  {
    id: "drain",
    name: "Életszívás",
    glyph: "check",
    description: "Vörös fonalak kapaszkodnak a közeli ellenfelekbe, és kiszívják az életüket: a sebzés fele a mágust gyógyítja.",
    color: "#f43f5e",
    mana: 8,
    cooldown: 6,
    castLock: 0.5,
    effect: { kind: "drain", targets: 4, range: 0.9, damage: 22, lifesteal: 0.5 },
  },
  {
    id: "tornado",
    name: "Tornádó",
    glyph: "spiral",
    description: "Forgószél tör ki a mágusból, és minden ellenfelet pörögve a pálya széléig sodor. Utána egy kicsit szédülnek.",
    color: "#5eead4",
    mana: 12,
    cooldown: 12,
    castLock: 0.8,
    effect: { kind: "tornado", dizzy: 1.2 },
  },
  {
    id: "meteor",
    name: "Meteor",
    glyph: "loop",
    description: "Hatalmas lángoló szikla zuhan az égből a legsűrűbb ellenfélcsoportra, és óriási robbanással mindent elsöpör.",
    color: "#ef4444",
    mana: 15,
    cooldown: 12,
    castLock: 0.75,
    effect: { kind: "meteor", radius: 0.62, damage: 90, delay: 0.9 },
  },
  {
    id: "blackhole",
    name: "Fekete lyuk",
    glyph: "infinity",
    description:
      "Örvénylő szingularitás nyílik a legsűrűbb ellenfélcsoport közepén. 2,5 másodpercig magába szív mindent a közelben, aztán hatalmas villanással összeomlik.",
    color: "#c084fc",
    mana: 18,
    cooldown: 18,
    castLock: 0.85,
    effect: { kind: "blackhole", radius: 0.75, pull: 0.55, duration: 2.5, damage: 60 },
  },
  {
    id: "ascend",
    name: "Felemelkedés",
    glyph: "star",
    description:
      "A mágus fénybe borulva a magasba emelkedik, és 8 másodpercre megtáltosodik: két és félszer akkorát sebez, a mana ötször, a varázslatok négyszer gyorsabban töltődnek, és 30 életerőt visszanyer.",
    color: "#fde047",
    mana: 25,
    cooldown: 30,
    castLock: 1.1,
    effect: { kind: "ascend", duration: 8, damageMult: 2.5, manaRegenMult: 5, cooldownMult: 4, heal: 30 },
  },
];

export const SPELL_BY_GLYPH = new Map(SPELLS.map((s) => [s.glyph, s]));
export const SPELL_BY_ID = new Map(SPELLS.map((s) => [s.id, s]));

/** A varázslat rövid jellemzése a képességek menübe: kit ér, mennyit sebez, mozgatja-e az ellenfeleket */
export interface SpellTraits {
  /** Egy célpont, több célpont, terület vagy önmaga */
  target: { kind: "single" | "multi" | "area" | "self"; label: string };
  /** Sebzés szövegesen (null: nem sebez) */
  damage: string | null;
  /** Mozgatás vagy irányítás (null: nincs) */
  control: string | null;
  /** Gyógyítás vagy erősítés (null: nincs) */
  bonus: string | null;
}

const num = (n: number) => n.toLocaleString("hu-HU");

export function spellTraits(spell: SpellDef): SpellTraits {
  const e = spell.effect;
  const none = { damage: null, control: null, bonus: null };
  switch (e.kind) {
    case "projectile":
      return { ...none, target: { kind: "single", label: "Egy célpont" }, damage: num(e.damage) };
    case "missiles":
      return { ...none, target: { kind: "multi", label: `${e.count} célpont` }, damage: `${num(e.damage)} / rakéta` };
    case "chain":
      return { ...none, target: { kind: "multi", label: "Lánc, minden szomszédos" }, damage: `${num(e.damage)} / célpont` };
    case "shield":
      return { ...none, target: { kind: "self", label: "Önmaga" }, damage: "Ami hozzáér, elpusztul" };
    case "firering":
      return { ...none, target: { kind: "area", label: "Terület, maga körül" }, damage: num(e.damage), control: "Messzire hátralök" };
    case "blink":
      return { ...none, target: { kind: "area", label: "Terület, a régi helyén" }, damage: num(e.damage), control: "A mágus elugrik" };
    case "tornado":
      return { ...none, target: { kind: "area", label: "Terület, az egész pálya" }, control: `Ellök a pálya széléig, ${num(e.dizzy)} mp szédülés` };
    case "poison":
      return {
        ...none,
        target: { kind: "area", label: "Nagy terület" },
        damage: `${num(e.tickDamage)} / ${num(e.tickEvery)} mp, ${num(e.duration)} mp-ig`,
      };
    case "heal":
      return { ...none, target: { kind: "self", label: "Önmaga" }, bonus: `+${e.amount} élet` };
    case "drain":
      return {
        ...none,
        target: { kind: "multi", label: `${e.targets} célpont` },
        damage: `${num(e.damage)} / célpont`,
        bonus: `A sebzés ${Math.round(e.lifesteal * 100)}%-a gyógyít`,
      };
    case "freeze":
      return { ...none, target: { kind: "area", label: "Terület, maga körül" }, control: `Fagyaszt, ${num(e.duration)} mp` };
    case "meteor":
      return { ...none, target: { kind: "area", label: "Nagy terület" }, damage: num(e.damage) };
    case "blackhole":
      return { ...none, target: { kind: "area", label: "Terület" }, damage: num(e.damage), control: `Beszív, ${num(e.duration)} mp` };
    case "ascend":
      return {
        ...none,
        target: { kind: "self", label: "Önmaga" },
        bonus: `${num(e.duration)} mp: ×${num(e.damageMult)} sebzés, ×${e.manaRegenMult} mana, ×${e.cooldownMult} töltés, +${e.heal} élet`,
      };
  }
}

/** Később tanulható varázslatok helye a képességek menüben (5. fázis); most minden varázslat kész */
export const UPCOMING_SPELLS: { id: string; name: string; description: string; color: string }[] = [];
