import { useCallback, useMemo, useState } from "react";
import { SPELLS, UPCOMING_SPELLS } from "../data/spells";
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
          {SPELLS.map((spell) => {
            const on = learned.has(spell.id);
            const glyph = GLYPH_BY_ID.get(spell.glyph);
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
