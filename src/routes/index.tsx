import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation, Trans } from "react-i18next";
import {
  Plane,
  Map,
  CloudSun,
  Brain,
  Award,
  Sparkles,
  Compass,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { QuizDemo } from "@/components/QuizDemo";
import { getPublicLandingSections } from "@/lib/landing.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "107toFly — Master FAA Part 107. Fly with confidence." },
      {
        name: "description",
        content:
          "Plataforma premium para preparar el examen FAA Part 107. Lecciones interactivas, simuladores UAG, FlyCoach AI y certificado interno alineado al ACS.",
      },
      { property: "og:title", content: "107toFly — From zero to Remote Pilot ready" },
      {
        property: "og:description",
        content:
          "Aprende, practica, repite y vuela. Curso de 4 semanas con FlyCoach AI y simulador UAG.",
      },
    ],
  }),
  component: Index,
});

const featureIcons = [Compass, Map, CloudSun, Brain, Sparkles, Award];
const featureKeys = ["course4w", "mapLab", "weatherLab", "flycoach", "spaced", "certificate"] as const;

function Index() {
  const { t, i18n } = useTranslation();
  const locale = (i18n.language?.startsWith("es") ? "es" : "en") as "en" | "es";
  const [cms, setCms] = useState<Record<string, { title?: string | null; subtitle?: string | null; body?: string | null; cta_label?: string | null; cta_href?: string | null; image_url?: string | null; content?: Record<string, unknown> | null }>>({});

  useEffect(() => {
    let alive = true;
    getPublicLandingSections({ data: { locale } })
      .then((r) => {
        if (!alive) return;
        const map: typeof cms = {};
        for (const s of r.sections as Array<{ section_key: string } & typeof cms[string]>) map[s.section_key] = s;
        setCms(map);
      })
      .catch(() => { /* silent fallback */ });
    return () => { alive = false; };
  }, [locale]);

  const hero = cms.hero;
  const PLACEHOLDERS = new Set(["", "hero", "untitled", "título", "titulo", "placeholder"]);
  const isPlaceholder = (v?: string | null) => {
    if (!v) return true;
    return PLACEHOLDERS.has(v.trim().toLowerCase());
  };
  const heroTitle = !isPlaceholder(hero?.title) ? hero!.title : null;
  const heroSubtitle = !isPlaceholder(hero?.subtitle)
    ? hero!.subtitle
    : !isPlaceholder(hero?.body)
      ? hero!.body
      : null;

  const modules = t("landing.modules.items", { returnObjects: true }) as string[];

  return (
    <PageShell>
      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 pt-16 md:pt-24">
        <div className="grid items-center gap-12 md:grid-cols-2">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
              <span className="grid h-4 w-4 place-items-center rounded-full bg-success" >
                <CheckCircle2 className="h-3 w-3 text-success-foreground" />
              </span>
              {t("landing.hero.badge")}
            </div>
            <h1 className="mt-5 font-display text-5xl font-semibold leading-[1.05] tracking-tight md:text-6xl lg:text-7xl">
              {heroTitle ? (
                heroTitle
              ) : (
                <>{t("landing.hero.titleBefore")}{" "}
                <span className="text-gradient">{t("landing.hero.titleHighlight")}</span>
                <br />
                {t("landing.hero.titleAfter")}</>
              )}
            </h1>
            <p className="mt-5 max-w-lg text-lg text-muted-foreground">
              {heroSubtitle ?? t("landing.hero.subtitle")}
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                to="/course"
                className="group inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-3 text-sm font-medium text-background shadow-elevated transition hover:opacity-90"
              >
                {t("landing.hero.ctaPrimary")}
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
              </Link>
              <Link
                to="/simulator"
                className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-5 py-3 text-sm font-medium backdrop-blur transition hover:bg-accent"
              >
                {t("landing.hero.ctaSecondary")}
              </Link>
            </div>
            <div className="mt-8 flex items-center gap-6 text-xs text-muted-foreground">
              <div>
                <div className="font-display text-xl font-semibold text-foreground">28</div>
                {t("landing.hero.stat1")}
              </div>
              <div>
                <div className="font-display text-xl font-semibold text-foreground">600+</div>
                {t("landing.hero.stat2")}
              </div>
              <div>
                <div className="font-display text-xl font-semibold text-foreground">10</div>
                {t("landing.hero.stat3")}
              </div>
            </div>
          </div>

          {/* Hero card mock */}
          <div className="relative">
            <div className="glass-strong rounded-3xl p-5 shadow-elevated">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-muted-foreground">{t("landing.hero.readinessScore")}</div>
                  <div className="font-display text-3xl font-semibold">87<span className="text-base text-muted-foreground">/100</span></div>
                </div>
                <div className="grid h-12 w-12 place-items-center rounded-full bg-[var(--gradient-sky)] text-primary-foreground animate-float-slow">
                  <Plane className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-3">
                {[
                  { label: t("student.topics.sectional"), v: 92, c: "bg-primary" },
                  { label: t("student.topics.weather"), v: 78, c: "bg-sky" },
                  { label: t("student.topics.regulations"), v: 85, c: "bg-success" },
                ].map((r) => (
                  <div key={r.label} className="rounded-2xl border border-border bg-card/70 p-3">
                    <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{r.label}</div>
                    <div className="font-display text-lg font-semibold">{r.v}%</div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                      <div className={`h-full ${r.c}`} style={{ width: `${r.v}%` }} />
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 rounded-2xl border border-border bg-card/70 p-4">
                <div className="flex items-center gap-2 text-xs font-medium text-primary">
                  <Sparkles className="h-3.5 w-3.5" /> {t("landing.hero.flycoachSuggests")}
                </div>
                <p className="mt-1 text-sm">
                  <Trans
                    i18nKey="landing.hero.flycoachLine"
                    components={[<span key="0" className="font-medium" />]}
                  />
                </p>
              </div>
            </div>
            <div className="absolute -bottom-6 -left-6 hidden rounded-2xl border border-border bg-card/90 p-3 shadow-glass backdrop-blur md:block">
              <div className="flex items-center gap-2 text-xs">
                <span className="grid h-7 w-7 place-items-center rounded-full bg-success/15 text-success">🔥</span>
                <div>
                  <div className="font-medium">{t("landing.hero.streakDays", { n: 12 })}</div>
                  <div className="text-muted-foreground">{t("landing.hero.xpWeek", { xp: 240 })}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto mt-28 max-w-6xl px-6">
        <div className="max-w-2xl">
          <h2 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">
            <Trans i18nKey="landing.features.title" components={[<span key="0" className="text-gradient" />]} />
          </h2>
          <p className="mt-3 text-muted-foreground">
            {t("landing.features.subtitle")}
          </p>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {featureKeys.map((key, i) => {
            const Icon = featureIcons[i];
            return (
              <div
                key={key}
                className="group glass rounded-3xl p-5 transition hover:-translate-y-0.5 hover:shadow-elevated"
              >
                <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[var(--gradient-sky)] text-primary-foreground">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 font-display text-lg font-semibold">{t(`landing.featuresItems.${key}.title`)}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{t(`landing.featuresItems.${key}.desc`)}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Quiz Demo */}
      <section className="mx-auto mt-28 max-w-6xl px-6">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <div className="text-xs font-medium uppercase tracking-wider text-primary">
              {t("landing.quiz.eyebrow")}
            </div>
            <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight md:text-4xl">
              {t("landing.quiz.title")}
              <br />{t("landing.quiz.titleLine2")}
            </h2>
            <p className="mt-3 text-muted-foreground">
              {t("landing.quiz.subtitle")}
            </p>
            <ul className="mt-6 space-y-2 text-sm">
              {[t("landing.quiz.bullet1"), t("landing.quiz.bullet2"), t("landing.quiz.bullet3")].map((l) => (
                <li key={l} className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-success" /> {l}
                </li>
              ))}
            </ul>
          </div>
          <QuizDemo />
        </div>
      </section>

      {/* Modules */}
      <section className="mx-auto mt-28 max-w-6xl px-6">
        <h2 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">
          {t("landing.modules.title")}
        </h2>
        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {modules.map((m, i) => (
            <div
              key={m}
              className="glass rounded-2xl p-4 transition hover:border-primary/40"
            >
              <div className="font-mono text-xs text-muted-foreground">M{String(i + 1).padStart(2, "0")}</div>
              <div className="mt-1 font-medium leading-snug">{m}</div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto mt-28 max-w-6xl px-6">
        <div className="glass-strong relative overflow-hidden rounded-3xl p-10 text-center shadow-elevated md:p-16">
          <div aria-hidden className="absolute inset-0 -z-10 bg-[var(--gradient-aurora)] opacity-20" />
          <h2 className="mx-auto max-w-2xl font-display text-3xl font-semibold tracking-tight md:text-5xl">
            <Trans i18nKey="landing.cta.title" components={[<span key="0" className="text-gradient" />]} />
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            {t("landing.cta.subtitle")}
          </p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/course"
              className="inline-flex items-center gap-2 rounded-full bg-foreground px-6 py-3 text-sm font-medium text-background transition hover:opacity-90"
            >
              {t("landing.cta.primary")} <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/flycoach"
              className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-6 py-3 text-sm font-medium backdrop-blur transition hover:bg-accent"
            >
              {t("landing.cta.secondary")}
            </Link>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
