// Fiókok és bejelentkezés. Egyelőre a böngészőben tároljuk (a 3. fázisban a
// szerver / Supabase veszi át); a felület csak az AuthValue-t ismeri, így a
// tárolás később kicserélhető anélkül, hogy az oldalakhoz hozzá kellene nyúlni.
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

interface Account {
  id: string;
  email: string;
  salt: string;
  hash: string;
  /** A jelszó-lenyomat módja (titkosítási API csak biztonságos kapcsolaton van) */
  algo: "pbkdf2" | "simple";
  createdAt: number;
}

/** Beépített admin fiók (admin / admin): minden böngészőben és minden verzióban működik, regisztráció nélkül,
 *  és minden mentésében mindig minden pálya, varázslat és ruha fel van oldva. Ezt a fiókot meg kell tartani. */
export const UNLOCK_ALL_ACCOUNT = { id: "unlock-all", email: "admin", password: "admin" };

/** Ez a teszt fiók-e (mindent feloldó) */
export function isUnlockAll(session: Session | null) {
  return session?.accountId === UNLOCK_ALL_ACCOUNT.id;
}

export interface Session {
  accountId: string;
  email: string;
}

interface AuthValue {
  session: Session | null;
  /** Hibaüzenet, vagy null, ha sikerült */
  login: (email: string, password: string, remember: boolean) => Promise<string | null>;
  register: (email: string, password: string, remember: boolean) => Promise<string | null>;
  logout: () => void;
  /** A kiválasztott mentéshely (null: még nincs kiválasztva) */
  slot: number | null;
  selectSlot: (slot: number | null) => void;
}

const ACCOUNTS_KEY = "drawn-magic:accounts";
const SESSION_KEY = "drawn-magic:session";
// A mentéshely csak erre a fülre szól: új megnyitáskor újra a játékmód-választó jön
const SLOT_KEY = "drawn-magic:slot";

export const MIN_PASSWORD = 6;

function readJson<T>(storage: Storage | undefined, key: string): T | null {
  try {
    const raw = storage?.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeJson(storage: Storage | undefined, key: string, value: unknown) {
  try {
    if (value === null) storage?.removeItem(key);
    else storage?.setItem(key, JSON.stringify(value));
  } catch {
    // privát mód: csak erre a munkamenetre marad meg
  }
}

const local = typeof localStorage === "undefined" ? undefined : localStorage;
const session = typeof sessionStorage === "undefined" ? undefined : sessionStorage;

function loadAccounts(): Account[] {
  return readJson<Account[]>(local, ACCOUNTS_KEY) ?? [];
}

function loadSession(): Session | null {
  return readJson<Session>(local, SESSION_KEY) ?? readJson<Session>(session, SESSION_KEY);
}

function loadSlot(accountId: string | undefined): number | null {
  const saved = readJson<{ accountId: string; slot: number }>(session, SLOT_KEY);
  return saved && saved.accountId === accountId ? saved.slot : null;
}

function randomId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

function toHex(bytes: ArrayBuffer) {
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Jelszó-lenyomat sóval. Biztonságos kapcsolaton PBKDF2, különben (pl. sima http a wifin) egyszerű kevert lenyomat. */
async function hashPassword(password: string, salt: string, algo: Account["algo"]): Promise<string> {
  if (algo === "pbkdf2") {
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
    const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt: enc.encode(salt), iterations: 120_000, hash: "SHA-256" }, key, 256);
    return toHex(bits);
  }
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  const text = `${salt}:${password}`;
  for (let round = 0; round < 2000; round++) {
    for (let i = 0; i < text.length; i++) {
      h1 = Math.imul(h1 ^ text.charCodeAt(i), 0x01000193);
      h2 = Math.imul(h2 ^ (text.charCodeAt(i) + round), 0x5bd1e995);
    }
  }
  return (h1 >>> 0).toString(16).padStart(8, "0") + (h2 >>> 0).toString(16).padStart(8, "0");
}

const canPbkdf2 = () => typeof crypto !== "undefined" && !!crypto.subtle;

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [current, setCurrent] = useState<Session | null>(loadSession);
  const [slot, setSlot] = useState<number | null>(() => loadSlot(loadSession()?.accountId));

  const start = useCallback((account: Account, remember: boolean) => {
    const next: Session = { accountId: account.id, email: account.email };
    writeJson(remember ? local : session, SESSION_KEY, next);
    setCurrent(next);
    setSlot(loadSlot(account.id));
  }, []);

  const login = useCallback(
    async (email: string, password: string, remember: boolean) => {
      // A beépített teszt fiók nincs a tárolt fiókok között
      if (normalizeEmail(email) === UNLOCK_ALL_ACCOUNT.email) {
        if (password !== UNLOCK_ALL_ACCOUNT.password) return "Hibás jelszó.";
        start({ id: UNLOCK_ALL_ACCOUNT.id, email: UNLOCK_ALL_ACCOUNT.email, salt: "", hash: "", algo: "simple", createdAt: 0 }, remember);
        return null;
      }
      const account = loadAccounts().find((a) => a.email === normalizeEmail(email));
      if (!account) return "Nincs fiók ezzel az e-mail címmel.";
      if (account.algo === "pbkdf2" && !canPbkdf2()) return "Ezen a kapcsolaton nem lehet belépni (biztonságos, https kapcsolat kell).";
      const hash = await hashPassword(password, account.salt, account.algo);
      if (hash !== account.hash) return "Hibás jelszó.";
      start(account, remember);
      return null;
    },
    [start],
  );

  const register = useCallback(
    async (email: string, password: string, remember: boolean) => {
      if (!isValidEmail(email)) return "Adj meg egy érvényes e-mail címet.";
      if (password.length < MIN_PASSWORD) return `A jelszó legalább ${MIN_PASSWORD} karakter legyen.`;
      const accounts = loadAccounts();
      const normalized = normalizeEmail(email);
      if (normalized === UNLOCK_ALL_ACCOUNT.email || accounts.some((a) => a.email === normalized)) return "Ezzel az e-mail címmel már van fiók. Jelentkezz be.";
      const salt = randomId();
      const algo: Account["algo"] = canPbkdf2() ? "pbkdf2" : "simple";
      const account: Account = { id: randomId(), email: normalized, salt, algo, hash: await hashPassword(password, salt, algo), createdAt: Date.now() };
      writeJson(local, ACCOUNTS_KEY, [...accounts, account]);
      start(account, remember);
      return null;
    },
    [start],
  );

  const logout = useCallback(() => {
    writeJson(local, SESSION_KEY, null);
    writeJson(session, SESSION_KEY, null);
    writeJson(session, SLOT_KEY, null);
    setCurrent(null);
    setSlot(null);
  }, []);

  const selectSlot = useCallback(
    (next: number | null) => {
      writeJson(session, SLOT_KEY, next === null || !current ? null : { accountId: current.accountId, slot: next });
      setSlot(next);
    },
    [current],
  );

  const value = useMemo(() => ({ session: current, login, register, logout, slot, selectSlot }), [current, login, register, logout, slot, selectSlot]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth csak AuthProvider-en belül használható");
  return ctx;
}
