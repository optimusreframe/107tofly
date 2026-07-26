import { GripVertical } from "lucide-react";

type Ex = { id: string; kind: string; payload: any };

export function ExerciseView({ ex, pick, setPick, disabled }: { ex: Ex; pick: any; setPick: (v: any) => void; disabled: boolean }) {
  const p = ex.payload ?? {};

  if (ex.kind === "mcq") {
    const prompt: string = p.prompt ?? p.question ?? "";
    const options: string[] = Array.isArray(p.options) ? p.options : [];
    return (
      <div>
        <div className="text-base font-medium mb-3">{prompt}</div>
        <div className="grid gap-2">
          {options.map((opt, i) => {
            const selected = pick === i;
            return (
              <button key={i} type="button" disabled={disabled} onClick={() => setPick(i)}
                className={`text-left rounded-lg border p-3 text-sm transition ${selected ? "border-primary bg-primary/10" : "border-border hover:bg-muted/50"} disabled:opacity-70`}>
                {opt}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  if (ex.kind === "cloze") {
    const prompt: string = p.prompt ?? "";
    return (
      <div>
        <div className="text-base font-medium mb-3">{prompt}</div>
        <input type="text" disabled={disabled}
          value={typeof pick === "string" ? pick : (pick?.text ?? "")}
          onChange={(e) => setPick(e.target.value)}
          className="w-full rounded-md border bg-background p-2 text-sm"
          placeholder="Type your answer" />
      </div>
    );
  }

  if (ex.kind === "order") {
    const prompt: string = p.prompt ?? "Put in the correct order";
    const items: string[] = Array.isArray(p.items) ? p.items : [];
    const order: number[] = Array.isArray(pick?.order) ? pick.order : [];
    const remaining = items.map((_, i) => i).filter((i) => !order.includes(i));

    const add = (i: number) => !disabled && setPick({ order: [...order, i] });
    const remove = (i: number) => !disabled && setPick({ order: order.filter((x) => x !== i) });
    const reset = () => !disabled && setPick({ order: [] });

    return (
      <div>
        <div className="text-base font-medium mb-3">{prompt}</div>
        <div className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">Your order</div>
        <ol className="mb-3 space-y-1">
          {order.length === 0 && <li className="rounded-lg border border-dashed border-border/60 p-3 text-xs text-muted-foreground">Tap items below to build your sequence.</li>}
          {order.map((i, pos) => (
            <li key={i}>
              <button type="button" disabled={disabled} onClick={() => remove(i)}
                className="flex w-full items-center gap-2 rounded-lg border border-primary bg-primary/10 p-2 text-left text-sm disabled:opacity-70">
                <span className="text-xs text-muted-foreground w-5">{pos + 1}.</span>
                <GripVertical className="h-3 w-3 opacity-50" />
                <span className="flex-1">{items[i]}</span>
                <span className="text-xs text-muted-foreground">remove</span>
              </button>
            </li>
          ))}
        </ol>
        <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Choices</div>
        <div className="grid gap-2">
          {remaining.length === 0 && <div className="text-xs text-muted-foreground">All items used.</div>}
          {remaining.map((i) => (
            <button key={i} type="button" disabled={disabled} onClick={() => add(i)}
              className="text-left rounded-lg border border-border p-2 text-sm hover:bg-muted/50 disabled:opacity-70">
              {items[i]}
            </button>
          ))}
        </div>
        {order.length > 0 && !disabled && (
          <button type="button" onClick={reset} className="mt-2 text-xs text-muted-foreground underline">Reset</button>
        )}
      </div>
    );
  }

  if (ex.kind === "match") {
    const prompt: string = p.prompt ?? "Match each item";
    const left: string[] = Array.isArray(p.left) ? p.left : [];
    const right: string[] = Array.isArray(p.right) ? p.right : [];
    const pairs: Record<string, number> = (pick?.pairs && typeof pick.pairs === "object") ? pick.pairs : {};

    const setPair = (l: number, r: number) => {
      if (disabled) return;
      const next = { ...pairs, [String(l)]: r };
      setPick({ pairs: next });
    };

    return (
      <div>
        <div className="text-base font-medium mb-3">{prompt}</div>
        <div className="space-y-2">
          {left.map((label, i) => (
            <div key={i} className="flex items-center gap-2 rounded-lg border border-border p-2">
              <span className="flex-1 text-sm">{label}</span>
              <select disabled={disabled} value={pairs[String(i)] ?? ""}
                onChange={(e) => setPair(i, Number(e.target.value))}
                className="rounded-md border bg-background p-1 text-sm">
                <option value="">Select…</option>
                {right.map((r, j) => (<option key={j} value={j}>{r}</option>))}
              </select>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return <div className="text-sm text-muted-foreground">Unsupported exercise kind: {ex.kind}</div>;
}
