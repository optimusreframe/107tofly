import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ArrowLeft, ArrowRight, BookOpen, CheckCircle2, Clock } from "lucide-react";
import { StudentAppShell } from "@/components/layouts/StudentAppShell";
import { useAuth } from "@/hooks/use-auth";
import { getLesson, getLessons } from "@/server/lessons.functions";
import { completeLesson } from "@/server/study.functions";

type LessonResp = Awaited<ReturnType<typeof getLesson>>;

export const Route = createFileRoute("/lessons/$slug")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.slug} · Lección — 107toFly` },
      { name: "description", content: "Lección Part 107 con fuentes oficiales y tracking de progreso." },
    ],
  }),
  component: LessonDetail,
});

function LessonDetail() {
  const { t } = useTranslation();
  const { slug } = Route.useParams();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<LessonResp | null>(null);
  const [all, setAll] = useState<Awaited<ReturnType<typeof getLessons>> | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => { if (!loading && !user) navigate({ to: "/auth" }); }, [loading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    setData(null);
    setMsg(null);
    getLesson({ data: { slug } }).then(setData);
    getLessons().then(setAll);
  }, [slug, user]);

  if (loading || !user || !data) {
    return <StudentAppShell><div className="mx-auto max-w-3xl px-6 pt-24 text-muted-foreground">{t("common.loading")}</div></StudentAppShell>;
  }

  if (!data.lesson) {
    return (
      <StudentAppShell>
        <div className="mx-auto max-w-3xl px-6 pt-24">
          <h1 className="font-display text-3xl font-semibold">Lección no encontrada</h1>
          <Link to="/lessons" className="mt-4 inline-block text-primary underline">← Volver a lecciones</Link>
        </div>
      </StudentAppShell>
    );
  }

  const l = data.lesson;
  const sources = Array.isArray(l.sources) ? (l.sources as Array<{ label?: string; url?: string }>) : [];
  const idx = (all ?? []).findIndex((x) => x.slug === slug);
  const prev = idx > 0 ? (all ?? [])[idx - 1] : null;
  const next = idx >= 0 && idx < (all ?? []).length - 1 ? (all ?? [])[idx + 1] : null;

  const onComplete = async () => {
    setSubmitting(true);
    try {
      await completeLesson({ data: { lesson_slug: l.slug, topic: l.topic ?? undefined } });
      setData({ ...data, completed: true });
      setMsg("¡Lección completada! +15 XP");
    } catch (e) {
      setMsg("Error al completar la lección.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <StudentAppShell>
      <article className="mx-auto max-w-3xl px-6 pt-12 md:pt-16">
        <Link to="/lessons" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Lecciones
        </Link>
        <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
          <span>Semana {l.week} · Día {l.day}</span>
          <span>·</span>
          <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> {l.est_minutes} min</span>
          {l.topic && <><span>·</span><span className="rounded-full bg-accent px-2 py-0.5">{l.topic}</span></>}
        </div>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight md:text-5xl">{l.title}</h1>
        {l.summary && <p className="mt-3 text-lg text-muted-foreground">{l.summary}</p>}

        <div className="glass-strong mt-8 rounded-3xl p-6 md:p-8 shadow-glass">
          <div className="prose prose-neutral dark:prose-invert max-w-none prose-headings:font-display prose-headings:tracking-tight prose-h2:text-2xl prose-h3:text-lg prose-a:text-primary">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{l.body_md}</ReactMarkdown>
          </div>
        </div>

        {sources.length > 0 && (
          <div className="mt-6 glass rounded-3xl p-5">
            <div className="mb-2 inline-flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
              <BookOpen className="h-3.5 w-3.5" /> Fuentes
            </div>
            <ul className="space-y-1 text-sm">
              {sources.map((s, i) => (
                <li key={i}>
                  {s.url ? <a href={s.url} target="_blank" rel="noreferrer" className="text-primary underline">{s.label ?? s.url}</a> : <span>{s.label}</span>}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3" aria-live="polite">
          {data.completed ? (
            <span className="inline-flex items-center gap-2 rounded-full bg-success/15 px-4 py-2 text-sm font-medium text-success">
              <CheckCircle2 className="h-4 w-4" /> Lección completada
            </span>
          ) : (
            <button
              onClick={onComplete}
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background transition hover:opacity-90 disabled:opacity-50"
            >
              {submitting ? "Guardando…" : "Marcar como completada · +15 XP"}
            </button>
          )}
          {msg && <span className="text-sm text-muted-foreground">{msg}</span>}
        </div>

        <nav className="mt-10 flex items-center justify-between border-t border-border pt-6 text-sm">
          {prev ? (
            <Link to="/lessons/$slug" params={{ slug: prev.slug }} className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" /> {prev.title}
            </Link>
          ) : <span />}
          {next ? (
            <Link to="/lessons/$slug" params={{ slug: next.slug }} className="ml-auto inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
              {next.title} <ArrowRight className="h-4 w-4" />
            </Link>
          ) : <span />}
        </nav>
      </article>
    </StudentAppShell>
  );
}
