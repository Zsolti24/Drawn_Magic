import { BrowserRouter, Outlet, Route, Routes } from "react-router";
import { ControllerPage } from "./controller/ControllerPage";
import { ProfileProvider } from "./profile/profile";
import { ConnectionProvider, useConnection } from "./screen/connection";
import { MainMenu } from "./screen/MainMenu";
import { LevelSelect } from "./screen/LevelSelect";
import { SpellsPage } from "./screen/SpellsPage";
import { WardrobePage } from "./screen/WardrobePage";
import { SettingsPage } from "./screen/SettingsPage";
import { GamePage } from "./screen/GamePage";

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/c" element={<ControllerPage />} />
        <Route element={<ScreenShell />}>
          <Route path="/" element={<MainMenu />} />
          <Route path="/levels" element={<LevelSelect />} />
          <Route path="/spells" element={<SpellsPage />} />
          <Route path="/wardrobe" element={<WardrobePage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/play/:levelId" element={<GamePage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

/** A nagy képernyő oldalai: közös profil és egyetlen telefonkapcsolat */
function ScreenShell() {
  return (
    <ProfileProvider>
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
