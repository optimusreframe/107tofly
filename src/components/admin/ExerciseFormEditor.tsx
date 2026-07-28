import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Code2, LayoutGrid } from "lucide-react";

type Exercise = {
  id: string;
  concept_id: string;
  kind: string;
  payload: any;
  answer: any;
  explanation: string | null;
  difficulty: number;
  locale: string;
};

/**
 * Per-kind structured editor. Falls back to raw JSON when the user prefers it,
 * or when the payload shape is unrecognized.
 */
export function ExerciseFormEditor({
  ex,
  onChange,
}: {
  ex: Exercise;
  onChange: (patch: Partial<Exercise>) => void;
}) {
  const [rawMode, setRawMode] = useState(false);
  const p = ex.payload ?? {};
  const a = ex.answer ?? {};

  if (rawMode) {
    return (
      <div className="space-y-2">
        <div className="flex justify-end">
          <Button size="sm" variant="ghost" onClick={() => setRawMode(false)}>
            <LayoutGrid className="mr-1 h-3 w-3" /> Form mode
          </Button>
        </div>
        <RawJsonPair ex={ex} onChange={onChange} />
      </div>
    );
  }

  const header = (
    <div className="flex justify-end">
      <Button size="sm" variant="ghost" onClick={() => setRawMode(true)}>
        <Code2 className="mr-1 h-3 w-3" /> JSON mode
      </Button>
    </div>
  );

  if (ex.kind === "mcq") {
    const options: string[] = Array.isArray(p.options) ? p.options : [];
    const answerIdx: number = typeof a.index === "number" ? a.index : 0;
    return (
      <div className="space-y-2">
        {header}
        <label className="block text-xs text-muted-foreground">Question
          <Textarea rows={2} value={p.prompt ?? p.question ?? ""}
            onChange={(e) => onChange({ payload: { ...p, prompt: e.target.value, question: e.target.value } })} />
        </label>
        <label className="block text-xs text-muted-foreground">Hint (optional)
          <Input value={p.hint ?? ""} onChange={(e) => onChange({ payload: { ...p, hint: e.target.value || undefined } })} />
        </label>
        <div className="text-xs text-muted-foreground">Options (pick the correct one)</div>
        <div className="space-y-1">
          {options.map((opt, i) => (
            <div key={i} className="flex items-center gap-2">
              <input type="radio" checked={answerIdx === i} onChange={() => onChange({ answer: { index: i } })} />
              <Input value={opt} onChange={(e) => {
                const next = [...options]; next[i] = e.target.value;
                onChange({ payload: { ...p, options: next } });
              }} />
              <Button size="sm" variant="ghost" onClick={() => {
                const next = options.filter((_, j) => j !== i);
                onChange({
                  payload: { ...p, options: next },
                  answer: { index: Math.max(0, Math.min(answerIdx, next.length - 1)) },
                });
              }}><Trash2 className="h-3 w-3" /></Button>
            </div>
          ))}
        </div>
        <Button size="sm" variant="outline" onClick={() => onChange({ payload: { ...p, options: [...options, ""] } })}>
          <Plus className="mr-1 h-3 w-3" /> Option
        </Button>
      </div>
    );
  }

  if (ex.kind === "cloze") {
    const blanks: string[] = Array.isArray(a.blanks) ? a.blanks
      : typeof a.text === "string" ? [a.text] : [];
    return (
      <div className="space-y-2">
        {header}
        <label className="block text-xs text-muted-foreground">Prompt (use ____ for the blank)
          <Textarea rows={3} value={p.prompt ?? p.text ?? ""}
            onChange={(e) => onChange({ payload: { ...p, prompt: e.target.value, text: e.target.value } })} />
        </label>
        <label className="block text-xs text-muted-foreground">Hint (optional)
          <Input value={p.hint ?? ""} onChange={(e) => onChange({ payload: { ...p, hint: e.target.value || undefined } })} />
        </label>
        <div className="text-xs text-muted-foreground">Accepted answers (case-insensitive)</div>
        {blanks.map((b, i) => (
          <div key={i} className="flex items-center gap-2">
            <Input value={b} onChange={(e) => {
              const next = [...blanks]; next[i] = e.target.value;
              onChange({ answer: { blanks: next } });
            }} />
            <Button size="sm" variant="ghost" onClick={() => onChange({ answer: { blanks: blanks.filter((_, j) => j !== i) } })}>
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        ))}
        <Button size="sm" variant="outline" onClick={() => onChange({ answer: { blanks: [...blanks, ""] } })}>
          <Plus className="mr-1 h-3 w-3" /> Accepted answer
        </Button>
      </div>
    );
  }

  if (ex.kind === "order") {
    const items: string[] = Array.isArray(p.items) ? p.items : [];
    const order: number[] = Array.isArray(a.order) ? a.order : items.map((_, i) => i);
    return (
      <div className="space-y-2">
        {header}
        <label className="block text-xs text-muted-foreground">Prompt
          <Textarea rows={2} value={p.prompt ?? ""} onChange={(e) => onChange({ payload: { ...p, prompt: e.target.value } })} />
        </label>
        <div className="text-xs text-muted-foreground">Items (correct order top-to-bottom)</div>
        {order.map((idx, pos) => (
          <div key={pos} className="flex items-center gap-2">
            <span className="w-5 text-xs text-muted-foreground">{pos + 1}.</span>
            <Input value={items[idx] ?? ""} onChange={(e) => {
              const nextItems = [...items]; nextItems[idx] = e.target.value;
              onChange({ payload: { ...p, items: nextItems } });
            }} />
            <Button size="sm" variant="ghost" disabled={pos === 0} onClick={() => {
              const no = [...order];[no[pos - 1], no[pos]] = [no[pos], no[pos - 1]];
              onChange({ answer: { order: no } });
            }}>↑</Button>
            <Button size="sm" variant="ghost" disabled={pos === order.length - 1} onClick={() => {
              const no = [...order];[no[pos + 1], no[pos]] = [no[pos], no[pos + 1]];
              onChange({ answer: { order: no } });
            }}>↓</Button>
            <Button size="sm" variant="ghost" onClick={() => {
              const removedIdx = order[pos];
              const nextOrder = order.filter((_, j) => j !== pos).map((x) => (x > removedIdx ? x - 1 : x));
              const nextItems = items.filter((_, j) => j !== removedIdx);
              onChange({ payload: { ...p, items: nextItems }, answer: { order: nextOrder } });
            }}><Trash2 className="h-3 w-3" /></Button>
          </div>
        ))}
        <Button size="sm" variant="outline" onClick={() => {
          const nextItems = [...items, ""];
          onChange({ payload: { ...p, items: nextItems }, answer: { order: [...order, nextItems.length - 1] } });
        }}><Plus className="mr-1 h-3 w-3" /> Item</Button>
      </div>
    );
  }

  if (ex.kind === "match") {
    const left: string[] = Array.isArray(p.left) ? p.left : [];
    const right: string[] = Array.isArray(p.right) ? p.right : [];
    const pairs: Record<string, number> = (a.pairs && typeof a.pairs === "object") ? a.pairs : {};
    return (
      <div className="space-y-2">
        {header}
        <label className="block text-xs text-muted-foreground">Prompt
          <Textarea rows={2} value={p.prompt ?? ""} onChange={(e) => onChange({ payload: { ...p, prompt: e.target.value } })} />
        </label>
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Left</div>
            {left.map((v, i) => (
              <div key={i} className="flex gap-1">
                <Input value={v} onChange={(e) => {
                  const next = [...left]; next[i] = e.target.value;
                  onChange({ payload: { ...p, left: next } });
                }} />
                <select className="rounded-md border bg-background text-xs" value={pairs[String(i)] ?? ""}
                  onChange={(e) => {
                    const val = e.target.value === "" ? undefined : Number(e.target.value);
                    const next = { ...pairs };
                    if (val === undefined) delete next[String(i)]; else next[String(i)] = val;
                    onChange({ answer: { pairs: next } });
                  }}>
                  <option value="">→</option>
                  {right.map((r, j) => <option key={j} value={j}>{r || `#${j + 1}`}</option>)}
                </select>
                <Button size="sm" variant="ghost" onClick={() => {
                  const nextLeft = left.filter((_, j) => j !== i);
                  const nextPairs: Record<string, number> = {};
                  Object.entries(pairs).forEach(([k, v]) => {
                    const kn = Number(k);
                    if (kn === i) return;
                    nextPairs[String(kn > i ? kn - 1 : kn)] = v;
                  });
                  onChange({ payload: { ...p, left: nextLeft }, answer: { pairs: nextPairs } });
                }}><Trash2 className="h-3 w-3" /></Button>
              </div>
            ))}
            <Button size="sm" variant="outline" onClick={() => onChange({ payload: { ...p, left: [...left, ""] } })}>
              <Plus className="mr-1 h-3 w-3" /> Left
            </Button>
          </div>
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Right</div>
            {right.map((v, i) => (
              <div key={i} className="flex gap-1">
                <Input value={v} onChange={(e) => {
                  const next = [...right]; next[i] = e.target.value;
                  onChange({ payload: { ...p, right: next } });
                }} />
                <Button size="sm" variant="ghost" onClick={() => {
                  const nextRight = right.filter((_, j) => j !== i);
                  const nextPairs: Record<string, number> = {};
                  Object.entries(pairs).forEach(([k, v]) => {
                    if (v === i) return;
                    nextPairs[k] = v > i ? v - 1 : v;
                  });
                  onChange({ payload: { ...p, right: nextRight }, answer: { pairs: nextPairs } });
                }}><Trash2 className="h-3 w-3" /></Button>
              </div>
            ))}
            <Button size="sm" variant="outline" onClick={() => onChange({ payload: { ...p, right: [...right, ""] } })}>
              <Plus className="mr-1 h-3 w-3" /> Right
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (ex.kind === "multi_select") {
    const options: string[] = Array.isArray(p.options) ? p.options : [];
    const indices: number[] = Array.isArray(a.indices) ? a.indices : [];
    const toggle = (i: number) => {
      const set = new Set(indices);
      if (set.has(i)) set.delete(i);
      else set.add(i);
      onChange({ answer: { indices: Array.from(set).sort((x, y) => x - y) } });
    };
    return (
      <div className="space-y-2">
        {header}
        <label className="block text-xs text-muted-foreground">Question
          <Textarea rows={2} value={p.prompt ?? ""}
            onChange={(e) => onChange({ payload: { ...p, prompt: e.target.value } })} />
        </label>
        <label className="block text-xs text-muted-foreground">Hint (optional)
          <Input value={p.hint ?? ""} onChange={(e) => onChange({ payload: { ...p, hint: e.target.value || undefined } })} />
        </label>
        <div className="text-xs text-muted-foreground">Options (check all correct answers)</div>
        <div className="space-y-1">
          {options.map((opt, i) => (
            <div key={i} className="flex items-center gap-2">
              <input type="checkbox" checked={indices.includes(i)} onChange={() => toggle(i)} />
              <Input value={opt} onChange={(e) => {
                const next = [...options]; next[i] = e.target.value;
                onChange({ payload: { ...p, options: next } });
              }} />
              <Button size="sm" variant="ghost" onClick={() => {
                const next = options.filter((_, j) => j !== i);
                const nextIdx = indices
                  .filter((x) => x !== i)
                  .map((x) => (x > i ? x - 1 : x));
                onChange({ payload: { ...p, options: next }, answer: { indices: nextIdx } });
              }}><Trash2 className="h-3 w-3" /></Button>
            </div>
          ))}
        </div>
        <Button size="sm" variant="outline" onClick={() => onChange({ payload: { ...p, options: [...options, ""] } })}>
          <Plus className="mr-1 h-3 w-3" /> Option
        </Button>
      </div>
    );
  }

  if (ex.kind === "numeric") {
    const value = a.value ?? "";
    const tolerance = a.tolerance ?? 0;
    return (
      <div className="space-y-2">
        {header}
        <label className="block text-xs text-muted-foreground">Prompt
          <Textarea rows={2} value={p.prompt ?? ""}
            onChange={(e) => onChange({ payload: { ...p, prompt: e.target.value } })} />
        </label>
        <label className="block text-xs text-muted-foreground">Unit label (optional, e.g. ft, kt)
          <Input value={p.unit ?? ""} onChange={(e) => onChange({ payload: { ...p, unit: e.target.value || undefined } })} />
        </label>
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="block text-xs text-muted-foreground">Correct value
            <Input type="number" step="any" value={value === "" ? "" : String(value)}
              onChange={(e) => onChange({ answer: { ...a, value: e.target.value === "" ? null : Number(e.target.value) } })} />
          </label>
          <label className="block text-xs text-muted-foreground">± Tolerance
            <Input type="number" min={0} step="any" value={String(tolerance)}
              onChange={(e) => onChange({ answer: { ...a, tolerance: Math.max(0, Number(e.target.value) || 0) } })} />
          </label>
        </div>
      </div>
    );
  }

  if (ex.kind === "truefalse") {
    const value = typeof a.value === "boolean" ? a.value : true;
    return (
      <div className="space-y-2">
        {header}
        <label className="block text-xs text-muted-foreground">Statement
          <Textarea rows={2} value={p.prompt ?? ""}
            onChange={(e) => onChange({ payload: { ...p, prompt: e.target.value } })} />
        </label>
        <div className="flex items-center gap-4 text-sm">
          <label className="flex items-center gap-1">
            <input type="radio" checked={value === true} onChange={() => onChange({ answer: { value: true } })} /> True
          </label>
          <label className="flex items-center gap-1">
            <input type="radio" checked={value === false} onChange={() => onChange({ answer: { value: false } })} /> False
          </label>
        </div>
      </div>
    );
  }

  return <RawJsonPair ex={ex} onChange={onChange} />;
}

function RawJsonPair({ ex, onChange }: { ex: Exercise; onChange: (patch: Partial<Exercise>) => void }) {
  const [payloadStr, setPayloadStr] = useState(JSON.stringify(ex.payload, null, 2));
  const [answerStr, setAnswerStr] = useState(JSON.stringify(ex.answer, null, 2));
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <label className="text-xs text-muted-foreground">Payload
        <Textarea rows={6} className="font-mono text-xs" value={payloadStr}
          onChange={(e) => setPayloadStr(e.target.value)}
          onBlur={() => { try { onChange({ payload: JSON.parse(payloadStr) }); } catch { /* ignore */ } }} />
      </label>
      <label className="text-xs text-muted-foreground">Answer
        <Textarea rows={6} className="font-mono text-xs" value={answerStr}
          onChange={(e) => setAnswerStr(e.target.value)}
          onBlur={() => { try { onChange({ answer: JSON.parse(answerStr) }); } catch { /* ignore */ } }} />
      </label>
    </div>
  );
}
