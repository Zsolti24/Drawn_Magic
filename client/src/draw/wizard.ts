// A mágus figurája saját rajzolással, cserélhető részekből (kalap, köpeny,
// pálca, amulett). Helyi koordináták: a (0, 0) pont a talpak közepe, a fej
// felfelé (negatív y) van, a figura kb. 3,3 egység magas és jobbra néz.
import type { AmuletDef, HatDef, ResolvedLook, RobeDef, StaffDef } from "../data/wizardParts";

export interface WizardPose {
  /** 1 = jobbra néz, -1 = balra */
  facing: 1 | -1;
  /** Járási fázis (radián), mozgás közben nő */
  walk: number;
  moving: boolean;
  /** Folyamatosan növő idő (mp) a tétlen animációkhoz */
  time: number;
  /** 0..1, 1 = épp most varázsolt */
  cast: number;
  castColor: string | null;
  /** Melyik varázslat (a hozzá tartozó egyedi mozdulathoz) */
  castKind?: string | null;
  /** Felemelkedés alatt: 0..1, mennyire lángol körülötte az aranyaura (0 = nincs) */
  aura?: number;
}

/** Varázslatonként mennyi ideig tart a mozdulatsor (mp) */
const CAST_DURATIONS: Record<string, number> = {
  fireball: 0.85,
  lightning: 1.0,
  missiles: 0.8,
  shield: 1.0,
  firering: 1.0,
  blink: 0.5,
  tornado: 1.3,
  poison: 1.0,
  heal: 1.3,
  drain: 1.1,
  freeze: 1.15,
  meteor: 1.4,
  blackhole: 1.5,
  ascend: 1.9,
};

const AURA_COLOR = "#fde047";

/** A varázslás mozdulatsorának hossza (mp) */
export function castAnimSeconds(kind: string | null | undefined) {
  return (kind && CAST_DURATIONS[kind]) || 0.9;
}

/** A varázslás közbeni testmozgás */
interface CastMotion {
  /** Előredőlés a talppont körül (radián) */
  lean: number;
  shakeX: number;
  shakeY: number;
  /** Guggolás és nyújtózás */
  squashX: number;
  squashY: number;
  /** A kéz (és vele a pálca) eltolása */
  handX: number;
  handY: number;
  /** Plusz palást- és kalapcsúcs-lendület */
  cape: number;
  hatTip: number;
  /** Izzó szem színe */
  eyeGlow: string | null;
  /** Körbefordulás a függőleges tengely körül (radián) */
  spin: number;
  /** A pálca elforgatása a kéz körül (radián) */
  staffSpin: number;
  /** Ragyogás a test körül */
  glow: string | null;
  /** Utóképek erőssége (0..1) a gyors mozdulatok mögött */
  trail: number;
}

const STILL: CastMotion = {
  lean: 0,
  shakeX: 0,
  shakeY: 0,
  squashX: 1,
  squashY: 1,
  handX: 0,
  handY: 0,
  cape: 0,
  hatTip: 0,
  eyeGlow: null,
  spin: 0,
  staffSpin: 0,
  glow: null,
  trail: 0,
};

const TAU = Math.PI * 2;

/** a-tól b-ig, simítva, a [from, to] szakaszon belül */
function seg(p: number, from: number, to: number) {
  return easeInOut(Math.max(0, Math.min(1, (p - from) / (to - from))));
}

