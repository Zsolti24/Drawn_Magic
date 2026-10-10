// A játék állapota és szabályai. React-től független: a komponens csak
// beállítja az irányítást, meghívja az update()-et és kirajzolja az állapotot.
//
// Koordináták: a pálya közepe a (0, 0) pont, 1 egység = a képernyő rövidebb
// oldalának fele. A pálya zárt és nagyobb a képernyőnél, a kamera követi a mágust.
import type { SpellDef } from "../data/spells";
import { ENEMY_BY_ID, type EnemyBehavior, type EnemyMixEntry } from "../data/enemies";
import type { Point } from "./types";
import { ArenaCollider, type Arena } from "./arena";

export interface GameConfig {
  /** A pálya fél szélessége és fél magassága (egység) */
  worldHalfWidth: number;
  worldHalfHeight: number;
  /** A képernyő közepétől ekkora távolságig (a látott terület arányában) nem mozdul a kamera */
  cameraDeadZone: number;
  /** A kamera utánhúzásának gyorsasága (1/mp) */
  cameraFollow: number;
  /** Ennyit láthat a kamera a pálya szélén túl (a sövény és a HUD miatt) */
  cameraEdgeMargin: number;
  maxHp: number;
  /** Ennyit sebez egy ellenfél egy ütéssel */
  enemyDamage: number;
  /** Két ütés között eltelt idő (mp) */
  enemyAttackInterval: number;
  maxMana: number;
  /** Mana visszatöltődés (egység/mp) */
  manaRegen: number;
  wizardRadius: number;
  /** Mágus sebessége (egység/mp) */
  wizardSpeed: number;
  /** Sebződés utáni sérthetetlenség (mp) */
  invulnerableTime: number;
  enemyRadius: number;
  enemyHp: number;
  /** Érkező ellenfelek száma másodpercenként a játék elején és a legnehezebb ponton */
  spawnRate: [start: number, end: number];
  /** Ellenfél sebessége (egység/mp) a játék elején és a legnehezebb ponton */
  enemySpeed: [start: number, end: number];
  /** Ennyi mp alatt éri el a nehézség a maximumot (ha nincs megadva a pálya hossza) */
  rampSeconds: number;
  pointsPerKill: number;
  /** Egyszerre legfeljebb ennyi ellenfél lehet a pályán */
  maxEnemies: number;
  /** Az ellenfelek kinézete: szörny vagy gyakorló célbábu */
  enemyLook: "monster" | "dummy";
  /** A látott területen belül jelenjenek meg (gyakorláshoz), ne a szélén kívül */
  spawnInView: boolean;
  /** Célpont nélkül a dobott/hívott varázslatok (méregbomba, meteor) ilyen messze landolnak */
  noTargetDistance: number;
  /** A pálya talaja és hangulata (pl. "meadow", "forest") */
  terrain: string;
  /** Az ellenfelek színe: test és perem */
  enemyTint: [body: string, rim: string];
  /** A pálya ellenfelei típus szerint; null esetén egyszerű szörnyek az enemyHp / enemySpeed alapján */
  enemyMix: EnemyMixEntry[] | null;
  /** A típusok életerejének és sebességének szorzója ezen a pályán */
  enemyHpScale: number;
  enemySpeedScale: number;
  /** A pálya hossza (mp): ennyi ideig érkeznek ellenfelek, utána a maradékot kell legyőzni (0 = végtelen) */
  duration: number;
  /** A mágus statjaiból: a varázslatok sebzésének és töltési idejének szorzója */
  damageMult: number;
  cooldownMult: number;
  /** Ennyi távolságon belül repülnek a tapasztalatgyöngyök a mágushoz (egység) */
  pickupRadius: number;
  /** A pályán leeshető tárgyak (amiket a játékos még nem szerzett meg) és a ritkaságuk */
  lootTable: { item: string; rarity: LootRarity }[];
  /** Esély, hogy egy legyőzött szörny tárgyat ejt (a garantált első után) */
  lootChance: number;
  /** Pályánként legfeljebb ennyi tárgy eshet le */
  lootMax: number;
  /** A pálya rögzített környezete (akadályok, folyók, tavak); null: üres rét */
  arena: Arena | null;
}

export const DEFAULT_CONFIG: GameConfig = {
  worldHalfWidth: 2.8,
  worldHalfHeight: 1.8,
  cameraDeadZone: 0.12,
  cameraFollow: 9,
  cameraEdgeMargin: 0.3,
  maxHp: 100,
  enemyDamage: 5,
  enemyAttackInterval: 1.1,
  maxMana: 100,
  manaRegen: 9,
  wizardRadius: 0.07,
  wizardSpeed: 0.6,
  invulnerableTime: 0,
  enemyRadius: 0.045,
  enemyHp: 30,
  spawnRate: [0.5, 1.8],
  enemySpeed: [0.16, 0.3],
  rampSeconds: 180,
  pointsPerKill: 10,
  maxEnemies: 70,
  enemyLook: "monster",
  spawnInView: false,
  noTargetDistance: 0.55,
  terrain: "meadow",
  enemyTint: ["#3a2f5c", "#6b5a9e"],
  enemyMix: null,
  enemyHpScale: 1,
  enemySpeedScale: 1,
  duration: 0,
  damageMult: 1,
  cooldownMult: 1,
  pickupRadius: 0.42,
  lootTable: [],
  lootChance: 0.004,
  lootMax: 2,
  arena: null,
};

/** A tárgy ritkasága: 0 = ritka (kék), 1 = epikus (lila), 2 = legendás (arany) */
export type LootRarity = 0 | 1 | 2;

/** A leeső tárgy ívben repül ki a szörnyből ennyi idő alatt (mp) */
const LOOT_FLIGHT = 0.75;

/** Ennyi ideig marad a földön a tapasztalatgyöngy, aztán elhalványul (mp) */
export const ORB_LIFE = 30;
/** Ha ennyi ideig nincs ellenfél a képernyőn, azonnal érkezik egy csoport a látott terület szélén (mp) */
const EMPTY_VIEW_SECONDS = 0.8;

/** A rég nem látott fajok legfeljebb ennyiszeres eséllyel jönnek (hogy minden faj rendszeresen felbukkanjon) */
const VARIETY_BOOST_MAX = 2.5;
/** Ennyi mp kihagyás után éri el egy faj a legnagyobb esélyt */
const VARIETY_BOOST_SECONDS = 25;
/** A pályán még nem látott fajok esélyszorzója: a pálya elején hamar sorra kerül mindegyik */
const NEW_TYPE_BOOST = 8;

export interface Wizard {
  x: number;
  y: number;
  /** Az utolsó mozgás iránya (egységvektor) */
  facing: Point;
  /** Merre néz a figura: 1 = jobbra, -1 = balra */
  side: 1 | -1;
  /** Járási fázis (radián) és hogy épp mozog-e, az animációhoz */
  walk: number;
  moving: boolean;
  hp: number;
  mana: number;
  /** Hátralévő pajzsidő (mp) */
  shield: number;
  /** Hátralévő sérthetetlenség (mp) */
  invulnerable: number;
  /** Hátralévő idő, amíg varázslás miatt nem mozoghat (mp) */
  rooted: number;
  /** Felemelkedés: hátralévő idő (mp), teljes hossz és a szorzók (null: nincs) */
  empowered: { left: number; duration: number; damageMult: number; manaRegenMult: number; cooldownMult: number } | null;
}

export interface Enemy {
  id: number;
  /** Típus (data/enemies.ts), ez dönti el a kinézetet és a viselkedést */
  type: string;
  behavior: EnemyBehavior;
  x: number;
  y: number;
  speed: number;
  damage: number;
  attackInterval: number;
  /** Viselkedés állapota (pl. "walk", "windup", "roll", "under", "air") és ideje */
  mode: string;
  timer: number;
  /** Saját sebesség rohamnál, ugrásnál, lecsapásnál */
  vx: number;
  vy: number;
  /** Magasság a föld fölött (ugrás, repülés) */
  height: number;
  /** A föld alatt van: nem sebezhető, nem célozható */
  burrowed: boolean;
  /** Merre néz: 1 = jobbra, -1 = balra */
  facing: 1 | -1;
  /** Járási fázis az animációhoz */
  walk: number;
  /** Körözés szöge (lecsapó repülőknél) */
  orbit: number;
  radius: number;
  hp: number;
  /** Animációs fázis, hogy ne egyszerre mozogjanak */
  phase: number;
  /** 0..1, a megjelenés animációja */
  appear: number;
  /** 1-ről 0-ra csökken találat után */
  hitFlash: number;
  /** Hátralévő fagyás (mp): nem mozog, nem sebez */
  frozen: number;
  /** Hátralévő szédülés (mp) a forgószél után */
  dizzy: number;
  /** Forgószél sodrása: honnan hová, mennyi ideig, mikor indul */
  push: { fromX: number; fromY: number; toX: number; toY: number; t: number; duration: number; delay: number } | null;
  /** Pörgés szöge (sodródás közben) */
  spin: number;
  /** Hátralévő mérgezettség (mp), csak a megjelenéshez */
  poisoned: number;
  maxHp: number;
  /** Az életerőcsík lassan követő "utóhúzása" */
  hpTrail: number;
  /** Mennyi idő múlva üthet újra (mp) */
  attackCd: number;
  /** Ütés animáció: 1-ről 0-ra fogy */
  attackAnim: number;
}

/** Egy varázslási kísérlet a visszajelzéshez (sávanimáció, buborék) */
export interface CastAttempt {
  spellId: string;
  result: "cast" | "no_mana" | "cooldown";
  /** Mennyi mana hiányzott / mennyi töltési idő volt hátra */
  missing: number;
  age: number;
}

/** Jégnova: kitörő jégtüskék és terjedő dér */
export interface FrostNova {
  x: number;
  y: number;
  age: number;
  duration: number;
  radius: number;
  color: string;
}

/** Meteor-becsapódás: villanás, törmelék, füst, izzó kráter */
export interface Impact {
  x: number;
  y: number;
  age: number;
  duration: number;
  radius: number;
  color: string;
  /** Véletlen mag a törmelék irányaihoz */
  seed: number;
}

