import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router";
import { Game, type GameEvent } from "../game/Game";
import { LEVEL_BY_ID, isLevelUnlocked, nextLevel, type LevelDef } from "../data/levels";
import { gearBonus, lootableItems, resolveLook } from "../data/wizardParts";
import { addStats, gainXp, levelRewards, statConfig, xpToNext } from "../data/stats";
import type { PlayerHud } from "../game/render";
import { usableSpells, useProfile } from "../profile/profile";
import { useConnection, useControllerEvents } from "./connection";
import { PhonePanel } from "../components/PhonePanel";
import { StatusDot } from "../components/StatusDot";
import { GameCanvas } from "./GameCanvas";
import { PauseMenu } from "./PauseMenu";
import { ResultsMenu, type Reward } from "./ResultsMenu";
import { LootToasts, type LootToastData } from "../components/LootToast";

const COUNTDOWN_SECONDS = 3;
/** Ennyi ideig látszik egy új tárgy értesítése (ms); a CSS animáció ehhez igazodik */
const LOOT_TOAST_MS = 5200;

/** Mozgás billentyűi: irány tengelyenként */
const MOVE_KEYS: Record<string, [number, number]> = {
  KeyW: [0, -1],
  KeyS: [0, 1],
  KeyA: [-1, 0],
  KeyD: [1, 0],
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
};

/** Varázslás billentyűzetről (próba telefon nélkül), a képességtár sorrendjében: 1–0, majd Z X C V B */
const SPELL_KEYS = [
  "Digit1",
  "Digit2",
  "Digit3",
  "Digit4",
  "Digit5",
  "Digit6",
  "Digit7",
  "Digit8",
  "Digit9",
  "Digit0",
  "KeyZ",
  "KeyX",
  "KeyC",
  "KeyV",
  "KeyB",
];

/** waiting: még nincs irányító; paused: szünet (a telefon elment vagy Esc) */
type Phase = "waiting" | "countdown" | "playing" | "paused" | "over";
type PauseReason = "phone" | "menu";

export function GamePage() {
  const { levelId } = useParams();
  const level = levelId ? LEVEL_BY_ID.get(levelId) : undefined;
  const { profile } = useProfile();
  if (!level || !isLevelUnlocked(level.id, profile.completedLevels)) return <Navigate to="/levels" replace />;
  return <GameSession key={level.id} level={level} />;
}

