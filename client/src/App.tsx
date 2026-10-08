import { BrowserRouter, Route, Routes } from "react-router";
import { ScreenPage } from "./screen/ScreenPage";
import { ControllerPage } from "./controller/ControllerPage";

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ScreenPage />} />
        <Route path="/c" element={<ControllerPage />} />
      </Routes>
    </BrowserRouter>
  );
}