/** Fekete lyuk a pályán */
export interface BlackHole {
  x: number;
  y: number;
  age: number;
  duration: number;
  radius: number;
  pull: number;
  damage: number;
  color: string;
}

/** Forgószél a mágus körül */
export interface Tornado {
  x: number;
  y: number;
  age: number;
  duration: number;
  /** Ekkora sugárig tágul */
  reach: number;
  color: string;
}

/** Ívben repülő méregfiola */
export interface Bomb {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  t: number;
  duration: number;
  color: string;
  radius: number;
  cloudDuration: number;
  tickDamage: number;
  tickEvery: number;
}

/** Mérgező tócsa a földön */
export interface PoisonCloud {
  x: number;
  y: number;
  radius: number;
  life: number;
  maxLife: number;
  tick: number;
  tickEvery: number;
  tickDamage: number;
  color: string;
}

/** Zuhanó meteor: a delay alatt árnyék jelzi a becsapódás helyét */
export interface Meteor {
  x: number;
  y: number;
  t: number;
  delay: number;
  radius: number;
  damage: number;
  color: string;
}

/** Perzselt folt a meteor után */
export interface Scorch {
  x: number;
  y: number;
  radius: number;
  life: number;
  maxLife: number;
}

/** Táguló lökéshullám-gyűrű */
export interface Ring {
  x: number;
  y: number;
  from: number;
  to: number;
  life: number;
  maxLife: number;
  color: string;
  width: number;
  /** Jégszilánkok a gyűrűn (fagyasztás) */
  shards?: boolean;
}

/** A földre esett tárgy (ruha): ívben kirepül a szörnyből, aztán fénylik a földön */
export interface Loot {
  /** A tárgy ("hely:azonosító"); a játékos csak felvételkor tudja meg, mi az */
  item: string;
  rarity: LootRarity;
  /** Honnan repült ki és hová esett */
  fromX: number;
  fromY: number;
  x: number;
  y: number;
  /** A repülés állapota (0..1); 1 = a földön van */
  t: number;
  /** A földön töltött idő (mp), az animációhoz */
  age: number;
}

/** Tapasztalatgyöngy: a legyőzött szörny ejti, a mágusnak fel kell vennie */
export interface XpOrb {
  x: number;
  y: number;
  vx: number;
  vy: number;
  value: number;
  age: number;
  /** Már a mágus felé repül */
  magnet: boolean;
  /** Animációs fázis */
  phase: number;
}

export interface Projectile {
  x: number;
  y: number;
  vx: number;
  vy: number;
  speed: number;
  targetId: number | null;
  damage: number;
  color: string;
  life: number;
}

export interface Bolt {
  points: Point[];
  color: string;
  life: number;
  /** Milyen gyorsan halványul (1/mp), alapból 3 */
  decay?: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  /** Felszálló részecske (kevésbé lassul) */
  rise?: boolean;
}

export interface FloatingText {
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
}

export type GameEvent =
  | { type: "cast"; spell: SpellDef }
  | { type: "no_mana"; spell: SpellDef }
  | { type: "cooldown"; spell: SpellDef }
  | { type: "kill"; count: number }
  | { type: "hurt"; hp: number }
  | { type: "over"; score: number }
  | { type: "won"; score: number }
  /** A mágus felvett egy leesett tárgyat */
  | { type: "loot"; item: string; rarity: LootRarity };

/** A mágus figurájának arányai a sugarához képest: talppont és méret (a rajzoló is ezeket használja) */
export const WIZARD_FEET = 0.85;
export const WIZARD_FIGURE = 1.15;
/** A pálca hegye a figura helyi koordinátáiban, a varázslás pillanatában (jobbra nézve) */
const STAFF_TIP_LOCAL: Point = { x: 0.74, y: -2.86 };

const PROJECTILE_RADIUS = 0.02;
const PROJECTILE_LIFE = 2.5;

export class Game {
  readonly config: GameConfig;
  readonly spells: SpellDef[];
  /** Ütközés a pálya környezetével (ha van) */
  readonly collider: ArenaCollider | null;
  wizard: Wizard;
  enemies: Enemy[] = [];
  projectiles: Projectile[] = [];
  bolts: Bolt[] = [];
  particles: Particle[] = [];
  texts: FloatingText[] = [];
  tornados: Tornado[] = [];
  bombs: Bomb[] = [];
  clouds: PoisonCloud[] = [];
  meteors: Meteor[] = [];
  scorches: Scorch[] = [];
  rings: Ring[] = [];
  blackholes: BlackHole[] = [];
  /** A legutóbbi varázslási kísérletek (pár másodpercig) */
  attempts: CastAttempt[] = [];
  novas: FrostNova[] = [];
  impacts: Impact[] = [];
  /** Képernyőrázkódás erőssége (0..1), lecseng */
  shake = 0;
  /** Mozgási szándék a billentyűzetről, -1..1 tengelyenként */
  input: Point = { x: 0, y: 0 };
  score = 0;
  kills = 0;
  /** A felvett tapasztalat ezen a pályán (a gyöngyökből) */
  xp = 0;
  /** A földön heverő tapasztalatgyöngyök */
  orbs: XpOrb[] = [];
  /** Az utolsó felvett gyöngy kora (mp), a HUD felvillanásához */
  lastPickup = Infinity;
  /** A pályán leesett tárgyak */
  loot: Loot[] = [];
  /** A garantált első tárgy ennyiedik legyőzött szörny után esik le */
  private lootPity = 15 + Math.floor(Math.random() * 26);
  /** Az ezen a pályán már leesett tárgyak (a felvettek is): egy tárgy csak egyszer eshet le */
  private droppedItems = new Set<string>();
  time = 0;
  over = false;
  /** A pálya teljesítve (lejárt az idő, és minden ellenfél legyőzve) */
  won = false;
  /** 1-ről 0-ra csökken sebződés után */
  hurtFlash = 0;
  /** Az utolsó varázslat és ideje, a mágus animációjához */
  lastCast: { spell: SpellDef; age: number } | null = null;
  /** A kamera középpontja (világkoordináta) */
  camera: Point = { x: 0, y: 0 };
  /** A látott terület fél szélessége és fél magassága (egység) */
  viewHalfWidth = 1;
  viewHalfHeight = 1;

  /** Hátralévő töltési idő varázslatonként (mp) */
  private cooldowns = new Map<string, number>();
  /** Az érkezésre "megtakarított" ellenfelek; ha eléri a következő csoport méretét, az megérkezik */
  private spawnBudget = 2;
  /** A következő csoport: típus és létszám (előre kiválasztva, hogy a keret kivárja) */
  private nextGroup: { type: string; count: number } | null = null;
  /** Fajonként mikor jött utoljára (mp), a változatossághoz */
  private lastSpawnOf = new Map<string, number>();
  /** Mióta nincs ellenfél a képernyőn (mp) */
  private emptyView = 0;
  private nextId = 1;
  private readonly spellsByGlyph: Map<string, SpellDef>;
  private readonly onEvent: (event: GameEvent) => void;

  constructor(spells: SpellDef[], onEvent: (event: GameEvent) => void, config: Partial<GameConfig> = {}) {
    this.spells = spells;
    this.spellsByGlyph = new Map(spells.map((s) => [s.glyph, s]));
    this.onEvent = onEvent;
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.collider = this.config.arena ? new ArenaCollider(this.config.arena) : null;
    this.wizard = {
      x: 0,
      y: 0,
      facing: { x: 0, y: -1 },
      side: 1,
      walk: 0,
      moving: false,
      hp: this.config.maxHp,
      mana: this.config.maxMana,
      shield: 0,
      invulnerable: 0,
      rooted: 0,
      empowered: null,
    };
  }

  /** A látott terület mérete egységben (a képernyő oldalarányától függ) */
  resize(viewHalfWidth: number, viewHalfHeight: number) {
    this.viewHalfWidth = viewHalfWidth;
    this.viewHalfHeight = viewHalfHeight;
    this.clampCamera();
  }

  /** 0..1, mennyire nehéz most a játék */
  get difficulty() {
    // Időre szóló pályán a pálya végére éri el a csúcsot
    const span = this.config.duration > 0 ? this.config.duration : this.config.rampSeconds;
    return Math.min(1, this.time / span);
  }

  /** Lejárt-e a pálya ideje (ilyenkor már nem jön új ellenfél) */
  get spawningDone() {
    return this.config.duration > 0 && this.time >= this.config.duration;
  }

  update(dt: number) {
    this.updateEffects(dt);
    if (this.over) return;

    this.time += dt;
    this.updateWizard(dt);
    this.updateCamera(dt);

    if (this.spawningDone) {
      if (this.enemies.length === 0) {
        // A pálya végén a földön maradt gyöngyök is a mágusé
        for (const orb of this.orbs) this.xp += orb.value;
        this.orbs = [];
        this.over = true;
        this.won = true;
        this.onEvent({ type: "won", score: this.score });
        return;
      }
    } else {
      this.updateSpawning(dt);
    }

    this.updateProjectiles(dt);
    this.updateEnemies(dt);
    this.updateOrbs(dt);
    this.updateLoot(dt);
  }