function GameSession({ level }: { level: LevelDef }) {
  const navigate = useNavigate();
  const { profile, update } = useProfile();
  const { status, phoneConnected, send, setPhoneState } = useConnection();
  const spells = useMemo(() => usableSpells(profile), [profile]);
  const look = useMemo(() => resolveLook(profile.look), [profile.look]);

  const [phase, setPhase] = useState<Phase>("waiting");
  const [pauseReason, setPauseReason] = useState<PauseReason>("phone");
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
  const [finalScore, setFinalScore] = useState(0);
  const [newRecord, setNewRecord] = useState(false);
  /** A pálya teljesítve (nem elbukva ért véget) */
  const [won, setWon] = useState(false);
  const wonRef = useRef(won);
  wonRef.current = won;
  /** Próba telefon nélkül: a számbillentyűkkel lehet varázsolni */
  const [keyboardMode, setKeyboardMode] = useState(false);

  /** A pálya végén kapott jutalom (az eredményképernyőhöz) */
  const [reward, setReward] = useState<Reward | null>(null);
  const profileRef = useRef(profile);
  profileRef.current = profile;
  /** A szint és az XP a pálya indulásakor (a HUD ehhez adja hozzá a pályán gyűjtött XP-t) */
  const [playerAtStart, setPlayerAtStart] = useState<PlayerHud>(() => ({
    level: profile.level,
    xp: profile.xp,
    xpNext: xpToNext(profile.level),
  }));

  const gameRef = useRef<Game | null>(null);
  /** Új tárgy értesítések a jobb felső sarokban */
  const [toasts, setToasts] = useState<LootToastData[]>([]);
  const toastId = useRef(0);
  /** Azok a játékok, amelyek XP-je már a profilba került (hogy ne számoljuk kétszer) */
  const banked = useRef(new WeakSet<Game>());
  /** Félbehagyott pálya: a felvett XP a profilba kerül (bónusz és arany nélkül) */
  const bankUnfinished = useCallback(
    (game: Game | null) => {
      if (!game || banked.current.has(game)) return;
      banked.current.add(game);
      if (game.xp <= 0) return;
      update((p) => {
        const next = gainXp(p.level, p.xp, p.statPoints, game.xp);
        return { ...p, level: next.level, xp: next.xp, statPoints: next.statPoints };
      });
    },
    [update],
  );
  const bestRef = useRef(profile.bestScores[level.id] ?? 0);
  bestRef.current = profile.bestScores[level.id] ?? 0;
  const heldKeys = useRef(new Set<string>());
  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  const handleGameEvent = useCallback(
    (event: GameEvent) => {
      switch (event.type) {
        case "kill":
          send({ t: "feedback", kind: "hit", count: event.count });
          break;
        case "no_mana":
          send({ t: "feedback", kind: "no_mana" });
          break;
        case "cooldown":
          send({ t: "feedback", kind: "cooldown" });
          break;
        case "hurt":
          send({ t: "feedback", kind: "hurt" });
          break;
        case "loot": {
          // Felvett tárgy: azonnal a játékosé (az Öltözetben feloldva), és jobb felül értesítés
          update((p) => (p.unlockedItems.includes(event.item) ? p : { ...p, unlockedItems: [...p.unlockedItems, event.item] }));
          const id = ++toastId.current;
          setToasts((list) => [...list, { id, item: event.item }]);
          window.setTimeout(() => setToasts((list) => list.filter((t) => t.id !== id)), LOOT_TOAST_MS);
          break;
        }
        case "won":
        case "over": {
          const win = event.type === "won";
          setWon(win);
          if (win) {
            update((p) =>
              p.completedLevels.includes(level.id) ? p : { ...p, completedLevels: [...p.completedLevels, level.id] },
            );
          }
          // Jutalom: a felvett gyöngyök XP-je, teljesítéskor bónusz XP és arany
          const game = gameRef.current;
          if (game) banked.current.add(game);
          const prize = levelRewards(level.id, game?.xp ?? 0, game?.kills ?? 0, win);
          const before = profileRef.current;
          const after = gainXp(before.level, before.xp, before.statPoints, prize.xp);
          setReward({ ...prize, levelsGained: after.levelsGained, level: after.level });
          update((p) => {
            const next = gainXp(p.level, p.xp, p.statPoints, prize.xp);
            return { ...p, level: next.level, xp: next.xp, statPoints: next.statPoints, gold: p.gold + prize.gold };
          });
          setFinalScore(event.score);
          setPhase("over");
          const record = !level.practice && event.score > bestRef.current;
          setNewRecord(record);
          if (record) update((p) => ({ ...p, bestScores: { ...p.bestScores, [level.id]: event.score } }));
          break;
        }
      }
    },
    [send, update, level.id, level.practice],
  );

  const startNewGame = useCallback(() => {
    // A félbehagyott pályán felvett XP megmarad
    bankUnfinished(gameRef.current);
    // A pálya beállításait a mágus statjai módosítják (élet, mana, sebzés …)
    const game = new Game(spells, handleGameEvent, {
      ...level.config,
      ...statConfig(addStats(profileRef.current.stats, gearBonus(profileRef.current.look))),
      // Csak a még meg nem szerzett ruhák eshetnek le
      lootTable: lootableItems(profileRef.current.unlockedItems),
    });
    game.input = moveVector(heldKeys.current);
    gameRef.current = game;
    // Fejlesztéskor a konzolból elérhető (teszteléshez), az éles buildben nincs benne
    if (import.meta.env.DEV) (window as unknown as { __game?: Game }).__game = game;
    setFinalScore(0);
    setNewRecord(false);
    setWon(false);
    setReward(null);
    const p = profileRef.current;
    setPlayerAtStart({ level: p.level, xp: p.xp, xpNext: xpToNext(p.level) });
    setPhase("countdown");
  }, [spells, handleGameEvent, level, bankUnfinished]);

  const castSpell = useCallback((glyph: string) => {
    if (phaseRef.current === "playing") gameRef.current?.cast(glyph);
  }, []);

  useControllerEvents((event) => {
    if (event.t === "spell") castSpell(event.id);
    if (event.t === "restart" && phaseRef.current === "over") startNewGame();
  });

  // Van-e, aki irányít: ha a telefon elmegy, a játék szünetel
  const controllerActive = keyboardMode || phoneConnected;
  useEffect(() => {
    if (controllerActive) {
      if (phase === "waiting") startNewGame();
      else if (phase === "paused" && pauseReason === "phone") setPhase("countdown");
    } else if (phase === "countdown" || phase === "playing") {
      setPauseReason("phone");
      setPhase("paused");
    }
  }, [controllerActive, phase, pauseReason, startNewGame]);

  useEffect(() => {
    if (phase !== "countdown") return;
    let left = COUNTDOWN_SECONDS;
    setCountdown(left);
    const timer = setInterval(() => {
      left -= 1;
      if (left <= 0) {
        clearInterval(timer);
        setPhase("playing");
      } else {
        setCountdown(left);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [phase]);

  // A telefon tudja, hol tart a játék; kilépéskor visszaáll menüre
  useEffect(() => {
    setPhoneState({ phase: phase === "waiting" ? "lobby" : phase, score: finalScore });
  }, [phase, finalScore, setPhoneState]);
  useEffect(() => () => setPhoneState({ phase: "lobby", score: 0 }), [setPhoneState]);
  // Kilépéskor (menü, pályaválasztás) a félbehagyott pályán felvett XP is megmarad
  useEffect(() => () => bankUnfinished(gameRef.current), [bankUnfinished]);

  const resume = useCallback(() => {
    if (controllerActive) setPhase("countdown");
    else setPauseReason("phone");
  }, [controllerActive]);

  // Billentyűk: WASD / nyilak = mozgás, 1–0 és Z–B = varázslat, Esc = szünet, Enter = új játék
  useEffect(() => {
    const updateInput = () => {
      if (gameRef.current) gameRef.current.input = moveVector(heldKeys.current);
    };
    const onDown = (e: KeyboardEvent) => {
      if (e.code in MOVE_KEYS) {
        e.preventDefault();
        heldKeys.current.add(e.code);
        updateInput();
        return;
      }
      if (e.repeat) return;
      if (e.key === "Escape") {
        if (phaseRef.current === "playing" || phaseRef.current === "countdown") {
          setPauseReason("menu");
          setPhase("paused");
        } else if (phaseRef.current === "paused") {
          resume();
        }
        return;
      }
      const index = SPELL_KEYS.indexOf(e.code);
      if (index >= 0 && index < spells.length) castSpell(spells[index].glyph);
      // Enter: az eredményképernyő elsődleges gombja (győzelem után a következő pálya)
      if (e.key === "Enter" && phaseRef.current === "over") {
        e.preventDefault();
        const following = nextLevel(level.id);
        if (wonRef.current && following) navigate(`/play/${following.id}`);
        else startNewGame();
      }
    };
    const onUp = (e: KeyboardEvent) => {
      heldKeys.current.delete(e.code);
      updateInput();
    };
    // Ha az ablak elveszti a fókuszt, a felengedést nem kapjuk meg
    const onBlur = () => {
      heldKeys.current.clear();
      updateInput();
    };
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
      window.removeEventListener("blur", onBlur);
    };
  }, [castSpell, startNewGame, resume, spells, level.id, navigate]);

  const serverOk = status === "open";
  const next = nextLevel(level.id);

  return (
    <main className="screen screen--game">
      {gameRef.current && (
        <GameCanvas
          gameRef={gameRef}
          spells={spells}
          look={look}
          levelLabel={level.code ?? "Gyakorlás"}
          player={playerAtStart}
          running={phase === "playing" || phase === "over"}
          onMenu={() => {
            if (phaseRef.current === "playing" || phaseRef.current === "countdown") {
              setPauseReason("menu");
              setPhase("paused");
            }
          }}
        />
      )}
      <LootToasts toasts={toasts} />
      <header className="screen__bar screen__bar--overlay">
        <div className="screen__status">
          <StatusDot tone={serverOk ? "ok" : "bad"} label={serverOk ? "Szerver" : "Nincs szerver"} />
          <StatusDot
            tone={phoneConnected ? "ok" : "wait"}
            label={phoneConnected ? "Telefon" : keyboardMode ? "Billentyűzet" : "Telefonra vár"}
          />
        </div>
      </header>

      {phase === "waiting" && (
        <div className="overlay overlay--dim">
          <section className="card card--center">
            <h2>{level.name}</h2>
            <p className="muted">Csatlakoztasd a telefont, és indul a játék.</p>
            <PhonePanel qrSize={200} />
            <div className="row">
              <button className="btn btn--ghost" onClick={() => setKeyboardMode(true)}>
                Indítás telefon nélkül (1–0, Z–B billentyűk)
              </button>
              <Link className="btn btn--ghost" to="/levels">
                Vissza
              </Link>
            </div>
          </section>
        </div>
      )}
      {phase === "countdown" && (
        <div className="overlay">
          <p className="countdown" key={countdown}>
            {countdown}
          </p>
        </div>
      )}
      {phase === "paused" && (
        <PauseMenu
          level={level}
          game={gameRef.current}
          phoneMissing={pauseReason === "phone" && !controllerActive}
          onResume={resume}
          onRestart={startNewGame}
          onLevels={() => navigate("/levels")}
          onExit={() => navigate("/")}
        />
      )}
      {phase === "over" && (
        <ResultsMenu
          level={level}
          game={gameRef.current}
          won={won}
          score={finalScore}
          newRecord={newRecord}
          reward={reward}
          next={next}
          onRetry={startNewGame}
          onNext={() => next && navigate(`/play/${next.id}`)}
          onLevels={() => navigate("/levels")}
          onExit={() => navigate("/")}
          onStats={() => navigate("/stats")}
        />
      )}
    </main>
  );
}

function moveVector(keys: Set<string>) {
  let x = 0;
  let y = 0;
  for (const code of keys) {
    const dir = MOVE_KEYS[code];
    if (!dir) continue;
    x += dir[0];
    y += dir[1];
  }
  return { x, y };
}
