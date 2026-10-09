// A képernyő kapcsolata a szerverrel és a telefonnal. Az egész képernyő-oldal
// alatt egyetlen kapcsolat él, így a menük között váltva sem szakad meg.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { ControllerEvent, GamePhase, ScreenEvent, ServerMsg } from "@shared/messages";
import { usableSpells, useProfile } from "../profile/profile";
import { useGameSocket } from "../net/useGameSocket";
import type { ConnStatus } from "../net/GameSocket";

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

interface ConnectionValue {
  status: ConnStatus;
  room: string | null;
  phoneConnected: boolean;
  /** Egy másik ablak vette át a szobát */
  replaced: boolean;
  /** A telefon címe (a QR-kódba) */
  controllerUrl: string | null;
  send: (msg: ScreenEvent) => void;
  /** Mit lásson a telefon a játék állapotáról (a menükben "lobby") */
  setPhoneState: (state: PhoneState) => void;
  /** Feliratkozás a telefon eseményeire; a visszaadott függvény leiratkoztat */
  onControllerEvent: (handler: (event: ControllerEvent) => void) => () => void;
}

export interface PhoneState {
  phase: GamePhase;
  score: number;
}

const MENU_STATE: PhoneState = { phase: "lobby", score: 0 };

const ConnectionContext = createContext<ConnectionValue | null>(null);

export function ConnectionProvider({ children }: { children: ReactNode }) {
  const [room, setRoom] = useState<string | null>(readRoom);
  const [phoneConnected, setPhoneConnected] = useState(false);
  const [replaced, setReplaced] = useState(false);
  const [phoneState, setPhoneState] = useState<PhoneState>(MENU_STATE);
  const handlers = useRef(new Set<(event: ControllerEvent) => void>());
  const { profile } = useProfile();

  const { status, socketRef } = useGameSocket(
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
        case "spell":
        case "restart":
          for (const handler of handlers.current) handler(msg);
          break;
      }
    },
  );

  const send = useCallback((msg: ScreenEvent) => socketRef.current?.send(msg), [socketRef]);
  const onControllerEvent = useCallback((handler: (event: ControllerEvent) => void) => {
    handlers.current.add(handler);
    return () => {
      handlers.current.delete(handler);
    };
  }, []);

  // A telefon mindig tudja, hol tart a képernyő és mely varázslatok használhatók (újracsatlakozás után is)
  const spellsKey = usableSpells(profile)
    .map((s) => s.id)
    .join(",");
  useEffect(() => {
    if (status !== "open" || !phoneConnected) return;
    send({
      t: "phase",
      phase: phoneState.phase,
      score: phoneState.score,
      spells: spellsKey.split(",").filter(Boolean),
    });
  }, [status, phoneConnected, phoneState, spellsKey, send]);

  const value = useMemo<ConnectionValue>(
    () => ({
      status,
      room,
      phoneConnected: status === "open" && phoneConnected,
      replaced,
      controllerUrl: room ? `${location.origin}/c?room=${room}` : null,
      send,
      setPhoneState,
      onControllerEvent,
    }),
    [status, room, phoneConnected, replaced, send, onControllerEvent],
  );
  return <ConnectionContext.Provider value={value}>{children}</ConnectionContext.Provider>;
}

export function useConnection() {
  const ctx = useContext(ConnectionContext);
  if (!ctx) throw new Error("useConnection csak ConnectionProvider-en belül használható");
  return ctx;
}

/** A telefon eseményei, amíg a komponens látszik */
export function useControllerEvents(handler: (event: ControllerEvent) => void) {
  const { onControllerEvent } = useConnection();
  const ref = useRef(handler);
  ref.current = handler;
  useEffect(() => onControllerEvent((e) => ref.current(e)), [onControllerEvent]);
}