  /** Tapasztalatgyöngyök: kipattannak, a mágus közelében hozzá repülnek, érintésre felveszi őket */
  private updateOrbs(dt: number) {
    const w = this.wizard;
    const reach = this.config.wizardRadius * 0.9;
    this.lastPickup += dt;
    for (const orb of this.orbs) {
      orb.age += dt;
      const dx = w.x - orb.x;
      const dy = w.y + 0.02 - orb.y;
      const dist = Math.hypot(dx, dy) || 1e-6;
      if (!orb.magnet && dist < this.config.pickupRadius) orb.magnet = true;
      if (orb.magnet) {
        // Egyre gyorsabban húzza magához a mágus, minél közelebb van
        const pull = 8 + Math.max(0, this.config.pickupRadius - dist) * 60;
        orb.vx += (dx / dist) * pull * dt;
        orb.vy += (dy / dist) * pull * dt;
        const v = Math.hypot(orb.vx, orb.vy);
        const max = 2.2;
        if (v > max) {
          orb.vx *= max / v;
          orb.vy *= max / v;
        }
      } else {
        orb.vx *= 1 - Math.min(1, dt * 5);
        orb.vy *= 1 - Math.min(1, dt * 5);
      }
      orb.x += orb.vx * dt;
      orb.y += orb.vy * dt;
      if (Math.hypot(w.x - orb.x, w.y + 0.02 - orb.y) < reach) {
        orb.age = ORB_LIFE;
        this.xp += orb.value;
        this.lastPickup = 0;
        this.burst(orb.x, orb.y, orbColor(orb.value), 4);
      }
    }
    this.orbs = this.orbs.filter((o) => o.age < ORB_LIFE);
  }

  /** Tárgy ejtése: az első garantáltan leesik (lootPity-edik szörnynél), utána ritka véletlen; pályánként legfeljebb lootMax */
  private maybeDropLoot(x: number, y: number, killsSoFar: number) {
    const { lootTable, lootChance, lootMax } = this.config;
    const available = lootTable.filter((l) => !this.droppedItems.has(l.item));
    if (available.length === 0 || this.droppedItems.size >= lootMax) return;
    const guaranteed = this.droppedItems.size === 0 && killsSoFar >= this.lootPity;
    if (!guaranteed && Math.random() >= lootChance) return;
    // Súlyozott sorsolás: a legendás tárgy a legritkább
    const weight = (r: LootRarity) => (r === 2 ? 1 : r === 1 ? 3 : 5);
    let roll = Math.random() * available.reduce((sum, l) => sum + weight(l.rarity), 0);
    const pick = available.find((l) => (roll -= weight(l.rarity)) <= 0) ?? available[available.length - 1];
    // Kicsit arrébb esik, mint ahol a szörny elpusztult, de a pályán belül
    const a = Math.random() * Math.PI * 2;
    const d = 0.15 + Math.random() * 0.12;
    const { worldHalfWidth, worldHalfHeight } = this.config;
    this.droppedItems.add(pick.item);
    this.loot.push({
      item: pick.item,
      rarity: pick.rarity,
      fromX: x,
      fromY: y,
      x: clamp(x + Math.cos(a) * d, -worldHalfWidth + 0.15, worldHalfWidth - 0.15),
      y: clamp(y + Math.sin(a) * d, -worldHalfHeight + 0.15, worldHalfHeight - 0.15),
      t: 0,
      age: 0,
    });
    this.burst(x, y, lootColor(pick.rarity), 18);
  }

  /** A leeső tárgyak repülése és becsapódása (a földön egyelőre csak fénylenek; a felvétel később jön) */
  private updateLoot(dt: number) {
    for (const loot of this.loot) {
      if (loot.t < 1) {
        loot.t = Math.min(1, loot.t + dt / LOOT_FLIGHT);
        if (loot.t >= 1) {
          // Becsapódás: fényhullám, szikrák, kis rázkódás, felirat
          const color = lootColor(loot.rarity);
          this.rings.push({ x: loot.x, y: loot.y, from: 0.02, to: 0.32, life: 0.6, maxLife: 0.6, color, width: 0.025 });
          this.rings.push({ x: loot.x, y: loot.y, from: 0.02, to: 0.18, life: 0.4, maxLife: 0.4, color: "#ffffff", width: 0.015 });
          this.burst(loot.x, loot.y, color, 26);
          this.burst(loot.x, loot.y, "#ffffff", 10);
          this.shake = Math.max(this.shake, 0.3);
          this.texts.push({ x: loot.x, y: loot.y - 0.22, text: "Valami leesett!", color, life: 1.6 });
        }
      } else {
        loot.age += dt;
        // Rálépve a mágus felveszi (a becsapódás után egy pillanattal)
        const w = this.wizard;
        if (loot.age > 0.3 && Math.hypot(w.x - loot.x, w.y - loot.y) < this.config.wizardRadius + 0.07) {
          const color = lootColor(loot.rarity);
          loot.t = 2; // jelzés: felvéve, a ciklus végén kikerül
          this.rings.push({ x: loot.x, y: loot.y, from: 0.05, to: 0.45, life: 0.7, maxLife: 0.7, color, width: 0.03 });
          this.rings.push({ x: w.x, y: w.y, from: 0.3, to: 0.04, life: 0.5, maxLife: 0.5, color: "#ffffff", width: 0.02 });
          this.burst(loot.x, loot.y, color, 30);
          this.burst(w.x, w.y, "#fde68a", 16);
          this.shake = Math.max(this.shake, 0.35);
          this.onEvent({ type: "loot", item: loot.item, rarity: loot.rarity });
          continue;
        }
        // Felszálló fényszikrák a tárgy körül
        if (Math.random() < dt * 14) {
          const a = Math.random() * Math.PI * 2;
          const life = 0.8 + Math.random() * 0.6;
          this.particles.push({
            x: loot.x + Math.cos(a) * 0.06,
            y: loot.y + Math.sin(a) * 0.025,
            vx: (Math.random() - 0.5) * 0.04,
            vy: -0.2 - Math.random() * 0.2,
            life,
            maxLife: life,
            size: 0.004 + Math.random() * 0.005,
            color: Math.random() < 0.4 ? "#ffffff" : lootColor(loot.rarity),
            rise: true,
          });
        }
      }
    }
    this.loot = this.loot.filter((l) => l.t <= 1);
  }

  /** Gyöngy(ök) ejtése a legyőzött szörny helyén: a nagy értékű tapasztalat több gyöngyre oszlik */
  private dropXp(x: number, y: number, value: number) {
    const pieces = value >= 12 ? 3 : value >= 6 ? 2 : 1;
    let left = value;
    for (let i = 0; i < pieces; i++) {
      const v = i === pieces - 1 ? left : Math.round(value / pieces);
      left -= v;
      const a = Math.random() * Math.PI * 2;
      const speed = 0.25 + Math.random() * 0.35;
      this.orbs.push({ x, y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, value: v, age: 0, magnet: false, phase: Math.random() * 10 });
    }
  }

  /** Folyamatos érkezés: a keret a nehézséggel együtt gyorsabban telik, és ha kitelik egy csoportra, az megérkezik */
  private updateSpawning(dt: number) {
    const { maxEnemies } = this.config;
    if (maxEnemies <= 0) return;
    this.nextGroup ??= this.planGroup();
    // Mindig legyen kivel harcolni: ha a képernyő egy ideje üres, a látott terület szélén azonnal jön egy csoport
    const anyVisible = this.enemies.some((e) => !e.burrowed && this.isVisible(e.x, e.y));
    this.emptyView = anyVisible ? 0 : this.emptyView + dt;
    if (this.emptyView >= EMPTY_VIEW_SECONDS && this.enemies.length < maxEnemies) {
      this.spawn(this.nextGroup.type, this.nextGroup.count, true);
      this.nextGroup = this.planGroup();
      this.emptyView = 0;
      return;
    }
    // Tele a pálya: a keret nem gyűlik tovább (különben utána egyszerre zúdulna mindenki)
    if (this.enemies.length >= maxEnemies) {
      this.spawnBudget = Math.min(this.spawnBudget, this.nextGroup.count);
      return;
    }
    this.spawnBudget += lerp(...this.config.spawnRate, this.difficulty) * dt;
    if (this.spawnBudget < this.nextGroup.count) return;
    this.spawnBudget -= this.nextGroup.count;
    this.spawn(this.nextGroup.type, this.nextGroup.count);
    this.nextGroup = this.planGroup();
  }

  private planGroup() {
    const type = this.pickEnemyType();
    const [minPack, maxPack] = ENEMY_BY_ID.get(type)?.pack ?? [1, 1];
    return { type, count: minPack + Math.floor(Math.random() * (maxPack - minPack + 1)) };
  }

