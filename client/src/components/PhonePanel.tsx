import { useConnection } from "../screen/connection";
import { QrCode } from "./QrCode";
import { StatusDot } from "./StatusDot";

/** A telefon csatlakozásának állapota; ha nincs telefon, QR-kódot mutat */
export function PhonePanel({ qrSize = 168, alwaysShowQr = false }: { qrSize?: number; alwaysShowQr?: boolean }) {
  const { status, phoneConnected, controllerUrl, room } = useConnection();
  const isLocalhost = ["localhost", "127.0.0.1"].includes(location.hostname);
  const showQr = alwaysShowQr || !phoneConnected;

  return (
    <div className="phone-panel">
      <div className="phone-panel__status">
        <StatusDot
          tone={status === "open" ? "ok" : status === "connecting" ? "wait" : "bad"}
          label={status === "open" ? "Szerver" : status === "connecting" ? "Csatlakozás…" : "Nincs szerver"}
        />
        <StatusDot tone={phoneConnected ? "ok" : "wait"} label={phoneConnected ? "Telefon csatlakozva" : "Telefonra vár"} />
      </div>
      {showQr && controllerUrl ? (
        <>
          <div className="qr">
            <QrCode value={controllerUrl} size={qrSize} />
          </div>
          <p className="room-code room-code--mid">{room}</p>
          <p className="muted small">Olvasd be a telefonoddal, azzal fogsz varázsolni.</p>
          {isLocalhost && (
            <p className="warn small">A telefon nem éri el a localhostot, nyisd meg az oldalt a tunnel címén.</p>
          )}
        </>
      ) : showQr ? (
        <p className="muted small">Szoba létrehozása…</p>
      ) : (
        <p className="muted small">Rajzolj a telefonon a varázsláshoz.</p>
      )}
    </div>
  );
}
