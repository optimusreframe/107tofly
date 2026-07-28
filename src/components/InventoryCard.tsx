import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getInventory, activateXpBoost, useStreakFreeze } from "@/lib/inventory.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Flame, Rocket, Loader2, Snowflake } from "lucide-react";
import { toast } from "sonner";

type Inv = { items: Array<{ itemKey: string; quantity: number; activeUntil: string | null }>; boostActive: boolean; boostActiveUntil: string | null };

export function InventoryCard() {
  const load = useServerFn(getInventory);
  const activate = useServerFn(activateXpBoost);
  const freeze = useServerFn(useStreakFreeze);
  const [inv, setInv] = useState<Inv | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const refresh = async () => { try { setInv(await load() as Inv); } catch {} };
  useEffect(() => { refresh(); }, []);

  const qty = (k: string) => inv?.items.find((i) => i.itemKey === k)?.quantity ?? 0;
  const boostLeftMin = inv?.boostActive && inv.boostActiveUntil
    ? Math.max(0, Math.round((new Date(inv.boostActiveUntil).getTime() - Date.now()) / 60000))
    : 0;

  const onBoost = async () => {
    setBusy("xp_boost");
    try {
      const r = await activate() as { activeUntil: string; alreadyActive: boolean };
      toast.success(r.alreadyActive ? "Boost already active" : "XP Boost activated (2× for 30 min)");
      await refresh();
    } catch (e: any) { toast.error(e?.message ?? "Failed to activate"); }
    finally { setBusy(null); }
  };
  const onFreeze = async () => {
    setBusy("streak_freeze");
    try { await freeze(); toast.success("Streak Freeze applied"); await refresh(); }
    catch (e: any) { toast.error(e?.message ?? "Failed"); }
    finally { setBusy(null); }
  };

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center gap-2">
        <Rocket className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold">Inventory</h3>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-border/60 p-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Flame className="h-4 w-4 text-orange-400" /> XP Boost
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            {inv?.boostActive ? `Active · ${boostLeftMin} min left` : `${qty("xp_boost")} available`}
          </div>
          <Button size="sm" className="mt-2 w-full" disabled={!!busy || inv?.boostActive || qty("xp_boost") < 1} onClick={onBoost}>
            {busy === "xp_boost" ? <Loader2 className="h-3 w-3 animate-spin" /> : inv?.boostActive ? "Active" : "Activate 2×"}
          </Button>
        </div>
        <div className="rounded-lg border border-border/60 p-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Snowflake className="h-4 w-4 text-sky-400" /> Streak Freeze
          </div>
          <div className="mt-1 text-xs text-muted-foreground">{qty("streak_freeze")} available</div>
          <Button size="sm" variant="outline" className="mt-2 w-full" disabled={!!busy || qty("streak_freeze") < 1} onClick={onFreeze}>
            {busy === "streak_freeze" ? <Loader2 className="h-3 w-3 animate-spin" /> : "Use"}
          </Button>
        </div>
      </div>
    </Card>
  );
}
