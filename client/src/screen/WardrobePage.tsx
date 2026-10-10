import { useCallback, useState, type CSSProperties } from "react";
import {
  BEARD_COLORS,
  GEAR,
  gearBonus,
  SKIN_COLORS,
  type AmuletDef,
  type GearSlot,
  type HatDef,
  type RobeDef,
  type StaffDef,
  type WizardLook,
} from "../data/wizardParts";
import { isUnlocked, usableSpells, useProfile } from "../profile/profile";
import { PageFrame } from "../components/PageFrame";
import { DrawnCanvas } from "../components/DrawnCanvas";
import { WizardStage, type StageCast } from "../components/WizardStage";
import { drawItemIcon } from "../draw/wizard";
import { BonusChips, BonusDiff } from "../components/StatBonus";
import { drawLock } from "../draw/icons";
import { drawGlowingGlyph } from "../draw/shapes";
import { GLYPH_BY_ID } from "../data/glyphs";

type Item = HatDef | RobeDef | StaffDef | AmuletDef;
type Panel = GearSlot | "looks";

const SLOT_LABELS: Record<GearSlot, string> = {
  hat: "Kalap",
  robe: "Köpeny",
  staff: "Pálca",
  amulet: "Amulett",
};
const GEAR_SLOTS = Object.keys(SLOT_LABELS) as GearSlot[];

