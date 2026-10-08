import { useState } from "react";
import { useSearchParams } from "react-router";
import { isRoomCode, type ServerMsg } from "@shared/messages";
import { useGameSocket } from "../net/useGameSocket";
import { StatusDot } from "../components/StatusDot";

type Problem = "no_room" | "room_not_found" | "replaced";

const problemText: Record<Problem, string> = {
  no_room: "Hiányzik a szobakód. Olvasd be a QR-kódot a képernyőről.",
  room_not_found: "Ez a szoba már nem létezik. Olvasd be újra a QR-kódot.",
  replaced: "Egy másik telefon csatlakozott ehhez a szobához.",
};

export function ControllerPage() {
  const [params] = useSearchParams();
  const rawRoom = params.get("room")?.toUpperCase() ?? "";
  const room = isRoomCode(rawRoom) ? rawRoom : null;

  const [problem, setProblem] = useState<Problem | null>(room ? null : "no_room");
  const [screenConnected, setScreenConnected] = useState(false);

  const { status, socketRef } = useGameSocket(
    () => (room && !problem ? { t: "join", room } : null),
    (msg: ServerMsg, socket) => {
      switch (msg.t) {
        case "peer":
          setScreenConnected(msg.connected);
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
        <StatusDot
          tone={ready ? "ok" : status === "closed" ? "bad" : "wait"}
          label={status !== "open" ? "Csatlakozás…" : screenConnected ? "Kapcsolódva" : "Képernyőre vár"}
        />
      </header>
      <button
        className="big-btn"
        disabled={!ready}
        onClick={() => {
          socketRef.current?.send({ t: "tap" });
          navigator.vibrate?.(30);
        }}
      >
        Varázsolj!
      </button>
    </main>
  );
}
