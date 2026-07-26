import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useServerFn } from "@tanstack/react-start";
import { Shield, Search, Plus, Copy, Archive, RotateCcw, Save, Loader2, CheckCircle2, Languages, Sparkles } from "lucide-react";
import { AdminAppShell } from "@/components/layouts/AdminAppShell";
import { useAuth } from "@/hooks/use-auth";
import { useRoles } from "@/hooks/use-role";
import { useDeviceMode } from "@/hooks/use-device-mode";
import {
  getAdminQuestions,
  createAdminQuestion,
  updateAdminQuestion,
  archiveAdminQuestion,
  duplicateAdminQuestion,
} from "@/lib/admin.functions";
import {
  generateQuestionSpanishDraft,
  saveQuestionSpanishTranslation,
  publishQuestionTranslation,
  markQuestionTranslationReviewed,
} from "@/lib/admin-translations.functions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/questions")({
  head: () => ({ meta: [{ title: "Questions — Admin · 107toFly" }, { name: "robots", content: "noindex" }] }),
  component: AdminQuestionsPage,
});

type Q = {
  id: string; question: string; options: string[]; correct_index: number;
  explanation: string; common_mistake: string | null; topic: string;
  difficulty: string; acs_code: string; source: string; tags: string[] | null;
  status: string; locale: string; version?: number; updated_at?: string; updated_by?: string | null;
  translation_group_id?: string | null;
  source_question_id?: string | null;
  translated_from_locale?: string | null;
  translation_status?: string | null;
  ai_translation_metadata?: Record<string, unknown> | null;
};

const TOPICS = ["regulations","airspace","sectional","weather","performance","operations","adm","emergencies","remote_id","maintenance"];
const DIFFS = ["easy","medium","hard"] as const;
const STATUSES = ["draft","reviewed","published","archived"] as const;
const LOCALES = ["en","es"] as const;
const TRANSLATION_FILTERS = ["all","original","missing_es","ai_draft","reviewed","published","needs_review"] as const;

type DraftPayload = {
  question: string;
  options: string[];
  explanation: string;
  common_mistake: string;
  tags: string[];
  warnings: string[];
};