/** Varázslatonként egyedi, több fázisú mozdulatsor. p: 0 = most kezdődik, 1 = vége */
function castMotion(kind: string | null | undefined, p: number, color: string | null, time: number): CastMotion {
  const env = Math.sin(Math.PI * p);
  const tremble = (amount: number) => Math.sin(time * 85) * amount;
  switch (kind) {
    case "fireball": {
      // 1. hátradől és körbeforgatja a pálcát, tüzet gyűjt
      // 2. kitörő előrelendülés utóképekkel  3. visszarándul
      const charge = seg(p, 0, 0.32);
      const lunge = seg(p, 0.3, 0.45);
      const back = seg(p, 0.5, 1);
      const out = lunge * (1 - back);
      return {
        ...STILL,
        lean: -0.16 * charge * (1 - lunge) + 0.34 * out,
        shakeX: tremble(0.015 * charge * (1 - lunge)) + 0.28 * out,
        squashY: 1 - 0.09 * charge * (1 - lunge),
        squashX: 1 + 0.05 * charge * (1 - lunge),
        handX: -0.25 * charge * (1 - lunge) + 0.65 * out,
        handY: -0.25 * charge * (1 - lunge) - 0.1 * out,
        staffSpin: -TAU * charge + 0.6 * out,
        cape: 0.25 * charge * (1 - lunge) - 0.7 * out,
        hatTip: -0.5 * out,
        eyeGlow: color,
        glow: env > 0.1 ? color : null,
        trail: out > 0.05 ? 1 : 0,
      };
    }
    case "lightning": {
      // 1. leguggol és erőt gyűjt  2. felemelkedik, a pálcát az égbe tartja, villám csap belé
      // 3. remegve tartja az energiát  4. leszáll
      const crouch = seg(p, 0, 0.22) * (1 - seg(p, 0.22, 0.35));
      const rise = seg(p, 0.22, 0.4) * (1 - seg(p, 0.82, 1));
      const shake = rise * 0.05;
      return {
        ...STILL,
        squashY: 1 - 0.14 * crouch + 0.05 * rise,
        squashX: 1 + 0.08 * crouch,
        shakeX: Math.sin(time * 90) * shake,
        shakeY: -0.4 * rise + Math.cos(time * 77) * shake * 0.6,
        handX: -0.2 * rise,
        handY: 0.15 * crouch - 1.0 * rise,
        cape: Math.sin(time * 40) * 0.25 * rise,
        hatTip: Math.sin(time * 55) * 0.2 * rise,
        eyeGlow: env > 0.15 ? color : null,
        glow: rise > 0.2 ? color : null,
      };
    }
    case "shield": {
      // 1. mélyen leguggol, a pálcát vízszintesen maga elé tartja
      // 2. felpattan és egyszer körbefordul  3. a pálcát a földre csapja
      const crouch = seg(p, 0, 0.28) * (1 - seg(p, 0.28, 0.4));
      const turn = seg(p, 0.3, 0.6);
      const slam = seg(p, 0.58, 0.68) * (1 - seg(p, 0.75, 1));
      return {
        ...STILL,
        squashY: 1 - 0.22 * crouch - 0.1 * slam + 0.06 * (turn * (1 - turn)) * 4,
        squashX: 1 + 0.12 * crouch + 0.06 * slam,
        shakeY: -0.25 * Math.sin(Math.PI * turn),
        spin: TAU * turn,
        staffSpin: (Math.PI / 2) * crouch,
        handX: -0.15 * crouch - 0.25 * slam,
        handY: 0.2 * crouch + 0.25 * slam - 0.4 * Math.sin(Math.PI * turn),
        cape: 0.4 * Math.sin(Math.PI * turn),
        hatTip: 0.2 * env,
        eyeGlow: env > 0.2 ? color : null,
        glow: turn > 0.1 ? color : null,
        trail: turn > 0.05 && turn < 0.95 ? 0.7 : 0,
      };
    }
    case "tornado": {
      // Felemelkedik és háromszor körbepörög, a pálcát vadul forgatja maga körül
      const lift = seg(p, 0, 0.2) * (1 - seg(p, 0.85, 1));
      const turns = seg(p, 0.05, 0.85);
      return {
        ...STILL,
        spin: turns * TAU * 3,
        shakeY: -0.45 * lift + Math.sin(time * 9) * 0.04 * lift,
        staffSpin: p * TAU * 4,
        handX: 0.25 * lift,
        handY: -0.45 * lift,
        squashX: 1 + 0.05 * lift,
        lean: Math.sin(turns * TAU * 3) * 0.08 * lift,
        cape: Math.sin(turns * TAU * 3) * 0.7 * lift,
        hatTip: Math.cos(turns * TAU * 3) * 0.5 * lift,
        eyeGlow: lift > 0.2 ? color : null,
        glow: lift > 0.2 ? color : null,
        trail: lift > 0.3 ? 0.8 : 0,
      };
    }
    case "poison": {
      // 1. rázza a fiolát  2. hátralendül  3. fej fölött elhajítja  4. gonoszul vihog
      const shakeFlask = 1 - seg(p, 0.22, 0.3);
      const windup = seg(p, 0.15, 0.35) * (1 - seg(p, 0.35, 0.45));
      const throwIt = seg(p, 0.35, 0.47) * (1 - seg(p, 0.6, 0.9));
      const cackle = seg(p, 0.5, 0.6) * (1 - seg(p, 0.9, 1));
      return {
        ...STILL,
        lean: -0.18 * windup + 0.24 * throwIt - 0.08 * cackle,
        shakeX: Math.sin(time * 45) * 0.025 * shakeFlask * (p < 0.3 ? 1 : 0),
        shakeY: -Math.abs(Math.sin(time * 26)) * 0.07 * cackle,
        squashY: 1 + Math.abs(Math.sin(time * 26)) * 0.04 * cackle,
        handX: Math.sin(time * 45) * 0.06 * (p < 0.3 ? 1 : 0) - 0.4 * windup + 0.5 * throwIt,
        handY: 0.15 * windup - 0.9 * throwIt,
        cape: 0.3 * windup - 0.5 * throwIt,
        hatTip: -0.35 * throwIt + Math.sin(time * 26) * 0.15 * cackle,
        eyeGlow: color,
        glow: env > 0.15 ? color : null,
        trail: throwIt > 0.1 && throwIt < 0.9 ? 0.8 : 0,
      };
    }
    case "heal": {
      // Lassan felemelkedik, egyszer körbefordul a fényben, a pálcát az égbe tartja
      const lift = seg(p, 0, 0.3) * (1 - seg(p, 0.8, 1));
      return {
        ...STILL,
        shakeY: -0.55 * lift + Math.sin(time * 4) * 0.04 * lift,
        spin: seg(p, 0.2, 0.8) * TAU,
        squashY: 1 + 0.05 * lift + Math.sin(time * 3) * 0.02 * lift,
        squashX: 1 - 0.03 * lift,
        handX: -0.15 * lift,
        handY: -0.95 * lift,
        staffSpin: Math.sin(time * 3) * 0.15 * lift,
        cape: 0.3 * Math.sin(time * 5) * lift,
        hatTip: 0.15 * Math.sin(time * 3) * lift,
        eyeGlow: lift > 0.1 ? color : null,
        glow: lift > 0.1 ? color : null,
      };
    }
    case "freeze": {
      // 1. magasra ugrik és a levegőben körbefordul  2. lezuhan, a pálcát fordítva a földbe döfi
      // 3. a becsapódás után remegve tartja, majd feláll
      const jump = seg(p, 0, 0.4);
      const air = Math.sin(Math.PI * jump) * (p < 0.4 ? 1 : 0);
      const crash = seg(p, 0.4, 0.46);
      const hold = 1 - seg(p, 0.7, 1);
      const planted = crash * hold;
      const impact = Math.max(0, 1 - Math.abs(p - 0.46) / 0.08);
      return {
        ...STILL,
        shakeY: -0.7 * air,
        spin: TAU * jump * (p < 0.4 ? 1 : 0),
        squashY: 1 - 0.25 * impact - 0.08 * planted + 0.06 * air,
        squashX: 1 + 0.15 * impact + 0.05 * planted,
        shakeX: tremble(0.035 * impact),
        lean: 0.1 * planted,
        staffSpin: Math.PI * planted,
        handX: -0.15 * air + 0.1 * planted,
        handY: -1.0 * air + 0.35 * planted,
        cape: 0.4 * air + 0.3 * impact,
        hatTip: 0.4 * air - 0.3 * planted,
        eyeGlow: color,
        glow: env > 0.1 ? color : null,
        trail: air > 0.15 ? 0.8 : 0,
      };
    }
    case "meteor": {
      // 1. felemelkedik, a pálcát a feje fölött pörgeti, lehívja az égből
      // 2. lecsap: előrevetődve a célra mutat  3. kitartja, majd megnyugszik
      const lift = seg(p, 0, 0.3) * (1 - seg(p, 0.45, 0.55));
      const twirl = seg(p, 0.05, 0.45);
      const strike = seg(p, 0.45, 0.56) * (1 - seg(p, 0.75, 1));
      return {
        ...STILL,
        shakeY: -0.45 * lift + Math.sin(time * 10) * 0.03 * lift,
        shakeX: tremble(0.02 * lift),
        lean: -0.12 * lift + 0.36 * strike,
        staffSpin: twirl * TAU * 3 * (1 - strike) - 0.5 * strike,
        handX: -0.2 * lift + 0.8 * strike,
        handY: -1.15 * lift - 0.25 * strike,
        squashY: 1 - 0.08 * strike,
        cape: 0.35 * lift - 0.7 * strike,
        hatTip: 0.2 * lift - 0.5 * strike,
        eyeGlow: color,
        glow: env > 0.1 ? color : null,
        trail: strike > 0.05 && strike < 0.95 ? 1 : 0,
      };
    }
    case "blackhole": {
      // 1. felemelkedik, lassan forgatja a pálcát  2. előrenyúl és remegve tartja a szingularitást
      // 3. hirtelen visszarántja  4. leereszkedik
      const lift = seg(p, 0, 0.25) * (1 - seg(p, 0.88, 1));
      const reach = seg(p, 0.2, 0.4) * (1 - seg(p, 0.72, 0.82));
      const yank = seg(p, 0.72, 0.8) * (1 - seg(p, 0.85, 1));
      return {
        ...STILL,
        shakeY: -0.4 * lift + Math.sin(time * 5) * 0.03 * lift,
        shakeX: tremble(0.04 * reach),
        lean: 0.2 * reach - 0.22 * yank,
        staffSpin: seg(p, 0, 0.3) * TAU + 0.5 * reach - 0.3 * yank,
        handX: 0.6 * reach - 0.2 * yank,
        handY: -0.4 * reach - 0.1 * yank,
        squashY: 1 + 0.04 * reach,
        cape: 0.5 * lift,
        hatTip: 0.35 * reach - 0.4 * yank,
        eyeGlow: color,
        glow: lift > 0.1 ? color : null,
        trail: yank > 0.05 && yank < 0.95 ? 1 : 0,
      };
    }
    case "missiles": {
      // 1. maga elé kapja a pálcát és pörgeti  2. ötször egymás után előrelöki, minden lökésnél megrándul
      const charge = seg(p, 0, 0.25);
      const volley = seg(p, 0.25, 0.75);
      const pulse = volley > 0 && volley < 1 ? Math.abs(Math.sin(volley * Math.PI * 5)) : 0;
      const settle = 1 - seg(p, 0.75, 1);
      return {
        ...STILL,
        lean: (-0.1 * charge + 0.2 * pulse) * settle,
        shakeX: 0.12 * pulse * settle,
        squashX: 1 + 0.04 * pulse,
        handX: (-0.15 * charge + 0.5 * (volley > 0 ? 1 : 0) + 0.15 * pulse) * settle,
        handY: (-0.2 * charge - 0.15) * settle,
        staffSpin: -TAU * 2 * charge + 0.5 * (volley > 0 ? 1 : 0) * settle,
        cape: -0.4 * pulse,
        hatTip: -0.3 * pulse,
        eyeGlow: color,
        glow: env > 0.1 ? color : null,
        trail: pulse > 0.5 ? 0.6 : 0,
      };
    }
    case "firering": {
      // 1. leguggol, a pálcát a feje fölé emeli  2. felugrik és megpördül  3. a pálcát a földbe vágja
      const crouch = seg(p, 0, 0.25) * (1 - seg(p, 0.25, 0.35));
      const jump = seg(p, 0.25, 0.5);
      const air = Math.sin(Math.PI * jump) * (p < 0.5 ? 1 : 0);
      const impact = Math.max(0, 1 - Math.abs(p - 0.52) / 0.08);
      const planted = seg(p, 0.5, 0.55) * (1 - seg(p, 0.75, 1));
      return {
        ...STILL,
        shakeY: -0.55 * air,
        spin: TAU * jump * (p < 0.5 ? 1 : 0),
        squashY: 1 - 0.2 * crouch - 0.25 * impact + 0.05 * air,
        squashX: 1 + 0.1 * crouch + 0.15 * impact,
        shakeX: tremble(0.04 * impact),
        handX: 0.1 * planted,
        handY: -0.6 * crouch - 0.6 * air + 0.4 * planted,
        staffSpin: Math.PI * planted,
        cape: 0.5 * air + 0.3 * impact,
        hatTip: 0.4 * air - 0.3 * impact,
        eyeGlow: color,
        glow: env > 0.1 ? color : null,
        trail: air > 0.2 ? 0.8 : 0,
      };
    }
    case "blink": {
      // Hirtelen összehúzódik, majd megnyúlva "kiugrik" az új helyére
      const pop = 1 - seg(p, 0, 0.5);
      return {
        ...STILL,
        squashX: 1 - 0.35 * pop,
        squashY: 1 + 0.3 * pop,
        shakeY: -0.2 * pop,
        cape: 0.6 * pop,
        hatTip: 0.4 * pop,
        eyeGlow: color,
        glow: pop > 0.1 ? color : null,
        trail: pop > 0.2 ? 1 : 0,
      };
    }
    case "drain": {
      // 1. előrenyúl a pálcával  2. remegve húzza magába az életet  3. hátradől, ahogy beáramlik
      const reach = seg(p, 0, 0.25) * (1 - seg(p, 0.7, 0.85));
      const pull = seg(p, 0.25, 0.7);
      const back = seg(p, 0.65, 0.8) * (1 - seg(p, 0.85, 1));
      return {
        ...STILL,
        lean: 0.18 * reach - 0.2 * back,
        shakeX: tremble(0.03 * reach * pull),
        handX: 0.55 * reach - 0.15 * back,
        handY: -0.25 * reach,
        staffSpin: 0.4 * reach,
        squashY: 1 + 0.05 * back,
        cape: -0.3 * reach + 0.3 * back,
        hatTip: 0.2 * reach,
        eyeGlow: color,
        glow: env > 0.15 ? color : null,
      };
    }
    case "ascend": {
      // 1. térdre ereszkedik, összegyűjti az erőt  2. kétszer megpördülve a magasba emelkedik, karját az égnek tárja
      // 3. hatalmas kitörés  4. lebeg, remeg az erőtől  5. lassan leereszkedik
      const kneel = seg(p, 0, 0.18) * (1 - seg(p, 0.18, 0.3));
      const rise = seg(p, 0.18, 0.45) * (1 - seg(p, 0.8, 1));
      const burst = Math.max(0, 1 - Math.abs(p - 0.47) / 0.07);
      const hover = rise * (p > 0.45 ? 1 : 0);
      return {
        ...STILL,
        squashY: 1 - 0.25 * kneel + 0.12 * burst + 0.04 * rise,
        squashX: 1 + 0.12 * kneel - 0.05 * burst,
        shakeY: -1.1 * rise + Math.sin(time * 6) * 0.05 * hover,
        shakeX: tremble(0.03 * kneel + 0.06 * burst + 0.015 * hover),
        spin: TAU * 2 * seg(p, 0.18, 0.45),
        handX: -0.1 * rise,
        handY: 0.2 * kneel - 1.2 * rise,
        staffSpin: Math.sin(time * 4) * 0.2 * hover,
        cape: 0.8 * burst + Math.sin(time * 14) * 0.35 * rise,
        hatTip: 0.5 * burst + Math.sin(time * 11) * 0.2 * rise,
        eyeGlow: "#ffffff",
        glow: env > 0.05 ? color : null,
        trail: rise > 0.1 && p < 0.47 ? 1 : 0,
      };
    }
    default:
      return STILL;
  }
}

