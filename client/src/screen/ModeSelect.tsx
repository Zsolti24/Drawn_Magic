import { useNavigate } from "react-router";
import { Gate } from "../components/Gate";
import { DrawnCanvas } from "../components/DrawnCanvas";
import { drawWizardFigure, type WizardPose } from "../draw/wizard";
import { DEFAULT_LOOK, resolveLook, type WizardLook } from "../data/wizardParts";

interface Mode {
  id: "single" | "coop" | "pvp";
  title: string;
  description: string;
  /** Még nincs kész: csak a helye látszik */
  soon: boolean;
  art: (ctx: CanvasRenderingContext2D, w: number, h: number) => void;
}

const MODES: Mode[] = [
  {
    id: "single",
    title: "Egyjátékos",
    description: "A kampány: 5 vidék, 25 pálya, egyedül a szörnyhordák ellen.",
    soon: false,
    art: singleArt,
  },
  {
    id: "coop",
    title: "Kooperatív",
    description: "Két mágus, két telefon: együtt a hordák ellen.",
    soon: true,
    art: coopArt,
  },
  {
    id: "pvp",
    title: "PvP párbaj",
    description: "Mágus a mágus ellen: ki rajzol gyorsabban és pontosabban?",
    soon: true,
    art: pvpArt,
  },
];

/** Bejelentkezés után: melyik játékmód */
export function ModeSelect() {
  const navigate = useNavigate();
  return (
    <Gate account>
      <section className="modes">
        <header className="modes__head">
          <h1 className="title title--hero">Drawn Magic</h1>
          <p className="muted">Válassz játékmódot</p>
        </header>
        <div className="modes__list">
          {MODES.map((mode) => (
            <button
              key={mode.id}
              className={`mode-card ${mode.soon ? "mode-card--soon" : ""}`}
              disabled={mode.soon}
              onClick={() => navigate("/saves")}
            >
              <DrawnCanvas width={300} height={170} draw={mode.art} className="mode-card__art" />
              <span className="mode-card__title">
                {mode.title}
                {mode.soon && <span className="soon">Hamarosan</span>}
              </span>
              <span className="mode-card__desc">{mode.description}</span>
            </button>
          ))}
        </div>
      </section>
    </Gate>
  );
}

// ---------------------------------------------------------------- képek

const POSE: WizardPose = { facing: 1, walk: 0, moving: false, time: 0.6, cast: 0, castColor: null };

const RIVAL: WizardLook = { ...DEFAULT_LOOK, hat: "flame", robe: "flame", staff: "ember", beard: "#1f2937" };
const FRIEND: WizardLook = { ...DEFAULT_LOOK, hat: "hood", robe: "forest", staff: "druid", beard: "#7c4a2d" };

function backdrop(ctx: CanvasRenderingContext2D, w: number, h: number, top: string, bottom: string) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, top);
  g.addColorStop(1, bottom);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  // Föld és halvány fénykör a mágusok alatt
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.fillRect(0, h * 0.84, w, h * 0.16);
}

function glow(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, color);
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
}

function singleArt(ctx: CanvasRenderingContext2D, w: number, h: number) {
  backdrop(ctx, w, h, "#3b2a7a", "#1b1533");
  glow(ctx, w / 2, h * 0.55, h * 0.6, "rgba(253,224,71,0.35)");
  // Lebegő szikrák a magányos mágus körül
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    glow(ctx, w / 2 + Math.cos(a) * h * 0.38, h * 0.5 + Math.sin(a) * h * 0.3, h * 0.035, i % 2 ? "rgba(253,224,71,0.9)" : "rgba(196,181,253,0.9)");
  }
  drawWizardFigure(ctx, resolveLook(DEFAULT_LOOK), POSE, w / 2, h * 0.9, h * 0.22);
}

function coopArt(ctx: CanvasRenderingContext2D, w: number, h: number) {
  backdrop(ctx, w, h, "#1e4a3a", "#0f2018");
  glow(ctx, w / 2, h * 0.5, h * 0.7, "rgba(94,234,212,0.3)");
  drawWizardFigure(ctx, resolveLook(DEFAULT_LOOK), POSE, w * 0.36, h * 0.9, h * 0.22);
  drawWizardFigure(ctx, resolveLook(FRIEND), POSE, w * 0.62, h * 0.92, h * 0.22);
}

function pvpArt(ctx: CanvasRenderingContext2D, w: number, h: number) {
  backdrop(ctx, w, h, "#5a1a1a", "#1a0a0a");
  drawWizardFigure(ctx, resolveLook(DEFAULT_LOOK), POSE, w * 0.24, h * 0.9, h * 0.22);
  drawWizardFigure(ctx, resolveLook(RIVAL), { ...POSE, facing: -1 }, w * 0.76, h * 0.9, h * 0.22);
  // Összecsapó varázslatok középen
  glow(ctx, w / 2, h * 0.38, h * 0.32, "rgba(255,255,255,0.7)");
  ctx.strokeStyle = "#c4b5fd";
  ctx.lineWidth = 2.5;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(w * 0.3, h * 0.3);
  for (let i = 1; i <= 6; i++) ctx.lineTo(w * (0.3 + i * 0.033), h * (0.3 + (i % 2 ? 0.06 : -0.02) + i * 0.012));
  ctx.stroke();
  ctx.strokeStyle = "#fb923c";
  ctx.beginPath();
  ctx.moveTo(w * 0.7, h * 0.3);
  for (let i = 1; i <= 6; i++) ctx.lineTo(w * (0.7 - i * 0.033), h * (0.3 + (i % 2 ? -0.04 : 0.04) + i * 0.012));
  ctx.stroke();
}
