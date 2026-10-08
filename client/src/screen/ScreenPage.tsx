import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import type { ServerMsg } from "@shared/messages";
import { useGameSocket } from "../net/useGameSocket";
import { StatusDot } from "../components/StatusDot";

const ROOM_KEY = "drawn-magic:room";

function readRoom() {
  try {
    return sessionStorage.getItem(ROOM_KEY);
  } catch {
    return null;
  }
}

function saveRoom(room: string) {
  try {
    sessionStorage.setItem(ROOM_KEY, room);
  } catch {
    // privát mód: újratöltéskor új szoba lesz
  }
}

export function ScreenPage() {
  const [room, setRoom] = useState<string | null>(readRoom);
  const [phoneConnected, setPhoneConnected] = useState(false);
  const [replaced, setReplaced] = useState(false);
  const [taps, setTaps] = useState(0);
  const [lastEvent, setLastEvent] = useState<string | null>(null);

  const { status } = useGameSocket(
    () => ({ t: "host", room: room ?? undefined }),
    (msg: ServerMsg, socket) => {
      switch (msg.t) {
        case "hosted":
          setRoom(msg.room);
          saveRoom(msg.room);
          break;
        case "peer":
          setPhoneConnected(msg.connected);
          break;
        case "error":
          if (msg.code === "replaced") {
            setReplaced(true);
            socket.close();
          }
          break;
        case "tap":
          setTaps((n) => n + 1);
          setLastEvent("Gomb megnyomva");
          break;
        case "spell":
          setLastEvent(`Varázslat: ${msg.id}`);
          break;
      }
    },
  );

  const controllerUrl = room ? `${location.origin}/c?room=${room}` : null;
  const isLocalhost = ["localhost", "127.0.0.1"].includes(location.hostname);
  const serverOk = status === "open";

  return (
    <main className="screen">
      <header className="screen__bar">
        <h1 className="title">Drawn Magic</h1>
        <div className="screen__status">
          <StatusDot
            tone={serverOk ? "ok" : status === "connecting" ? "wait" : "bad"}
            label={serverOk ? "Szerver" : status === "connecting" ? "Csatlakozás…" : "Nincs szerver"}
          />
          <StatusDot
            tone={serverOk && phoneConnected ? "ok" : "wait"}
            label={serverOk && phoneConnected ? "Telefon csatlakozva" : "Telefonra vár"}
          />
        </div>
      </header>

      {replaced ? (
        <section className="card card--center">
          <p>Ez a szoba egy másik ablakban nyílt meg.</p>
          <button className="btn" onClick={() => location.reload()}>
            Átvétel
          </button>
        </section>
      ) : phoneConnected ? (
        <section className="card card--center">
          <p className="muted">Gombnyomások a telefonról</p>
          <p className="counter">{taps}</p>
          <p>{lastEvent ?? "Nyomd meg a gombot a telefonon!"}</p>
        </section>
      ) : (
        <section className="card card--center">
          {controllerUrl ? (
            <>
              <div className="qr">
                <QRCodeSVG value={controllerUrl} size={260} marginSize={2} />
              </div>
              <p className="room-code">{room}</p>
              <p className="muted">Olvasd be a QR-kódot a telefonoddal</p>
              {isLocalhost && (
                <p className="warn">
                  A telefon nem éri el a localhostot. Nyisd meg ezt az oldalt a tunnel címén
                  (<code>npm run tunnel</code>).
                </p>
              )}
            </>
          ) : (
            <p className="muted">Szoba létrehozása…</p>
          )}
        </section>
      )}
    </main>
  );
}
