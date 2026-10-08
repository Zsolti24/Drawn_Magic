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
  | { t: "tap" }
  | { t: "spell"; id: string };

/** Képernyő → telefon visszajelzések. */
export type ScreenEvent =
  | { t: "feedback"; kind: "hit" | "miss" | "hurt" };

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

export const CONTROLLER_EVENTS: ReadonlySet<string> = new Set(["tap", "spell"]);
export const SCREEN_EVENTS: ReadonlySet<string> = new Set(["feedback"]);
