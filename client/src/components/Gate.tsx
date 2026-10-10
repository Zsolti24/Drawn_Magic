import type { ReactNode } from "react";
import { useNavigate } from "react-router";
import { isUnlockAll, useAuth } from "../auth/auth";
import { DEFAULT_LOOK } from "../data/wizardParts";
import { WizardStage } from "./WizardStage";

/** A belépés előtti oldalak kerete: a réten álló mágus a háttérben, elöl a tartalom */
export function Gate({ children, account = false }: { children: ReactNode; account?: boolean }) {
  return (
    <main className="gate">
      <WizardStage look={DEFAULT_LOOK} sparkles focusX={0.9} className="gate__stage" />
      <div className="gate__content">
        {account && <AccountBar />}
        {children}
      </div>
    </main>
  );
}

/** A bejelentkezett fiók és a kijelentkezés */
export function AccountBar() {
  const { session, logout } = useAuth();
  const navigate = useNavigate();
  if (!session) return null;
  return (
    <div className="account-bar">
      <span className="account-bar__avatar" aria-hidden="true">
        {session.email[0]?.toUpperCase()}
      </span>
      <span className="account-bar__email">{session.email}</span>
      {isUnlockAll(session) && <span className="unlock-all-badge">Admin: minden feloldva</span>}
      <button
        className="account-bar__btn"
        onClick={() => {
          logout();
          navigate("/login");
        }}
      >
        Kijelentkezés
      </button>
    </div>
  );
}
