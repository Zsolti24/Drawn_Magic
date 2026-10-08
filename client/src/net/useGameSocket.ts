import { useEffect, useRef, useState } from "react";
import type { ClientMsg, ServerMsg } from "@shared/messages";
import { GameSocket, type ConnStatus } from "./GameSocket";

/**
 * React kötés a GameSocket-hez. A hello és az onMessage mindig a legfrissebb
 * függvényt használja, így nem kell újraépíteni a kapcsolatot.
 * Ha a hello null-t ad, nincs kapcsolat.
 */
export function useGameSocket(
  hello: () => ClientMsg | null,
  onMessage: (msg: ServerMsg, socket: GameSocket) => void,
) {
  const [status, setStatus] = useState<ConnStatus>("connecting");
  const socketRef = useRef<GameSocket | null>(null);
  const helloRef = useRef(hello);
  const onMessageRef = useRef(onMessage);
  helloRef.current = hello;
  onMessageRef.current = onMessage;

  const enabled = hello() !== null;

  useEffect(() => {
    if (!enabled) return;
    const socket = new GameSocket({
      hello: () => helloRef.current()!,
      onMessage: (msg) => onMessageRef.current(msg, socket),
      onStatus: setStatus,
    });
    socketRef.current = socket;
    return () => {
      socket.close();
      socketRef.current = null;
    };
  }, [enabled]);

  return { status, socketRef };
}
