// A játékos profilja: kinézet, felszerelt varázslatok, haladás.
// Egyelőre a böngészőben mentjük; a 3. fázisban a szerver (Supabase) veszi át.
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { DEFAULT_LOOK, GEAR, STARTING_ITEMS, itemKey, type GearSlot, type WizardLook } from "../data/wizardParts";
import { SPELLS } from "../data/spells";

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
}

export const DEFAULT_PROFILE: Profile = {
  look: DEFAULT_LOOK,
  // Egyelőre minden varázslat megtanulva; később a tanulással bővül
  unlockedSpells: SPELLS.map((s) => s.id),
  level: 1,
  xp: 0,
  gold: 0,
  bestScores: {},
  completedLevels: [],
  unlockedItems: STARTING_ITEMS,
};

const STORAGE_KEY = "drawn-magic:profile";

function load(): Profile {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PROFILE;
    // A régi mentés "loadout" mezője (3 felszerelési hely) már nem kell
    const { loadout: _unused, ...saved } = JSON.parse(raw) as Partial<Profile> & { loadout?: unknown };
    const known = new Set(SPELLS.map((s) => s.id));
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
    };
  } catch {
    return DEFAULT_PROFILE;
  }
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

function save(profile: Profile) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch {
    // privát mód: csak erre a munkamenetre marad meg
  }
}

interface ProfileContextValue {
  profile: Profile;
  update: (change: (p: Profile) => Profile) => void;
  reset: () => void;
}

const ProfileContext = createContext<ProfileContextValue | null>(null);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile>(load);

  const update = useCallback((change: (p: Profile) => Profile) => {
    setProfile((p) => {
      const next = change(p);
      save(next);
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    save(DEFAULT_PROFILE);
    setProfile(DEFAULT_PROFILE);
  }, []);

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