  /** A rajzolt jelhez tartozó varázslat elsütése; false, ha nincs ilyen felszerelt varázslat */
  cast(glyph: string): boolean {
    const spell = this.spellsByGlyph.get(glyph);
    if (!spell || this.over) return false;
    const w = this.wizard;
    if (this.cooldownLeft(spell.id) > 0) {
      this.attempts.push({ spellId: spell.id, result: "cooldown", missing: this.cooldownLeft(spell.id), age: 0 });
      this.onEvent({ type: "cooldown", spell });
      return true;
    }
    if (w.mana < spell.mana) {
      this.attempts.push({ spellId: spell.id, result: "no_mana", missing: spell.mana - w.mana, age: 0 });
      this.onEvent({ type: "no_mana", spell });
      return true;
    }
    this.attempts.push({ spellId: spell.id, result: "cast", missing: 0, age: 0 });
    w.mana -= spell.mana;
    this.cooldowns.set(spell.id, spell.cooldown * this.config.cooldownMult);
    w.rooted = Math.max(w.rooted, spell.castLock);
    this.lastCast = { spell, age: 0 };
    this.onEvent({ type: "cast", spell });

    const effect = spell.effect;
    switch (effect.kind) {
      case "projectile": {
        const target = this.nearestEnemy(w.x, w.y, Infinity);
        const tip = this.staffTip();
        const dir = target ? normalize(target.x - tip.x, target.y - tip.y) : w.facing;
        this.projectiles.push({
          x: tip.x,
          y: tip.y,
          vx: dir.x * effect.speed,
          vy: dir.y * effect.speed,
          speed: effect.speed,
          targetId: target?.id ?? null,
          damage: effect.damage,
          color: spell.color,
          life: PROJECTILE_LIFE,
        });
        break;
      }
      case "chain": {
        const tip = this.staffTip();
        const first = this.nearestEnemy(w.x, w.y, effect.range);
        if (!first) {
          // Nincs célpont: rövid szikra a nézési irányba
          this.bolts.push({ points: [tip, { x: tip.x + w.facing.x * 0.25, y: tip.y + w.facing.y * 0.25 }], color: spell.color, life: 1 });
          break;
        }
        // Szélességi bejárás: minden eltalált ellenfélről továbbugrik az összes közeli, még el nem találtra
        const hit: Enemy[] = [first];
        this.bolts.push({ points: [tip, { x: first.x, y: first.y }], color: spell.color, life: 1 });
        for (let i = 0; i < hit.length; i++) {
          const from = hit[i];
          for (const e of this.enemies) {
            if (e.burrowed || hit.includes(e) || Math.hypot(e.x - from.x, e.y - from.y) > effect.jump) continue;
            hit.push(e);
            this.bolts.push({ points: [{ x: from.x, y: from.y }, { x: e.x, y: e.y }], color: spell.color, life: 1 });
          }
        }
        if (hit.length > 4) this.shake = Math.max(this.shake, Math.min(0.6, hit.length * 0.04));
        this.damageAll(hit, effect.damage, spell.color);
        break;
      }
      case "missiles": {
        // Mindegyik rakéta más célpontot kap (a legközelebbiek közül); ha kevés az ellenfél, újrakezdi a sort
        const tip = this.staffTip();
        const targets = this.enemies
          .filter((e) => !e.burrowed)
          .sort((a, b) => Math.hypot(a.x - w.x, a.y - w.y) - Math.hypot(b.x - w.x, b.y - w.y))
          .slice(0, effect.count);
        for (let i = 0; i < effect.count; i++) {
          const target = targets.length ? targets[i % targets.length] : null;
          const base = target ? Math.atan2(target.y - tip.y, target.x - tip.x) : Math.atan2(w.facing.y, w.facing.x);
          // Legyezőben indulnak, aztán ráfordulnak a célra
          const a = base + (i - (effect.count - 1) / 2) * 0.45;
          this.projectiles.push({
            x: tip.x,
            y: tip.y,
            vx: Math.cos(a) * effect.speed,
            vy: Math.sin(a) * effect.speed,
            speed: effect.speed,
            targetId: target?.id ?? null,
            damage: effect.damage,
            color: spell.color,
            life: PROJECTILE_LIFE,
          });
        }
        this.burst(tip.x, tip.y, spell.color, 10);
        break;
      }
      case "firering": {
        this.rings.push({ x: w.x, y: w.y, from: 0.05, to: effect.radius, life: 0.45, maxLife: 0.45, color: spell.color, width: 0.05 });
        this.rings.push({ x: w.x, y: w.y, from: 0.05, to: effect.radius * 0.85, life: 0.35, maxLife: 0.35, color: "#fde047", width: 0.025 });
        // Lángnyelvek a gyűrű mentén
        for (let i = 0; i < 48; i++) {
          const a = (i / 48) * Math.PI * 2;
          const speed = effect.radius * (1.6 + Math.random() * 0.8);
          const life = 0.35 + Math.random() * 0.3;
          this.particles.push({
            x: w.x + Math.cos(a) * 0.08,
            y: w.y + Math.sin(a) * 0.05,
            vx: Math.cos(a) * speed,
            vy: Math.sin(a) * speed * 0.75 - 0.1,
            life,
            maxLife: life,
            size: 0.01 + Math.random() * 0.012,
            color: i % 3 === 0 ? "#fde047" : i % 3 === 1 ? spell.color : "#ef4444",
            rise: true,
          });
        }
        this.shake = Math.max(this.shake, 0.45);
        const near = this.enemies.filter((e) => !e.burrowed && Math.hypot(e.x - w.x, e.y - w.y) <= effect.radius + e.radius);
        this.damageAll(near, effect.damage, spell.color);
        for (const e of near) if (this.enemies.includes(e)) this.knockBack(e, w.x, w.y, effect.push, 0.5);
        break;
      }
      case "blink": {
        // Mozgás közben arra ugrik, különben amerre néz
        const len = Math.hypot(this.input.x, this.input.y);
        const dir = len > 0 ? { x: this.input.x / len, y: this.input.y / len } : w.facing;
        const { worldHalfWidth, worldHalfHeight, wizardRadius } = this.config;
        const fromX = w.x;
        const fromY = w.y;
        w.x = clamp(w.x + dir.x * effect.distance, -worldHalfWidth + wizardRadius, worldHalfWidth - wizardRadius);
        w.y = clamp(w.y + dir.y * effect.distance, -worldHalfHeight + wizardRadius, worldHalfHeight - wizardRadius);
        w.invulnerable = Math.max(w.invulnerable, 0.35);
        // Arkán robbanás a régi helyén, fénycsík a kettő között, felvillanás az újon
        this.rings.push({ x: fromX, y: fromY, from: 0.03, to: effect.radius, life: 0.4, maxLife: 0.4, color: spell.color, width: 0.035 });
        this.rings.push({ x: w.x, y: w.y, from: 0.2, to: 0.03, life: 0.3, maxLife: 0.3, color: "#ffffff", width: 0.02 });
        this.burst(fromX, fromY, spell.color, 22);
        for (let i = 0; i < 14; i++) {
          const t = i / 13;
          const life = 0.3 + Math.random() * 0.3;
          this.particles.push({
            x: fromX + (w.x - fromX) * t,
            y: fromY + (w.y - fromY) * t,
            vx: (Math.random() - 0.5) * 0.15,
            vy: (Math.random() - 0.5) * 0.15,
            life,
            maxLife: life,
            size: 0.008 + Math.random() * 0.008,
            color: i % 2 ? "#ffffff" : spell.color,
          });
        }
        this.shake = Math.max(this.shake, 0.25);
        this.damageAll(
          this.enemies.filter((e) => Math.hypot(e.x - fromX, e.y - fromY) <= effect.radius + e.radius),
          effect.damage,
          spell.color,
        );
        break;
      }
      case "drain": {
        const tip = this.staffTip();
        const victims = this.enemies
          .filter((e) => !e.burrowed && Math.hypot(e.x - w.x, e.y - w.y) <= effect.range)
          .sort((a, b) => Math.hypot(a.x - w.x, a.y - w.y) - Math.hypot(b.x - w.x, b.y - w.y))
          .slice(0, effect.targets);
        for (const e of victims) {
          this.bolts.push({ points: [tip, { x: e.x, y: e.y }], color: spell.color, life: 1, decay: 1.4 });
          // Életerő-cseppek szállnak vissza a mágushoz
          for (let k = 0; k < 7; k++) {
            const life = 0.45 + Math.random() * 0.25;
            this.particles.push({
              x: e.x,
              y: e.y,
              vx: (w.x - e.x) / life + (Math.random() - 0.5) * 0.2,
              vy: (w.y - 0.08 - e.y) / life + (Math.random() - 0.5) * 0.2,
              life,
              maxLife: life,
              size: 0.007 + Math.random() * 0.007,
              color: k % 2 ? "#fb7185" : spell.color,
              rise: true,
            });
          }
        }
        const dealt = this.damageAll(victims, effect.damage, spell.color);
        const before = w.hp;
        w.hp = Math.min(this.config.maxHp, w.hp + dealt * effect.lifesteal);
        const healed = Math.round(w.hp - before);
        if (healed > 0) this.texts.push({ x: w.x, y: w.y - 0.2, text: `+${healed}`, color: "#fb7185", life: 1.2 });
        break;
      }
      case "ascend": {
        w.empowered = {
          left: effect.duration,
          duration: effect.duration,
          damageMult: effect.damageMult,
          manaRegenMult: effect.manaRegenMult,
          cooldownMult: effect.cooldownMult,
        };
        const before = w.hp;
        w.hp = Math.min(this.config.maxHp, w.hp + effect.heal);
        const healed = Math.round(w.hp - before);
        if (healed > 0) this.texts.push({ x: w.x, y: w.y - 0.22, text: `+${healed}`, color: spell.color, life: 1.4 });
        // Robbanásszerű kitörés: lökéshullámok, fénypászmák, a közeliek hátratántorodnak
        this.shake = 1;
        for (const [to, life, width, color] of [
          [0.35, 0.5, 0.06, "#ffffff"],
          [0.8, 0.8, 0.04, spell.color],
          [1.4, 1.2, 0.02, "#fb923c"],
        ] as const) {
          this.rings.push({ x: w.x, y: w.y, from: 0.05, to, life, maxLife: life, color, width });
        }
        for (let i = 0; i < 70; i++) {
          const a = Math.random() * Math.PI * 2;
          const speed = 0.3 + Math.random() * 1.1;
          const life = 0.6 + Math.random() * 0.9;
          this.particles.push({
            x: w.x,
            y: w.y - 0.05,
            vx: Math.cos(a) * speed,
            vy: Math.sin(a) * speed * 0.7 - 0.25,
            life,
            maxLife: life,
            size: 0.006 + Math.random() * 0.012,
            color: i % 4 === 0 ? "#ffffff" : i % 4 === 1 ? "#fb923c" : spell.color,
            rise: true,
          });
        }
        for (const e of this.enemies) {
          if (!e.burrowed && Math.hypot(e.x - w.x, e.y - w.y) <= 0.5) this.knockBack(e, w.x, w.y, 0.3, 0.8);
        }
        break;
      }
      case "shield":
        w.shield = effect.duration;
        break;
      case "tornado":
        this.castTornado(spell.color, effect.dizzy);
        break;
      case "poison": {
        const tip = this.staffTip();
        const to = this.bestTarget(effect.radius, 1.6);
        this.bombs.push({
          fromX: tip.x,
          fromY: tip.y,
          toX: to.x,
          toY: to.y,
          t: 0,
          duration: effect.throwTime,
          color: spell.color,
          radius: effect.radius,
          cloudDuration: effect.duration,
          tickDamage: effect.tickDamage,
          tickEvery: effect.tickEvery,
        });
        break;
      }
      case "heal": {
        const before = w.hp;
        w.hp = Math.min(this.config.maxHp, w.hp + effect.amount);
        this.rings.push({ x: w.x, y: w.y, from: 0.05, to: 0.32, life: 0.7, maxLife: 0.7, color: spell.color, width: 0.012 });
        for (let i = 0; i < 26; i++) {
          const a = Math.random() * Math.PI * 2;
          const d = Math.random() * 0.09;
          const life = 0.8 + Math.random() * 0.7;
          this.particles.push({
            x: w.x + Math.cos(a) * d,
            y: w.y + 0.05 + Math.sin(a) * d * 0.5,
            vx: (Math.random() - 0.5) * 0.08,
            vy: -0.25 - Math.random() * 0.35,
            life,
            maxLife: life,
            size: 0.006 + Math.random() * 0.009,
            color: i % 3 === 0 ? "#fde68a" : spell.color,
            rise: true,
          });
        }
        const healed = Math.round(w.hp - before);
        if (healed > 0) this.texts.push({ x: w.x, y: w.y - 0.2, text: `+${healed}`, color: spell.color, life: 1.2 });
        break;
      }
      case "freeze": {
        this.novas.push({ x: w.x, y: w.y, age: 0, duration: 1.6, radius: effect.radius, color: spell.color });
        this.shake = Math.max(this.shake, 0.35);
        for (const enemy of this.enemies) {
          if (Math.hypot(enemy.x - w.x, enemy.y - w.y) > effect.radius) continue;
          enemy.frozen = effect.duration;
          enemy.hitFlash = 1;
          this.burst(enemy.x, enemy.y, spell.color, 6);
        }
        break;
      }
      case "blackhole": {
        const to = this.bestTarget(effect.radius * 0.6, Infinity);
        this.blackholes.push({
          x: to.x,
          y: to.y,
          age: 0,
          duration: effect.duration,
          radius: effect.radius,
          pull: effect.pull,
          damage: effect.damage,
          color: spell.color,
        });
        this.shake = Math.max(this.shake, 0.25);
        break;
      }
      case "meteor": {
        const to = this.bestTarget(effect.radius, Infinity);
        this.meteors.push({ x: to.x, y: to.y, t: 0, delay: effect.delay, radius: effect.radius, damage: effect.damage, color: spell.color });
        break;
      }
    }
    return true;
  }

