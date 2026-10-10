import { STATS, type StatPoints } from "../data/stats";

/** Stat bónuszok kis címkékként, a statok színével: elöl a konkrét hatás (pl. "+20 maximális mana"),
 *  mögötte halványan, melyik statból és hány pontból jön */
export function BonusChips({ bonus, empty = "Nincs bónusz" }: { bonus: Partial<StatPoints>; empty?: string }) {
  const list = STATS.filter((s) => (bonus[s.id] ?? 0) > 0);
  if (list.length === 0) return <span className="bonus-chips bonus-chips--empty">{empty}</span>;
  return (
    <span className="bonus-chips">
      {list.map((stat) => (
        <span
          key={stat.id}
          className="bonus-chip"
          style={{ "--stat-color": stat.color } as React.CSSProperties}
          title={`${stat.name}: +${bonus[stat.id]} pont`}
        >
          {stat.effect(bonus[stat.id]!)}
          <span className="bonus-chip__src">
            {stat.name} +{bonus[stat.id]}
          </span>
        </span>
      ))}
    </span>
  );
}

/** Mi változna a tárgy felvételével: statonként a hatás változása, zöld (jobb lesz) vagy piros (rosszabb lesz) */
export function BonusDiff({ from, to }: { from: StatPoints; to: StatPoints }) {
  const changes = STATS.map((stat) => ({ stat, delta: to[stat.id] - from[stat.id] })).filter((c) => c.delta !== 0);
  if (changes.length === 0) return <p className="bonus-diff bonus-diff--same">Ugyanannyi bónusz, mint most.</p>;
  return (
    <ul className="bonus-diff">
      {changes.map(({ stat, delta }) => (
        <li key={stat.id} className={delta > 0 ? "bonus-diff__up" : "bonus-diff__down"}>
          <span className="bonus-diff__sign">{delta > 0 ? "▲" : "▼"}</span>
          <span>{stat.effect(delta)}</span>
          <span className="bonus-diff__effect">
            ({stat.name} {delta > 0 ? "+" : "−"}
            {Math.abs(delta)} pont)
          </span>
        </li>
      ))}
    </ul>
  );
}
