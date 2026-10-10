import { useCallback, useState } from "react";
import { useNavigate } from "react-router";
import { isUnlockAll, useAuth } from "../auth/auth";
import { Gate } from "../components/Gate";
import { DrawnCanvas } from "../components/DrawnCanvas";
import { drawWizardFigure } from "../draw/wizard";
import { LEVELS } from "../data/levels";
import { resolveLook, type WizardLook } from "../data/wizardParts";
import { DEFAULT_PROFILE, applyUnlockAll, deleteSave, listSaves, saveKey, writeSave, type Profile } from "../profile/profile";

/** Egyjátékos mód: a fiók mentéshelyei; meglévő mentés folytatása vagy új játék egy üres helyen */
export function SaveSelect() {
  const { session, slot: activeSlot, selectSlot } = useAuth();
  const navigate = useNavigate();
  const [saves, setSaves] = useState(() => (session ? listSaves(session.accountId) : []));
  /** Melyik hely törlését kell megerősíteni */
  const [confirming, setConfirming] = useState<number | null>(null);
  if (!session) return null;

  const open = (slot: number) => {
    selectSlot(slot);
    navigate("/");
  };
  const create = (slot: number) => {
    writeSave(saveKey(session.accountId, slot), isUnlockAll(session) ? applyUnlockAll(DEFAULT_PROFILE) : DEFAULT_PROFILE);
    open(slot);
  };
  const remove = (slot: number) => {
    deleteSave(saveKey(session.accountId, slot));
    if (activeSlot === slot) selectSlot(null);
    setSaves(listSaves(session.accountId));
    setConfirming(null);
  };

  return (
    <Gate account>
      <section className="saves">
        <header className="saves__head">
          <button className="back-btn" onClick={() => navigate("/mode")}>
            <span className="back-btn__arrow" aria-hidden="true" />
            Játékmódok
          </button>
          <div>
            <h1 className="title">Egyjátékos</h1>
            <p className="muted">Válassz mentést, vagy kezdj új játékot egy üres helyen.</p>
          </div>
        </header>
        <div className="saves__list">
          {saves.map((save, slot) =>
            save ? (
              <article key={slot} className={`save-card ${activeSlot === slot ? "save-card--active" : ""}`}>
                <SavePortrait look={save.look} />
                <div className="save-card__body">
                  <h2 className="save-card__title">{slot + 1}. mentés</h2>
                  <SaveStats save={save} />
                  {confirming === slot ? (
                    <div className="save-card__confirm">
                      <p>Biztosan törlöd? Ez nem vonható vissza.</p>
                      <div className="save-card__actions">
                        <button className="btn btn--danger" onClick={() => remove(slot)}>
                          Igen, törlöm
                        </button>
                        <button className="btn btn--ghost" onClick={() => setConfirming(null)}>
                          Mégse
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="save-card__actions">
                      <button className="btn" onClick={() => open(slot)} autoFocus={slot === 0}>
                        Folytatás
                      </button>
                      <button className="btn btn--ghost" onClick={() => setConfirming(slot)}>
                        Törlés
                      </button>
                    </div>
                  )}
                </div>
              </article>
            ) : (
              <button key={slot} className="save-card save-card--empty" onClick={() => create(slot)}>
                <span className="save-card__plus" aria-hidden="true">
                  +
                </span>
                <span className="save-card__title">{slot + 1}. hely: üres</span>
                <span className="muted">Új játék indítása</span>
              </button>
            ),
          )}
        </div>
      </section>
    </Gate>
  );
}

function SaveStats({ save }: { save: Profile }) {
  const done = LEVELS.filter((l) => save.completedLevels.includes(l.id));
  // A legmesszebbi még nem teljesített pálya (ahol tart)
  const current = LEVELS.find((l) => !save.completedLevels.includes(l.id));
  const best = Math.max(0, ...Object.values(save.bestScores));
  return (
    <dl className="save-stats">
      <dt>Hol tart</dt>
      <dd>{current ? `${current.code} ${current.name}` : "A kampány kész!"}</dd>
      <dt>Teljesítve</dt>
      <dd>
        {done.length} / {LEVELS.length} pálya
      </dd>
      <dt>Szint</dt>
      <dd>
        {save.level}. szint · {save.gold} arany
      </dd>
      <dt>Legjobb</dt>
      <dd>{best} pont</dd>
      <dt>Utoljára</dt>
      <dd>{save.savedAt ? formatDate(save.savedAt) : "–"}</dd>
    </dl>
  );
}

function formatDate(ms: number) {
  return new Date(ms).toLocaleString("hu-HU", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

/** A mentés mágusa a saját öltözetében */
function SavePortrait({ look }: { look: WizardLook }) {
  const draw = useCallback(
    (ctx: CanvasRenderingContext2D, w: number, h: number) => {
      const bg = ctx.createLinearGradient(0, 0, 0, h);
      bg.addColorStop(0, "#3b2a7a");
      bg.addColorStop(1, "#1b1533");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);
      const g = ctx.createRadialGradient(w / 2, h * 0.6, 0, w / 2, h * 0.6, h * 0.6);
      g.addColorStop(0, "rgba(253,224,71,0.25)");
      g.addColorStop(1, "rgba(253,224,71,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = "rgba(0,0,0,0.3)";
      ctx.beginPath();
      ctx.ellipse(w / 2, h * 0.9, w * 0.28, h * 0.04, 0, 0, Math.PI * 2);
      ctx.fill();
      drawWizardFigure(ctx, resolveLook(look), { facing: 1, walk: 0, moving: false, time: 0.6, cast: 0, castColor: null }, w / 2, h * 0.9, h * 0.23);
    },
    [look],
  );
  return <DrawnCanvas width={96} height={150} draw={draw} className="save-card__art" />;
}