/** Öltözet: bal oldalt a mágus, középen a felszerelési helyek, jobbra a választható tárgyak */
export function WardrobePage() {
  const { profile, update } = useProfile();
  const look = profile.look;
  const [open, setOpen] = useState<Panel | null>("hat");
  /** Felpróbálás: az egér alatti tárgy, akkor is, ha még lezárt */
  const [tryOn, setTryOn] = useState<Partial<WizardLook> | null>(null);
  const [walking, setWalking] = useState(false);
  const [cast, setCast] = useState<StageCast | null>(null);

  const setLook = (change: Partial<WizardLook>) => update((p) => ({ ...p, look: { ...p.look, ...change } }));
  const shownLook = tryOn ? { ...look, ...tryOn } : look;
  const toggle = (panel: Panel) => {
    setOpen((cur) => (cur === panel ? null : panel));
    setTryOn(null);
  };

  return (
    <PageFrame title="Öltözet">
      <div className="outfit">
        <div className="outfit__preview">
          <WizardStage look={shownLook} walking={walking} cast={cast} className="outfit__stage" />
          <div className="preview-bar">
            <span className="preview-bar__title">Próba</span>
            <button
              className={`preview-btn ${walking ? "preview-btn--on" : ""}`}
              onClick={() => setWalking((v) => !v)}
              aria-pressed={walking}
            >
              <DrawnCanvas width={34} height={34} draw={drawFootsteps} />
              {walking ? "Megállás" : "Séta"}
            </button>
            {usableSpells(profile).map((spell) => (
              <button
                key={spell.id}
                className="preview-btn"
                style={{ "--btn-color": spell.color } as CSSProperties}
                onClick={() => setCast({ at: performance.now(), spellId: spell.id })}
              >
                <SpellGlyphIcon glyph={spell.glyph} color={spell.color} />
                {spell.name}
              </button>
            ))}
          </div>
          <GearSummary look={look} tryOn={tryOn ? shownLook : null} />
        </div>

        <nav className="outfit__slots" aria-label="Felszerelési helyek">
          {GEAR_SLOTS.map((slot) => {
            const id = look[slot];
            const item = id ? GEAR[slot].find((i) => i.id === id) : undefined;
            return (
              <button
                key={slot}
                className={`gear-slot ${open === slot ? "gear-slot--open" : ""}`}
                onClick={() => toggle(slot)}
                aria-expanded={open === slot}
              >
                <ItemIcon slot={slot} item={item as Item | undefined} size={64} />
                <span className="gear-slot__text">
                  <span className="gear-slot__label">{SLOT_LABELS[slot]}</span>
                  <span className="gear-slot__name">{item?.name ?? "Nincs"}</span>
                  {item && <BonusChips bonus={item.bonus} />}
                </span>
              </button>
            );
          })}
          <button
            className={`gear-slot ${open === "looks" ? "gear-slot--open" : ""}`}
            onClick={() => toggle("looks")}
            aria-expanded={open === "looks"}
          >
            <FaceIcon skin={look.skin} beard={look.beard} size={64} />
            <span className="gear-slot__text">
              <span className="gear-slot__label">Megjelenés</span>
              <span className="gear-slot__name">Bőr és szakáll</span>
            </span>
          </button>
        </nav>

        <aside className={`outfit__panel ${open ? "outfit__panel--open" : ""}`}>
          {open === null && (
            <p className="muted outfit__hint">Válassz egy helyet bal oldalt, és itt megjelennek a hozzá tartozó tárgyak.</p>
          )}
          {open && open !== "looks" && (
            <>
              <h2 className="section-title">{SLOT_LABELS[open]}</h2>
              <div className="item-list" onMouseLeave={() => setTryOn(null)}>
                {open === "amulet" && (
                  <button
                    className={`item-row ${look.amulet === null ? "item-row--on" : ""}`}
                    onClick={() => setLook({ amulet: null })}
                    onMouseEnter={() => setTryOn({ amulet: null })}
                  >
                    <ItemIcon slot="amulet" size={56} />
                    <span className="item-row__text">
                      <span className="item-row__name">Nincs amulett</span>
                      <BonusChips bonus={{}} />
                    </span>
                    {look.amulet === null && <span className="item-row__badge">Felvéve</span>}
                  </button>
                )}
                {GEAR[open].map((item) => {
                  const unlocked = isUnlocked(profile, open, item.id);
                  const worn = look[open] === item.id;
                  return (
                    <button
                      key={item.id}
                      className={`item-row ${worn ? "item-row--on" : ""} ${unlocked ? "" : "item-row--locked"}`}
                      onClick={() => unlocked && setLook({ [open]: item.id })}
                      // Lezárt tárgyat nem lehet felpróbálni: a kinézete is titok
                      onMouseEnter={() => setTryOn(unlocked ? { [open]: item.id } : null)}
                      onFocus={() => setTryOn(unlocked ? { [open]: item.id } : null)}
                      aria-disabled={!unlocked}
                    >
                      <ItemIcon slot={open} item={item as Item} size={56} locked={!unlocked} />
                      <span className="item-row__text">
                        <span className="item-row__name">{unlocked ? item.name : `Ismeretlen ${SLOT_LABELS[open].toLowerCase()}`}</span>
                        {unlocked ? <BonusChips bonus={item.bonus} /> : <span className="item-row__teaser">Vajon mit tudhat? Szerezd meg, és kiderül.</span>}
                        {unlocked && <span className="item-row__obtain">Feloldva</span>}
                      </span>
                      {worn && <span className="item-row__badge">Felvéve</span>}
                    </button>
                  );
                })}
              </div>
            </>
          )}
          {open === "looks" && (
            <>
              <h2 className="section-title">Bőrszín</h2>
              <div className="chips">
                {SKIN_COLORS.map((c) => (
                  <button
                    key={c}
                    className={`swatch ${look.skin === c ? "chip--on" : ""}`}
                    style={{ background: c }}
                    aria-label={`Bőrszín ${c}`}
                    onClick={() => setLook({ skin: c })}
                  />
                ))}
              </div>
              <h2 className="section-title">Szakáll</h2>
              <div className="chips">
                {BEARD_COLORS.map((c) => (
                  <button
                    key={c}
                    className={`swatch ${look.beard === c ? "chip--on" : ""}`}
                    style={{ background: c }}
                    aria-label={`Szakállszín ${c}`}
                    onClick={() => setLook({ beard: c })}
                  />
                ))}
              </div>
              <p className="muted small">A megjelenés szabadon választható.</p>
            </>
          )}
        </aside>
      </div>
    </PageFrame>
  );
}

