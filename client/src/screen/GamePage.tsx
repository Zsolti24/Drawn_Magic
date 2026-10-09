import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router";
import { Game, type GameEvent } from "../game/Game";
import { LEVEL_BY_ID, isLevelUnlocked, nextLevel, type LevelDef } from "../data/levels";
import { resolveLook } from "../data/wizardParts";
import { usableSpells, useProfile } from "../profile/profile";
import { useConnection, useControllerEvents } from "./connection";
import { PhonePanel } from "../components/PhonePanel";
import { StatusDot } from "../components/StatusDot";
import { GameCanvas } from "./GameCanvas";
import { PauseMenu } from "./PauseMenu";

const COUNTDOWN_SECONDS = 3;

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
  /** Próba telefon nélkül: a számbillentyűkkel lehet varázsolni */
  const [keyboardMode, setKeyboardMode] = useState(false);

  const gameRef = useRef<Game | null>(null);
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
        case "won":
        case "over": {
          const win = event.type === "won";
          setWon(win);
          if (win) {
            update((p) =>
              p.completedLevels.includes(level.id) ? p : { ...p, completedLevels: [...p.completedLevels, level.id] },
            );
          }
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
    const game = new Game(spells, handleGameEvent, level.config);
    game.input = moveVector(heldKeys.current);
    gameRef.current = game;
    setFinalScore(0);
    setNewRecord(false);
    setWon(false);
    setPhase("countdown");
  }, [spells, handleGameEvent, level]);

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

  const resume = useCallback(() => {
    if (controllerActive) setPhase("countdown");
    else setPauseReason("phone");
  }, [controllerActive]);

  // Billentyűk: WASD / nyilak = mozgás, 1–9 = varázslat, Esc = szünet, Enter = új játék
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
      const index = Number(e.key) - 1;
      if (index >= 0 && index < spells.length) castSpell(spells[index].glyph);
      if (e.key === "Enter" && phaseRef.current === "over") startNewGame();
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
  }, [castSpell, startNewGame, resume, spells]);

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
          running={phase === "playing" || phase === "over"}
          onMenu={() => {
            if (phaseRef.current === "playing" || phaseRef.current === "countdown") {
              setPauseReason("menu");
              setPhase("paused");
            }
          }}
        />
      )}
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
                Indítás telefon nélkül (1–9 billentyűk)
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
        <div className="overlay overlay--dim">
          <section className="card card--center">
            <h2 className={won ? "win-title" : undefined}>{won ? "Pálya teljesítve!" : "Elbuktál"}</h2>
            {newRecord && <p className="record">Új rekord!</p>}
            <p className="counter">{finalScore}</p>
            <p className="muted">pont</p>
            {won && next ? (
              <button className="btn btn--big" onClick={() => navigate(`/play/${next.id}`)}>
                Következő pálya: {next.code}
              </button>
            ) : (
              <button className="btn btn--big" onClick={startNewGame}>
                {won ? "Újra" : "Újrapróbálom"}
              </button>
            )}
            <div className="row">
              {won && next && (
                <button className="btn btn--ghost" onClick={startNewGame}>
                  Újra
                </button>
              )}
              <button className="btn btn--ghost" onClick={() => navigate("/levels")}>
                Pályaválasztás
              </button>
              <button className="btn btn--ghost" onClick={() => navigate("/")}>
                Főmenü
              </button>
            </div>
            <p className="muted small">Az újrakezdés a telefonról is indítható.</p>
          </section>
        </div>
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
