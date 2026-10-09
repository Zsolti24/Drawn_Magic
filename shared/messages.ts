// Közös üzenettípusok a kliens (képernyő, telefon) és a szerver között.

export const ROOM_CODE_LENGTH = 4;
// Félreérthető karakterek (0/O, 1/I) nélkül
export const ROOM_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function isRoomCode(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length === ROOM_CODE_LENGTH &&
    [...value].every((ch) => ROOM_CODE_ALPHABET.includes(ch))
  );
}

/** Telefon → képernyő. Csak események, nem folyamatos adat. */
export type ControllerEvent =
  | { t: "spell"; id: string } // felismert jel
  | { t: "restart" }; // új játék a játék vége után

/** A játék állapota a képernyőn ("lobby" = a menükben van) */
export type GamePhase = "lobby" | "countdown" | "playing" | "paused" | "over";

/** Képernyő → telefon visszajelzések. */
export type ScreenEvent =
  | { t: "feedback"; kind: "hit"; count: number } // ennyi ellenfél pusztult el
  | { t: "feedback"; kind: "no_mana" | "cooldown" | "hurt" }
  // spells: a használható varázslatok azonosítói, hogy a telefon tudja, mit lehet rajzolni
  | { t: "phase"; phase: GamePhase; score: number; spells: string[] };

/** Kliens → szerver */
export type ClientMsg =
  | { t: "host"; room?: string } // képernyő: új szoba, vagy a régi visszakérése
  | { t: "join"; room: string } // telefon: csatlakozás szobához
  | ControllerEvent
  | ScreenEvent;

export type ErrorCode =
  | "room_not_found" // nincs ilyen szoba
  | "replaced" // egy újabb kapcsolat átvette a helyedet
  | "bad_message";

/** Szerver → kliens */
export type ServerMsg =
  | { t: "hosted"; room: string }
  | { t: "joined"; room: string }
  | { t: "peer"; connected: boolean } // a másik fél (telefon / képernyő) állapota
  | { t: "error"; code: ErrorCode }
  | ControllerEvent
  | ScreenEvent;

export const CONTROLLER_EVENTS: ReadonlySet<string> = new Set(["spell", "restart"]);
export const SCREEN_EVENTS: ReadonlySet<string> = new Set(["feedback", "phase"]);