/** Egy tárgy ikonja; item nélkül üres hely */
function ItemIcon({ slot, item, size, locked = false }: { slot: GearSlot; item?: Item; size: number; locked?: boolean }) {
  const draw = useCallback(
    (ctx: CanvasRenderingContext2D, w: number, h: number) => {
      const bg = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w * 0.7);
      bg.addColorStop(0, "#33265f");
      bg.addColorStop(1, "#160f2e");
      ctx.fillStyle = bg;
      ctx.beginPath();
      ctx.roundRect(0, 0, w, h, w * 0.18);
      ctx.fill();
      if (!item) {
        // Üres hely: szaggatott kör
        ctx.strokeStyle = "rgba(167,123,255,0.4)";
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.arc(w / 2, h / 2, w * 0.22, 0, Math.PI * 2);
        ctx.stroke();
        return;
      }
      if (locked) {
        // A kinézet titok: a tárgy helyett izzó kérdőjel és kis lakat
        const glow = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w * 0.45);
        glow.addColorStop(0, "rgba(167,123,255,0.35)");
        glow.addColorStop(1, "rgba(167,123,255,0)");
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = "rgba(233,213,255,0.85)";
        ctx.font = `800 ${Math.round(h * 0.55)}px system-ui, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("?", w / 2, h * 0.52);
        drawLock(ctx, w * 0.78, h * 0.78, w * 0.26, "#e9d5ff");
        return;
      }
      drawItemIcon(ctx, slot, item, w, h);
    },
    [slot, item, locked],
  );
  return <DrawnCanvas width={size} height={size} draw={draw} label={locked ? "Ismeretlen tárgy" : (item?.name ?? "Üres")} />;
}

/** Megjelenés ikon: arc a választott bőr- és szakállszínnel */
function FaceIcon({ skin, beard, size }: { skin: string; beard: string; size: number }) {
  const draw = useCallback(
    (ctx: CanvasRenderingContext2D, w: number, h: number) => {
      const bg = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w * 0.7);
      bg.addColorStop(0, "#33265f");
      bg.addColorStop(1, "#160f2e");
      ctx.fillStyle = bg;
      ctx.beginPath();
      ctx.roundRect(0, 0, w, h, w * 0.18);
      ctx.fill();
      const cx = w / 2;
      const cy = h * 0.45;
      const r = w * 0.24;
      ctx.fillStyle = skin;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#1e1b2e";
      for (const ex of [-0.35, 0.35]) {
        ctx.beginPath();
        ctx.ellipse(cx + ex * r, cy - r * 0.15, r * 0.11, r * 0.15, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = beard;
      ctx.beginPath();
      ctx.moveTo(cx - r * 0.9, cy + r * 0.1);
      ctx.quadraticCurveTo(cx - r * 0.8, cy + r * 1.3, cx, cy + r * 1.7);
      ctx.quadraticCurveTo(cx + r * 0.8, cy + r * 1.3, cx + r * 0.9, cy + r * 0.1);
      ctx.quadraticCurveTo(cx, cy + r * 0.5, cx - r * 0.9, cy + r * 0.1);
      ctx.fill();
    },
    [skin, beard],
  );
  return <DrawnCanvas width={size} height={size} draw={draw} label="Megjelenés" />;
}


/** Séta ikon: két lábnyom */
function drawFootsteps(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.fillStyle = "#c4b5fd";
  for (const [x, y, rot] of [
    [0.36, 0.62, -0.25],
    [0.64, 0.36, 0.25],
  ]) {
    ctx.save();
    ctx.translate(x * w, y * h);
    ctx.rotate(rot);
    ctx.beginPath();
    ctx.ellipse(0, 0, w * 0.11, h * 0.17, 0, 0, Math.PI * 2);
    ctx.fill();
    for (let t = 0; t < 3; t++) {
      ctx.beginPath();
      ctx.arc((t - 1) * w * 0.07, -h * 0.22, w * 0.035, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

function SpellGlyphIcon({ glyph, color }: { glyph: string; color: string }) {
  const draw = useCallback(
    (ctx: CanvasRenderingContext2D, w: number, h: number) =>
      drawGlowingGlyph(ctx, GLYPH_BY_ID.get(glyph)?.path ?? [], w / 2, h / 2, w * 0.62, color, 3),
    [glyph, color],
  );
  return <DrawnCanvas width={34} height={34} draw={draw} />;
}

/** A felszerelés összes bónusza; felpróbáláskor az is, mi változna a felvételével */
function GearSummary({ look, tryOn }: { look: WizardLook; tryOn: WizardLook | null }) {
  const current = gearBonus(look);
  return (
    <section className="gear-summary">
      <h2 className="gear-summary__title">A felszerelés bónusza</h2>
      <BonusChips bonus={current} empty="A felvett tárgyak nem adnak bónuszt" />
      {tryOn && (
        <div className="gear-summary__try">
          <span className="gear-summary__label">Ha ezt felveszed:</span>
          <BonusDiff from={current} to={gearBonus(tryOn)} />
        </div>
      )}
    </section>
  );
}
