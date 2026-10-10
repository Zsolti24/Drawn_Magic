import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./index.css";
import "./gate.css";
import "./stats.css";
import "./results.css";
import "./gear.css";
import "./mystery.css";
import "./loot.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
