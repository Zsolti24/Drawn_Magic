import { WebSocketServer, WebSocket, type RawData } from "ws";
import {
  CONTROLLER_EVENTS,
  ROOM_CODE_ALPHABET,
  ROOM_CODE_LENGTH,
  SCREEN_EVENTS,
  isRoomCode,
  type ClientMsg,
  type ServerMsg,
} from "../shared/messages";

const PORT = Number(process.env.PORT ?? 3001);
const HEARTBEAT_MS = 15_000;
// Ennyi ideig marad meg a szoba, ha a képernyő lecsatlakozott (pl. újratöltés)
const ROOM_GRACE_MS = 5 * 60_000;

interface Client {
  ws: WebSocket;
  alive: boolean;
  role?: "host" | "controller";
  room?: Room;
}

interface Room {
  code: string;
  host?: Client;
  controller?: Client;
  expireTimer?: NodeJS.Timeout;
}

const rooms = new Map<string, Room>();

function send(client: Client | undefined, msg: ServerMsg) {
  if (client && client.ws.readyState === WebSocket.OPEN) {
    client.ws.send(JSON.stringify(msg));
  }
}

function newRoomCode(): string {
  for (;;) {
    let code = "";
    for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
      code += ROOM_CODE_ALPHABET[Math.floor(Math.random() * ROOM_CODE_ALPHABET.length)];
    }
    if (!rooms.has(code)) return code;
  }
}

function getOrCreateRoom(code: string): Room {
  let room = rooms.get(code);
  if (!room) {
    room = { code };
    rooms.set(code, room);
  }
  return room;
}

function scheduleExpiry(room: Room) {
  clearTimeout(room.expireTimer);
  room.expireTimer = setTimeout(() => {
    if (room.host) return;
    send(room.controller, { t: "error", code: "room_not_found" });
    room.controller?.ws.close();
    rooms.delete(room.code);
    console.log(`[${room.code}] szoba lejárt`);
  }, ROOM_GRACE_MS);
}

/** Egy szereplő kiléptetése: egy újabb kapcsolat vette át a helyét. */
function evict(old: Client | undefined) {
  if (!old) return;
  old.room = undefined;
  send(old, { t: "error", code: "replaced" });
  old.ws.close();
}

function handleHost(client: Client, requested?: string) {
  // A kért kódot visszaadjuk, ha érvényes: így a képernyő újratöltés vagy
  // szerver-újraindítás után is ugyanabban a szobában marad.
  const code = isRoomCode(requested) ? requested : newRoomCode();
  const room = getOrCreateRoom(code);
  if (room.host !== client) evict(room.host);
  clearTimeout(room.expireTimer);

  room.host = client;
  client.role = "host";
  client.room = room;

  send(client, { t: "hosted", room: code });
  send(client, { t: "peer", connected: !!room.controller });
  send(room.controller, { t: "peer", connected: true });
  console.log(`[${code}] képernyő csatlakozott`);
}

function handleJoin(client: Client, code: string) {
  const room = isRoomCode(code) ? rooms.get(code) : undefined;
  if (!room) {
    send(client, { t: "error", code: "room_not_found" });
    return;
  }
  if (room.controller !== client) evict(room.controller);

  room.controller = client;
  client.role = "controller";
  client.room = room;

  send(client, { t: "joined", room: code });
  send(client, { t: "peer", connected: !!room.host });
  send(room.host, { t: "peer", connected: true });
  console.log(`[${code}] telefon csatlakozott`);
}

function handleMessage(client: Client, data: RawData) {
  let msg: ClientMsg;
  try {
    msg = JSON.parse(data.toString());
    if (typeof msg?.t !== "string") throw new Error();
  } catch {
    send(client, { t: "error", code: "bad_message" });
    return;
  }

  if (msg.t === "host") return handleHost(client, msg.room);
  if (msg.t === "join") return handleJoin(client, msg.room);

  // Események továbbítása a másik félnek
  const room = client.room;
  if (!room) return;
  if (client.role === "controller" && CONTROLLER_EVENTS.has(msg.t)) {
    send(room.host, msg);
  } else if (client.role === "host" && SCREEN_EVENTS.has(msg.t)) {
    send(room.controller, msg);
  }
}

function handleClose(client: Client) {
  const room = client.room;
  if (!room) return;
  if (room.host === client) {
    room.host = undefined;
    send(room.controller, { t: "peer", connected: false });
    scheduleExpiry(room);
    console.log(`[${room.code}] képernyő lecsatlakozott`);
  } else if (room.controller === client) {
    room.controller = undefined;
    send(room.host, { t: "peer", connected: false });
    console.log(`[${room.code}] telefon lecsatlakozott`);
  }
}

const wss = new WebSocketServer({ port: PORT, path: "/ws" });
const clients = new Set<Client>();

wss.on("connection", (ws) => {
  const client: Client = { ws, alive: true };
  clients.add(client);
  ws.on("pong", () => (client.alive = true));
  ws.on("message", (data) => handleMessage(client, data));
  ws.on("close", () => {
    clients.delete(client);
    handleClose(client);
  });
  ws.on("error", (err) => console.warn("ws hiba:", err.message));
});

// Halott kapcsolatok kiszűrése (pl. a telefon lezárt, a TCP kapcsolat félig nyitva maradt)
setInterval(() => {
  for (const client of clients) {
    if (!client.alive) {
      client.ws.terminate();
      continue;
    }
    client.alive = false;
    client.ws.ping();
  }
}, HEARTBEAT_MS);

console.log(`WebSocket szerver: ws://localhost:${PORT}/ws`);