  /** Forgószél: minden ellenfél a pálya szélére sodródik, a közelebbiek előbb */
  private castTornado(color: string, dizzy: number) {
    const w = this.wizard;
    const { worldHalfWidth, worldHalfHeight, enemyRadius } = this.config;
    const reach = Math.hypot(worldHalfWidth, worldHalfHeight) * 2;
    this.tornados.push({ x: w.x, y: w.y, age: 0, duration: 2.2, reach, color });
    this.rings.push({ x: w.x, y: w.y, from: 0.05, to: 1.4, life: 0.9, maxLife: 0.9, color, width: 0.01 });
    const edgeX = worldHalfWidth - enemyRadius * 1.5;
    const edgeY = worldHalfHeight - enemyRadius * 1.5;
    for (const enemy of this.enemies) {
      if (enemy.burrowed) continue;
      enemy.mode = enemy.behavior === "swoop" ? "circle" : enemy.behavior === "burrow" ? "walk" : "walk";
      const dir = normalize(enemy.x - w.x, enemy.y - w.y);
      // A mágusból kifelé húzott egyenes metszése a pálya szélével
      const tx = dir.x !== 0 ? (Math.sign(dir.x) * edgeX - enemy.x) / dir.x : Infinity;
      const ty = dir.y !== 0 ? (Math.sign(dir.y) * edgeY - enemy.y) / dir.y : Infinity;
      const travel = Math.max(0, Math.min(tx, ty));
      const dist = Math.hypot(enemy.x - w.x, enemy.y - w.y);
      enemy.push = {
        fromX: enemy.x,
        fromY: enemy.y,
        toX: enemy.x + dir.x * travel,
        toY: enemy.y + dir.y * travel,
        t: 0,
        duration: 0.6 + travel * 0.45,
        delay: dist / 3.2,
      };
      enemy.dizzy = dizzy;
      enemy.frozen = 0;
    }
  }

  /** Hátralökés: az ellenfél a (fromX, fromY) ponttól elrepül dist távolságra (a pálya szélén belül), utána szédül */
  private knockBack(enemy: Enemy, fromX: number, fromY: number, dist: number, dizzy: number) {
    const { worldHalfWidth, worldHalfHeight } = this.config;
    const dir = normalize(enemy.x - fromX, enemy.y - fromY);
    enemy.mode = enemy.behavior === "swoop" ? "circle" : "walk";
    enemy.push = {
      fromX: enemy.x,
      fromY: enemy.y,
      toX: clamp(enemy.x + dir.x * dist, -worldHalfWidth + enemy.radius, worldHalfWidth - enemy.radius),
      toY: clamp(enemy.y + dir.y * dist, -worldHalfHeight + enemy.radius, worldHalfHeight - enemy.radius),
      t: 0,
      duration: 0.3 + dist * 0.4,
      delay: 0,
    };
    enemy.dizzy = Math.max(enemy.dizzy, dizzy);
    enemy.frozen = 0;
  }

  /** A legtöbb ellenfelet érintő pont (a radius sugarú körben), a mágustól maxRange-en belül */
  private bestTarget(radius: number, maxRange: number): Point {
    const w = this.wizard;
    let best: Point | null = null;
    let bestCount = 0;
    let bestDist = Infinity;
    for (const e of this.enemies) {
      const d = Math.hypot(e.x - w.x, e.y - w.y);
      if (d > maxRange || !this.isVisible(e.x, e.y)) continue;
      const count = this.enemies.filter((o) => Math.hypot(o.x - e.x, o.y - e.y) <= radius).length;
      if (count > bestCount || (count === bestCount && d < bestDist)) {
        best = { x: e.x, y: e.y };
        bestCount = count;
        bestDist = d;
      }
    }
    if (best) return best;
    const reach = this.config.noTargetDistance;
    return { x: w.x + w.facing.x * reach, y: w.y + w.facing.y * reach };
  }

  /** A pálca hegye világkoordinátában: innen indulnak a varázslatok */
  staffTip(): Point {
    const w = this.wizard;
    const r = this.config.wizardRadius;
    const s = r * WIZARD_FIGURE;
    return {
      x: w.x + w.side * STAFF_TIP_LOCAL.x * s,
      y: w.y + r * WIZARD_FEET + STAFF_TIP_LOCAL.y * s,
    };
  }

  /** Mennyi van még hátra a varázslat töltési idejéből (mp) */
  cooldownLeft(spellId: string) {
    return this.cooldowns.get(spellId) ?? 0;
  }

  private updateWizard(dt: number) {
    const w = this.wizard;
    const power = w.empowered;
    // Felemelkedés alatt a töltési idők és a mana is sokkal gyorsabban telnek
    const cdStep = dt * (power?.cooldownMult ?? 1);
    for (const [id, left] of this.cooldowns) {
      if (left - cdStep <= 0) this.cooldowns.delete(id);
      else this.cooldowns.set(id, left - cdStep);
    }
    if (power) {
      power.left -= dt;
      if (power.left <= 0) w.empowered = null;
      // Felszálló aranyszikrák a mágus körül
      if (Math.random() < dt * 40) {
        const a = Math.random() * Math.PI * 2;
        const life = 0.6 + Math.random() * 0.6;
        this.particles.push({
          x: w.x + Math.cos(a) * 0.07,
          y: w.y + 0.04 + Math.sin(a) * 0.03,
          vx: (Math.random() - 0.5) * 0.06,
          vy: -0.3 - Math.random() * 0.3,
          life,
          maxLife: life,
          size: 0.004 + Math.random() * 0.006,
          color: Math.random() < 0.3 ? "#ffffff" : "#fde047",
          rise: true,
        });
      }
    }
    const { wizardRadius, wizardSpeed, manaRegen, maxMana } = this.config;
    w.rooted = Math.max(0, w.rooted - dt);
    // Varázslás közben egyhelyben marad
    const len = w.rooted > 0 ? 0 : Math.hypot(this.input.x, this.input.y);
    if (len > 0) {
      const dx = this.input.x / len;
      const dy = this.input.y / len;
      w.x += dx * wizardSpeed * dt;
      w.y += dy * wizardSpeed * dt;
      w.facing = { x: dx, y: dy };
      if (Math.abs(dx) > 0.01) w.side = dx > 0 ? 1 : -1;
      w.walk += dt * 11;
    }
    w.moving = len > 0;
    const { worldHalfWidth, worldHalfHeight } = this.config;
    // Az akadályok és a víz megállítják (a talpa körüli kis körrel ütközik)
    if (this.collider) {
      const p = this.collider.resolve(w.x, w.y, wizardRadius * 0.7);
      w.x = p.x;
      w.y = p.y;
    }
    w.x = clamp(w.x, -worldHalfWidth + wizardRadius, worldHalfWidth - wizardRadius);
    w.y = clamp(w.y, -worldHalfHeight + wizardRadius, worldHalfHeight - wizardRadius);
    w.mana = Math.min(maxMana, w.mana + manaRegen * (power?.manaRegenMult ?? 1) * dt);
    w.shield = Math.max(0, w.shield - dt);
    w.invulnerable = Math.max(0, w.invulnerable - dt);
  }

