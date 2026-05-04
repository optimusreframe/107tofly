# Completar Fase 7

## Estado verificado
- DB: 37 preguntas, 0 lecciones. Tablas listas con `content_hash` único e índice.
- Falta: seeds, UI de lecciones, a11y pass, manifest PWA.

## Ejecución (en orden)

### 1. Seed 165 preguntas nuevas → total 200
Insert masivo vía `supabase--read_query` no aplica (es read-only). Uso migración SQL con `INSERT ... ON CONFLICT (content_hash) DO NOTHING`.

Distribución:
- regulations: 45 (Part 107 subparts A–D, waivers, registration)
- airspace: 30 (clases B/C/D/E/G, sectional symbols, NOTAMs, LAANC)
- weather: 25 (METAR, TAF, density altitude, fronts, stability)
- loading_performance: 15 (CG, payload, battery, W&B)
- operations: 25 (CRM, ADM, site survey, night ops básicas)
- emergency: 10 (lost link, flyaway, fire, deconfliction)
- night_operations: 5 (anti-collision lights, ilusiones)
- maintenance: 5 (preflight, batteries LiPo, firmware)
- radio_comm: 5 (CTAF, phraseology básica)

Cada pregunta: `question`, 4 `options` (jsonb), `correct_index`, `explanation` ≥80 palabras citando fuente, `common_mistake`, `acs_code` (UA.I.A.K1 etc.), `source` ("14 CFR §107.51(b)", "AC 107-2A §5.7", "FAA-G-8082-22 p.42"), `difficulty`, `tags[]`, `content_hash` = md5(lower(trim(question))).

### 2. Seed 28 lecciones (4×7 días)
Migración con INSERT en `lessons`. Cada lección:
- Semana 1 — Fundamentos: certificación, elegibilidad, registro, Remote ID, responsabilidades PIC, sUAS overview, repaso.
- Semana 2 — Espacio aéreo: clases A–G, sectional charts, símbolos, NOTAMs, LAANC, controlled vs uncontrolled, repaso.
- Semana 3 — Meteorología: atmósfera estándar, METAR/TAF, density altitude, vientos/turbulencia, nubes/visibilidad, frentes, repaso.
- Semana 4 — Operaciones: preflight/CRM, ADM/risk, performance/W&B, emergencias, night ops, comunicaciones, examen final.

Campos: `slug`, `week`, `day`, `order_index`, `title`, `summary`, `body_md` (markdown 500–700 palabras con secciones: Objetivos / Conceptos / Ejemplos / Errores comunes / Fuentes), `topic`, `est_minutes` (20–35), `sources` jsonb.

### 3. UI de lecciones
- `bun add react-markdown remark-gfm`
- `src/routes/lessons.index.tsx` → `/lessons`: grid agrupado por semana, día, badge "Completada" leyendo `lesson_completions`. Server fn `getLessons()` con `requireSupabaseAuth`.
- `src/routes/lessons.$slug.tsx` → `/lessons/$slug`: render `body_md` con `react-markdown`+`remark-gfm`, sidebar TOC sticky en desktop, botón "Marcar completada" → insert en `lesson_completions` + `+15 XP` en `progress`. Nav prev/next por `order_index`.
- Link "Plan 28 días" en `SiteHeader` y card en `dashboard`.

### 4. Accesibilidad (WCAG AA)
- `__root.tsx`: skip-link "Saltar al contenido" + `<main id="main">` en PageShell.
- `styles.css`: `:focus-visible` ring global (ya existe en button, extender a links/inputs).
- Iconos-botón: `aria-label` en theme/lang toggle, menú móvil.
- Flashcards: `Space` voltea, `1–4` califica SM-2, `aria-live="polite"` para feedback.
- Quizzes: `role="radiogroup"`, navegación por flechas, `aria-live` para correcto/incorrecto.

### 5. PWA manifest (sin service worker)
- `public/manifest.webmanifest` con name "107toFly", short_name, `display: "standalone"`, theme_color del token primary, icons 192/512.
- `<link rel="manifest">` + `<meta name="theme-color">` en `__root.tsx` head.
- **No** `vite-plugin-pwa`, **no** SW (rompe preview iframe). Solo Add-to-Home-Screen.

## Notas técnicas
- Seeds van en migraciones (data + schema combinados es aceptable para semilla inicial idempotente con ON CONFLICT).
- `content_hash` calculado en SQL: `md5(lower(regexp_replace(question, '\s+', ' ', 'g')))`.
- Iconos PWA: reutilizar PNGs existentes en `public/` o generar placeholders 192/512 con color primary.
- Server fns: `getLessons`, `getLesson(slug)`, `completeLesson(slug)` en `src/server/lessons.functions.ts`.

## Fuera de alcance
- Mistake Coach con IA, offline real, tests e2e.
