type Tone = "ok" | "wait" | "bad";

export function StatusDot({ tone, label }: { tone: Tone; label: string }) {
  return (
    <span className={`status status--${tone}`}>
      <span className="status__dot" />
      {label}
    </span>
  );
}
