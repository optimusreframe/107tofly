import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { StudentAppShell } from "@/components/layouts/StudentAppShell";
import { useAuth } from "@/hooks/use-auth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  getStudentSettings, updateStudentSettings, resetMyProgress,
} from "@/server/student-settings.functions";
import { LogOut, Settings as SettingsIcon, Bell, ShieldAlert } from "lucide-react";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — 107toFly" },
      { name: "description", content: "Manage your profile, preferences, and account." },
    ],
  }),
  component: SettingsPage,
});

type Settings = Awaited<ReturnType<typeof getStudentSettings>>;

function SettingsPage() {
  const { t, i18n } = useTranslation();
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const fetchSettings = useServerFn(getStudentSettings);
  const saveSettings = useServerFn(updateStudentSettings);
  const doReset = useServerFn(resetMyProgress);

  const [data, setData] = useState<Settings | null>(null);
  const [name, setName] = useState("");
  const [targetDate, setTargetDate] = useState<string>("");
  const [studyPlan, setStudyPlan] = useState<"4-week" | "intensive" | "flexible">("4-week");
  const [dailyGoal, setDailyGoal] = useState<number>(120);
  const [theme, setTheme] = useState<"light" | "dark" | "system">("system");
  const [reminderOn, setReminderOn] = useState(false);
  const [reminderTime, setReminderTime] = useState("19:00");
  const [saving, setSaving] = useState(false);
  const [resetText, setResetText] = useState("");
  const [resetting, setResetting] = useState(false);

  useEffect(() => { if (!loading && !user) navigate({ to: "/auth" }); }, [loading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    fetchSettings().then((d) => {
      setData(d);
      const p = d.profile as Record<string, unknown> | null;
      if (p) {
        setName((p.display_name as string) ?? "");
        setTargetDate(((p.target_exam_date as string) ?? (p.study_goal_date as string) ?? "") || "");
        setStudyPlan(((p.study_plan as string) ?? "4-week") as typeof studyPlan);
        setDailyGoal((p.daily_goal_minutes as number) ?? 120);
        setTheme(((p.preferred_theme as string) ?? "system") as typeof theme);
      }
    }).catch(() => undefined);
  }, [user, fetchSettings]);

  const onSave = async () => {
    setSaving(true);
    try {
      await saveSettings({ data: {
        display_name: name,
        preferred_language: (i18n.language?.startsWith("es") ? "es" : "en"),
        preferred_theme: theme,
        target_exam_date: targetDate || null,
        study_plan: studyPlan,
        daily_goal_minutes: Number(dailyGoal),
      }});
      applyTheme(theme);
      toast.success(t("settings.saved"));
    } catch {
      toast.error(t("common.error", { defaultValue: "Error" }));
    } finally {
      setSaving(false);
    }
  };

  const onReset = async () => {
    if (resetText !== "RESET") return;
    setResetting(true);
    try {
      await doReset({ data: { confirm: "RESET" } });
      toast.success(t("settings.resetDone"));
      setResetText("");
      navigate({ to: "/dashboard" });
    } catch {
      toast.error(t("common.error", { defaultValue: "Error" }));
    } finally {
      setResetting(false);
    }
  };

  const applyTheme = (mode: "light" | "dark" | "system") => {
    if (typeof document === "undefined") return;
    const isDark = mode === "dark" || (mode === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.classList.toggle("dark", isDark);
    localStorage.setItem("theme", isDark ? "dark" : "light");
  };

  const toggleLang = async () => {
    const next = i18n.language?.startsWith("es") ? "en" : "es";
    await i18n.changeLanguage(next);
    localStorage.setItem("locale", next);
  };

  if (loading || !user) {
    return <StudentAppShell><div className="mx-auto max-w-3xl px-6 pt-24 text-muted-foreground">{t("common.loading")}</div></StudentAppShell>;
  }

  return (
    <StudentAppShell>
      <section className="mx-auto max-w-3xl px-6 pt-12 md:pt-16 pb-20">
        <div className="flex items-center gap-3">
          <SettingsIcon className="h-6 w-6 text-primary" />
          <h1 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">{t("settings.title")}</h1>
        </div>

        {/* Profile */}
        <div className="glass mt-8 rounded-3xl p-6">
          <h2 className="font-display text-lg font-semibold">{t("settings.profile")}</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="name">{t("settings.name")}</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">{t("settings.email")}</Label>
              <Input id="email" value={data?.email ?? user.email ?? ""} readOnly disabled />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="target">{t("settings.targetDate")}</Label>
              <Input id="target" type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="plan">{t("settings.studyPlan")}</Label>
              <Select value={studyPlan} onValueChange={(v) => setStudyPlan(v as typeof studyPlan)}>
                <SelectTrigger id="plan"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="4-week">{t("settings.plan4w")}</SelectItem>
                  <SelectItem value="intensive">{t("settings.planIntensive")}</SelectItem>
                  <SelectItem value="flexible">{t("settings.planFlexible")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="goal">{t("settings.dailyGoal")}</Label>
              <Input id="goal" type="number" min={15} max={480} step={15} value={dailyGoal} onChange={(e) => setDailyGoal(Number(e.target.value))} />
            </div>
          </div>
        </div>

        {/* Preferences */}
        <div className="glass mt-4 rounded-3xl p-6">
          <h2 className="font-display text-lg font-semibold">{t("settings.preferences")}</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>{t("settings.language")}</Label>
              <Button variant="outline" onClick={toggleLang} className="w-full justify-between">
                <span>{i18n.language?.startsWith("es") ? "Español" : "English"}</span>
                <span className="text-xs text-muted-foreground">{t("settings.toggle")}</span>
              </Button>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="theme">{t("settings.theme")}</Label>
              <Select value={theme} onValueChange={(v) => { setTheme(v as typeof theme); applyTheme(v as typeof theme); }}>
                <SelectTrigger id="theme"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">{t("settings.light")}</SelectItem>
                  <SelectItem value="dark">{t("settings.dark")}</SelectItem>
                  <SelectItem value="system">{t("settings.system")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Notifications placeholder */}
        <div className="glass mt-4 rounded-3xl p-6 opacity-80">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-muted-foreground" />
            <h2 className="font-display text-lg font-semibold">{t("settings.notifications")}</h2>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="flex items-center justify-between rounded-xl border border-border bg-card/40 px-4 py-3">
              <Label htmlFor="rem" className="m-0">{t("settings.studyReminder")}</Label>
              <Switch id="rem" checked={reminderOn} onCheckedChange={setReminderOn} disabled />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="remTime">{t("settings.reminderTime")}</Label>
              <Input id="remTime" type="time" value={reminderTime} onChange={(e) => setReminderTime(e.target.value)} disabled />
            </div>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">{t("settings.notificationsSoon")}</p>
        </div>

        {/* Save */}
        <div className="mt-4 flex justify-end gap-2">
          <Button onClick={onSave} disabled={saving}>
            {saving ? t("common.loading") : t("settings.save")}
          </Button>
        </div>

        {/* Account */}
        <div className="glass mt-8 rounded-3xl p-6">
          <h2 className="font-display text-lg font-semibold">{t("settings.account")}</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => signOut().then(() => navigate({ to: "/" }))}>
              <LogOut className="mr-2 h-4 w-4" /> {t("settings.logout")}
            </Button>
          </div>

          <div className="mt-6 rounded-2xl border border-destructive/40 bg-destructive/5 p-4">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-destructive" />
              <h3 className="font-display text-base font-semibold text-destructive">{t("settings.resetTitle")}</h3>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{t("settings.resetWhat")}</p>
            <ul className="mt-2 list-disc pl-5 text-xs text-muted-foreground">
              <li>{t("settings.resetItem.lessons")}</li>
              <li>{t("settings.resetItem.quizzes")}</li>
              <li>{t("settings.resetItem.sims")}</li>
              <li>{t("settings.resetItem.flashcards")}</li>
              <li>{t("settings.resetItem.progress")}</li>
            </ul>
            <p className="mt-2 text-xs text-muted-foreground">{t("settings.resetKeeps")}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Input
                value={resetText}
                onChange={(e) => setResetText(e.target.value)}
                placeholder={t("settings.typeReset")}
                className="max-w-xs"
              />
              <Button variant="destructive" disabled={resetText !== "RESET" || resetting} onClick={onReset}>
                {resetting ? t("common.loading") : t("settings.confirmReset")}
              </Button>
            </div>
          </div>
        </div>

        <div className="mt-6 text-center text-xs text-muted-foreground">
          <Link to="/dashboard" className="underline">← {t("student.backToDashboard")}</Link>
        </div>
      </section>
    </StudentAppShell>
  );
}
