// Ellenféltípusok adatai. A viselkedést a játéklogika, a kinézetet a
// draw/enemies.ts rajzolja a típus azonosítója alapján.

export type EnemyBehavior =
  /** Egyenesen a mágus felé megy */
  | "walk"
  /** Szökdécselve közelít */
  | "hop"
  /** Apró, gyors léptekkel, kicsit oldalazva */
  | "scuttle"
  /** Repül, cikázva közelít (a földi hatások, pl. méreg nem érik) */
  | "fly"
  /** A föld alatt túr (sebezhetetlen), a mágus mellett bukkan elő */
  | "burrow"
  /** Nagy ugrásokkal közelít */
  | "leap"
  /** Megáll, megremeg, majd egyenesen nekiront */
  | "charge"
  /** Körözve repül a mágus körül, majd lecsap */
  | "swoop";

export interface EnemyDef {
  id: string;
  name: string;
  /** Rövid leírás (később a bestiáriumhoz) */
  description: string;
  hp: number;
  /** Sebesség (egység/mp) */
  speed: number;
  /** Ütközési sugár (egység) */
  radius: number;
  /** Ütésenkénti sebzés */
  damage: number;
  /** Két ütés közötti idő (mp) */
  attackInterval: number;
  behavior: EnemyBehavior;
  /** Egyszerre ennyien érkeznek (min, max) */
  pack: [number, number];
  /** Halálakor ezekre esik szét */
  splitInto?: { type: string; count: number };
}

export const ENEMIES: EnemyDef[] = [
  {
    id: "blob",
    name: "Lidérc",
    description: "Egyszerű szörny, egyenesen jön.",
    hp: 30,
    speed: 0.16,
    radius: 0.045,
    damage: 5,
    attackInterval: 1.1,
    behavior: "walk",
    pack: [1, 1],
  },
  // ------------------------------------------------------------ rét (megszállt mező)
  {
    id: "imp",
    name: "Ördögfióka",
    description: "Vigyorgó kis démon. Gyenge, de sokan vannak, és szökdécselve rontanak rád.",
    hp: 22,
    speed: 0.22,
    radius: 0.04,
    damage: 4,
    attackInterval: 1.1,
    behavior: "hop",
    pack: [2, 4],
  },
  {
    id: "spider",
    name: "Vérpók",
    description: "Apró, gyors pók vörösen izzó szemekkel. Mindig rajban érkezik.",
    hp: 10,
    speed: 0.35,
    radius: 0.028,
    damage: 2,
    attackInterval: 0.8,
    behavior: "scuttle",
    pack: [4, 8],
  },
  {
    id: "hornet",
    name: "Pokoli darázs",
    description: "Cikázva repülő démondarázs izzó fullánkkal. A földi csapdák nem érik.",
    hp: 12,
    speed: 0.37,
    radius: 0.03,
    damage: 3,
    attackInterval: 0.9,
    behavior: "fly",
    pack: [3, 5],
  },
  {
    id: "bonetortoise",
    name: "Csontteknős",
    description: "Élőhalott teknős tüskés csontpáncélban. Lassú, de szinte elpusztíthatatlan.",
    hp: 110,
    speed: 0.1,
    radius: 0.062,
    damage: 8,
    attackInterval: 1.6,
    behavior: "walk",
    pack: [1, 2],
  },
  {
    id: "graveworm",
    name: "Sírféreg",
    description: "A föld alatt túr, ott semmi sem éri. Fogsoros szájjal tör elő a mágus mellett.",
    hp: 36,
    speed: 0.27,
    radius: 0.045,
    damage: 6,
    attackInterval: 1.2,
    behavior: "burrow",
    pack: [1, 2],
  },
  {
    id: "slime",
    name: "Dögnyálka",
    description: "Mérgező nyálka, benne egy koponya lebeg. Legyőzve három nyálkacseppre esik szét.",
    hp: 40,
    speed: 0.15,
    radius: 0.052,
    damage: 5,
    attackInterval: 1.3,
    behavior: "walk",
    pack: [1, 2],
    splitInto: { type: "slimelet", count: 3 },
  },
  {
    id: "toad",
    name: "Varangydémon",
    description: "Szarvas, agyaras varangy. Nagy ugrásokkal közelít, a levegőben nehéz eltalálni.",
    hp: 30,
    speed: 0.26,
    radius: 0.042,
    damage: 5,
    attackInterval: 1.2,
    behavior: "leap",
    pack: [2, 3],
  },
  {
    id: "boar",
    name: "Pokoli vadkan",
    description: "Lángoló sörényű vadkan. Kapál, majd tűzcsíkot húzva nekiront.",
    hp: 48,
    speed: 0.15,
    radius: 0.045,
    damage: 9,
    attackInterval: 1.4,
    behavior: "charge",
    pack: [1, 2],
  },
  {
    id: "bonecrow",
    name: "Csontholló",
    description: "Élőhalott holló. Körözik a mágus fölött, aztán hirtelen lecsap.",
    hp: 26,
    speed: 0.34,
    radius: 0.038,
    damage: 6,
    attackInterval: 1.2,
    behavior: "swoop",
    pack: [2, 3],
  },
  {
    id: "scarecrow",
    name: "Rémmadárijesztő",
    description: "Óriási madárijesztő izzó tökfejjel és kaszával. Lassú, de hatalmasat suhint.",
    hp: 320,
    speed: 0.08,
    radius: 0.1,
    damage: 15,
    attackInterval: 2,
    behavior: "walk",
    pack: [1, 1],
  },
  // A dögnyálka szétesésekor keletkező csepp (önállóan nem jön)
  {
    id: "slimelet",
    name: "Nyálkacsepp",
    description: "Apró, gyors nyálkacsepp.",
    hp: 8,
    speed: 0.32,
    radius: 0.024,
    damage: 2,
    attackInterval: 0.8,
    behavior: "hop",
    pack: [1, 1],
  },
];

export const ENEMY_BY_ID = new Map(ENEMIES.map((e) => [e.id, e]));

/** Egy pálya ellenfél-összetétele: típus, gyakoriság, és mikortól jöhet (a pálya idejének aránya, 0..1) */
export interface EnemyMixEntry {
  type: string;
  weight: number;
  from?: number;
}
