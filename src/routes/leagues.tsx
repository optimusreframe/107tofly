import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { getWeeklyLeaderboard } from "@/lib/leagues.functions";
import { StudentAppShell } from "@/components/layouts/StudentAppShell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Loader2, Users, Swords } from "lucide-react";

export const Route = createFileRoute("/leagues")({
  head: () => ({
    meta: [
      { title: "Weekly Leagues · 107toFly" },
      { name: "description", content: "Compete with other pilots this week. Climb tiers from Bronze to Ace." },
      { property: "og:title", content: "Weekly Leagues · 107toFly" },
      { property: "og:description", content: "Compete with other pilots this week." },
    ],
  }),
  component: LeaguesPage,
});

type Entry = { rank: number; userId: string; xp: number; tier: string; displayName: string; avatarUrl: string | null; isMe: boolean };
type Board = { weekStart: string; entries: Entry[]; myEntry: Entry | null };

const TIER_COLORS: Record<string, string> = {
  ace: "bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/30",
  diamond: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
  gold: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  silver: "bg-slate-400/15 text-slate-300 border-slate-400/30",
  bronze: "bg-orange-700/15 text-orange-300 border-orange-700/30",
};

function LeaguesPage() {
  const load = useServerFn(getWeeklyLeaderboard);
  const [board, setBoard] = useState<Board | null>(null);
  useEffect(() => { load().then((b) => setBoard(b as Board)).catch(() => setBoard({ weekStart: "", entries: [], myEntry: null })); }, []);

  return (
    <StudentAppShell>
      <section className="mx-auto max-w-4xl px-6 pt-12 md:pt-16">
        <div className="flex items-end justify-between">
          <div>
            <div className="text-sm text-muted-foreground">Sprint I3 · Social</div>
            <h1 className="font-display text-3xl font-semibold md:text-5xl">Weekly Leagues</h1>
            <p className="mt-2 text-sm text-muted-foreground">Earn XP this week to climb tiers. Resets every Monday (UTC).</p>
          </div>
          {board?.myEntry && (
            <Badge variant="outline" className={TIER_COLORS[board.myEntry.tier] ?? ""}>
              Your tier · {board.myEntry.tier.toUpperCase()}
            </Badge>
          )}
        </div>

        <Card className="mt-6 p-4">
          {!board ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading leaderboard…</div>
          ) : board.entries.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              No entries yet this week. Complete a session to appear on the leaderboard.
            </div>
          ) : (
            <ol className="divide-y divide-border/60">
              {board.entries.map((e) => (
                <li key={e.userId} className={`flex items-center justify-between gap-3 py-3 ${e.isMe ? "bg-primary/5 rounded-lg px-2" : ""}`}>
                  <div className="flex items-center gap-3">
                    <div className="w-8 text-center font-display text-sm text-muted-foreground">
                      {e.rank === 1 ? "🥇" : e.rank === 2 ? "🥈" : e.rank === 3 ? "🥉" : e.rank}
                    </div>
                    <div className="text-sm font-medium">{e.displayName}{e.isMe ? " · you" : ""}</div>
                    <Badge variant="outline" className={`text-[10px] ${TIER_COLORS[e.tier] ?? ""}`}>{e.tier}</Badge>
                  </div>
                  <div className="inline-flex items-center gap-1.5 text-sm">
                    <Trophy className="h-3.5 w-3.5 text-primary" /> {e.xp} XP
                  </div>
                </li>
              ))}
            </ol>
          )}
        </Card>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Card className="p-4 opacity-60">
            <div className="flex items-center gap-2"><Swords className="h-4 w-4 text-primary" /><h3 className="text-sm font-semibold">Duels</h3></div>
            <p className="mt-1 text-xs text-muted-foreground">1v1 asynchronous duels · <span className="italic">Coming soon</span></p>
          </Card>
          <Card className="p-4 opacity-60">
            <div className="flex items-center gap-2"><Users className="h-4 w-4 text-primary" /><h3 className="text-sm font-semibold">Squadrons</h3></div>
            <p className="mt-1 text-xs text-muted-foreground">Team up with other pilots · <span className="italic">Coming soon</span></p>
          </Card>
        </div>
      </section>
    </StudentAppShell>
  );
}