  private updateProjectiles(dt: number) {
    for (const p of [...this.projectiles]) {
      p.life -= dt;
      // Enyhe célkövetés
      const target = p.targetId !== null ? this.enemies.find((e) => e.id === p.targetId) : undefined;
      if (target) {
        const want = normalize(target.x - p.x, target.y - p.y);
        const cur = normalize(p.vx, p.vy);
        const turn = Math.min(1, dt * 8);
        const dir = normalize(cur.x + (want.x - cur.x) * turn, cur.y + (want.y - cur.y) * turn);
        p.vx = dir.x * p.speed;
        p.vy = dir.y * p.speed;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (Math.random() < 0.6) {
        this.particles.push({
          x: p.x,
          y: p.y,
          vx: (Math.random() - 0.5) * 0.1,
          vy: (Math.random() - 0.5) * 0.1,
          life: 0.3,
          maxLife: 0.3,
          size: 0.008 + Math.random() * 0.008,
          color: p.color,
        });
      }

      const hit = this.enemies.find((e) => Math.hypot(e.x - p.x, e.y - p.y) < e.radius + PROJECTILE_RADIUS);
      const outside =
        Math.abs(p.x) > this.config.worldHalfWidth + 0.3 || Math.abs(p.y) > this.config.worldHalfHeight + 0.3;
      if (hit || p.life <= 0 || outside) {
        this.projectiles = this.projectiles.filter((q) => q !== p);
        if (hit) this.damageAll([hit], p.damage, p.color);
      }
    }
  }

  private updateEnemies(dt: number) {
    for (const enemy of [...this.enemies]) {
      enemy.appear = Math.min(1, enemy.appear + dt * 3);
      enemy.hitFlash = Math.max(0, enemy.hitFlash - dt * 5);

      // Forgószél sodorja: pörögve repül a pálya széle felé
      if (enemy.push) {
        const p = enemy.push;
        if (p.delay > 0) {
          p.delay -= dt;
        } else {
          p.t = Math.min(1, p.t + dt / p.duration);
          const e = 1 - Math.pow(1 - p.t, 3);
          enemy.x = p.fromX + (p.toX - p.fromX) * e;
          enemy.y = p.fromY + (p.toY - p.fromY) * e;
          enemy.spin += dt * 22 * (1 - p.t * 0.7);
          if (Math.random() < 0.5) this.burst(enemy.x, enemy.y, "#ccfbf1", 1);
          if (p.t >= 1) enemy.push = null;
        }
        continue;
      }
      enemy.spin *= 1 - Math.min(1, dt * 6);
      if (enemy.frozen > 0) {
        enemy.frozen = Math.max(0, enemy.frozen - dt);
        if (enemy.frozen === 0) this.burst(enemy.x, enemy.y, "#e0f2fe", 12);
        continue;
      }
      if (enemy.dizzy > 0) {
        enemy.dizzy = Math.max(0, enemy.dizzy - dt);
        continue;
      }
      this.updateBehavior(enemy, dt);
      if (this.over) return;
    }
    this.separateEnemies();
  }

  /** Egy ellenfél mozgása és támadása a viselkedése szerint */
  private updateBehavior(e: Enemy, dt: number) {
    const w = this.wizard;
    const { wizardRadius, worldHalfWidth, worldHalfHeight } = this.config;
    const dx = w.x - e.x;
    const dy = w.y - e.y;
    const dist = Math.hypot(dx, dy) || 1;
    const nx = dx / dist;
    const ny = dy / dist;
    const reach = wizardRadius + e.radius;
    e.attackCd = Math.max(0, e.attackCd - dt);
    e.timer += dt;
    if (Math.abs(dx) > 0.02) e.facing = dx > 0 ? 1 : -1;

    const flying = e.behavior === "fly" || e.behavior === "swoop";
    const chase = (speed: number, sideways = 0) => {
      // A földi szörny a folyón át a hidat keresi; a repülő egyenesen jön
      const goal = this.collider && !flying && !e.burrowed ? this.collider.route(e.x, e.y, w.x, w.y) : null;
      if (goal && (goal.x !== w.x || goal.y !== w.y)) {
        const gd = Math.hypot(goal.x - e.x, goal.y - e.y) || 1;
        e.x += ((goal.x - e.x) / gd) * speed * dt;
        e.y += ((goal.y - e.y) / gd) * speed * dt;
        e.walk += dt * (6 + speed * 30);
        if (Math.abs(goal.x - e.x) > 0.02) e.facing = goal.x > e.x ? 1 : -1;
        return;
      }
      if (dist <= reach * 0.95) return;
      const step = Math.min(dist - reach * 0.9, speed * dt);
      e.x += nx * step - ny * sideways * dt;
      e.y += ny * step + nx * sideways * dt;
      e.walk += dt * (6 + speed * 30);
    };
    let canMelee = true;

    switch (e.behavior) {
      case "walk":
        chase(e.speed);
        break;
      case "scuttle":
        chase(e.speed, Math.sin(e.timer * 9 + e.phase) * e.speed * 0.6);
        break;
      case "hop": {
        const cycle = 0.62;
        const ph = ((e.timer + e.phase) % cycle) / cycle;
        if (ph < 0.55) chase(e.speed * 1.8);
        e.height = ph < 0.55 ? Math.sin((Math.PI * ph) / 0.55) * 0.028 : 0;
        break;
      }
      case "fly":
        chase(e.speed, Math.sin(e.timer * 4.5 + e.phase) * e.speed * 1.1);
        e.height = 0.07 + Math.sin(e.timer * 7) * 0.008;
        break;
      case "burrow":
        if (e.mode === "under") {
          e.burrowed = true;
          canMelee = false;
          chase(e.speed);
          if (Math.random() < dt * 14) this.burst(e.x, e.y + 0.01, "#7c5a3a", 1);
          if (dist < reach * 2.4) {
            e.mode = "emerge";
            e.timer = 0;
            this.burst(e.x, e.y, "#7c5a3a", 14);
          }
        } else if (e.mode === "emerge") {
          canMelee = false;
          e.burrowed = e.timer < 0.2;
          if (e.timer > 0.45) {
            e.mode = "walk";
            e.burrowed = false;
          }
        } else {
          chase(e.speed * 0.6);
        }
        break;
      case "leap":
        if (e.mode === "air") {
          canMelee = false;
          const t = Math.min(1, e.timer / 0.45);
          e.x += e.vx * dt;
          e.y += e.vy * dt;
          e.height = Math.sin(Math.PI * t) * 0.1;
          if (t >= 1) {
            e.mode = "walk";
            e.timer = 0;
            e.height = 0;
            this.burst(e.x, e.y + e.radius * 0.6, "#a3b18a", 5);
          }
        } else if (dist > reach * 1.1 && e.timer > 0.9) {
          const len = Math.min(0.36, dist - reach * 0.9);
          e.mode = "air";
          e.timer = 0;
          e.vx = (nx * len) / 0.45;
          e.vy = (ny * len) / 0.45;
        }
        break;
      case "charge":
        if (e.mode === "windup") {
          canMelee = false;
          if (e.timer > 0.6) {
            e.mode = "roll";
            e.timer = 0;
            e.vx = nx * 0.9;
            e.vy = ny * 0.9;
          }
        } else if (e.mode === "roll") {
          canMelee = false;
          e.x += e.vx * dt;
          e.y += e.vy * dt;
          e.walk += dt * 40;
          if (Math.random() < dt * 30) this.burst(e.x, e.y + e.radius * 0.6, "#a8a29e", 1);
          if (dist < reach * 1.05 && w.shield <= 0) {
            this.hurt(e, 1.5);
            e.mode = "stun";
            e.timer = 0;
          } else if (e.timer > 1.3 || Math.abs(e.x) > worldHalfWidth - e.radius || Math.abs(e.y) > worldHalfHeight - e.radius) {
            e.mode = "stun";
            e.timer = 0;
          }
        } else if (e.mode === "stun") {
          if (e.timer > 0.7) {
            e.mode = "walk";
            e.timer = 0;
          }
        } else {
          chase(e.speed);
          if (dist < 0.85 && dist > reach * 1.6 && e.timer > 2.4) {
            e.mode = "windup";
            e.timer = 0;
          }
        }
        break;
      case "swoop":
        if (e.mode === "dive") {
          canMelee = false;
          e.x += e.vx * dt;
          e.y += e.vy * dt;
          e.height = Math.max(0.015, 0.1 * (1 - e.timer / 0.35));
          if (dist < reach * 1.15 && w.shield <= 0) {
            this.hurt(e);
            e.mode = "retreat";
            e.timer = 0;
            e.vx = -nx * 0.7;
            e.vy = -ny * 0.7;
          } else if (e.timer > 1.1) {
            e.mode = "retreat";
            e.timer = 0;
            e.vx = -nx * 0.5;
            e.vy = -ny * 0.5;
          }
        } else if (e.mode === "retreat") {
          canMelee = false;
          e.x += e.vx * dt;
          e.y += e.vy * dt;
          e.height = Math.min(0.1, e.height + dt * 0.25);
          if (e.timer > 0.7) {
            e.mode = "circle";
            e.timer = 0;
            e.orbit = Math.atan2(e.y - w.y, e.x - w.x);
          }
        } else {
          canMelee = false;
          // Körözés a mágus körül, majd lecsapás
          e.orbit += dt * 1.5;
          const tx = w.x + Math.cos(e.orbit) * 0.48;
          const ty = w.y + Math.sin(e.orbit) * 0.38;
          const ox = tx - e.x;
          const oy = ty - e.y;
          const od = Math.hypot(ox, oy) || 1;
          const step = Math.min(od, e.speed * 1.5 * dt);
          e.x += (ox / od) * step;
          e.y += (oy / od) * step;
          e.height = 0.1 + Math.sin(e.timer * 3) * 0.01;
          if (Math.abs(ox) > 0.01) e.facing = ox > 0 ? 1 : -1;
          if (e.timer > 2.3 && dist < 0.9) {
            e.mode = "dive";
            e.timer = 0;
            e.vx = nx * 1.0;
            e.vy = ny * 1.0;
          }
        }
        e.walk += dt * 14;
        break;
    }

    // A földön járók nem mennek át az akadályokon (a repülők fölöttük, a túrók alattuk, az ugrók a levegőben igen)
    if (this.collider && !flying && !e.burrowed && e.mode !== "air") {
      const p = this.collider.resolve(e.x, e.y, e.radius * 0.8);
      e.x = p.x;
      e.y = p.y;
    }
    e.x = clamp(e.x, -worldHalfWidth + e.radius, worldHalfWidth - e.radius);
    e.y = clamp(e.y, -worldHalfHeight + e.radius, worldHalfHeight - e.radius);

    // Közelharc: a mágus mellett áll és üt; a pajzs elpusztítja
    if (e.burrowed) return;
    const near = Math.hypot(w.x - e.x, w.y - e.y) <= reach * 1.05;
    if (!near) return;
    if (w.shield > 0) {
      this.damageAll([e], Infinity, "#5ee0ff");
      return;
    }
    if (canMelee && e.attackCd <= 0) {
      e.attackCd = e.attackInterval * (0.85 + Math.random() * 0.3);
      e.attackAnim = 1;
      this.hurt(e);
    }
  }

  /** Az ellenfelek ne torlódjanak egymásra: ami túl közel van, szétnyomódik */
  private separateEnemies() {
    const list = this.enemies;
    for (let i = 0; i < list.length; i++) {
      const a = list[i];
      if (a.push || a.burrowed || a.height > 0.04) continue;
      for (let j = i + 1; j < list.length; j++) {
        const b = list[j];
        if (b.push || b.burrowed || b.height > 0.04) continue;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const min = a.radius + b.radius;
        const d2 = dx * dx + dy * dy;
        if (d2 >= min * min || d2 === 0) continue;
        const d = Math.sqrt(d2);
        const overlap = (min - d) / 2;
        const nx = dx / d;
        const ny = dy / d;
        if (a.frozen <= 0) {
          a.x -= nx * overlap;
          a.y -= ny * overlap;
        }
        if (b.frozen <= 0) {
          b.x += nx * overlap;
          b.y += ny * overlap;
        }
      }
    }
  }

  /** Sebzés a mágus varázslataiból (Felemelkedés alatt szorozva); a ténylegesen okozott sebzést adja vissza */
  private damageAll(targets: Enemy[], baseDamage: number, color: string) {
    const damage = baseDamage * this.config.damageMult * (this.wizard.empowered?.damageMult ?? 1);
    let total = 0;
    let killed = 0;
    for (const enemy of targets) {
      if (enemy.burrowed) continue;
      const dealt = Math.min(enemy.hp, damage);
      enemy.hp -= damage;
      enemy.hitFlash = 1;
      if (Number.isFinite(dealt) && dealt > 0) {
        total += dealt;
        this.texts.push({
          x: enemy.x + (Math.random() - 0.5) * 0.04,
          y: enemy.y - enemy.radius * 2.2,
          text: String(Math.round(dealt)),
          color: enemy.hp <= 0 ? "#fde68a" : "#ffffff",
          life: 1,
        });
      }
      if (enemy.hp > 0) {
        this.burst(enemy.x, enemy.y, color, 5);
        continue;
      }
      killed++;
      // Tapasztalatgyöngyöt ejt; a szívósabb szörnyek többet érnek
      this.dropXp(enemy.x, enemy.y, Math.max(1, Math.round(enemy.maxHp / 10)));
      this.maybeDropLoot(enemy.x, enemy.y, this.kills + killed);
      this.removeEnemy(enemy);
      this.burst(enemy.x, enemy.y, color, 16);
      const split = ENEMY_BY_ID.get(enemy.type)?.splitInto;
      if (split) {
        for (let i = 0; i < split.count; i++) {
          const a = (i / split.count) * Math.PI * 2 + Math.random();
          const child = this.makeEnemy(split.type, enemy.x + Math.cos(a) * 0.04, enemy.y + Math.sin(a) * 0.04);
          child.appear = 0.4;
          this.enemies.push(child);
        }
        this.burst(enemy.x, enemy.y, "#e7e5e4", 14);
      }
    }
    if (killed > 0) {
      this.kills += killed;
      this.score += killed * this.config.pointsPerKill;
      this.onEvent({ type: "kill", count: killed });
    }
    return total;
  }

  private hurt(by?: Enemy, multiplier = 1) {
    const w = this.wizard;
    const damage = Math.round((by?.damage ?? this.config.enemyDamage) * multiplier);
    w.hp = Math.max(0, w.hp - damage);
    w.invulnerable = this.config.invulnerableTime;
    this.hurtFlash = Math.max(this.hurtFlash, 0.55);
    const hx = by ? (w.x + by.x) / 2 : w.x;
    const hy = by ? (w.y + by.y) / 2 : w.y;
    this.burst(hx, hy, "#f87171", 8);
    if (damage > 0) {
      this.texts.push({ x: w.x + (Math.random() - 0.5) * 0.05, y: w.y - 0.25, text: `-${damage}`, color: "#fb7185", life: 1 });
    }
    this.onEvent({ type: "hurt", hp: w.hp });
    if (w.hp <= 0) {
      this.over = true;
      this.onEvent({ type: "over", score: this.score });
    }
  }

  /** Egy csoport érkezése egy helyre */
  private spawn(type: string, count: number, viewEdge = false) {
    const { worldHalfWidth, worldHalfHeight } = this.config;
    const margin = 0.1;
    // A mágus körüli gyűrűn, épp a látott területen kívül, de a pályán belül
    // (viewEdge: a látott terület szélén belül, hogy rögtön látszódjon)
    let x = 0;
    let y = 0;
    for (let attempt = 0; attempt < 12; attempt++) {
      if (viewEdge) {
        const angle = Math.random() * Math.PI * 2;
        const ex = Math.cos(angle);
        const ey = Math.sin(angle);
        // A téglalap alakú látott terület széle az adott irányban, kicsit beljebb
        const t = Math.min((this.viewHalfWidth * 0.85) / Math.abs(ex || 1e-6), (this.viewHalfHeight * 0.8) / Math.abs(ey || 1e-6));
        x = clamp(this.camera.x + ex * t, -worldHalfWidth + margin, worldHalfWidth - margin);
        y = clamp(this.camera.y + ey * t, -worldHalfHeight + margin, worldHalfHeight - margin);
        if (Math.hypot(x - this.wizard.x, y - this.wizard.y) > 0.45) break;
        continue;
      }
      if (this.config.spawnInView) {
        x = this.camera.x + (Math.random() * 2 - 1) * (this.viewHalfWidth - 0.15);
        y = this.camera.y + (Math.random() * 2 - 1) * (this.viewHalfHeight - 0.25);
        const crowded = this.enemies.some((e) => Math.hypot(e.x - x, e.y - y) < 0.2);
        if (Math.hypot(x - this.wizard.x, y - this.wizard.y) > 0.35 && !crowded) break;
        continue;
      }
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.hypot(this.viewHalfWidth, this.viewHalfHeight) * (0.75 + Math.random() * 0.4);
      x = clamp(this.wizard.x + Math.cos(angle) * dist, -worldHalfWidth + margin, worldHalfWidth - margin);
      y = clamp(this.wizard.y + Math.sin(angle) * dist, -worldHalfHeight + margin, worldHalfHeight - margin);
      if (!this.isVisible(x, y, margin)) break;
    }

    for (let i = 0; i < count && this.enemies.length < this.config.maxEnemies; i++) {
      const a = Math.random() * Math.PI * 2;
      const d = i === 0 ? 0 : 0.05 + Math.random() * 0.08;
      this.enemies.push(this.makeEnemy(type, x + Math.cos(a) * d, y + Math.sin(a) * d));
    }
    this.lastSpawnOf.set(type, this.time);
  }

  /** A pálya összetételéből választ típust; ami még nem jöhet (from), az kimarad.
   *  A rég (vagy még soha) nem látott fajok nagyobb eséllyel jönnek, így mindegyik rendszeresen felbukkan. */
  private pickEnemyType(): string {
    const mix = this.config.enemyMix;
    if (!mix || mix.length === 0) return "blob";
    const open = mix.filter((m) => (m.from ?? 0) <= this.difficulty);
    const list = open.length ? open : [mix[0]];
    const weights = list.map((m) => {
      const last = this.lastSpawnOf.get(m.type);
      const boost = last === undefined ? NEW_TYPE_BOOST : 1 +(VARIETY_BOOST_MAX - 1) * Math.min(1, (this.time - last) / VARIETY_BOOST_SECONDS);
      return m.weight * boost;
    });
    let r = Math.random() * weights.reduce((s, w) => s + w, 0);
    for (let i = 0; i < list.length; i++) {
      r -= weights[i];
      if (r <= 0) return list[i].type;
    }
    return list[list.length - 1].type;
  }

  /** Új ellenfél a megadott típusból (a pálya szorzóival) */
  makeEnemy(type: string, x: number, y: number): Enemy {
    const c = this.config;
    const def = ENEMY_BY_ID.get(type) ?? ENEMY_BY_ID.get("blob")!;
    const legacy = c.enemyMix === null && def.id === "blob";
    const speed = legacy
      ? lerp(...c.enemySpeed, this.difficulty)
      : def.speed * c.enemySpeedScale * (1 + this.difficulty * 0.2);
    const hp = Math.round(legacy ? c.enemyHp : def.hp * c.enemyHpScale);
    return {
      id: this.nextId++,
      type: def.id,
      behavior: def.behavior,
      x,
      y,
      speed: speed * (0.88 + Math.random() * 0.24),
      damage: legacy ? c.enemyDamage : def.damage,
      attackInterval: legacy ? c.enemyAttackInterval : def.attackInterval,
      mode: def.behavior === "burrow" ? "under" : def.behavior === "swoop" ? "circle" : "walk",
      timer: Math.random(),
      vx: 0,
      vy: 0,
      height: def.behavior === "fly" || def.behavior === "swoop" ? 0.08 : 0,
      burrowed: def.behavior === "burrow",
      facing: x > this.wizard.x ? -1 : 1,
      walk: Math.random() * 10,
      orbit: Math.atan2(y - this.wizard.y, x - this.wizard.x),
      radius: legacy ? c.enemyRadius : def.radius,
      hp,
      phase: Math.random() * Math.PI * 2,
      appear: 0,
      hitFlash: 0,
      frozen: 0,
      dizzy: 0,
      push: null,
      spin: 0,
      poisoned: 0,
      maxHp: hp,
      hpTrail: hp,
      attackCd: 0.4,
      attackAnim: 0,
    };
  }

  /** Repül-e (a földi hatások, pl. a méregtócsa nem érik) */
  isFlying(e: Enemy) {
    return e.behavior === "fly" || e.behavior === "swoop";
  }

  /** Benne van-e a pont (margóval) a látott területen */
  isVisible(x: number, y: number, margin = 0) {
    return (
      Math.abs(x - this.camera.x) < this.viewHalfWidth + margin &&
      Math.abs(y - this.camera.y) < this.viewHalfHeight + margin
    );
  }

  /** A kamera csak akkor mozdul, ha a mágus kilép a holt zónából */
  private updateCamera(dt: number) {
    const { cameraDeadZone, cameraFollow } = this.config;
    const zoneX = this.viewHalfWidth * cameraDeadZone;
    const zoneY = this.viewHalfHeight * cameraDeadZone;
    const dx = this.wizard.x - this.camera.x;
    const dy = this.wizard.y - this.camera.y;
    const wantX = this.camera.x + (Math.abs(dx) > zoneX ? dx - Math.sign(dx) * zoneX : 0);
    const wantY = this.camera.y + (Math.abs(dy) > zoneY ? dy - Math.sign(dy) * zoneY : 0);
    const t = 1 - Math.exp(-cameraFollow * dt);
    this.camera.x += (wantX - this.camera.x) * t;
    this.camera.y += (wantY - this.camera.y) * t;
    this.clampCamera();
  }

  /** A kamera ne mutasson a pályán kívülre (ha a pálya kisebb, középre áll) */
  private clampCamera() {
    const { worldHalfWidth, worldHalfHeight, cameraEdgeMargin } = this.config;
    const maxX = Math.max(0, worldHalfWidth + cameraEdgeMargin - this.viewHalfWidth);
    const maxY = Math.max(0, worldHalfHeight + cameraEdgeMargin - this.viewHalfHeight);
    this.camera.x = clamp(this.camera.x, -maxX, maxX);
    this.camera.y = clamp(this.camera.y, -maxY, maxY);
  }

  private nearestEnemy(x: number, y: number, maxDist: number, exclude: Enemy[] = []): Enemy | null {
    let best: Enemy | null = null;
    let bestDist = maxDist;
    for (const e of this.enemies) {
      if (exclude.includes(e) || e.burrowed) continue;
      const d = Math.hypot(e.x - x, e.y - y);
      if (d < bestDist) {
        bestDist = d;
        best = e;
      }
    }
    return best;
  }

  private removeEnemy(enemy: Enemy) {
    this.enemies = this.enemies.filter((e) => e !== enemy);
  }

  private burst(x: number, y: number, color: string, count: number) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const speed = 0.2 + Math.random() * 0.6;
      const life = 0.4 + Math.random() * 0.4;
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed,
        life,
        maxLife: life,
        size: 0.006 + Math.random() * 0.01,
        color,
      });
    }
  }

  private updateEffects(dt: number) {
    this.hurtFlash = Math.max(0, this.hurtFlash - dt * 2);
    this.shake = Math.max(0, this.shake - dt * 2.5);
    for (const a of this.attempts) a.age += dt;
    this.attempts = this.attempts.filter((a) => a.age < 1.6);
    for (const e of this.enemies) {
      e.poisoned = Math.max(0, e.poisoned - dt);
      e.attackAnim = Math.max(0, e.attackAnim - dt * 4);
      e.hpTrail = e.hp >= e.hpTrail ? e.hp : Math.max(e.hp, e.hpTrail - e.maxHp * dt * 0.8);
    }

    // Fekete lyuk: magába szív, a végén összeomlik
    for (const bh of [...this.blackholes]) {
      bh.age += dt;
      const strength = Math.min(1, bh.age / 0.4);
      if (!this.over) {
        for (const e of this.enemies) {
          const dx = bh.x - e.x;
          const dy = bh.y - e.y;
          const d = Math.hypot(dx, dy);
          if (d > bh.radius || d < 0.001 || e.burrowed) continue;
          // Spirál: befelé húz és oldalra pörget, közelebb erősebben
          const k = strength * bh.pull * (0.4 + (1 - d / bh.radius)) * dt;
          const step = Math.min(d, k);
          e.x += (dx / d) * step - (dy / d) * k * 0.8;
          e.y += (dy / d) * step + (dx / d) * k * 0.8;
          e.spin += dt * 10 * (1 - d / bh.radius);
          e.frozen = 0;
        }
      }
      if (Math.random() < 0.8) {
        // Beszívott fényszemcsék
        const a = Math.random() * Math.PI * 2;
        const r = bh.radius * (0.6 + Math.random() * 0.5);
        const life = 0.6;
        this.particles.push({
          x: bh.x + Math.cos(a) * r,
          y: bh.y + Math.sin(a) * r * 0.6,
          vx: -Math.cos(a) * r / life,
          vy: (-Math.sin(a) * r * 0.6) / life,
          life,
          maxLife: life,
          size: 0.004 + Math.random() * 0.005,
          color: Math.random() < 0.5 ? bh.color : "#fde68a",
          rise: true,
        });
      }
      if (bh.age < bh.duration) continue;
      this.blackholes = this.blackholes.filter((b) => b !== bh);
      this.shake = Math.max(this.shake, 0.9);
      this.rings.push({ x: bh.x, y: bh.y, from: 0.02, to: bh.radius * 1.4, life: 0.5, maxLife: 0.5, color: "#f5d0fe", width: 0.03 });
      this.rings.push({ x: bh.x, y: bh.y, from: 0.02, to: bh.radius * 0.8, life: 0.35, maxLife: 0.35, color: bh.color, width: 0.05 });
      this.burst(bh.x, bh.y, bh.color, 30);
      this.burst(bh.x, bh.y, "#ffffff", 14);
      if (!this.over) {
        const hit = this.enemies.filter((e) => Math.hypot(e.x - bh.x, e.y - bh.y) <= bh.radius * 0.45);
        if (hit.length) this.damageAll(hit, bh.damage, bh.color);
      }
    }
    if (this.lastCast) this.lastCast.age += dt;

    for (const p of this.particles) {
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      const drag = p.rise ? 0.6 : 3;
      p.vx *= 1 - dt * drag;
      p.vy *= 1 - dt * drag;
    }
    this.particles = this.particles.filter((p) => p.life > 0);

    for (const b of this.bolts) b.life -= dt * (b.decay ?? 3);
    this.bolts = this.bolts.filter((b) => b.life > 0);

    for (const tor of this.tornados) tor.age += dt;
    this.tornados = this.tornados.filter((tor) => tor.age < tor.duration);

    for (const r of this.rings) r.life -= dt;
    this.rings = this.rings.filter((r) => r.life > 0);

    for (const n of this.novas) n.age += dt;
    this.novas = this.novas.filter((n) => n.age < n.duration);
    for (const im of this.impacts) im.age += dt;
    this.impacts = this.impacts.filter((im) => im.age < im.duration);

    for (const s of this.scorches) s.life -= dt;
    this.scorches = this.scorches.filter((s) => s.life > 0);

    // Méregfiola: ívben repül, a végén szétloccsan
    for (const bomb of [...this.bombs]) {
      bomb.t = Math.min(1, bomb.t + dt / bomb.duration);
      if (bomb.t < 1) continue;
      this.bombs = this.bombs.filter((b) => b !== bomb);
      this.clouds.push({
        x: bomb.toX,
        y: bomb.toY,
        radius: bomb.radius,
        life: bomb.cloudDuration,
        maxLife: bomb.cloudDuration,
        tick: 0,
        tickEvery: bomb.tickEvery,
        tickDamage: bomb.tickDamage,
        color: bomb.color,
      });
      this.rings.push({ x: bomb.toX, y: bomb.toY, from: 0.03, to: bomb.radius, life: 0.4, maxLife: 0.4, color: bomb.color, width: 0.014 });
      this.burst(bomb.toX, bomb.toY, bomb.color, 22);
    }

    // Méregtócsa: rendszeresen sebzi a benne állókat
    for (const cloud of this.clouds) {
      cloud.life -= dt;
      cloud.tick -= dt;
      for (const e of this.enemies) {
        if (this.isFlying(e) || e.burrowed) continue;
        if (Math.hypot(e.x - cloud.x, e.y - cloud.y) <= cloud.radius + e.radius * 0.5) e.poisoned = 0.6;
      }
      if (cloud.tick > 0 || this.over) continue;
      cloud.tick = cloud.tickEvery;
      const inside = this.enemies.filter(
        (e) => !this.isFlying(e) && Math.hypot(e.x - cloud.x, e.y - cloud.y) <= cloud.radius + e.radius * 0.5,
      );
      if (inside.length) this.damageAll(inside, cloud.tickDamage, cloud.color);
    }
    this.clouds = this.clouds.filter((c) => c.life > 0);

    // Meteor: becsapódás a késleltetés végén
    for (const m of [...this.meteors]) {
      m.t += dt;
      if (m.t < m.delay) continue;
      this.meteors = this.meteors.filter((x) => x !== m);
      this.impacts.push({ x: m.x, y: m.y, age: 0, duration: 4.5, radius: m.radius, color: m.color, seed: Math.random() * 1000 });
      this.burst(m.x, m.y, "#fbbf24", 24);
      this.shake = Math.max(this.shake, 1);
      if (!this.over) {
        const hit = this.enemies.filter((e) => Math.hypot(e.x - m.x, e.y - m.y) <= m.radius + e.radius);
        if (hit.length) this.damageAll(hit, m.damage, m.color);
      }
    }

    for (const t of this.texts) {
      t.life -= dt * 1.2;
      t.y -= dt * 0.15;
    }
    this.texts = this.texts.filter((t) => t.life > 0);
  }
}

/** A leesett tárgy fényének színe a ritkasága szerint: kék, lila, arany */
export function lootColor(rarity: LootRarity) {
  return rarity === 2 ? "#fbbf24" : rarity === 1 ? "#c084fc" : "#60a5fa";
}

/** A gyöngy színe az értéke szerint: zöld (kicsi), kék (közepes), lila (nagy) */
export function orbColor(value: number) {
  return value >= 8 ? "#c084fc" : value >= 4 ? "#38bdf8" : "#4ade80";
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function normalize(x: number, y: number): Point {
  const len = Math.hypot(x, y) || 1;
  return { x: x / len, y: y / len };
}
