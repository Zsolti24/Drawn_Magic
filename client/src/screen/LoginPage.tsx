import { useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router";
import { MIN_PASSWORD, useAuth } from "../auth/auth";
import { Gate } from "../components/Gate";

type Tab = "login" | "register";

/** Bejelentkezés és regisztráció: az alkalmazás megnyitásakor ez jön először */
export function LoginPage() {
  const { session, login, register } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (session) return <Navigate to="/mode" replace />;

  const switchTab = (next: Tab) => {
    setTab(next);
    setError(null);
    setConfirm("");
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (tab === "register" && password !== confirm) {
      setError("A két jelszó nem egyezik.");
      return;
    }
    setBusy(true);
    const problem = tab === "login" ? await login(email, password, remember) : await register(email, password, remember);
    setBusy(false);
    if (problem) setError(problem);
    else navigate("/mode");
  };

  return (
    <Gate>
      <section className="auth-card">
        <header className="auth-card__head">
          <h1 className="title title--hero">Drawn Magic</h1>
          <p className="muted">Rajzolj jeleket a telefonodon, és varázsolj!</p>
        </header>

        <div className="tabs" role="tablist">
          <button role="tab" aria-selected={tab === "login"} className={`tabs__tab ${tab === "login" ? "tabs__tab--on" : ""}`} onClick={() => switchTab("login")}>
            Bejelentkezés
          </button>
          <button
            role="tab"
            aria-selected={tab === "register"}
            className={`tabs__tab ${tab === "register" ? "tabs__tab--on" : ""}`}
            onClick={() => switchTab("register")}
          >
            Regisztráció
          </button>
        </div>

        <form className="auth-form" onSubmit={submit}>
          <label className="field">
            <span className="field__label">{tab === "login" ? "E-mail cím vagy felhasználónév" : "E-mail cím"}</span>
            <input className="field__input" type={tab === "login" ? "text" : "email"} autoComplete={tab === "login" ? "username" : "email"} value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
          </label>
          <label className="field">
            <span className="field__label">Jelszó</span>
            <input
              className="field__input"
              type="password"
              autoComplete={tab === "login" ? "current-password" : "new-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={tab === "register" ? MIN_PASSWORD : undefined}
              required
            />
          </label>
          {tab === "register" && (
            <label className="field">
              <span className="field__label">Jelszó újra</span>
              <input className="field__input" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
            </label>
          )}
          <label className="check">
            <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
            Maradjak bejelentkezve
          </label>
          {error && (
            <p className="auth-form__error" role="alert">
              {error}
            </p>
          )}
          <button className="btn btn--big auth-form__submit" type="submit" disabled={busy}>
            {busy ? "Egy pillanat…" : tab === "login" ? "Belépés" : "Fiók létrehozása"}
          </button>
        </form>

        <div className="divider">
          <span>vagy</span>
        </div>
        <button className="btn btn--ghost google-btn" disabled title="Hamarosan">
          <GoogleMark />
          Folytatás Google-fiókkal
          <span className="soon">Hamarosan</span>
        </button>
        <p className="muted small auth-card__note">A fiókok és a mentések egyelőre ebben a böngészőben tárolódnak.</p>
      </section>
    </Gate>
  );
}

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.3-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.2-.1-2.3-.4-3.5z" />
    </svg>
  );
}
