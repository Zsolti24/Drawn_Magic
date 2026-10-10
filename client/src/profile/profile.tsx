// A játékos profilja (egy mentés): kinézet, megtanult varázslatok, haladás.
// Fiókonként több mentéshely van; egyelőre a böngészőben mentjük, a 3. fázisban
// a szerver (Supabase) veszi át.
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { DEFAULT_LOOK, GEAR, STARTING_ITEMS, itemKey, type GearSlot, type WizardLook } from "../data/wizardParts";
import { SPELLS } from "../data/spells";
import { LEVELS } from "../data/levels";
import { NO_STATS, type StatPoints } from "../data/stats";

export interface Profile {
  look: WizardLook;
  /** Megtanult varázslatok: ezek mind használhatók a játékban */
  unlockedSpells: string[];
  level: number;
  xp: number;
  gold: number;
  bestScores: Record<string, number>;
  /** Teljesített pályák: mindegyik feloldja a következőt */
  completedLevels: string[];
  /** Feloldott tárgyak ("hely:azonosító") */
  unlockedItems: string[];
  /** Elosztott statpontok statonként */
  stats: StatPoints;
  /** Még el nem osztott statpontok */
  statPoints: number;
  /** Az utolsó mentés ideje (ms), a mentésválasztóhoz */
  savedAt?: number;
  /** A mentés formátumának verziója (lásd PROFILE_VERSION) */
  version?: number;
}

/** Ennyi varázslatot ismer a mágus kezdéskor (a képességtár elejéről) */
export const STARTING_SPELLS = 3;

/** A mentés formátuma. 2: a feloldások már valódiak (az 1-es mentésekben még minden ideiglenesen nyitva volt) */
const PROFILE_VERSION = 2;

export const DEFAULT_PROFILE: Profile = {
  look: DEFAULT_LOOK,
  // Kezdéskor csak az első 3 varázslat ismert, a többit meg kell tanulni
  unlockedSpells: SPELLS.slice(0, STARTING_SPELLS).map((s) => s.id),
  level: 1,
  xp: 0,
  gold: 0,
  bestScores: {},
  completedLevels: [],
  unlockedItems: STARTING_ITEMS,
  stats: NO_STATS,
  statPoints: 0,
};

/** Ennyi mentéshely van fiókonként */
export const SAVE_SLOTS = 3;

/** A fiókok előtti, egyetlen mentés helye: az első belépéskor átkerül a fiók első mentéshelyére */
const LEGACY_KEY = "drawn-magic:profile";

export function saveKey(accountId: string, slot: number) {
  return `drawn-magic:save:${accountId}:${slot}`;
}

/** Egy mentés beolvasása (null: üres hely). A hiányzó vagy elavult mezőket kiegészíti. */
export function readSave(key: string): Profile | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    // A régi mentés "loadout" mezője (3 felszerelési hely) már nem kell
    const { loadout: _unused, ...saved } = JSON.parse(raw) as Partial<Profile> & { loadout?: unknown };
    const known = new Set(SPELLS.map((s) => s.id));
    // Régi mentés: a feloldások alapra állnak (a haladás, szint, arany, statok megmaradnak)
    if ((saved.version ?? 1) < PROFILE_VERSION) {
      saved.unlockedSpells = [];
      saved.unlockedItems = [];
    }
    const unlockedSpells = [...new Set([...DEFAULT_PROFILE.unlockedSpells, ...(saved.unlockedSpells ?? [])])].filter((id) =>
      known.has(id),
    );
    const unlockedItems = [...new Set([...STARTING_ITEMS, ...(saved.unlockedItems ?? [])])];
    return {
      ...DEFAULT_PROFILE,
      ...saved,
      look: onlyUnlocked({ ...DEFAULT_LOOK, ...saved.look }, unlockedItems),
      unlockedSpells,
      bestScores: { ...saved.bestScores },
      completedLevels: Array.isArray(saved.completedLevels) ? saved.completedLevels : [],
      unlockedItems,
      stats: { ...NO_STATS, ...saved.stats },
      statPoints: Math.max(0, saved.statPoints ?? 0),
    };
  } catch {
    return null;
  }
}

