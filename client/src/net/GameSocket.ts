import type { ClientMsg, ServerMsg } from "@shared/messages";

export type ConnStatus = "connecting" | "open" | "closed";

interface Options {
  /** Minden (újra)csatlakozáskor elküldött első üzenet: host vagy join */
  hello: () => ClientMsg;
  onMessage: (msg: ServerMsg) => void;
  onStatus: (status: ConnStatus) => void;
}

const MIN_RETRY_MS = 500;
const MAX_RETRY_MS = 5000;

function socketUrl() {
  const proto = location.protocol === "https:" ? "wss" : "ws";
  return `${proto}://${location.host}/ws`;
}

/** WebSocket kliens automatikus újracsatlakozással. */
export class GameSocket {
  private ws?: WebSocket;
  private retryMs = MIN_RETRY_MS;
  private retryTimer?: number;
  private stopped = false;
  private readonly opts: Options;

  constructor(opts: Options) {
    this.opts = opts;
    document.addEventListener("visibilitychange", this.onVisibility);
    window.addEventListener("online", this.reconnectNow);
    this.connect();
  }

  send(msg: ClientMsg) {
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(msg));
  }

  /** Végleges leállítás, nincs több újrapróbálkozás. */
  close() {
    this.stopped = true;
    clearTimeout(this.retryTimer);
    document.removeEventListener("visibilitychange", this.onVisibility);
    window.removeEventListener("online", this.reconnectNow);
    this.ws?.close();
    this.opts.onStatus("closed");
  }

  private connect() {
    if (this.stopped) return;
    this.opts.onStatus("connecting");
    const ws = new WebSocket(socketUrl());
    this.ws = ws;

    ws.onopen = () => {
      this.retryMs = MIN_RETRY_MS;
      this.opts.onStatus("open");
      this.send(this.opts.hello());
    };
    ws.onmessage = (e) => {
      try {
        this.opts.onMessage(JSON.parse(e.data));
      } catch (err) {
        console.warn("Hibás üzenet", err);
      }
    };
    ws.onclose = () => {
      if (this.ws !== ws || this.stopped) return;
      this.opts.onStatus("closed");
      this.scheduleRetry();
    };
  }

  private scheduleRetry() {
    clearTimeout(this.retryTimer);
    this.retryTimer = window.setTimeout(() => this.connect(), this.retryMs);
    this.retryMs = Math.min(this.retryMs * 2, MAX_RETRY_MS);
  }

  private reconnectNow = () => {
    if (this.stopped) return;
    const state = this.ws?.readyState;
    if (state === WebSocket.OPEN || state === WebSocket.CONNECTING) return;
    clearTimeout(this.retryTimer);
    this.retryMs = MIN_RETRY_MS;
    this.connect();
  };

  // A telefon feloldása után azonnal próbáljon újra, ne várja ki a késleltetést
  private onVisibility = () => {
    if (document.visibilityState === "visible") this.reconnectNow();
  };
}
