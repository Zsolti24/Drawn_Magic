import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router";
import { isRoomCode, type GamePhase, type ServerMsg } from "@shared/messages";
import { useGameSocket } from "../net/useGameSocket";
import { StatusDot } from "../components/StatusDot";
import { GlyphBadge } from "../components/GlyphBadge";
import { StatIcon } from "../components/StatIcon";
import { GLYPHS, GLYPH_BY_ID } from "../data/glyphs";
import { SPELLS, SPELL_BY_GLYPH, SPELL_BY_ID } from "../data/spells";
import { Spellbook } from "../game/spellbook";
import type { Point } from "../game/types";
import { DrawPad, type StrokeOutcome } from "./DrawPad";
import { useWakeLock } from "./useWakeLock";

type Problem = "no_room" | "room_not_found" | "replaced";

const problemText: Record<Problem, string> = {
  no_room: "Hiányzik a szobakód. Olvasd be a QR-kódot a képernyőről.",
  room_not_found: "Ez a szoba már nem létezik. Olvasd be újra a QR-kódot.",
  replaced: "Egy másik telefon csatlakozott ehhez a szobához.",
};

const phaseText: Record<GamePhase, string> = {
  lobby: "Menüben",
  countdown: "Készülj!",
  playing: "Rajzolj jeleket!",
  paused: "Szünet",
  over: "Vége",
};

const FAIL_COLOR = "#f87171";

type Flash = { id: number; text: string; detail?: string; color: string };

const spellbook = new Spellbook(GLYPHS);

/** A rezgés nem működik iOS-en, ezért mindig van látható visszajelzés is */
function vibrate(pattern: number | number[]) {
  navigator.vibrate?.(pattern);
}

