import { BrowserRouter, Navigate, Outlet, Route, Routes } from "react-router";
import { AuthProvider, isUnlockAll, useAuth } from "./auth/auth";
import { ControllerPage } from "./controller/ControllerPage";
import { ProfileProvider, saveKey } from "./profile/profile";
import { ConnectionProvider, useConnection } from "./screen/connection";
import { LoginPage } from "./screen/LoginPage";
import { ModeSelect } from "./screen/ModeSelect";
import { SaveSelect } from "./screen/SaveSelect";
import { MainMenu } from "./screen/MainMenu";
import { LevelSelect } from "./screen/LevelSelect";
import { SpellsPage } from "./screen/SpellsPage";
import { WardrobePage } from "./screen/WardrobePage";
import { SettingsPage } from "./screen/SettingsPage";
import { StatsPage } from "./screen/StatsPage";
import { GamePage } from "./screen/GamePage";

// A képernyő útja: bejelentkezés → játékmód → mentés kiválasztása → főmenü és játék.
export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/c" element={<ControllerPage />} />
        <Route element={<AuthShell />}>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<RequireAuth />}>
            <Route path="/mode" element={<ModeSelect />} />
            <Route path="/saves" element={<SaveSelect />} />
            <Route element={<GameShell />}>
              <Route path="/" element={<MainMenu />} />
              <Route path="/levels" element={<LevelSelect />} />
              <Route path="/spells" element={<SpellsPage />} />
              <Route path="/wardrobe" element={<WardrobePage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/stats" element={<StatsPage />} />
              <Route path="/play/:levelId" element={<GamePage />} />
            </Route>
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

function AuthShell() {
  return (
    <AuthProvider>
      <Outlet />
    </AuthProvider>
  );
}

/** Bejelentkezés nélkül a belépő oldal jön */
function RequireAuth() {
  const { session } = useAuth();
  return session ? <Outlet /> : <Navigate to="/login" replace />;
}

/** A főmenü és a játék: kell egy kiválasztott mentés; közös profil és egyetlen telefonkapcsolat */
function GameShell() {
  const { session, slot } = useAuth();
  if (!session || slot === null) return <Navigate to="/mode" replace />;
  const key = saveKey(session.accountId, slot);
  return (
    <ProfileProvider key={key} storageKey={key} unlockAll={isUnlockAll(session)}>
      <ConnectionProvider>
        <ReplacedGuard />
      </ConnectionProvider>
    </ProfileProvider>
  );
}

function ReplacedGuard() {
  const { replaced } = useConnection();
  if (replaced) {
    return (
      <main className="screen">
        <section className="card card--center">
          <p>Ez a szoba egy másik ablakban nyílt meg.</p>
          <button className="btn" onClick={() => location.reload()}>
            Átvétel
          </button>
        </section>
      </main>
    );
  }
  return <Outlet />;
}
