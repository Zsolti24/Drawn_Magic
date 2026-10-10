import { useCallback } from "react";
import { Link, useNavigate } from "react-router";
import { isUnlockAll, useAuth } from "../auth/auth";
import { usableSpells, useProfile } from "../profile/profile";
import { DrawnCanvas } from "../components/DrawnCanvas";
import { PhonePanel } from "../components/PhonePanel";
import { WizardStage } from "../components/WizardStage";
import { drawGear, drawMapArt, drawSpellbookArt } from "../draw/icons";
import { drawWizardFigure } from "../draw/wizard";
import { GLYPH_BY_ID } from "../data/glyphs";
import { SPELLS, SPELL_BY_ID } from "../data/spells";
import { STATS, xpToNext } from "../data/stats";
import { resolveLook, type WizardLook } from "../data/wizardParts";

interface MenuItem {
  to: string;
  title: string;
  subtitle: string;
  art: (ctx: CanvasRenderingContext2D, w: number, h: number) => void;
  /** Figyelemfelhívó szám a kártya sarkában (pl. elosztható statpontok) */
  badge?: number;
}

export function MainMenu() {
  const { profile } = useProfile();
  const { session, slot, logout } = useAuth();
  const navigate = useNavigate();
  const best = Math.max(0, ...Object.values(profile.bestScores));
  const learned = usableSpells(profile).length;

  const items: MenuItem[] = [
    { to: "/levels", title: "Pályák", subtitle: "Válassz pályát és indulj", art: drawMapArt },
    { to: "/spells", title: "Képességek", subtitle: `${learned} varázslat megtanulva`, art: spellArt },
    { to: "/wardrobe", title: "Öltözet", subtitle: "Kalap, köpeny, pálca, amulett", art: useWardrobeArt(profile.look) },
    { to: "/settings", title: "Beállítások", subtitle: "Telefon, irányítás, mentés", art: settingsArt },
    {
      to: "/stats",
      title: "Statok",
      subtitle: profile.statPoints > 0 ? `${profile.level}. szint · ${profile.statPoints} elosztható pont!` : `${profile.level}. szint · ${profile.xp} / ${xpToNext(profile.level)} XP`,
      art: statsArt,
      badge: profile.statPoints > 0 ? profile.statPoints : undefined,
    },
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
          {session && slot !== null && (
            <div className="menu__account">
              <span className="menu__account-who">
                {session.email} · {slot + 1}. mentés
              </span>
              {isUnlockAll(session) && <span className="unlock-all-badge">Admin: minden feloldva</span>}
              <Link to="/saves" className="menu__account-btn">
                Mentés váltása
              </Link>
              <button
                className="menu__account-btn"
                onClick={() => {
                  logout();
                  navigate("/login");
                }}
              >
                Kijelentkezés
              </button>
            </div>
          )}
        </header>

        <nav className="menu__grid">
          {items.map((item, i) => (
            <Link key={item.to} to={item.to} className={`menu-card ${i === 0 ? "menu-card--primary" : ""}`}>
              <DrawnCanvas width={i === 0 ? 132 : 92} height={i === 0 ? 92 : 68} draw={item.art} className="menu-card__art" />
              <span className="menu-card__text">
                <span className="menu-card__title">{item.title}</span>
                <span className="menu-card__subtitle">{item.subtitle}</span>
              </span>
              {item.badge !== undefined && <span className="menu-card__badge">{item.badge}</span>}
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
  // A legkülönlegesebb jel (a Felemelkedés csillaga), nem a sima vonal
  const spell = SPELL_BY_ID.get("ascend") ?? SPELLS[0];
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

/** Statok kártya: színes oszlopok a statok színeivel, fölöttük felfelé mutató nyíl */
function statsArt(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const bg = ctx.createLinearGradient(0, 0, w, h);
  bg.addColorStop(0, "#2d1f5c");
  bg.addColorStop(1, "#140d2b");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);
  const heights = [0.35, 0.55, 0.45, 0.7, 0.5, 0.85];
  const bw = w / (STATS.length * 1.6);
  STATS.forEach((stat, i) => {
    const bh = h * 0.7 * heights[i];
    const x = w * 0.12 + i * bw * 1.45;
    const g = ctx.createLinearGradient(0, h * 0.88 - bh, 0, h * 0.88);
    g.addColorStop(0, stat.color);
    g.addColorStop(1, "rgba(255,255,255,0.15)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.roundRect(x, h * 0.88 - bh, bw, bh, 2);
    ctx.fill();
  });
  ctx.strokeStyle = "#fde047";
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(w * 0.12, h * 0.55);
  ctx.lineTo(w * 0.42, h * 0.38);
  ctx.lineTo(w * 0.58, h * 0.45);
  ctx.lineTo(w * 0.86, h * 0.14);
  ctx.moveTo(w * 0.72, h * 0.14);
  ctx.lineTo(w * 0.86, h * 0.14);
  ctx.lineTo(w * 0.86, h * 0.3);
  ctx.stroke();
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
