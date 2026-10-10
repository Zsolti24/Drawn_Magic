import { useCallback, useMemo, useState } from "react";
import { SPELLS, UPCOMING_SPELLS, spellTraits, type SpellDef } from "../data/spells";
import { GLYPH_BY_ID } from "../data/glyphs";
import { useProfile } from "../profile/profile";
import { PageFrame } from "../components/PageFrame";
import { drawLock } from "../draw/icons";
import { GlyphGuide } from "../components/GlyphGuide";
import { StatIcon } from "../components/StatIcon";
import { SpellDemo } from "../components/SpellDemo";
import { DrawnCanvas } from "../components/DrawnCanvas";
import { resolveLook } from "../data/wizardParts";

export function SpellsPage() {
  const { profile } = useProfile();
  const learned = new Set(profile.unlockedSpells);
  const look = useMemo(() => resolveLook(profile.look), [profile.look]);
  /** Melyik kártya fölött van az egér: csak annak a képe és jelrajza mozog */
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <PageFrame title="Képességek">
      <section>
        <h2 className="section-title">Képességtár</h2>
        <p className="muted small spells-intro">Minden megtanult varázslat használható a játékban: rajzold le a jelét a telefonon.</p>
        <div className="spell-list">
          {SPELLS.map((spell, index) => {
            const on = learned.has(spell.id);
            const glyph = GLYPH_BY_ID.get(spell.glyph);
            // Lezárt varázslat: semmit nem árul el, csak kíváncsivá tesz
            if (!on) return <MysterySpell key={spell.id} spell={spell} look={look} index={index} />;
            return (
              <article
                key={spell.id}
                className={`spell-card ${on ? "spell-card--on" : "spell-card--locked"}`}
                style={{ borderColor: on ? spell.color : undefined }}
                onMouseEnter={() => setHovered(spell.id)}
                onMouseLeave={() => setHovered((cur) => (cur === spell.id ? null : cur))}
              >
                <SpellDemo
                  spell={spell}
                  look={look}
                  active={on && hovered === spell.id}
                  className={`spell-card__art ${on ? "" : "spell-card__art--locked"}`}
                />
                <div className="spell-card__head">
                  <h3 className="spell-card__name" style={{ color: on ? spell.color : undefined }}>
                    {spell.name}
                  </h3>
                  <span className={`spell-card__badge ${on ? "" : "spell-card__badge--locked"}`}>
                    {on ? "Megtanulva" : "Lezárva"}
                  </span>
                </div>
                <div className="spell-card__stats">
                  <span className="stat stat--mana">
                    <StatIcon kind="mana" />
                    {spell.mana}
                  </span>
                  <span className="stat stat--cooldown">
                    <StatIcon kind="cooldown" />
                    {formatSeconds(spell.cooldown)}
                  </span>
                </div>
                <Traits spell={spell} />
                {glyph && (
                  <div className="spell-card__howto">
                    <GlyphGuide glyph={glyph} active={on && hovered === spell.id} />
                  </div>
                )}
                <Details text={spell.description} />
              </article>
            );
          })}
          {UPCOMING_SPELLS.map((spell) => (
            <article key={spell.id} className="spell-card spell-card--locked">
              <LockedArt />
              <div className="spell-card__head">
                <h3 className="spell-card__name">{spell.name}</h3>
              </div>
              <p className="spell-card__hint">Később tanulható.</p>
              <Details text={spell.description} />
            </article>
          ))}
        </div>
      </section>
    </PageFrame>
  );
}

/** Kit ér, mennyit sebez, mozgatja-e az ellenfeleket: alapból látszik */
function Traits({ spell }: { spell: SpellDef }) {
  const { target, damage, control, bonus } = spellTraits(spell);
  return (
    <dl className="spell-traits">
      <dt>Célzás</dt>
      <dd>
        <span className={`trait trait--${target.kind}`}>{target.label}</span>
      </dd>
      <dt>Sebzés</dt>
      <dd className={damage ? "" : "spell-traits__none"}>{damage ?? "Nincs"}</dd>
      <dt>Mozgatás</dt>
      <dd className={control ? "" : "spell-traits__none"}>{control ?? "Nincs"}</dd>
      {bonus && (
        <>
          <dt>Bónusz</dt>
          <dd className="spell-traits__bonus">{bonus}</dd>
        </>
      )}
    </dl>
  );
}

/** Töltési idő magyar formában, pl. "0,6 mp" */
function formatSeconds(seconds: number) {
  return `${seconds.toLocaleString("hu-HU")} mp`;
}

/** Lenyitható részletek: alapból csak a gomb látszik */
function Details({ text }: { text: string }) {
  return (
    <details className="spell-card__details">
      <summary>
        <span className="chevron" aria-hidden="true" />
        Részletek
      </summary>
      <p>{text}</p>
    </details>
  );
}

/** Később tanulható varázslat helye: lakat */
function LockedArt() {
  const draw = useCallback((ctx: CanvasRenderingContext2D, w: number, h: number) => {
    ctx.fillStyle = "#14101f";
    ctx.fillRect(0, 0, w, h);
    drawLock(ctx, w / 2, h / 2 - h * 0.06, h * 0.3, "#6b5a9e");
  }, []);
  return <DrawnCanvas width={300} height={150} draw={draw} className="spell-card__art" label="Lezárva" />;
}

/** Kedvcsináló mondatok a lezárt varázslatokhoz (a sorszám szerint váltakoznak) */
const TEASERS = [
  "Egy titokzatos varázslat. Vajon mire képes?",
  "Ősi erő szunnyad itt, csak az érdemes mágusnak tárul fel.",
  "Valami nagy dolog lapul a köd mögött…",
  "Suttogják, hogy egész hordákat söpör el.",
  "A régi könyvek csak utalásokat tesznek rá.",
  "Ki tudja, milyen jelet kell hozzá rajzolni?",
];

/** Lezárt varázslat: elmosott, szürke kép egy nagy kérdőjellel és egy rövid kedvcsinálóval; név, hatás és jel rejtve */
function MysterySpell({ spell, look, index }: { spell: SpellDef; look: ReturnType<typeof resolveLook>; index: number }) {
  return (
    <article className="spell-card spell-card--mystery">
      <div className="spell-card__mystery-art">
        <SpellDemo spell={spell} look={look} active={false} className="spell-card__art spell-card__art--locked" />
        <span className="spell-card__mystery-mark" aria-hidden="true">
          ?
        </span>
      </div>
      <div className="spell-card__head">
        <h3 className="spell-card__name">Ismeretlen varázslat</h3>
        <span className="spell-card__badge spell-card__badge--locked">Lezárva</span>
      </div>
      <p className="spell-card__teaser">{TEASERS[index % TEASERS.length]}</p>
    </article>
  );
}