export function writeSave(key: string, profile: Profile): Profile {
  const stamped = { ...profile, savedAt: Date.now(), version: PROFILE_VERSION };
  try {
    localStorage.setItem(key, JSON.stringify(stamped));
  } catch {
    // privát mód: csak erre a munkamenetre marad meg
  }
  return stamped;
}

export function deleteSave(key: string) {
  try {
    localStorage.removeItem(key);
  } catch {
    // nincs mit törölni
  }
}

/** A fiók mentései helyenként (null: üres). A fiókok előtti mentést az első üres fióknál átveszi. */
export function listSaves(accountId: string): (Profile | null)[] {
  const saves = Array.from({ length: SAVE_SLOTS }, (_, i) => readSave(saveKey(accountId, i)));
  const legacy = readSave(LEGACY_KEY);
  if (legacy && !saves.some((s) => s !== null)) {
    saves[0] = writeSave(saveKey(accountId, 0), legacy);
    deleteSave(LEGACY_KEY);
  }
  return saves;
}

/** Minden feloldva: mind a pályák, a varázslatok és a ruhák (a teszt fióknál mindig így van) */
export function applyUnlockAll(profile: Profile): Profile {
  const allItems = (Object.keys(GEAR) as GearSlot[]).flatMap((slot) => GEAR[slot].map((item) => itemKey(slot, item.id)));
  return {
    ...profile,
    unlockedSpells: SPELLS.map((s) => s.id),
    unlockedItems: allItems,
    completedLevels: [...new Set([...profile.completedLevels, ...LEVELS.map((l) => l.id)])],
  };
}

/** A lezárt (vagy már nem létező) tárgyak helyére az alapfelszerelés kerül */
function onlyUnlocked(look: WizardLook, unlocked: string[]): WizardLook {
  const fixed = { ...look };
  for (const slot of Object.keys(GEAR) as GearSlot[]) {
    const id = fixed[slot];
    if (id !== null && !unlocked.includes(itemKey(slot, id))) fixed[slot] = DEFAULT_LOOK[slot] as string;
  }
  return fixed;
}

export function isUnlocked(profile: Profile, slot: GearSlot, id: string) {
  return profile.unlockedItems.includes(itemKey(slot, id));
}

interface ProfileContextValue {
  profile: Profile;
  update: (change: (p: Profile) => Profile) => void;
  reset: () => void;
}

const ProfileContext = createContext<ProfileContextValue | null>(null);

/** A kiválasztott mentés: minden változás azonnal a storageKey helyre mentődik.
 *  unlockAll: mindig minden fel van oldva (betöltéskor és minden változásnál is) */
export function ProfileProvider({ storageKey, unlockAll = false, children }: { storageKey: string; unlockAll?: boolean; children: ReactNode }) {
  const fix = useCallback((p: Profile) => (unlockAll ? applyUnlockAll(p) : p), [unlockAll]);
  const [profile, setProfile] = useState<Profile>(() => writeSave(storageKey, fix(readSave(storageKey) ?? DEFAULT_PROFILE)));

  const update = useCallback(
    (change: (p: Profile) => Profile) => {
      setProfile((p) => writeSave(storageKey, fix(change(p))));
    },
    [storageKey, fix],
  );

  const reset = useCallback(() => {
    setProfile(writeSave(storageKey, fix(DEFAULT_PROFILE)));
  }, [storageKey, fix]);

  const value = useMemo(() => ({ profile, update, reset }), [profile, update, reset]);
  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfile() {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error("useProfile csak ProfileProvider-en belül használható");
  return ctx;
}

/** A használható (megtanult) varázslatok, a képességtár sorrendjében */
export function usableSpells(profile: Profile) {
  return SPELLS.filter((s) => profile.unlockedSpells.includes(s.id));
}