/** A pálca hegye a figura helyi koordinátáiban (a mozdulattal és a pálcaforgatással együtt) */
function staffTipLocal(pose: WizardPose, motion: CastMotion) {
  const hand = { x: 0.6 + motion.handX, y: -0.9 - pose.cast * 0.35 + motion.handY };
  const dx = 0.14;
  const dy = -1.61;
  const c = Math.cos(motion.staffSpin);
  const s = Math.sin(motion.staffSpin);
  return { x: hand.x + dx * c - dy * s, y: hand.y + dx * s + dy * c, hand };
}

/** A varázslás kísérőeffektjei a figura mögött */
function drawCastBehind(ctx: CanvasRenderingContext2D, pose: WizardPose, motion: CastMotion, p: number) {
  const color = pose.castColor;
  if (!color) return;
  const env = Math.sin(Math.PI * p);
  const t = pose.time;
  // Színes aura minden varázslatnál
  ctx.save();
  const g = ctx.createRadialGradient(0, -1.5 + motion.shakeY, 0.2, 0, -1.5 + motion.shakeY, 2.3);
  g.addColorStop(0, hexToRgba(pose.castKind === "blackhole" ? "#1e0032" : color, 0.5 * env));
  g.addColorStop(1, hexToRgba(color, 0));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, -1.5 + motion.shakeY, 2.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  switch (pose.castKind) {
    case "shield":
      drawRuneRing(ctx, p, color);
      break;
    case "firering":
      drawRuneRing(ctx, Math.min(1, p * 1.4), color);
      break;
    case "ascend":
      drawAscendBehind(ctx, p, color, t, motion);
      break;
    case "heal": {
      drawLightPillar(ctx, p, color);
      ctx.save();
      ctx.globalAlpha = env;
      ctx.strokeStyle = "#fde68a";
      ctx.lineWidth = 0.08;
      ctx.shadowColor = "#fde68a";
      ctx.shadowBlur = 0;
      ctx.beginPath();
      ctx.ellipse(0.02, -3.45 + motion.shakeY * 0.6, 0.5, 0.14, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      break;
    }
    case "tornado": {
      ctx.save();
      ctx.globalAlpha = env;
      for (let i = 0; i < 5; i++) {
        const a = t * 16 + i * 1.3;
        ctx.strokeStyle = i % 2 ? "rgba(214,200,160,0.85)" : hexToRgba(color, 0.85);
        ctx.lineWidth = 0.08;
        ctx.beginPath();
        ctx.ellipse(0, -0.05, 0.6 + i * 0.28, (0.6 + i * 0.28) * 0.3, 0, a, a + 2.4);
        ctx.stroke();
      }
      ctx.restore();
      break;
    }
    case "meteor": {
      // Lángoló idézőkör a feje fölött, egyre gyorsabban forog
      const up = seg(p, 0, 0.4);
      const fade = 1 - seg(p, 0.55, 0.8);
      ctx.save();
      ctx.globalAlpha = fade * up;
      ctx.translate(0.3, -3.75 + motion.shakeY);
      ctx.scale(1, 0.32);
      ctx.rotate(t * 3 + p * 12);
      ctx.strokeStyle = "#fb923c";
      ctx.shadowColor = color;
      ctx.shadowBlur = 0;
      ctx.lineWidth = 0.1;
      ctx.beginPath();
      ctx.arc(0, 0, 1.2 * up, 0, Math.PI * 2);
      ctx.stroke();
      ctx.lineWidth = 0.07;
      ctx.beginPath();
      for (let i = 0; i <= 5; i++) {
        const a = ((i * 2) / 5) * Math.PI * 2;
        ctx.lineTo(Math.cos(a) * 1.15 * up, Math.sin(a) * 1.15 * up);
      }
      ctx.stroke();
      ctx.restore();
      break;
    }
  }
}

/** A varázslás kísérőeffektjei a figura előtt */
function drawCastFront(ctx: CanvasRenderingContext2D, pose: WizardPose, motion: CastMotion, p: number) {
  const color = pose.castColor;
  if (!color) return;
  const env = Math.sin(Math.PI * p);
  const t = pose.time;
  const tip = staffTipLocal(pose, motion);
  ctx.save();
  ctx.lineCap = "round";
  switch (pose.castKind) {
    case "lightning": {
      drawCrackles(ctx, p, color, t);
      // Villám csap le az égből a pálcába
      const strike = p > 0.25 && p < 0.45 ? 1 - (p - 0.25) / 0.2 : 0;
      if (strike > 0) {
        ctx.strokeStyle = `rgba(255,255,255,${strike})`;
        ctx.shadowColor = color;
        ctx.shadowBlur = 0;
        for (const [w, c] of [
          [0.16, color],
          [0.06, "#ffffff"],
        ] as const) {
          ctx.strokeStyle = c;
          ctx.globalAlpha = strike;
          ctx.lineWidth = w;
          ctx.beginPath();
          ctx.moveTo(tip.x + 0.4, tip.y - 7);
          for (let k = 1; k <= 8; k++) {
            const y = tip.y - 7 + (7 * k) / 8;
            const jitter = k === 8 ? 0 : Math.sin(k * 7.3 + Math.floor(t * 30)) * 0.35;
            ctx.lineTo(tip.x + 0.4 * (1 - k / 8) + jitter, y);
          }
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
        glow(ctx, tip.x, tip.y, 1.1, "#ffffff", 0.8 * strike);
      }
      if (p > 0.3 && p < 0.85) glow(ctx, tip.x, tip.y, 0.55, color, 0.7);
      break;
    }

    case "fireball": {
      if (p < 0.32) {
        // Tűz gyűlik a forgó pálca hegyébe
        const q = p / 0.32;
        for (let i = 0; i < 12; i++) {
          const a = i * 0.52 + t * 10;
          const r = 1.2 * (1 - q) + 0.15;
          ctx.fillStyle = i % 2 ? "#fde047" : color;
          ctx.globalAlpha = q;
          ctx.beginPath();
          ctx.arc(tip.x + Math.cos(a) * r, tip.y + Math.sin(a) * r, 0.06 + q * 0.05, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
        glow(ctx, tip.x, tip.y, 0.3 + q * 0.5, color, 0.85);
        ctx.fillStyle = "#fff7d6";
        ctx.beginPath();
        ctx.arc(tip.x, tip.y, 0.08 + q * 0.14, 0, Math.PI * 2);
        ctx.fill();
      } else if (p < 0.55) {
        const q = (p - 0.32) / 0.23;
        glow(ctx, tip.x, tip.y, 0.6 + q * 0.8, "#fde047", 1 - q);
        for (let k = 0; k < 3; k++) {
          ctx.strokeStyle = hexToRgba(k === 1 ? "#fde047" : color, 1 - q);
          ctx.lineWidth = 0.09 * (1 - q);
          ctx.beginPath();
          ctx.arc(tip.x, tip.y, 0.2 + q * (0.6 + k * 0.45), 0, Math.PI * 2);
          ctx.stroke();
        }
      }
      for (let i = 0; i < 10; i++) {
        const k = (t * 1.6 + i * 0.1) % 1;
        ctx.fillStyle = `rgba(253,186,116,${(1 - k) * env})`;
        ctx.beginPath();
        ctx.arc(Math.sin(i * 2.3) * 0.75, -k * 2.6, 0.045, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }

    case "shield": {
      const q = seg(p, 0.1, 0.6);
      const fade = 1 - seg(p, 0.78, 1);
      ctx.globalAlpha = fade;
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2 + t * 1.2;
        const r = 2.8 * (1 - q) + 1.3 * q;
        ctx.save();
        ctx.translate(Math.cos(a) * r, -1.4 + Math.sin(a) * r * 0.75);
        ctx.rotate(a + (1 - q) * 5);
        ctx.fillStyle = hexToRgba(color, 0.35);
        ctx.strokeStyle = color;
        ctx.lineWidth = 0.05;
        ctx.shadowColor = color;
        ctx.shadowBlur = 0;
        ctx.beginPath();
        for (let k = 0; k < 6; k++) {
          const ang = (k / 6) * Math.PI * 2;
          ctx.lineTo(Math.cos(ang) * 0.24, Math.sin(ang) * 0.24);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
      // A pálca földre csapásakor lökéshullám a talpánál
      const slam = p > 0.6 && p < 0.9 ? (p - 0.6) / 0.3 : 0;
      if (slam > 0) {
        ctx.strokeStyle = hexToRgba("#ffffff", 1 - slam);
        ctx.lineWidth = 0.1 * (1 - slam);
        ctx.beginPath();
        ctx.ellipse(0, 0, 0.4 + slam * 2.2, (0.4 + slam * 2.2) * 0.3, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeStyle = hexToRgba("#ffffff", 0.7 * (1 - slam));
        ctx.lineWidth = 0.05;
        ctx.beginPath();
        ctx.ellipse(0, -1.4, 1.3, 1.6, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      break;
    }

    case "tornado": {
      ctx.globalAlpha = env;
      for (let s = 0; s < 4; s++) {
        ctx.strokeStyle = s % 2 ? "rgba(255,255,255,0.85)" : hexToRgba(color, 0.9);
        ctx.lineWidth = 0.08;
        ctx.beginPath();
        for (let i = 0; i <= 30; i++) {
          const k = i / 30;
          const a = t * 18 + s * 1.6 + k * 8;
          const r = 0.55 + k * 0.7;
          const x = Math.cos(a) * r;
          const y = -k * 3.6 + Math.sin(a) * r * 0.25 + motion.shakeY;
          if (Math.sin(a) < 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      for (let i = 0; i < 8; i++) {
        const a = t * 12 + i * 0.8;
        const k = (i / 8 + t * 0.5) % 1;
        ctx.save();
        ctx.translate(Math.cos(a) * (0.7 + k * 0.6), -k * 3.4 + Math.sin(a) * 0.2 + motion.shakeY);
        ctx.rotate(a * 2);
        ctx.fillStyle = i % 2 ? "#84cc16" : "#4d7c0f";
        ctx.beginPath();
        ctx.ellipse(0, 0, 0.1, 0.04, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      break;
    }

    case "poison": {
      const h = tip.hand;
      if (p < 0.4) {
        ctx.save();
        ctx.translate(h.x + 0.08, h.y - 0.12);
        ctx.rotate(Math.sin(t * 45) * 0.35);
        glow(ctx, 0, 0, 0.4, color, 0.65);
        ctx.fillStyle = "rgba(217,249,157,0.45)";
        ctx.strokeStyle = "rgba(255,255,255,0.85)";
        ctx.lineWidth = 0.03;
        ctx.beginPath();
        ctx.arc(0, 0, 0.16, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(0, 0.02, 0.13, 0.2, Math.PI - 0.2);
        ctx.fill();
        ctx.fillStyle = "#92400e";
        ctx.fillRect(-0.05, -0.25, 0.1, 0.08);
        ctx.restore();
        for (let i = 0; i < 5; i++) {
          const k = (t * 1.6 + i * 0.2) % 1;
          ctx.fillStyle = hexToRgba(color, 0.55 * (1 - k));
          ctx.beginPath();
          ctx.arc(h.x + 0.08 + Math.sin(t * 6 + i) * 0.12, h.y - 0.3 - k * 0.8, 0.06 + k * 0.09, 0, Math.PI * 2);
          ctx.fill();
        }
      } else {
        const k = (p - 0.4) / 0.6;
        for (let i = 0; i < 7; i++) {
          const a = i * 0.9 + k * 3;
          ctx.fillStyle = hexToRgba(color, 0.4 * (1 - k));
          ctx.beginPath();
          ctx.arc(h.x + Math.cos(a) * k * 0.7, h.y + Math.sin(a) * k * 0.5 - k * 0.3, 0.1 + k * 0.12, 0, Math.PI * 2);
          ctx.fill();
        }
        // Vihogás közben apró zöld buborékok szállnak a feje fölül
        for (let i = 0; i < 3; i++) {
          const q = (t * 1.4 + i / 3) % 1;
          ctx.fillStyle = hexToRgba(color, 0.8 * (1 - q) * env);
          ctx.beginPath();
          ctx.arc(0.1 + (i - 1) * 0.2, -2.5 - q * 0.8 + motion.shakeY, 0.05 + q * 0.04, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      break;
    }

    case "heal": {
      for (let i = 0; i < 6; i++) {
        const a = t * 3 + (i / 6) * Math.PI * 2;
        if (Math.sin(a) < -0.2) continue;
        const x = Math.cos(a) * 1.1;
        const y = -1.5 + motion.shakeY + Math.sin(a) * 0.3 - ((t * 0.6 + i * 0.17) % 1) * 0.9;
        ctx.globalAlpha = env;
        drawHeartShape(ctx, x, y, 0.17, color);
      }
      for (let i = 0; i < 14; i++) {
        const k = (t * 0.9 + i * 0.071) % 1;
        ctx.globalAlpha = env * (1 - k);
        ctx.fillStyle = i % 2 ? "#fde68a" : "#ffffff";
        ctx.beginPath();
        ctx.arc(Math.sin(i * 2.4) * 0.85, -0.2 - k * 3.4, 0.035, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }

    case "freeze": {
      if (p < 0.42) {
        const q = p / 0.42;
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2 + t * 7;
          const r = 1.0 * (1 - q) + 0.3;
          drawCrystal(ctx, tip.x + Math.cos(a) * r, tip.y + Math.sin(a) * r, 0.11, a);
        }
        glow(ctx, tip.x, tip.y, 0.55, color, 0.75 * q);
      } else {
        // Jégszilánkok törnek ki a földbe döfött pálca hegyéből
        const q = (p - 0.42) / 0.58;
        ctx.globalAlpha = 1 - q;
        for (let i = 0; i < 11; i++) {
          const a = Math.PI + (i / 10) * Math.PI;
          const d = 0.2 + easeInOut(Math.min(1, q * 2)) * 1.5;
          drawCrystal(ctx, tip.x + Math.cos(a) * d, tip.y + Math.sin(a) * d * 0.4, 0.16 * (1 - q * 0.5), a);
        }
        for (let k = 0; k < 2; k++) {
          ctx.strokeStyle = k ? "rgba(186,230,253,0.9)" : "rgba(255,255,255,0.95)";
          ctx.lineWidth = 0.07 * (1 - q);
          ctx.beginPath();
          const rr = 0.3 + q * (1.6 + k * 0.6);
          ctx.ellipse(tip.x, tip.y, rr, rr * 0.3, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
      ctx.globalAlpha = env * 0.8;
      for (let i = 0; i < 3; i++) {
        const k = (t * 1.2 + i / 3) % 1;
        ctx.fillStyle = `rgba(240,249,255,${0.6 * (1 - k)})`;
        ctx.beginPath();
        ctx.arc(0.45 + k * 0.5, -1.72 - k * 0.15 + motion.shakeY, 0.06 + k * 0.1, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }

    case "meteor": {
      for (let i = 0; i < 10; i++) {
        const k = (t * 2 + i * 0.1) % 1;
        const side = i % 2 ? -0.35 : 0.35;
        ctx.fillStyle = k < 0.4 ? `rgba(253,224,71,${(1 - k) * env})` : `rgba(239,68,68,${(1 - k) * env})`;
        ctx.beginPath();
        ctx.arc(side + Math.sin(t * 8 + i) * 0.08, -1.4 - k * 1.2 + motion.shakeY, 0.1 * (1 - k * 0.6), 0, Math.PI * 2);
        ctx.fill();
      }
      // A pörgetett pálca hegye lángcsíkot húz
      if (p < 0.45) {
        ctx.strokeStyle = hexToRgba("#fb923c", 0.7 * env);
        ctx.lineWidth = 0.12;
        ctx.shadowColor = color;
        ctx.shadowBlur = 0;
        ctx.beginPath();
        ctx.arc(tip.hand.x, tip.hand.y, 1.62, motion.staffSpin - Math.PI / 2 - 1.2, motion.staffSpin - Math.PI / 2 + 0.05);
        ctx.stroke();
        ctx.shadowBlur = 0;
      } else if (p < 0.85) {
        const q = (p - 0.45) / 0.4;
        ctx.strokeStyle = `rgba(253,186,116,${1 - q})`;
        ctx.lineWidth = 0.14 * (1 - q);
        ctx.shadowColor = color;
        ctx.shadowBlur = 0;
        ctx.beginPath();
        ctx.moveTo(tip.x, tip.y);
        ctx.lineTo(tip.x + 1.4 + q * 1.6, tip.y - 0.6 - q * 0.8);
        ctx.stroke();
        ctx.shadowBlur = 0;
      }
      glow(ctx, tip.x, tip.y, 0.55, color, 0.75 * env);
      break;
    }

    case "missiles": {
      // Lila energiagömbök keringenek a pálca hegye körül, és lövésenként felvillan a hegy
      const charge = seg(p, 0, 0.25);
      const left = p < 0.25 ? 5 : Math.max(0, 5 - Math.floor(((p - 0.25) / 0.5) * 5));
      for (let i = 0; i < left; i++) {
        const a = (i / 5) * Math.PI * 2 + t * 9;
        const r = 0.45 * (1 - charge * 0.4);
        glow(ctx, tip.x + Math.cos(a) * r, tip.y + Math.sin(a) * r * 0.7, 0.16, color, 0.9);
        ctx.fillStyle = "#ede9fe";
        ctx.beginPath();
        ctx.arc(tip.x + Math.cos(a) * r, tip.y + Math.sin(a) * r * 0.7, 0.05, 0, Math.PI * 2);
        ctx.fill();
      }
      const flash = p > 0.25 && p < 0.75 ? Math.abs(Math.sin(((p - 0.25) / 0.5) * Math.PI * 5)) : 0;
      glow(ctx, tip.x, tip.y, 0.4 + flash * 0.5, color, 0.5 + flash * 0.5);
      break;
    }

    case "firering": {
      // Lángnyelvek csapnak fel a talp körül a becsapódás után
      const q = seg(p, 0.5, 1);
      if (p > 0.5) {
        for (let i = 0; i < 16; i++) {
          const a = (i / 16) * Math.PI * 2;
          const r = 0.6 + q * 2.2;
          const h = (0.5 + 0.5 * Math.sin(t * 20 + i * 2.1)) * 0.7 * (1 - q);
          const x = Math.cos(a) * r;
          const y = Math.sin(a) * r * 0.3;
          const g = ctx.createLinearGradient(x, y, x, y - h - 0.1);
          g.addColorStop(0, hexToRgba(color, 0.9 * (1 - q)));
          g.addColorStop(1, hexToRgba("#fde047", 0));
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.moveTo(x - 0.12, y);
          ctx.quadraticCurveTo(x - 0.05, y - h * 0.6, x, y - h - 0.1);
          ctx.quadraticCurveTo(x + 0.05, y - h * 0.6, x + 0.12, y);
          ctx.closePath();
          ctx.fill();
        }
      } else {
        glow(ctx, tip.x, tip.y, 0.5, color, 0.8 * seg(p, 0, 0.3));
      }
      break;
    }

    case "blink": {
      // Lila szikrák pattannak szét a megérkezéskor
      const q = seg(p, 0, 1);
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2 + i;
        const r = 0.3 + q * 1.6;
        ctx.fillStyle = hexToRgba(i % 2 ? "#ffffff" : color, 1 - q);
        ctx.beginPath();
        ctx.arc(Math.cos(a) * r, -1.5 + Math.sin(a) * r, 0.07 * (1 - q), 0, Math.PI * 2);
        ctx.fill();
      }
      glow(ctx, 0, -1.5, 2 * (1 - q), "#ffffff", 0.7 * (1 - q));
      break;
    }

    case "drain": {
      // Vörös köd örvénylik befelé a pálca hegyébe
      for (let i = 0; i < 14; i++) {
        const k = (t * 1.5 + i / 14) % 1;
        const a = i * 2.4 + t * 3;
        const r = (1 - k) * 1.6 + 0.1;
        ctx.fillStyle = hexToRgba(i % 3 ? color : "#fb7185", 0.7 * env * k);
        ctx.beginPath();
        ctx.arc(tip.x + Math.cos(a) * r, tip.y + Math.sin(a) * r * 0.6, 0.05 + k * 0.05, 0, Math.PI * 2);
        ctx.fill();
      }
      glow(ctx, tip.x, tip.y, 0.55, color, 0.8 * env);
      break;
    }

    case "ascend": {
      drawCrackles(ctx, p, "#ffffff", t);
      drawCrackles(ctx, p, color, t + 0.37);
      // A kitörés pillanatában vakító villanás és szétszóródó fénytüskék
      const flash = Math.max(0, 1 - Math.abs(p - 0.47) / 0.1);
      if (flash > 0) {
        glow(ctx, 0, -1.6 + motion.shakeY, 4.5 * flash, "#ffffff", flash);
        ctx.strokeStyle = hexToRgba("#ffffff", flash);
        ctx.lineWidth = 0.08;
        for (let i = 0; i < 16; i++) {
          const a = (i / 16) * Math.PI * 2;
          const r0 = 0.8;
          const r1 = 1.4 + flash * 3;
          ctx.beginPath();
          ctx.moveTo(Math.cos(a) * r0, -1.6 + motion.shakeY + Math.sin(a) * r0);
          ctx.lineTo(Math.cos(a) * r1, -1.6 + motion.shakeY + Math.sin(a) * r1);
          ctx.stroke();
        }
      }
      // Erőgyűjtés: fénypontok húzódnak be a testébe
      if (p < 0.45) {
        const q = p / 0.45;
        for (let i = 0; i < 18; i++) {
          const a = (i / 18) * Math.PI * 2 + t * 4;
          const r = 2.6 * (1 - q) + 0.3;
          ctx.fillStyle = hexToRgba(i % 2 ? "#ffffff" : color, q);
          ctx.beginPath();
          ctx.arc(Math.cos(a) * r, -1.5 + motion.shakeY + Math.sin(a) * r * 0.8, 0.05 + q * 0.04, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      glow(ctx, tip.x, tip.y, 0.9, color, env);
      break;
    }

    case "blackhole": {
      const h = tip.hand;
      const ox = h.x + 0.45;
      const oy = h.y - 0.25;
      const r = 0.3 * seg(p, 0.15, 0.4) * (1 - seg(p, 0.75, 0.82));
      for (let s = 0; s < 7; s++) {
        ctx.strokeStyle = hexToRgba(color, 0.7 * env);
        ctx.lineWidth = 0.05;
        ctx.beginPath();
        for (let i = 0; i <= 20; i++) {
          const k = i / 20;
          const a = s * 0.9 - t * 6 + k * 4;
          const rr = r + (1 - k) * 1.6;
          const x = ox + Math.cos(a) * rr;
          const y = oy + Math.sin(a) * rr * 0.7;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      if (r > 0.01) {
        glow(ctx, ox, oy, r * 3.2, color, 0.85);
        ctx.strokeStyle = "rgba(255,237,213,0.9)";
        ctx.lineWidth = 0.045;
        ctx.beginPath();
        ctx.arc(ox, oy, r * 1.15, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = "#050007";
        ctx.beginPath();
        ctx.arc(ox, oy, r, 0, Math.PI * 2);
        ctx.fill();
      }
      // Visszarántáskor lila villanás
      const yankFlash = p > 0.75 && p < 0.9 ? 1 - (p - 0.75) / 0.15 : 0;
      if (yankFlash > 0) glow(ctx, ox, oy, 1.2, color, yankFlash);
      break;
    }
  }
  ctx.restore();
}

function glow(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, alpha: number) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, Math.max(0.001, r));
  g.addColorStop(0, hexToRgba(color, Math.max(0, Math.min(1, alpha))));
  g.addColorStop(1, hexToRgba(color, 0));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

function drawCrystal(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, rot: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.fillStyle = "rgba(224,242,254,0.95)";
  ctx.strokeStyle = "#7dd3fc";
  ctx.lineWidth = 0.02;
  ctx.beginPath();
  ctx.moveTo(0, -s);
  ctx.lineTo(s * 0.45, 0);
  ctx.lineTo(0, s);
  ctx.lineTo(-s * 0.45, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawHeartShape(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string) {
  const s = size;
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 0;
  ctx.beginPath();
  ctx.moveTo(x, y + s * 0.9);
  ctx.bezierCurveTo(x - s * 1.2, y, x - s, y - s, x - s * 0.5, y - s);
  ctx.bezierCurveTo(x - s * 0.2, y - s, x, y - s * 0.7, x, y - s * 0.4);
  ctx.bezierCurveTo(x, y - s * 0.7, x + s * 0.2, y - s, x + s * 0.5, y - s);
  ctx.bezierCurveTo(x + s, y - s, x + s * 1.2, y, x, y + s * 0.9);
  ctx.fill();
  ctx.shadowBlur = 0;
}

function easeInOut(t: number) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

const OUTLINE = "rgba(20,10,35,0.55)";

/** A mágus kirajzolása a (x, y) talpponttal, size = 1 helyi egység mérete */
export function drawWizardFigure(
  ctx: CanvasRenderingContext2D,
  look: ResolvedLook,
  pose: WizardPose,
  x: number,
  y: number,
  size: number,
) {
  const p = 1 - pose.cast;
  const motion = pose.cast > 0 ? castMotion(pose.castKind, p, pose.castColor, pose.time) : STILL;

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size * pose.facing, size);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  const aura = pose.aura ?? 0;
  if (aura > 0) drawEmpoweredAura(ctx, aura, pose.time);
  if (pose.cast > 0) drawCastBehind(ctx, pose, motion, p);

  // Utóképek: a mozdulat korábbi pillanatai halványan, a varázslat színében ragyogva
  if (motion.trail > 0) {
    for (const k of [3, 2, 1]) {
      const pk = Math.max(0, p - k * 0.03);
      const mk = castMotion(pose.castKind, pk, pose.castColor, pose.time - k * 0.02);
      ctx.save();
      ctx.globalAlpha = motion.trail * (0.32 - k * 0.07);
      drawBody(ctx, look, { ...pose, cast: 1 - pk }, mk, true);
      ctx.restore();
    }
  }
  // Felemelkedés alatt a szeme aranyban izzik (ha a varázslás nem ad más színt)
  drawBody(ctx, look, pose, aura > 0 && !motion.eyeGlow ? { ...motion, eyeGlow: AURA_COLOR } : motion, false);

  if (pose.cast > 0) drawCastFront(ctx, pose, motion, p);
  ctx.restore();
}

/** A figura teste a mozdulattal (az utóképek is ezt rajzolják) */
function drawBody(ctx: CanvasRenderingContext2D, look: ResolvedLook, pose: WizardPose, motion: CastMotion, _ghost: boolean) {
  const step = Math.sin(pose.walk);
  const bob = pose.moving ? -Math.abs(step) * 0.07 : Math.sin(pose.time * 2.2) * 0.02;
  const sway = pose.moving ? step * 0.05 : 0;
  const capeFlow =
    (pose.moving ? -0.22 + Math.sin(pose.walk * 2) * 0.05 : Math.sin(pose.time * 1.5) * 0.03) + motion.cape;

  ctx.save();
  // Testmozgás a talppont körül
  ctx.rotate(motion.lean);
  ctx.translate(motion.shakeX, motion.shakeY);
  // Körbefordulás: a figura szélessége a fordulás szögével változik
  const turn = Math.cos(motion.spin);
  ctx.scale(motion.squashX * (Math.abs(turn) < 0.08 ? Math.sign(turn || 1) * 0.08 : turn), motion.squashY);

  drawFeet(ctx, step, pose.moving);
  ctx.translate(0, bob);
  drawCape(ctx, look.robe, capeFlow);
  if (look.hat.style === "hood") drawHoodBack(ctx, look.hat);
  drawRobe(ctx, look.robe, sway);
  if (look.amulet) drawAmulet(ctx, look.amulet);
  drawHead(ctx, look, pose, motion.eyeGlow);
  drawHat(ctx, look.hat, pose, motion.hatTip);
  drawArmAndStaff(ctx, look, pose, step, motion);
  ctx.restore();
}

/** Felemelkedés a figura mögött: óriási fényoszlop, forgó fénypászmák, kettős rúnakör */
function drawAscendBehind(ctx: CanvasRenderingContext2D, p: number, color: string, t: number, motion: CastMotion) {
  const env = Math.sin(Math.PI * p);
  drawLightPillar(ctx, p, color);
  ctx.save();
  ctx.scale(1.6, 1.2);
  drawLightPillar(ctx, p, "#ffffff");
  ctx.restore();
  // Forgó fénypászmák a mágus mögül
  ctx.save();
  ctx.translate(0, -1.6 + motion.shakeY);
  ctx.rotate(t * 0.8);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const len = 3.2 + Math.sin(t * 5 + i) * 0.6;
    const g = ctx.createLinearGradient(0, 0, Math.cos(a) * len, Math.sin(a) * len);
    g.addColorStop(0, hexToRgba(i % 2 ? "#ffffff" : color, 0.55 * env));
    g.addColorStop(1, hexToRgba(color, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(a - 0.09) * len, Math.sin(a - 0.09) * len);
    ctx.lineTo(Math.cos(a + 0.09) * len, Math.sin(a + 0.09) * len);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
  drawRuneRing(ctx, Math.min(1, p * 1.2), color);
  ctx.save();
  ctx.scale(1.7, 1.7);
  drawRuneRing(ctx, Math.min(1, p * 0.9), "#fb923c");
  ctx.restore();
}

/** A Felemelkedés tartós aurája: lobogó aranyláng a figura körül (a test mögött) */
function drawEmpoweredAura(ctx: CanvasRenderingContext2D, strength: number, time: number) {
  ctx.save();
  // Lágy fényudvar
  glow(ctx, 0, -1.5, 2.4, AURA_COLOR, 0.35 * strength);
  // Lángnyelvek a sziluett körül
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    const flick = 0.5 + 0.5 * Math.sin(time * 13 + i * 1.7);
    const bx = Math.cos(a) * 0.85;
    const by = -1.5 + Math.sin(a) * 1.6;
    const h = (0.35 + flick * 0.45) * strength;
    const g = ctx.createLinearGradient(bx, by, bx, by - h);
    g.addColorStop(0, hexToRgba(i % 3 ? AURA_COLOR : "#fb923c", 0.55 * strength));
    g.addColorStop(1, hexToRgba("#ffffff", 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(bx - 0.18, by);
    ctx.quadraticCurveTo(bx - 0.06, by - h * 0.6, bx + Math.sin(time * 9 + i) * 0.06, by - h);
    ctx.quadraticCurveTo(bx + 0.06, by - h * 0.6, bx + 0.18, by);
    ctx.closePath();
    ctx.fill();
  }
  // Forgó rúnakör a talpak alatt
  ctx.strokeStyle = hexToRgba(AURA_COLOR, 0.8 * strength);
  ctx.lineWidth = 0.05;
  ctx.beginPath();
  ctx.ellipse(0, 0, 1.25, 0.38, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = 0.035;
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + time * 1.5;
    const rx = Math.cos(a) * 1.05;
    const ry = Math.sin(a) * 0.32;
    ctx.beginPath();
    ctx.moveTo(rx - 0.08, ry);
    ctx.lineTo(rx, ry - 0.06);
    ctx.lineTo(rx + 0.08, ry);
    ctx.lineTo(rx, ry + 0.06);
    ctx.closePath();
    ctx.stroke();
  }
  ctx.restore();
}

/** Függőleges fényoszlop (gyógyítás) */
function drawLightPillar(ctx: CanvasRenderingContext2D, p: number, color: string) {
  const alpha = Math.sin(Math.PI * p);
  ctx.save();
  ctx.globalAlpha = alpha;
  const g = ctx.createLinearGradient(0, 0, 0, -4.2);
  g.addColorStop(0, color);
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-0.9, 0.1);
  ctx.lineTo(-0.5, -4.2);
  ctx.lineTo(0.5, -4.2);
  ctx.lineTo(0.9, 0.1);
  ctx.closePath();
  ctx.fill();
  // Fény a talpak alatt
  ctx.fillStyle = color;
  ctx.globalAlpha = alpha * 0.6;
  ctx.beginPath();
  ctx.ellipse(0, 0, 1.1, 0.32, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** Földön táguló fénykör rúnákkal (pajzs) */
function drawRuneRing(ctx: CanvasRenderingContext2D, p: number, color: string) {
  const r = 0.5 + p * 1.1;
  const alpha = Math.sin(Math.PI * Math.min(1, p * 1.3));
  ctx.save();
  ctx.globalAlpha = Math.max(0, alpha);
  ctx.strokeStyle = color;
  ctx.lineWidth = 0.06;
  ctx.shadowColor = color;
  ctx.shadowBlur = 0;
  ctx.beginPath();
  ctx.ellipse(0, 0, r, r * 0.32, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = 0.04;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + p * 1.5;
    const rx = Math.cos(a) * r * 0.82;
    const ry = Math.sin(a) * r * 0.32 * 0.82;
    ctx.beginPath();
    ctx.moveTo(rx - 0.06, ry - 0.04);
    ctx.lineTo(rx, ry + 0.04);
    ctx.lineTo(rx + 0.06, ry - 0.04);
    ctx.stroke();
  }
  ctx.restore();
}

/** Apró villámszikrák a fej és a pálca körül (villám) */
function drawCrackles(ctx: CanvasRenderingContext2D, p: number, color: string, time: number) {
  const env = Math.sin(Math.PI * p);
  const frame = Math.floor(time * 18);
  ctx.save();
  ctx.globalAlpha = env;
  ctx.strokeStyle = color;
  ctx.lineWidth = 0.045;
  ctx.shadowColor = color;
  ctx.shadowBlur = 0;
  for (let i = 0; i < 5; i++) {
    const seed = frame * 31 + i * 17;
    const a = ((seed % 360) / 360) * Math.PI * 2;
    const cx = 0.1 + Math.cos(a) * 0.75;
    const cy = -2.0 + Math.sin(a) * 0.75;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    for (let k = 1; k <= 3; k++) {
      const j = (((seed * (k + 3)) % 7) - 3) * 0.05;
      ctx.lineTo(cx + Math.cos(a) * k * 0.12 + j, cy + Math.sin(a) * k * 0.12 - j);
    }
    ctx.stroke();
  }
  ctx.restore();
}

// ---------------------------------------------------------------- részek

function drawFeet(ctx: CanvasRenderingContext2D, step: number, moving: boolean) {
  const offset = moving ? step * 0.12 : 0;
  ctx.fillStyle = "#2a1a12";
  for (const [fx, d] of [
    [-0.2, offset],
    [0.22, -offset],
  ]) {
    ctx.beginPath();
    ctx.ellipse(fx + d, -0.03, 0.16, 0.08, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** A köpeny szélessége adott magasságban (vállnál keskeny, aljánál széles) */
function robeHalfWidth(y: number) {
  const t = Math.min(1, Math.max(0, (y + 1.45) / 1.4));
  return 0.3 + t * 0.34;
}

function drawCape(ctx: CanvasRenderingContext2D, robe: RobeDef, flow: number) {
  ctx.fillStyle = shade(robe.color, -0.3);
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 0.04;
  ctx.beginPath();
  ctx.moveTo(0.22, -1.48);
  ctx.quadraticCurveTo(-0.3, -1.52, -0.42, -1.3);
  ctx.quadraticCurveTo(-0.7 + flow, -0.6, -0.86 + flow * 1.6, -0.02);
  ctx.quadraticCurveTo(-0.3 + flow, 0.05, 0.3, -0.02);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Bélés a szélén
  ctx.strokeStyle = shade(robe.trimColor, -0.2);
  ctx.lineWidth = 0.05;
  ctx.beginPath();
  ctx.moveTo(-0.42, -1.3);
  ctx.quadraticCurveTo(-0.7 + flow, -0.6, -0.86 + flow * 1.6, -0.02);
  ctx.stroke();
}

function drawRobe(ctx: CanvasRenderingContext2D, robe: RobeDef, sway: number) {
  const top = -1.45;
  const hem = -0.06;
  const hwTop = robeHalfWidth(top);
  const hwHem = robeHalfWidth(hem);

  // Test
  const body = new Path2D();
  body.moveTo(-hwTop, top);
  body.quadraticCurveTo(0, top - 0.12, hwTop, top);
  body.lineTo(hwHem + sway, hem);
  // Hullámos alj
  const waves = 4;
  for (let i = 1; i <= waves; i++) {
    const x0 = hwHem + sway - ((i - 0.5) / waves) * hwHem * 2;
    const x1 = hwHem + sway - (i / waves) * hwHem * 2;
    body.quadraticCurveTo(x0, hem + 0.07, x1, hem);
  }
  body.closePath();

  const grad = ctx.createLinearGradient(-hwHem, 0, hwHem, 0);
  grad.addColorStop(0, shade(robe.color, -0.18));
  grad.addColorStop(0.6, robe.color);
  grad.addColorStop(1, shade(robe.color, 0.12));
  ctx.fillStyle = grad;
  ctx.fill(body);

  ctx.save();
  ctx.clip(body);
  drawRobePattern(ctx, robe);
  // Ráncok
  ctx.strokeStyle = shade(robe.color, -0.25);
  ctx.lineWidth = 0.035;
  for (const fx of [-0.3, 0.38]) {
    ctx.beginPath();
    ctx.moveTo(fx * 0.5, -0.65);
    ctx.quadraticCurveTo(fx * 0.8 + sway, -0.35, fx + sway, hem);
    ctx.stroke();
  }
  // Elöl a nyílás szegélye és az alsó szegély
  ctx.strokeStyle = robe.trimColor;
  ctx.lineWidth = 0.07;
  ctx.beginPath();
  ctx.moveTo(0.1, top + 0.05);
  ctx.lineTo(0.16 + sway * 0.6, hem + 0.05);
  ctx.stroke();
  ctx.lineWidth = 0.09;
  ctx.beginPath();
  ctx.moveTo(-hwHem - 0.1 + sway, hem - 0.02);
  ctx.lineTo(hwHem + 0.1 + sway, hem - 0.02);
  ctx.stroke();
  ctx.restore();

  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 0.04;
  ctx.stroke(body);

  // Öv csattal
  const beltY = -0.78;
  const hw = robeHalfWidth(beltY);
  ctx.fillStyle = shade(robe.trimColor, -0.45);
  ctx.beginPath();
  ctx.roundRect(-hw - 0.01, beltY - 0.06, hw * 2 + 0.02, 0.12, 0.03);
  ctx.fill();
  ctx.fillStyle = robe.trimColor;
  ctx.strokeStyle = shade(robe.trimColor, -0.4);
  ctx.lineWidth = 0.025;
  ctx.beginPath();
  ctx.roundRect(0.04, beltY - 0.09, 0.18, 0.18, 0.04);
  ctx.fill();
  ctx.stroke();
}

function drawRobePattern(ctx: CanvasRenderingContext2D, robe: RobeDef) {
  const spots: [number, number][] = [
    [-0.32, -0.45],
    [0.38, -0.3],
    [-0.12, -1.15],
    [0.3, -1.05],
    [-0.45, -0.15],
  ];
  ctx.fillStyle = robe.trimColor;
  ctx.strokeStyle = robe.trimColor;
  ctx.globalAlpha = 0.7;
  if (robe.pattern === "stars") {
    for (const [sx, sy] of spots) drawSparkle(ctx, sx, sy, 0.07);
  } else if (robe.pattern === "runes") {
    ctx.lineWidth = 0.03;
    spots.forEach(([sx, sy], i) => {
      ctx.beginPath();
      if (i % 3 === 0) {
        ctx.moveTo(sx - 0.05, sy - 0.06);
        ctx.lineTo(sx + 0.05, sy);
        ctx.lineTo(sx - 0.05, sy + 0.06);
      } else if (i % 3 === 1) {
        ctx.moveTo(sx, sy - 0.07);
        ctx.lineTo(sx, sy + 0.07);
        ctx.moveTo(sx - 0.05, sy - 0.02);
        ctx.lineTo(sx + 0.05, sy - 0.05);
      } else {
        ctx.arc(sx, sy, 0.05, 0.3, Math.PI * 1.7);
      }
      ctx.stroke();
    });
  }
  ctx.globalAlpha = 1;
}

function drawAmulet(ctx: CanvasRenderingContext2D, amulet: AmuletDef) {
  const px = 0.1;
  const py = -1.08;
  ctx.strokeStyle = "#d4a017";
  ctx.lineWidth = 0.025;
  ctx.beginPath();
  ctx.moveTo(-0.14, -1.46);
  ctx.quadraticCurveTo(-0.05, -1.2, px, py - 0.07);
  ctx.quadraticCurveTo(0.22, -1.2, 0.3, -1.46);
  ctx.stroke();

  ctx.fillStyle = amulet.color;
  ctx.strokeStyle = shade(amulet.color, -0.45);
  ctx.lineWidth = 0.025;
  ctx.shadowColor = amulet.color;
  ctx.shadowBlur = 0.15;
  ctx.beginPath();
  if (amulet.shape === "round") {
    ctx.arc(px, py, 0.075, 0, Math.PI * 2);
  } else if (amulet.shape === "diamond") {
    ctx.moveTo(px, py - 0.1);
    ctx.lineTo(px + 0.07, py);
    ctx.lineTo(px, py + 0.11);
    ctx.lineTo(px - 0.07, py);
    ctx.closePath();
  } else {
    ctx.arc(px, py, 0.08, Math.PI * 0.35, Math.PI * 1.65);
    ctx.arc(px + 0.04, py, 0.06, Math.PI * 1.5, Math.PI * 0.5, true);
    ctx.closePath();
  }
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.stroke();
}

function drawHead(ctx: CanvasRenderingContext2D, look: ResolvedLook, pose: WizardPose, eyeGlow: string | null = null) {
  const hx = 0.06;
  const hy = -1.86;
  const r = 0.4;

  // Arc
  ctx.fillStyle = look.skin;
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 0.04;
  ctx.beginPath();
  ctx.arc(hx, hy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // Pír
  ctx.fillStyle = "rgba(244,114,182,0.35)";
  ctx.beginPath();
  ctx.ellipse(hx + 0.3, hy + 0.05, 0.07, 0.045, 0, 0, Math.PI * 2);
  ctx.fill();

  // Szemek (pislogás néha)
  const blink = !eyeGlow && pose.time % 3.7 < 0.12;
  ctx.fillStyle = eyeGlow ?? "#1e1b2e";
  if (eyeGlow) {
    // Izzó szem: kis fényudvar a szemek körül
    for (const ex of [hx + 0.05, hx + 0.26]) glow(ctx, ex, hy - 0.04, 0.16, eyeGlow, 0.7);
    ctx.fillStyle = eyeGlow;
  }
  for (const ex of [hx + 0.05, hx + 0.26]) {
    ctx.beginPath();
    if (blink) ctx.ellipse(ex, hy - 0.04, 0.05, 0.012, 0, 0, Math.PI * 2);
    else ctx.ellipse(ex, hy - 0.04, 0.045, 0.06, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.shadowBlur = 0;
  if (!blink) {
    ctx.fillStyle = "#ffffff";
    for (const ex of [hx + 0.065, hx + 0.275]) {
      ctx.beginPath();
      ctx.arc(ex, hy - 0.06, 0.016, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // Szemöldök
  ctx.strokeStyle = shade(look.beard, -0.25);
  ctx.lineWidth = 0.035;
  for (const ex of [hx + 0.05, hx + 0.27]) {
    ctx.beginPath();
    ctx.moveTo(ex - 0.06, hy - 0.14);
    ctx.lineTo(ex + 0.06, hy - 0.16);
    ctx.stroke();
  }

  // Szakáll
  ctx.fillStyle = look.beard;
  ctx.strokeStyle = shade(look.beard, -0.3);
  ctx.lineWidth = 0.03;
  ctx.beginPath();
  ctx.moveTo(hx - 0.32, hy + 0.04);
  ctx.quadraticCurveTo(hx - 0.3, hy + 0.42, hx + 0.02, hy + 0.66);
  ctx.quadraticCurveTo(hx + 0.12, hy + 0.58, hx + 0.16, hy + 0.7);
  ctx.quadraticCurveTo(hx + 0.42, hy + 0.4, hx + 0.38, hy + 0.06);
  ctx.quadraticCurveTo(hx + 0.18, hy + 0.2, hx - 0.32, hy + 0.04);
  ctx.fill();
  ctx.stroke();
  // Bajusz és orr
  ctx.beginPath();
  ctx.ellipse(hx + 0.1, hy + 0.13, 0.13, 0.05, -0.1, 0, Math.PI * 2);
  ctx.ellipse(hx + 0.3, hy + 0.12, 0.1, 0.045, 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = shade(look.skin, -0.12);
  ctx.beginPath();
  ctx.arc(hx + 0.22, hy + 0.05, 0.06, 0, Math.PI * 2);
  ctx.fill();
}

function drawHoodBack(ctx: CanvasRenderingContext2D, hat: HatDef) {
  ctx.fillStyle = shade(hat.color, -0.25);
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 0.04;
  ctx.beginPath();
  ctx.moveTo(0.55, -1.55);
  ctx.quadraticCurveTo(0.62, -2.5, 0.0, -2.42);
  ctx.quadraticCurveTo(-0.5, -2.35, -0.62, -1.75);
  ctx.quadraticCurveTo(-0.7, -1.45, -0.4, -1.4);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

function drawHat(ctx: CanvasRenderingContext2D, hat: HatDef, pose: WizardPose, tipKick = 0) {
  if (hat.style === "hood") {
    // A csuklya eleje a homlok körül
    ctx.strokeStyle = hat.color;
    ctx.lineWidth = 0.16;
    ctx.beginPath();
    ctx.arc(0.06, -1.86, 0.46, Math.PI * 0.95, Math.PI * 2.08);
    ctx.stroke();
    ctx.strokeStyle = hat.bandColor;
    ctx.lineWidth = 0.035;
    ctx.beginPath();
    ctx.arc(0.06, -1.86, 0.39, Math.PI * 1.0, Math.PI * 2.0);
    ctx.stroke();
    return;
  }

  const wide = hat.style === "wide";
  const brimY = -2.12;
  const brimRx = wide ? 0.82 : 0.62;
  // A csúcs kicsit hátrahajlik és lengedez
  const tipSway = Math.sin(pose.time * 2 + pose.walk) * 0.04 - (pose.moving ? 0.08 : 0) + tipKick;
  const tipX = (wide ? -0.15 : -0.38) + tipSway;
  const tipY = wide ? -2.85 : -3.3;
  const baseL = wide ? -0.34 : -0.3;
  const baseR = wide ? 0.46 : 0.42;

  // Karima
  ctx.fillStyle = shade(hat.color, -0.15);
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 0.04;
  ctx.beginPath();
  ctx.ellipse(0.06, brimY, brimRx, wide ? 0.17 : 0.13, -0.05, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Kúp
  const cone = new Path2D();
  cone.moveTo(baseL, brimY);
  cone.quadraticCurveTo(baseL + 0.05, brimY - 0.6, tipX, tipY);
  cone.quadraticCurveTo(baseR - 0.05, brimY - 0.45, baseR, brimY);
  cone.quadraticCurveTo(0.06, brimY + 0.08, baseL, brimY);
  const grad = ctx.createLinearGradient(baseL, 0, baseR, 0);
  grad.addColorStop(0, shade(hat.color, -0.1));
  grad.addColorStop(1, shade(hat.color, 0.15));
  ctx.fillStyle = grad;
  ctx.fill(cone);

  ctx.save();
  ctx.clip(cone);
  // Szalag
  ctx.fillStyle = hat.bandColor;
  ctx.fillRect(-1, brimY - 0.2, 2, 0.13);
  // Díszítés
  ctx.fillStyle = hat.bandColor;
  if (hat.decoration === "stars") {
    drawSparkle(ctx, 0.08, brimY - 0.52, 0.09);
    drawSparkle(ctx, -0.12, brimY - 0.82, 0.06);
  } else if (hat.decoration === "moon") {
    ctx.beginPath();
    ctx.arc(0.04, brimY - 0.5, 0.12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = hat.color;
    ctx.beginPath();
    ctx.arc(0.1, brimY - 0.54, 0.11, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 0.04;
  ctx.stroke(cone);
}

function drawArmAndStaff(
  ctx: CanvasRenderingContext2D,
  look: ResolvedLook,
  pose: WizardPose,
  step: number,
  motion: CastMotion = STILL,
) {
  const raise = pose.cast * 0.35;
  const swing = pose.moving ? step * 0.06 : 0;
  const hand = { x: 0.6 + motion.handX, y: -0.9 - raise + swing + motion.handY };

  ctx.save();
  ctx.translate(hand.x, hand.y);
  ctx.rotate(motion.staffSpin);
  ctx.translate(-hand.x, -hand.y);
  drawStaff(ctx, look.staff, pose, hand);
  ctx.restore();

  // Ujj
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 0.27;
  ctx.beginPath();
  ctx.moveTo(0.22, -1.32);
  ctx.quadraticCurveTo(0.5, -1.25, hand.x - 0.05, hand.y + 0.02);
  ctx.stroke();
  ctx.strokeStyle = look.robe.color;
  ctx.lineWidth = 0.21;
  ctx.stroke();
  // Mandzsetta
  ctx.strokeStyle = look.robe.trimColor;
  ctx.lineWidth = 0.08;
  ctx.beginPath();
  ctx.moveTo(hand.x - 0.13, hand.y - 0.06);
  ctx.lineTo(hand.x - 0.06, hand.y + 0.1);
  ctx.stroke();
  // Kéz
  ctx.fillStyle = look.skin;
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 0.03;
  ctx.beginPath();
  ctx.arc(hand.x + 0.04, hand.y, 0.09, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
}

function drawStaff(ctx: CanvasRenderingContext2D, staff: StaffDef, pose: WizardPose, hand: { x: number; y: number }) {
  const bottom = { x: hand.x - 0.02, y: hand.y + 0.9 };
  const top = { x: hand.x + 0.14, y: hand.y - 1.45 };

  // Nyél
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 0.14;
  ctx.beginPath();
  ctx.moveTo(bottom.x, bottom.y);
  ctx.lineTo(top.x, top.y);
  ctx.stroke();
  ctx.strokeStyle = staff.woodColor;
  ctx.lineWidth = 0.09;
  ctx.stroke();
  // Göcsök
  ctx.strokeStyle = shade(staff.woodColor, -0.3);
  ctx.lineWidth = 0.03;
  for (const t of [0.3, 0.62]) {
    const kx = bottom.x + (top.x - bottom.x) * t;
    const ky = bottom.y + (top.y - bottom.y) * t;
    ctx.beginPath();
    ctx.moveTo(kx - 0.05, ky);
    ctx.lineTo(kx + 0.05, ky - 0.02);
    ctx.stroke();
  }

  const glowColor = pose.castColor && pose.cast > 0 ? pose.castColor : staff.gemColor;
  const glow = 0.25 + pose.cast * 0.6 + Math.sin(pose.time * 3) * 0.05;

  // Fej
  if (staff.top === "curl") {
    ctx.strokeStyle = staff.woodColor;
    ctx.lineWidth = 0.09;
    ctx.beginPath();
    ctx.moveTo(top.x, top.y);
    ctx.bezierCurveTo(top.x + 0.05, top.y - 0.35, top.x - 0.35, top.y - 0.35, top.x - 0.25, top.y - 0.1);
    ctx.bezierCurveTo(top.x - 0.18, top.y + 0.02, top.x - 0.05, top.y - 0.08, top.x - 0.1, top.y - 0.16);
    ctx.stroke();
    drawGem(ctx, top.x - 0.13, top.y - 0.15, 0.07, glowColor, glow, "orb");
  } else {
    // Foglalat
    ctx.strokeStyle = "#c9a227";
    ctx.lineWidth = 0.04;
    ctx.beginPath();
    ctx.moveTo(top.x - 0.12, top.y - 0.05);
    ctx.quadraticCurveTo(top.x, top.y + 0.08, top.x + 0.12, top.y - 0.05);
    ctx.stroke();
    drawGem(ctx, top.x, top.y - 0.16, staff.top === "crystal" ? 0.12 : 0.13, glowColor, glow, staff.top);
  }

  // Varázslás: fénykör a pálca feje körül
  if (pose.cast > 0 && pose.castColor) {
    ctx.strokeStyle = pose.castColor;
    ctx.globalAlpha = pose.cast;
    ctx.lineWidth = 0.05;
    ctx.beginPath();
    ctx.arc(top.x, top.y - 0.16, 0.2 + (1 - pose.cast) * 0.5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
}

function drawGem(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  color: string,
  glow: number,
  shape: "orb" | "crystal",
) {
  // Fényudvar
  const halo = ctx.createRadialGradient(x, y, 0, x, y, r * 4);
  halo.addColorStop(0, hexToRgba(color, glow));
  halo.addColorStop(1, hexToRgba(color, 0));
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(x, y, r * 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = color;
  ctx.strokeStyle = shade(color, -0.45);
  ctx.lineWidth = 0.025;
  ctx.beginPath();
  if (shape === "crystal") {
    ctx.moveTo(x, y - r * 1.6);
    ctx.lineTo(x + r * 0.7, y - r * 0.2);
    ctx.lineTo(x, y + r);
    ctx.lineTo(x - r * 0.7, y - r * 0.2);
    ctx.closePath();
  } else {
    ctx.arc(x, y, r, 0, Math.PI * 2);
  }
  ctx.fill();
  ctx.stroke();
  // Csillanás
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.beginPath();
  ctx.ellipse(x - r * 0.3, y - r * 0.35, r * 0.25, r * 0.15, -0.6, 0, Math.PI * 2);
  ctx.fill();
}

/** Négyágú csillag (szikra) */
function drawSparkle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
    const rr = i % 2 === 0 ? r : r * 0.35;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fill();
}

// ---------------------------------------------------------------- színek

function parseHex(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Világosítás (amount > 0) vagy sötétítés (amount < 0) */
export function shade(hex: string, amount: number) {
  const [r, g, b] = parseHex(hex);
  const f = (c: number) =>
    Math.round(amount >= 0 ? c + (255 - c) * amount : c * (1 + amount));
  return `rgb(${f(r)},${f(g)},${f(b)})`;
}

function hexToRgba(hex: string, alpha: number) {
  const [r, g, b] = parseHex(hex);
  return `rgba(${r},${g},${b},${Math.max(0, Math.min(1, alpha))})`;
}

// ---------------------------------------------------------------- tárgyikonok

const ICON_POSE: WizardPose = { facing: 1, walk: 0, moving: false, time: 0.4, cast: 0, castColor: null };

/** A rész befoglaló doboza helyi koordinátában: [minX, minY, maxX, maxY] */
const ICON_BOXES = {
  hat: [-0.75, -3.35, 0.8, -1.95],
  hood: [-0.75, -2.5, 0.75, -1.3],
  robe: [-1.0, -1.62, 0.78, 0.06],
  staff: [0.25, -2.7, 1.05, 0.05],
  amulet: [-0.22, -1.5, 0.36, -0.95],
} as const;

/** Egy felszerelési tárgy ikonja a w × h dobozban, középre illesztve */
export function drawItemIcon(
  ctx: CanvasRenderingContext2D,
  slot: "hat" | "robe" | "staff" | "amulet",
  item: HatDef | RobeDef | StaffDef | AmuletDef,
  w: number,
  h: number,
) {
  const hood = slot === "hat" && (item as HatDef).style === "hood";
  const [minX, minY, maxX, maxY] = ICON_BOXES[hood ? "hood" : slot];
  // A ferdén álló pálca az átlót használja, ezért nagyobbra vehető
  const fit = slot === "staff" ? 1.12 : 0.92;
  const scale = Math.min(w / (maxX - minX), h / (maxY - minY)) * fit;

  ctx.save();
  ctx.translate(w / 2, h / 2);
  // A pálca ferdén jobban kitölti a négyzetet
  if (slot === "staff") ctx.rotate(Math.PI / 4.4);
  ctx.scale(scale, scale);
  ctx.translate(-(minX + maxX) / 2, -(minY + maxY) / 2);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  switch (slot) {
    case "hat":
      if (hood) {
        drawHoodBack(ctx, item as HatDef);
        // Üres csuklya: sötét arc helye
        ctx.fillStyle = "rgba(10,7,22,0.85)";
        ctx.beginPath();
        ctx.arc(0.06, -1.86, 0.4, 0, Math.PI * 2);
        ctx.fill();
      }
      drawHat(ctx, item as HatDef, ICON_POSE);
      break;
    case "robe":
      drawCape(ctx, item as RobeDef, 0);
      drawRobe(ctx, item as RobeDef, 0);
      break;
    case "staff":
      // Ikonnál vastagabb nyél, hogy kis méretben is látsszon
      ctx.save();
      ctx.translate(0.66, -1.3);
      ctx.scale(1.6, 1);
      ctx.translate(-0.66, 1.3);
      drawStaff(ctx, item as StaffDef, ICON_POSE, { x: 0.6, y: -0.9 });
      ctx.restore();
      break;
    case "amulet":
      drawAmulet(ctx, item as AmuletDef);
      break;
  }
  ctx.restore();
}
