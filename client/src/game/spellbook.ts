import type { GlyphDef } from "../data/glyphs";
import { Recognizer, templateVariants, type Match } from "./recognizer";
import type { Point } from "./types";

/** Ennél gyengébb egyezés hibás rajznak számít */
export const MATCH_THRESHOLD = 0.7;
/** Csali minták: ha a rajz ezekre hasonlít legjobban, nem varázslat */
const DECOY_ID = "";
const DECOYS: Point[][] = [
  // V és hegycsúcs: korábbi jelek, ne süljön el helyettük véletlenül más
  [
    { x: 0, y: 0 },
    { x: 0.5, y: 1 },
    { x: 1, y: 0 },
  ],
  [
    { x: 0, y: 1 },
    { x: 0.5, y: 0 },
    { x: 1, y: 1 },
  ],
];
/** Ennél kisebb rajz (képpontban) csak koppintás, nem jel */
const MIN_STROKE_SIZE = 40;

export type CastResult =
  | { kind: "match"; glyph: GlyphDef; score: number }
  | { kind: "fail"; best: Match | null }
  | { kind: "ignored" };

/** A megadott jelek felismerése egy rajzból */
export class Spellbook {
  private recognizer = new Recognizer();
  private glyphs: Map<string, GlyphDef>;

  constructor(glyphs: GlyphDef[]) {
    this.glyphs = new Map(glyphs.map((g) => [g.id, g]));
    for (const glyph of glyphs) {
      for (const path of [glyph.path, ...(glyph.alternates ?? [])]) {
        for (const variant of templateVariants(path, glyph.closed)) {
          this.recognizer.addTemplate(glyph.id, variant);
        }
      }
    }
    for (const decoy of DECOYS) {
      for (const variant of templateVariants(decoy)) this.recognizer.addTemplate(DECOY_ID, variant);
    }
  }

  read(stroke: Point[]): CastResult {
    const xs = stroke.map((p) => p.x);
    const ys = stroke.map((p) => p.y);
    const size = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
    if (stroke.length < 4 || size < MIN_STROKE_SIZE) return { kind: "ignored" };

    const best = this.recognizer.recognize(stroke);
    const glyph = best ? this.glyphs.get(best.id) : undefined;
    if (!best || !glyph || best.score < (glyph.minScore ?? MATCH_THRESHOLD)) return { kind: "fail", best };
    return { kind: "match", glyph, score: best.score };
  }
}