function AdminQuestionsPage() {
  const { t } = useTranslation();
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: rolesLoading } = useRoles();
  const navigate = useNavigate();
  const { isMobile } = useDeviceMode();
  const fetchList = useServerFn(getAdminQuestions);
  const createFn = useServerFn(createAdminQuestion);
  const updateFn = useServerFn(updateAdminQuestion);
  const archiveFn = useServerFn(archiveAdminQuestion);
  const dupFn = useServerFn(duplicateAdminQuestion);
  const genEsFn = useServerFn(generateQuestionSpanishDraft);
  const saveEsFn = useServerFn(saveQuestionSpanishTranslation);
  const publishEsFn = useServerFn(publishQuestionTranslation);
  const reviewEsFn = useServerFn(markQuestionTranslationReviewed);

  const [items, setItems] = useState<Q[] | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [topicFilter, setTopicFilter] = useState("all");
  const [diffFilter, setDiffFilter] = useState("all");
  const [localeFilter, setLocaleFilter] = useState<string>("all");
  const [translationFilter, setTranslationFilter] = useState<string>("all");
  const [editing, setEditing] = useState<Q | null>(null);
  const [draft, setDraft] = useState<Partial<Q> | null>(null);
  const [saving, setSaving] = useState(false);
  const [previewIdx, setPreviewIdx] = useState<number | null>(null);

  // Translation drawer state
  const [trDraft, setTrDraft] = useState<DraftPayload | null>(null);
  const [trSource, setTrSource] = useState<Q | null>(null);
  const [trTarget, setTrTarget] = useState<Q | null>(null);
  const [trMeta, setTrMeta] = useState<Record<string, unknown> | null>(null);
  const [trBusy, setTrBusy] = useState(false);
  const [trLoading, setTrLoading] = useState(false);

  // Bulk
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState<{ i: number; n: number } | null>(null);

  useEffect(() => { if (!authLoading && !user) navigate({ to: "/auth" }); }, [authLoading, user, navigate]);

  const refresh = () => {
    if (!isAdmin) return;
    fetchList().then((r) => setItems(r.questions as unknown as Q[])).catch((e) => toast.error(e?.message ?? "Error"));
  };
  useEffect(refresh, [isAdmin]); // eslint-disable-line

  // Index by translation_group
  const byGroup = useMemo(() => {
    const m = new Map<string, { en?: Q; es?: Q }>();
    for (const it of items ?? []) {
      const gid = it.translation_group_id ?? it.id;
      const cur = m.get(gid) ?? {};
      if (it.locale === "es") cur.es = it;
      else cur.en = it;
      m.set(gid, cur);
    }
    return m;
  }, [items]);

  const translationStateOf = (it: Q): "original" | "missing_es" | "ai_draft" | "reviewed" | "published" | "needs_review" | "es_translation" => {
    if (it.locale === "es") return (it.translation_status as "ai_draft" | "reviewed" | "published" | "needs_review") ?? "ai_draft";
    const gid = it.translation_group_id ?? it.id;
    const es = byGroup.get(gid)?.es;
    if (!es) return "missing_es";
    const ts = (es.translation_status ?? "ai_draft") as "ai_draft" | "reviewed" | "published" | "needs_review";
    return ts;
  };

  const filtered = useMemo(() => {
    if (!items) return [];
    const q = search.trim().toLowerCase();
    return items.filter((it) => {
      if (statusFilter !== "all" && it.status !== statusFilter) return false;
      if (topicFilter !== "all" && it.topic !== topicFilter) return false;
      if (diffFilter !== "all" && it.difficulty !== diffFilter) return false;
      if (localeFilter !== "all" && it.locale !== localeFilter) return false;
      if (translationFilter !== "all") {
        if (translationFilter === "original") {
          if (it.locale !== "en") return false;
        } else if (translationFilter === "missing_es") {
          if (it.locale !== "en") return false;
          const gid = it.translation_group_id ?? it.id;
          if (byGroup.get(gid)?.es) return false;
        } else {
          // ai_draft / reviewed / published / needs_review on the ES row
          if (it.locale !== "es") return false;
          if ((it.translation_status ?? "ai_draft") !== translationFilter) return false;
        }
      }
      if (q && !`${it.question} ${it.source} ${it.acs_code} ${(it.tags ?? []).join(" ")}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [items, search, statusFilter, topicFilter, diffFilter, localeFilter, translationFilter, byGroup]);

  const counts = useMemo(() => {
    const c = { total: items?.length ?? 0, published: 0, draft: 0, archived: 0 };
    for (const it of items ?? []) {
      if (it.status === "published") c.published++;
      else if (it.status === "archived") c.archived++;
      else c.draft++;
    }
    return c;
  }, [items]);

  const openEditor = (q: Q | null) => {
    setEditing(q);
    setPreviewIdx(null);
    setDraft(q ?? {
      question: "", options: ["","","",""], correct_index: 0,
      explanation: "", common_mistake: "", topic: "regulations", difficulty: "medium",
      acs_code: "", source: "", tags: [], status: "draft", locale: "en",
    });
  };

  const save = async () => {
    if (!draft) return;
    setSaving(true);
    try {
      const payload = {
        question: draft.question ?? "",
        options: (draft.options ?? ["","","",""]) as string[],
        correct_index: Number(draft.correct_index ?? 0),
        explanation: draft.explanation ?? "",
        common_mistake: draft.common_mistake ?? null,
        topic: (draft.topic ?? "regulations") as never,
        difficulty: (draft.difficulty ?? "medium") as never,
        acs_code: draft.acs_code ?? "",
        source: draft.source ?? "",
        tags: (draft.tags ?? []) as string[],
        status: (draft.status ?? "draft") as never,
        locale: draft.locale ?? "en",
      };
      if (editing) await updateFn({ data: { id: editing.id, input: payload } });
      else await createFn({ data: payload });
      toast.success(t(editing ? "admin.questions.updated" : "admin.questions.created"));
      setDraft(null); setEditing(null); refresh();
    } catch (e) { toast.error((e as Error).message); }
    finally { setSaving(false); }
  };

  const onArchive = async (q: Q) => {
    try {
      await archiveFn({ data: { id: q.id, restore: q.status === "archived" } });
      toast.success(t(q.status === "archived" ? "admin.questions.restored" : "admin.questions.archived"));
      refresh();
    } catch (e) { toast.error((e as Error).message); }
  };
  const onDup = async (q: Q) => {
    try { await dupFn({ data: { id: q.id } }); toast.success(t("admin.questions.duplicated")); refresh(); }
    catch (e) { toast.error((e as Error).message); }
  };

  // ============ Translation flow ============
  const openTranslationDrawer = async (enQ: Q) => {
    setTrLoading(true);
    setTrSource(enQ);
    const gid = enQ.translation_group_id ?? enQ.id;
    const existing = byGroup.get(gid)?.es ?? null;
    setTrTarget(existing);
    try {
      const r = await genEsFn({ data: { questionId: enQ.id } });
      setTrDraft(r.draft);
      setTrMeta(r.meta as Record<string, unknown>);
      toast.success(t("admin.questions.translation.generated"));
    } catch (e) {
      toast.error((e as Error).message || t("admin.questions.translation.invalidAi"));
      setTrSource(null);
      setTrTarget(null);
    } finally {
      setTrLoading(false);
    }
  };

  const openExistingTranslation = (enQ: Q) => {
    const gid = enQ.translation_group_id ?? enQ.id;
    const existing = byGroup.get(gid)?.es;
    if (!existing) return;
    openEditor(existing);
  };

  const persistTranslation = async (mode: "draft" | "reviewed" | "published", overwrite = false) => {
    if (!trDraft || !trSource) return;
    setTrBusy(true);
    try {
      const translation_status = mode === "draft" ? "ai_draft" : mode;
      const question_status = mode === "draft" ? "draft" : mode;
      await saveEsFn({
        data: {
          sourceQuestionId: trSource.id,
          targetQuestionId: trTarget?.id ?? null,
          question: trDraft.question,
          options: trDraft.options as [string, string, string, string],
          explanation: trDraft.explanation,
          common_mistake: trDraft.common_mistake || null,
          tags: trDraft.tags,
          translation_status,
          question_status,
          ai_metadata: trMeta ?? {},
          overwritePublished: overwrite,
        },
      });
      toast.success(
        mode === "published" ? t("admin.questions.translation.published")
        : mode === "reviewed" ? t("admin.questions.translation.marked")
        : t("admin.questions.translation.saved"),
      );
      setTrDraft(null); setTrSource(null); setTrTarget(null); setTrMeta(null);
      refresh();
    } catch (e) {
      const msg = (e as Error).message;
      if (msg === "PUBLISHED_ES_EXISTS") {
        if (window.confirm(t("admin.questions.translation.publishedExists"))) {
          await persistTranslation(mode, true);
          return;
        }
      } else if (msg === "SIMILAR_ES_EXISTS") {
        toast.error(t("admin.questions.translation.similarExists"));
      } else {
        toast.error(msg);
      }
    } finally {
      setTrBusy(false);
    }
  };

  const publishExistingEs = async (esQ: Q) => {
    try { await publishEsFn({ data: { questionId: esQ.id } }); toast.success(t("admin.questions.translation.published")); refresh(); }
    catch (e) { toast.error((e as Error).message); }
  };
  const markReviewedExistingEs = async (esQ: Q) => {
    try { await reviewEsFn({ data: { questionId: esQ.id } }); toast.success(t("admin.questions.translation.marked")); refresh(); }
    catch (e) { toast.error((e as Error).message); }
  };

  // Bulk
  const toggleSel = (id: string) => {
    const s = new Set(selected);
    if (s.has(id)) s.delete(id); else s.add(id);
    setSelected(s);
  };
  const runBulk = async () => {
    const ids = [...selected].slice(0, 5);
    if (ids.length === 0) return;
    if (!window.confirm(t("admin.questions.translation.bulkConfirm", { count: ids.length }))) return;
    for (let i = 0; i < ids.length; i++) {
      setBulkBusy({ i: i + 1, n: ids.length });
      try {
        const r = await genEsFn({ data: { questionId: ids[i] } });
        await saveEsFn({
          data: {
            sourceQuestionId: ids[i],
            targetQuestionId: null,
            question: r.draft.question,
            options: r.draft.options as [string, string, string, string],
            explanation: r.draft.explanation,
            common_mistake: r.draft.common_mistake || null,
            tags: r.draft.tags,
            translation_status: "ai_draft",
            question_status: "draft",
            ai_metadata: r.meta as Record<string, unknown>,
          },
        });
      } catch (e) { toast.error(`#${i + 1}: ${(e as Error).message}`); }
    }
    setBulkBusy(null);
    setSelected(new Set());
    toast.success(t("admin.questions.translation.saved"));
    refresh();
  };

  if (authLoading || rolesLoading) return <AdminAppShell><div className="p-8 text-sm text-muted-foreground">{t("common.loading")}</div></AdminAppShell>;
  if (!isAdmin) return (
    <AdminAppShell>
      <div className="mx-auto max-w-md p-8 text-center">
        <Shield className="mx-auto h-10 w-10 text-muted-foreground" />
        <h1 className="mt-4 text-2xl font-semibold">Access denied</h1>
        <Link to="/dashboard" className="mt-6 inline-flex rounded-full bg-foreground px-4 py-2 text-sm text-background">Volver</Link>
      </div>
    </AdminAppShell>
  );

  const renderTranslationBadge = (it: Q) => {
    if (it.locale === "es") {
      const ts = (it.translation_status ?? "ai_draft") as string;
      const label =
        ts === "published" ? t("admin.questions.translation.esReady")
        : ts === "reviewed" ? t("admin.questions.translation.esReviewed")
        : ts === "needs_review" ? t("admin.questions.translation.esNeedsReview")
        : t("admin.questions.translation.esDraft");
      return <Badge variant="outline" className="border-sky-500/50 text-sky-600 dark:text-sky-300">{label}</Badge>;
    }
    const state = translationStateOf(it);
    if (state === "missing_es") return <Badge variant="outline" className="border-amber-500/50 text-amber-600 dark:text-amber-300">{t("admin.questions.translation.esMissing")}</Badge>;
    if (state === "ai_draft") return <Badge variant="outline" className="border-blue-500/40 text-blue-600 dark:text-blue-300">{t("admin.questions.translation.esDraft")}</Badge>;
    if (state === "reviewed") return <Badge variant="outline" className="border-emerald-500/40 text-emerald-600 dark:text-emerald-300">{t("admin.questions.translation.esReviewed")}</Badge>;
    if (state === "published") return <Badge variant="outline" className="border-emerald-500/60 text-emerald-700 dark:text-emerald-300">{t("admin.questions.translation.esReady")}</Badge>;
    if (state === "needs_review") return <Badge variant="outline" className="border-orange-500/50 text-orange-600 dark:text-orange-300">{t("admin.questions.translation.esNeedsReview")}</Badge>;
    return null;
  };

  return (
    <AdminAppShell>
      <div className="mx-auto max-w-7xl px-4 py-6 lg:px-8">
        <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl font-semibold tracking-tight">{t("admin.questions.title")}</h1>
            <p className="text-sm text-muted-foreground">{counts.total} total · {counts.published} {t("admin.status.published").toLowerCase()} · {counts.draft} {t("admin.status.draft").toLowerCase()} · {counts.archived} {t("admin.status.archived").toLowerCase()}</p>
          </div>
          <div className="flex items-center gap-2">
            {selected.size > 0 && (
              <Button variant="outline" onClick={runBulk} disabled={!!bulkBusy}>
                {bulkBusy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Sparkles className="mr-1.5 h-4 w-4" />}
                {bulkBusy ? t("admin.questions.translation.bulkProgress", { i: bulkBusy.i, n: bulkBusy.n }) : `${t("admin.questions.translation.bulkGenerate")} (${Math.min(selected.size, 5)})`}
              </Button>
            )}
            <Button onClick={() => openEditor(null)}><Plus className="mr-1.5 h-4 w-4" /> {t("admin.questions.new")}</Button>
          </div>
        </header>

        <div className="mb-4 grid gap-2 sm:grid-cols-[1fr_auto_auto_auto_auto_auto]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("admin.questions.searchPh")} className="pl-9" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="all">{t("admin.common.allStatus")}</SelectItem>{STATUSES.map(s => <SelectItem key={s} value={s}>{t(`admin.status.${s}`)}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={topicFilter} onValueChange={setTopicFilter}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="all">{t("admin.common.allTopics")}</SelectItem>{TOPICS.map(tp => <SelectItem key={tp} value={tp}>{tp}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={diffFilter} onValueChange={setDiffFilter}>
            <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="all">{t("admin.common.allDifficulty")}</SelectItem>{DIFFS.map(d => <SelectItem key={d} value={d}>{t(`admin.diff.${d}`)}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={localeFilter} onValueChange={setLocaleFilter}>
            <SelectTrigger className="w-[110px]"><SelectValue placeholder={t("admin.questions.translation.filterLocale")} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("admin.questions.translation.all")}</SelectItem>
              {LOCALES.map(lc => <SelectItem key={lc} value={lc}>{lc.toUpperCase()}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={translationFilter} onValueChange={setTranslationFilter}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder={t("admin.questions.translation.filterTranslation")} /></SelectTrigger>
            <SelectContent>
              {TRANSLATION_FILTERS.map(f => (
                <SelectItem key={f} value={f}>
                  {f === "all" ? t("admin.questions.translation.all")
                    : f === "original" ? t("admin.questions.translation.original")
                    : f === "missing_es" ? t("admin.questions.translation.missingEs")
                    : f === "ai_draft" ? t("admin.questions.translation.aiDraft")
                    : f === "reviewed" ? t("admin.questions.translation.reviewed")
                    : f === "published" ? t("admin.questions.translation.published2")
                    : t("admin.questions.translation.needsReview")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {!items ? (
          <div className="rounded-2xl border border-border/60 p-8 text-center text-sm text-muted-foreground">{t("admin.common.loading")}</div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-border/60 p-8 text-center text-sm text-muted-foreground">{t("admin.common.empty")}</div>
        ) : isMobile ? (
          <div className="space-y-2">
            {filtered.map((q) => (
              <div key={q.id} className="rounded-2xl border border-border/60 bg-card/40 p-4">
                <button onClick={() => openEditor(q)} className="block w-full text-left">
                  <div className="text-sm line-clamp-2">{q.question}</div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    <Badge variant="secondary">{q.locale.toUpperCase()}</Badge>
                    <Badge variant="secondary">{q.topic}</Badge>
                    <Badge variant={q.status === "published" ? "default" : "secondary"}>{t(`admin.status.${q.status}`)}</Badge>
                    {renderTranslationBadge(q)}
                  </div>
                </button>
                {q.locale === "en" && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {translationStateOf(q) === "missing_es" ? (
                      <Button size="sm" variant="outline" onClick={() => openTranslationDrawer(q)}><Sparkles className="mr-1 h-3.5 w-3.5" />{t("admin.questions.translation.generate")}</Button>
                    ) : (
                      <>
                        <Button size="sm" variant="outline" onClick={() => openExistingTranslation(q)}><Languages className="mr-1 h-3.5 w-3.5" />{t("admin.questions.translation.edit")}</Button>
                        <Button size="sm" variant="ghost" onClick={() => openTranslationDrawer(q)}>{t("admin.questions.translation.regenerate")}</Button>
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-border/60">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="w-8 px-2 py-2"></th>
                  <th className="px-3 py-2 text-left">{t("admin.questions.question")}</th>
                  <th className="px-3 py-2 text-left">{t("admin.common.locale")}</th>
                  <th className="px-3 py-2 text-left">{t("admin.common.topic")}</th>
                  <th className="px-3 py-2 text-left">{t("admin.common.status")}</th>
                  <th className="px-3 py-2 text-left">{t("admin.questions.translation.panelTitle")}</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, 500).map((q) => (
                  <tr key={q.id} className="border-t border-border/40 hover:bg-accent/30">
                    <td className="px-2 py-2">
                      {q.locale === "en" && translationStateOf(q) === "missing_es" && (
                        <input type="checkbox" checked={selected.has(q.id)} onChange={() => toggleSel(q.id)} className="h-4 w-4" />
                      )}
                    </td>
                    <td className="max-w-md px-3 py-2"><button onClick={() => openEditor(q)} className="text-left line-clamp-2 hover:underline">{q.question}</button></td>
                    <td className="px-3 py-2"><Badge variant="secondary">{q.locale.toUpperCase()}</Badge></td>
                    <td className="px-3 py-2 text-xs">{q.topic}</td>
                    <td className="px-3 py-2"><Badge variant={q.status === "published" ? "default" : "secondary"}>{t(`admin.status.${q.status}`)}</Badge></td>
                    <td className="px-3 py-2">{renderTranslationBadge(q)}</td>
                    <td className="px-3 py-2 text-right">
                      <div className="flex justify-end gap-1">
                        {q.locale === "en" && (
                          translationStateOf(q) === "missing_es" ? (
                            <button onClick={() => openTranslationDrawer(q)} className="inline-flex h-8 items-center gap-1 rounded-md px-2 text-xs hover:bg-accent" title={t("admin.questions.translation.generate")}>
                              <Sparkles className="h-3.5 w-3.5" /> ES
                            </button>
                          ) : (
                            <>
                              <button onClick={() => openExistingTranslation(q)} className="inline-flex h-8 items-center gap-1 rounded-md px-2 text-xs hover:bg-accent" title={t("admin.questions.translation.edit")}>
                                <Languages className="h-3.5 w-3.5" /> ES
                              </button>
                              <button onClick={() => openTranslationDrawer(q)} className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-accent" title={t("admin.questions.translation.regenerate")}>
                                <Sparkles className="h-3.5 w-3.5" />
                              </button>
                            </>
                          )
                        )}
                        <button onClick={() => onDup(q)} className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-accent" title={t("admin.common.duplicate")}><Copy className="h-4 w-4" /></button>
                        <button onClick={() => onArchive(q)} className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-accent" title={q.status === "archived" ? t("admin.common.restore") : t("admin.common.archive")}>
                          {q.status === "archived" ? <RotateCcw className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length > 500 && <div className="border-t border-border/40 p-2 text-center text-xs text-muted-foreground">Showing first 500 of {filtered.length}</div>}
          </div>
        )}
      </div>

      {/* Editor sheet */}
      <Sheet open={!!draft} onOpenChange={(o) => { if (!o) { setDraft(null); setEditing(null); } }}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-2xl">
          <SheetHeader><SheetTitle>{editing ? t("admin.questions.edit") : t("admin.questions.new")}</SheetTitle></SheetHeader>
          {draft && (
            <div className="mt-4 grid gap-3">
              {editing && (
                <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                  <Badge variant="secondary">{t("admin.common.version")} {editing.version ?? 1}</Badge>
                  <Badge variant="secondary">{t(`admin.status.${editing.status}`)}</Badge>
                  {editing.locale === "es" && <Badge variant="outline" className="border-sky-500/50 text-sky-600 dark:text-sky-300">{t("admin.questions.translation.translatedFromEn")}</Badge>}
                  {editing.updated_at && <span>{t("admin.common.updated")}: {new Date(editing.updated_at).toLocaleString()}</span>}
                </div>
              )}

              {editing && editing.locale === "es" && editing.source_question_id && (
                <div className="rounded-xl border border-border/60 bg-muted/20 p-3 text-xs">
                  <div className="mb-1 font-semibold uppercase tracking-wide text-muted-foreground">{t("admin.questions.translation.sourceQuestion")}</div>
                  <button className="text-left text-sm hover:underline" onClick={() => {
                    const en = (items ?? []).find((x) => x.id === editing.source_question_id);
                    if (en) openEditor(en);
                  }}>
                    {(items ?? []).find((x) => x.id === editing.source_question_id)?.question ?? editing.source_question_id}
                  </button>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <Button size="sm" variant="outline" onClick={() => markReviewedExistingEs(editing)}>{t("admin.questions.translation.saveReviewed")}</Button>
                    <Button size="sm" onClick={() => publishExistingEs(editing)}>{t("admin.questions.translation.publish")}</Button>
                  </div>
                </div>
              )}

              {editing && editing.locale === "en" && (
                <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("admin.questions.translation.panelTitle")}</div>
                    {renderTranslationBadge(editing)}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {translationStateOf(editing) === "missing_es" ? (
                      <Button size="sm" onClick={() => openTranslationDrawer(editing)}><Sparkles className="mr-1 h-3.5 w-3.5" />{t("admin.questions.translation.generate")}</Button>
                    ) : (
                      <>
                        <Button size="sm" variant="outline" onClick={() => openExistingTranslation(editing)}><Languages className="mr-1 h-3.5 w-3.5" />{t("admin.questions.translation.edit")}</Button>
                        <Button size="sm" variant="ghost" onClick={() => openTranslationDrawer(editing)}>{t("admin.questions.translation.regenerate")}</Button>
                      </>
                    )}
                  </div>
                </div>
              )}

              <label className="text-xs"><span className="text-muted-foreground">{t("admin.questions.question")}</span>
                <Textarea rows={3} value={draft.question ?? ""} onChange={(e) => setDraft({ ...draft, question: e.target.value })} /></label>
              <div className="grid gap-2">
                <span className="text-xs text-muted-foreground">{t("admin.questions.options")}</span>
                {[0,1,2,3].map((i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input type="radio" checked={draft.correct_index === i} onChange={() => setDraft({ ...draft, correct_index: i })} className="h-4 w-4" />
                    <Input value={(draft.options ?? ["","","",""])[i] ?? ""} onChange={(e) => {
                      const opts = [...((draft.options as string[]) ?? ["","","",""])]; opts[i] = e.target.value;
                      setDraft({ ...draft, options: opts });
                    }} placeholder={`Option ${i+1}`} />
                  </div>
                ))}
              </div>
              <label className="text-xs"><span className="text-muted-foreground">{t("admin.questions.explanation")}</span>
                <Textarea rows={4} value={draft.explanation ?? ""} onChange={(e) => setDraft({ ...draft, explanation: e.target.value })} />
                <span className="text-[10px] text-muted-foreground">{t("admin.questions.explanationHint", { count: (draft.explanation ?? "").split(/\s+/).filter(Boolean).length })}</span>
              </label>
              <label className="text-xs"><span className="text-muted-foreground">{t("admin.questions.commonMistake")}</span>
                <Textarea rows={2} value={draft.common_mistake ?? ""} onChange={(e) => setDraft({ ...draft, common_mistake: e.target.value })} /></label>
              <div className="grid grid-cols-2 gap-2">
                <label className="text-xs"><span className="text-muted-foreground">{t("admin.common.topic")}</span>
                  <Select value={draft.topic ?? "regulations"} onValueChange={(v) => setDraft({ ...draft, topic: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{TOPICS.map(tp => <SelectItem key={tp} value={tp}>{tp}</SelectItem>)}</SelectContent>
                  </Select></label>
                <label className="text-xs"><span className="text-muted-foreground">{t("admin.common.difficulty")}</span>
                  <Select value={draft.difficulty ?? "medium"} onValueChange={(v) => setDraft({ ...draft, difficulty: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{DIFFS.map(d => <SelectItem key={d} value={d}>{t(`admin.diff.${d}`)}</SelectItem>)}</SelectContent>
                  </Select></label>
                <label className="text-xs"><span className="text-muted-foreground">{t("admin.common.acsCode")}</span>
                  <Input value={draft.acs_code ?? ""} onChange={(e) => setDraft({ ...draft, acs_code: e.target.value })} /></label>
                <label className="text-xs"><span className="text-muted-foreground">{t("admin.common.source")}</span>
                  <Input value={draft.source ?? ""} onChange={(e) => setDraft({ ...draft, source: e.target.value })} /></label>
                <label className="text-xs"><span className="text-muted-foreground">{t("admin.common.status")}</span>
                  <Select value={draft.status ?? "draft"} onValueChange={(v) => setDraft({ ...draft, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{t(`admin.status.${s}`)}</SelectItem>)}</SelectContent>
                  </Select></label>
                <label className="text-xs"><span className="text-muted-foreground">{t("admin.common.locale")}</span>
                  <Select value={draft.locale ?? "en"} onValueChange={(v) => setDraft({ ...draft, locale: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{LOCALES.map(lc => <SelectItem key={lc} value={lc}>{lc}</SelectItem>)}</SelectContent>
                  </Select></label>
              </div>
              <label className="text-xs"><span className="text-muted-foreground">{t("admin.questions.tags")}</span>
                <Input value={(draft.tags ?? []).join(", ")} onChange={(e) => setDraft({ ...draft, tags: e.target.value.split(",").map(s => s.trim()).filter(Boolean) })} /></label>

              <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
                <div className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">{t("admin.questions.previewQuiz")}</div>
                <div className="text-sm font-medium">{draft.question}</div>
                <div className="mt-2 grid gap-1.5">
                  {(draft.options ?? []).map((o, i) => (
                    <button key={i} type="button" onClick={() => setPreviewIdx(i)}
                      className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm ${
                        previewIdx === null ? "border-border/60" :
                        i === draft.correct_index ? "border-emerald-500/60 bg-emerald-500/10" :
                        i === previewIdx ? "border-destructive/60 bg-destructive/10" : "border-border/60"
                      }`}>
                      {previewIdx !== null && i === draft.correct_index && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                      <span>{o || <em className="text-muted-foreground">empty</em>}</span>
                    </button>
                  ))}
                </div>
                {previewIdx !== null && (
                  <div className="mt-3 space-y-2 text-xs">
                    <div><span className="font-semibold">{t("admin.questions.explanation")}: </span>{draft.explanation}</div>
                    {draft.common_mistake && <div><span className="font-semibold">{t("admin.questions.commonMistake")}: </span>{draft.common_mistake}</div>}
                    <div className="text-muted-foreground">{t("admin.common.source")}: {draft.source} · {t("admin.common.acsCode")}: {draft.acs_code}</div>
                  </div>
                )}
              </div>

              <div className="sticky bottom-0 -mx-6 mt-2 flex justify-end gap-2 border-t border-border/60 bg-background/95 px-6 py-3 backdrop-blur">
                <Button variant="ghost" onClick={() => { setDraft(null); setEditing(null); }}>{t("admin.common.cancel")}</Button>
                <Button onClick={save} disabled={saving}>{saving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />} {t("admin.common.save")}</Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Translation review drawer */}
      <Sheet open={!!trSource || trLoading} onOpenChange={(o) => { if (!o && !trBusy) { setTrDraft(null); setTrSource(null); setTrTarget(null); setTrMeta(null); } }}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-3xl">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Languages className="h-5 w-5" /> {t("admin.questions.translation.review")}
            </SheetTitle>
          </SheetHeader>
          {trLoading && (
            <div className="mt-12 flex flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin" />
              {t("admin.questions.translation.loading")}
            </div>
          )}
          {trSource && trDraft && !trLoading && (
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              {/* EN source (read only) */}
              <div className="space-y-2 rounded-xl border border-border/60 bg-muted/10 p-3 text-sm">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">EN · {t("admin.questions.translation.sourceQuestion")}</div>
                <div className="font-medium">{trSource.question}</div>
                <ol className="ml-4 list-decimal space-y-1 text-xs">
                  {(trSource.options ?? []).map((o, i) => (
                    <li key={i} className={i === trSource.correct_index ? "font-semibold text-emerald-600 dark:text-emerald-300" : ""}>{o}</li>
                  ))}
                </ol>
                <div className="text-xs"><span className="font-semibold">Explanation: </span>{trSource.explanation}</div>
                {trSource.common_mistake && <div className="text-xs"><span className="font-semibold">Common mistake: </span>{trSource.common_mistake}</div>}
                <div className="text-[11px] text-muted-foreground">{trSource.topic} · {trSource.difficulty} · ACS {trSource.acs_code}</div>
              </div>

              {/* ES editable draft */}
              <div className="space-y-2 rounded-xl border border-sky-500/30 bg-sky-500/5 p-3">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-sky-700 dark:text-sky-300">ES · {t("admin.questions.translation.aiTranslation")}</div>
                {trDraft.warnings.length > 0 && (
                  <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-2 text-[11px] text-amber-700 dark:text-amber-300">
                    <div className="font-semibold">{t("admin.questions.translation.aiWarnings")}</div>
                    <ul className="ml-4 list-disc">{trDraft.warnings.map((w, i) => <li key={i}>{w}</li>)}</ul>
                  </div>
                )}
                <label className="block text-xs"><span className="text-muted-foreground">{t("admin.questions.question")}</span>
                  <Textarea rows={3} value={trDraft.question} onChange={(e) => setTrDraft({ ...trDraft, question: e.target.value })} />
                </label>
                <div className="grid gap-1.5">
                  <span className="text-xs text-muted-foreground">{t("admin.questions.options")}</span>
                  {trDraft.options.map((o, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className={`inline-flex h-5 w-5 items-center justify-center rounded text-[10px] ${i === trSource.correct_index ? "bg-emerald-500 text-white" : "bg-muted"}`}>{i + 1}</span>
                      <Input value={o} onChange={(e) => {
                        const opts = [...trDraft.options]; opts[i] = e.target.value;
                        setTrDraft({ ...trDraft, options: opts });
                      }} />
                    </div>
                  ))}
                </div>
                <label className="block text-xs"><span className="text-muted-foreground">{t("admin.questions.explanation")}</span>
                  <Textarea rows={4} value={trDraft.explanation} onChange={(e) => setTrDraft({ ...trDraft, explanation: e.target.value })} />
                </label>
                <label className="block text-xs"><span className="text-muted-foreground">{t("admin.questions.commonMistake")}</span>
                  <Textarea rows={2} value={trDraft.common_mistake} onChange={(e) => setTrDraft({ ...trDraft, common_mistake: e.target.value })} />
                </label>
                <label className="block text-xs"><span className="text-muted-foreground">{t("admin.questions.tags")}</span>
                  <Input value={trDraft.tags.join(", ")} onChange={(e) => setTrDraft({ ...trDraft, tags: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })} />
                </label>
              </div>

              <div className="lg:col-span-2 sticky bottom-0 -mx-6 flex flex-wrap justify-end gap-2 border-t border-border/60 bg-background/95 px-6 py-3 backdrop-blur">
                <Button variant="ghost" disabled={trBusy} onClick={() => { setTrDraft(null); setTrSource(null); setTrTarget(null); setTrMeta(null); }}>{t("admin.common.cancel")}</Button>
                <Button variant="outline" disabled={trBusy} onClick={() => persistTranslation("draft")}>{t("admin.questions.translation.saveDraft")}</Button>
                <Button variant="outline" disabled={trBusy} onClick={() => persistTranslation("reviewed")}>{t("admin.questions.translation.saveReviewed")}</Button>
                <Button disabled={trBusy} onClick={() => persistTranslation("published")}>
                  {trBusy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />}
                  {t("admin.questions.translation.publish")}
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </AdminAppShell>
  );
}