export function ControllerPage() {
  const [params] = useSearchParams();
  const rawRoom = params.get("room")?.toUpperCase() ?? "";
  const room = isRoomCode(rawRoom) ? rawRoom : null;

  const [problem, setProblem] = useState<Problem | null>(room ? null : "no_room");
  const [screenConnected, setScreenConnected] = useState(false);
  const [phase, setPhase] = useState<GamePhase>("lobby");
  const [score, setScore] = useState(0);
  /** A használható (megtanult) varázslatok (amíg nem tudjuk, mind) */
  const [equipped, setEquipped] = useState<string[]>(() => SPELLS.map((s) => s.id));
  const [flash, setFlash] = useState<Flash | null>(null);
  const [hurtKey, setHurtKey] = useState(0);
  const flashId = useRef(0);

  const showFlash = (text: string, color: string, detail?: string) =>
    setFlash({ id: ++flashId.current, text, color, detail });

  const { status, socketRef } = useGameSocket(
    () => (room && !problem ? { t: "join", room } : null),
    (msg: ServerMsg, socket) => {
      switch (msg.t) {
        case "peer":
          setScreenConnected(msg.connected);
          break;
        case "phase":
          setPhase(msg.phase);
          setScore(msg.score);
          if (Array.isArray(msg.spells)) setEquipped(msg.spells);
          break;
        case "feedback":
          if (msg.kind === "hit") {
            showFlash(msg.count > 1 ? `Találat ×${msg.count}` : "Találat!", "#4ade80");
            vibrate(25);
          } else if (msg.kind === "no_mana") {
            showFlash("Nincs elég mana", "#60a5fa");
            vibrate([15, 30, 15]);
          } else if (msg.kind === "cooldown") {
            showFlash("Még töltődik", "#c4b5fd");
            vibrate([15, 30, 15]);
          } else {
            setHurtKey((k) => k + 1);
            vibrate(200);
          }
          break;
        case "error":
          if (msg.code === "room_not_found" || msg.code === "replaced") {
            setProblem(msg.code);
            socket.close();
          }
          break;
      }
    },
  );

  const ready = status === "open" && screenConnected;
  useWakeLock(ready);

  // A rajzolás ne görgesse és ne nagyítsa az oldalt
  useEffect(() => {
    document.documentElement.classList.add("no-scroll");
    return () => document.documentElement.classList.remove("no-scroll");
  }, []);

  const handleStroke = (points: Point[]): StrokeOutcome => {
    const result = spellbook.read(points);
    if (result.kind === "ignored") return null;
    if (result.kind === "fail") {
      // Csali mintánál (pl. egyenes vonal) nincs értelme a százaléknak
      const guess = result.best?.id ? ` (${Math.round(result.best.score * 100)}%)` : "";
      showFlash("?", FAIL_COLOR, `Nem ismertem fel${guess}`);
      vibrate([20, 40, 20]);
      return { color: FAIL_COLOR };
    }

    const { glyph, score: match } = result;
    const spell = SPELL_BY_GLYPH.get(glyph.id);
    if (!spell || !equipped.includes(spell.id)) {
      showFlash(spell?.name ?? glyph.name, "#9d94c4", "Még nem tanultad meg");
      return { color: "#9d94c4" };
    }
    const playing = ready && phase === "playing";
    if (playing) socketRef.current?.send({ t: "spell", id: glyph.id });
    showFlash(spell?.name ?? glyph.name, glyph.color, playing ? `${Math.round(match * 100)}%` : "gyakorlás");
    return { color: glyph.color };
  };

  if (problem) {
    return (
      <main className="controller">
        <section className="card card--center">
          <p>{problemText[problem]}</p>
          {problem === "replaced" && (
            <button className="btn" onClick={() => location.reload()}>
              Visszacsatlakozás
            </button>
          )}
        </section>
      </main>
    );
  }

  return (
    <main className="controller">
      <header className="controller__bar">
        <span className="room-code room-code--small">{room}</span>
        <span className="controller__phase">{ready ? phaseText[phase] : ""}</span>
        <StatusDot
          tone={ready ? "ok" : status === "closed" ? "bad" : "wait"}
          label={status !== "open" ? "Csatlakozás…" : screenConnected ? "Kapcsolódva" : "Képernyőre vár"}
        />
      </header>

      <div className="pad-area">
        <DrawPad onStroke={handleStroke} />
        {hurtKey > 0 && <div className="hurt-vignette" key={hurtKey} />}
        {flash && (
          <div className="flash" key={flash.id} style={{ color: flash.color }}>
            <span className="flash__text">{flash.text}</span>
            {flash.detail && <span className="flash__detail">{flash.detail}</span>}
          </div>
        )}
        {ready && phase === "over" && (
          <div className="pad-overlay">
            <p className="muted">Vége a játéknak</p>
            <p className="counter">{score}</p>
            <button className="btn btn--big" onClick={() => socketRef.current?.send({ t: "restart" })}>
              Új játék
            </button>
          </div>
        )}
        {ready && phase === "lobby" && (
          <div className="pad-overlay pad-overlay--soft">
            <p className="muted">A képernyőn a menüben vagy.</p>
            <p className="muted small">Addig gyakorolhatod a jeleket.</p>
          </div>
        )}
        {!ready && (
          <div className="pad-overlay pad-overlay--soft">
            <p className="muted">{status !== "open" ? "Csatlakozás a szerverhez…" : "A képernyő nem elérhető"}</p>
            <p className="muted small">Addig gyakorolhatod a jeleket.</p>
          </div>
        )}
      </div>

      <ul className="legend legend--phone">
        {equipped.flatMap((id) => SPELL_BY_ID.get(id) ?? []).map((spell) => {
          const glyph = GLYPH_BY_ID.get(spell.glyph);
          return (
            <li key={spell.id}>
              {glyph && <GlyphBadge glyph={glyph} size={24} />}
              <span>{spell.name}</span>
              <span className="legend__cost">
                <StatIcon kind="mana" size={14} />
                {spell.mana}
              </span>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
