export function MasteryRing({ pct, size = 40 }: { pct: number; size?: number }) {
  const clamped = Math.max(0, Math.min(100, pct));
  const stroke = 4;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - clamped / 100);
  const color =
    clamped >= 80 ? "var(--success, #22c55e)" :
    clamped >= 50 ? "var(--primary, #3b82f6)" :
    clamped >= 20 ? "var(--warning, #f59e0b)" : "hsl(var(--muted-foreground))";
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} className="fill-none stroke-muted" />
        <circle
          cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke}
          className="fill-none transition-all"
          strokeDasharray={c} strokeDashoffset={offset}
          strokeLinecap="round" style={{ stroke: color }}
        />
      </svg>
      <span className="absolute text-[10px] font-semibold tabular-nums">{clamped}%</span>
    </div>
  );
}
