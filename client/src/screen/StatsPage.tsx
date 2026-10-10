import { PageFrame } from "../components/PageFrame";
import { DEFAULT_CONFIG } from "../game/Game";
import { useProfile } from "../profile/profile";
import { MAX_LEVEL, NO_STATS, POINTS_PER_LEVEL, STATS, addStats, statConfig, xpToNext, type StatDef } from "../data/stats";
import { gearBonus } from "../data/wizardParts";

/** Szint, tapasztalat és a statpontok elosztása */
export function StatsPage() {
  const { profile, update } = useProfile();
  const { level, xp, statPoints, stats } = profile;
  const next = xpToNext(level);
  const spent = Object.values(stats).reduce((s, v) => s + v, 0);
  // A felvett ruhák bónusza az elosztott pontokhoz adódik
  const gear = gearBonus(profile.look);
  const result = statConfig(addStats(stats, gear));

  const change = (stat: StatDef, delta: 1 | -1) =>
    update((p) => {
      const current = p.stats[stat.id];
      if (delta > 0 && (p.statPoints <= 0 || current >= stat.max)) return p;
      if (delta < 0 && current <= 0) return p;
      return { ...p, stats: { ...p.stats, [stat.id]: current + delta }, statPoints: p.statPoints - delta };
    });
  const refund = () => update((p) => ({ ...p, stats: NO_STATS, statPoints: p.statPoints + spent }));

  return (
    <PageFrame title="Statok">
      <section className="stats-head card">
        <div className="stats-head__level">
          <span className="stats-head__num">{level}</span>
          <span className="muted small">szint</span>
        </div>
        <div className="stats-head__xp">
          <div className="stats-head__row">
            <strong>Tapasztalat</strong>
            <span className="muted">{level >= MAX_LEVEL ? "Elérted a legmagasabb szintet" : `${xp} / ${next} XP`}</span>
          </div>
          <div className="xp-bar">
            <div className="xp-bar__fill" style={{ width: `${level >= MAX_LEVEL ? 100 : Math.min(100, (xp / next) * 100)}%` }} />
          </div>
          <p className="muted small">
            Szörnyekért és teljesített pályákért jár XP. Szintenként {POINTS_PER_LEVEL} statpontot kapsz.
          </p>
        </div>
        <div className={`stats-head__points ${statPoints > 0 ? "stats-head__points--on" : ""}`}>
          <span className="stats-head__num">{statPoints}</span>
          <span className="small">elosztható pont</span>
        </div>
      </section>

      <div className="stat-grid">
        {STATS.map((stat) => {
          const points = stats[stat.id];
          const fromGear = gear[stat.id];
          return (
            <article key={stat.id} className="stat-card" style={{ "--stat-color": stat.color } as React.CSSProperties}>
              <header className="stat-card__head">
                <h2 className="stat-card__name">{stat.name}</h2>
                <span className="stat-card__count">
                  {points} / {stat.max} pont
                </span>
              </header>
              <p className="stat-card__desc muted small">{stat.description}</p>
              {fromGear > 0 && <span className="stat-card__gear">+{fromGear} pont a felvett ruháktól</span>}
              <div className="stat-pips" aria-hidden="true">
                {Array.from({ length: stat.max }, (_, i) => (
                  <span key={i} className={`stat-pips__pip ${i < points ? "stat-pips__pip--on" : ""}`} />
                ))}
              </div>
              <footer className="stat-card__foot">
                <span className="stat-card__effect">{points + fromGear > 0 ? stat.effect(points + fromGear) : "Még nincs pont benne"}</span>
                <span className="stat-card__buttons">
                  <button className="stat-btn" onClick={() => change(stat, -1)} disabled={points <= 0} aria-label={`${stat.name} csökkentése`}>
                    −
                  </button>
                  <button
                    className="stat-btn stat-btn--plus"
                    onClick={() => change(stat, 1)}
                    disabled={statPoints <= 0 || points >= stat.max}
                    aria-label={`${stat.name} növelése`}
                  >
                    +
                  </button>
                </span>
              </footer>
            </article>
          );
        })}
      </div>

      <section className="card stats-summary">
        <h2 className="section-title">A pályán (ruhákkal együtt)</h2>
        <p className="muted small stats-summary__note">Az elosztott pontok és a felvett ruhák együtt, zárójelben a kezdő érték.</p>
        <dl className="stats-summary__list">
          <dt>Életerő</dt>
          <dd>
            {result.maxHp} <small>(alap {DEFAULT_CONFIG.maxHp})</small>
          </dd>
          <dt>Maximális mana</dt>
          <dd>
            {result.maxMana} <small>(alap {DEFAULT_CONFIG.maxMana})</small>
          </dd>
          <dt>Mana visszatöltődés</dt>
          <dd>
            {fmt(result.manaRegen ?? DEFAULT_CONFIG.manaRegen)} mana másodpercenként <small>(alap {fmt(DEFAULT_CONFIG.manaRegen)})</small>
          </dd>
          <dt>Sebzés</dt>
          <dd>{percentChange(result.damageMult ?? 1, "több", "kevesebb")}</dd>
          <dt>Mozgási sebesség</dt>
          <dd>{percentChange((result.wizardSpeed ?? DEFAULT_CONFIG.wizardSpeed) / DEFAULT_CONFIG.wizardSpeed, "gyorsabb", "lassabb")}</dd>
          <dt>Töltési idő</dt>
          <dd>{percentChange(result.cooldownMult ?? 1, "hosszabb", "rövidebb")}</dd>
        </dl>
        <button className="btn btn--ghost" onClick={refund} disabled={spent === 0}>
          Pontok visszaosztása
        </button>
      </section>
    </PageFrame>
  );
}

const fmt = (n: number) => n.toLocaleString("hu-HU", { maximumFractionDigits: 1 });

/** Szorzó köznapi szavakkal: 1,15 -> "15%-kal több", 0,96 -> "4%-kal rövidebb", 1 -> "alap" */
function percentChange(mult: number, more: string, less: string) {
  const diff = Math.round((mult - 1) * 100);
  if (diff === 0) return "alap";
  return `${Math.abs(diff)}%-kal ${diff > 0 ? more : less}`;
}
