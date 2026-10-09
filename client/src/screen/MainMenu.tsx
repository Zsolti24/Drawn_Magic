import { useCallback } from "react";
import { Link } from "react-router";
import { usableSpells, useProfile } from "../profile/profile";
import { DrawnCanvas } from "../components/DrawnCanvas";
import { PhonePanel } from "../components/PhonePanel";
import { WizardStage } from "../components/WizardStage";
import { drawGear, drawMapArt, drawSpellbookArt } from "../draw/icons";
import { drawWizardFigure } from "../draw/wizard";
import { GLYPH_BY_ID } from "../data/glyphs";
import { SPELLS } from "../data/spells";
import { resolveLook, type WizardLook } from "../data/wizardParts";

interface MenuItem {
  to: string;
  title: string;
  subtitle: string;
  art: (ctx: CanvasRenderingContext2D, w: number, h: number) => void;
}

export function MainMenu() {
  const { profile } = useProfile();
  const best = Math.max(0, ...Object.values(profile.bestScores));
  const learned = usableSpells(profile).length;

  const items: MenuItem[] = [
    { to: "/levels", title: "Pályák", subtitle: "Válassz pályát és indulj", art: drawMapArt },
    { to: "/spells", title: "Képességek", subtitle: `${learned} varázslat megtanulva`, art: spellArt },
    { to: "/wardrobe", title: "Öltözet", subtitle: "Kalap, köpeny, pálca, amulett", art: useWardrobeArt(profile.look) },
    { to: "/settings", title: "Beállítások", subtitle: "Telefon, irányítás, mentés", art: settingsArt },
  ];

  return (
    <main className="menu">
      <WizardStage look={profile.look} sparkles focusX={0.62} className="menu__stage" />
      <div className="menu__content">
        <header className="menu__header">
          <h1 className="title title--hero">Drawn Magic</h1>
          <p className="menu__tagline">Rajzolj jeleket a telefonodon, és varázsolj!</p>
          <div className="menu__stats">
            <span>{profile.level}. szint</span>
            <span>{profile.gold} arany</span>
            <span>Legjobb: {best} pont</span>
          </div>
        </header>

        <nav className="menu__grid">
          {items.map((item, i) => (
            <Link key={item.to} to={item.to} className={`menu-card ${i === 0 ? "menu-card--primary" : ""}`}>
              <DrawnCanvas width={i === 0 ? 132 : 92} height={i === 0 ? 92 : 68} draw={item.art} className="menu-card__art" />
              <span className="menu-card__text">
                <span className="menu-card__title">{item.title}</span>
                <span className="menu-card__subtitle">{item.subtitle}</span>
              </span>
            </Link>
          ))}
        </nav>

        <aside className="menu__phone card">
          <PhonePanel qrSize={150} />
        </aside>
      </div>
    </main>
  );
}

function spellArt(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const spell = SPELLS[0];
  drawSpellbookArt(ctx, w, h, GLYPH_BY_ID.get(spell.glyph)?.path ?? [], spell.color);
}

function settingsArt(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const bg = ctx.createLinearGradient(0, 0, w, h);
  bg.addColorStop(0, "#2d1f5c");
  bg.addColorStop(1, "#140d2b");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);
  drawGear(ctx, w * 0.42, h * 0.48, h * 0.62, "#a78bfa");
  drawGear(ctx, w * 0.7, h * 0.32, h * 0.34, "#5ee0ff");
}

/** Öltözet kártya: a mágus felsőteste a jelenlegi kinézettel */
function useWardrobeArt(look: WizardLook) {
  return useCallback(
    (ctx: CanvasRenderingContext2D, w: number, h: number) => {
      const bg = ctx.createLinearGradient(0, 0, 0, h);
      bg.addColorStop(0, "#3b2a7a");
      bg.addColorStop(1, "#1b1533");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);
      const pose = { facing: 1 as const, walk: 0, moving: false, time: 0.5, cast: 0, castColor: null };
      drawWizardFigure(ctx, resolveLook(look), pose, w * 0.45, h * 1.55, h * 0.48);
    },
    [look],
  );
}
