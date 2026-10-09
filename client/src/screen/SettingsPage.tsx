import { useState } from "react";
import { PageFrame } from "../components/PageFrame";
import { PhonePanel } from "../components/PhonePanel";
import { useProfile } from "../profile/profile";

export function SettingsPage() {
  const { reset } = useProfile();
  const [confirming, setConfirming] = useState(false);
  const [done, setDone] = useState(false);

  return (
    <PageFrame title="Beállítások">
      <div className="settings">
        <section className="card">
          <h2 className="section-title">Telefon</h2>
          <PhonePanel qrSize={180} alwaysShowQr />
          <p className="muted small">Egy másik telefon is csatlakozhat ezzel a kóddal, ilyenkor az átveszi az irányítást.</p>
        </section>

        <section className="card">
          <h2 className="section-title">Irányítás</h2>
          <dl className="controls-list">
            <dt>Mozgás</dt>
            <dd>W A S D vagy a nyilak</dd>
            <dt>Varázslás</dt>
            <dd>Rajzolj egy jelet a telefonra</dd>
            <dt>Szünet</dt>
            <dd>Esc</dd>
            <dt>Próba telefon nélkül</dt>
            <dd>1–9 billentyűk (a képességtár sorrendjében)</dd>
          </dl>
        </section>

        <section className="card">
          <h2 className="section-title">Mentés</h2>
          <p className="muted small">
            A haladás, a megtanult varázslatok és az öltözet ebben a böngészőben van elmentve. Később fiókhoz köthető lesz.
          </p>
          {done ? (
            <p className="ok-text">A mentés törölve, minden visszaállt alapra.</p>
          ) : confirming ? (
            <div className="confirm">
              <p>Biztosan törlöd? Ez nem vonható vissza.</p>
              <button
                className="btn btn--danger"
                onClick={() => {
                  reset();
                  setConfirming(false);
                  setDone(true);
                }}
              >
                Igen, törlöm
              </button>
              <button className="btn btn--ghost" onClick={() => setConfirming(false)}>
                Mégse
              </button>
            </div>
          ) : (
            <button className="btn btn--ghost" onClick={() => setConfirming(true)}>
              Mentés törlése
            </button>
          )}
        </section>

        <section className="card">
          <h2 className="section-title">Hamarosan</h2>
          <p className="muted small">Hang és zene, fiók és belépés, a menü irányítása telefonról.</p>
        </section>
      </div>
    </PageFrame>
  );
}
