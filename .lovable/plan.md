# Auditoría 107toFly + Plan de cierre

## 1. Estado real (verificado contra DB y código)

### Completo y funcional (full-stack)
- **Auth**: `/auth`, `/forgot-password`, `/reset-password`, `use-auth` hook. Trigger `handle_new_user` crea `profiles` + `progress`. OK.
- **Onboarding** → `saveOnboarding` server fn. OK.
- **Dashboard** (`/dashboard`): lee `progress`, racha, XP. OK.
- **Práctica** (`/practice`): `fetchPracticeQuestions` + `submitQuizAttempt` + `quiz_answers`. OK.
- **Simulador UAG** (`/simulator`): 60 preguntas, `submitExamSimulation`, breakdown por dominio. OK.
- **Flashcards** (`/flashcards`): SM-2, `gradeFlashcard`, `fetchDueFlashcards`, `createFlashcardFromQuestion`. OK.
- **Certificado** (`/certificate`, `/verify/$id`): `issueCertificate`, verificación pública. OK.
- **FlyCoach AI** (`/flycoach`): `askFlyCoach` con Lovable AI. OK.
- **i18n** ES/EN, `SiteHeader`, `SiteFooter`, landing `/`.
- **Schema**: tablas `profiles, progress, questions, quiz_attempts, quiz_answers, flashcards, exam_simulations, certificates, lessons, lesson_completions` con RLS.

### Parcial (UI sin backend o backend sin UI)
- **`/course`**: solo array estático de 28 días. **No** lee `lessons` ni marca progreso.
- **`/lesson`**: una sola lección hardcoded. No hay ruta dinámica `/lessons/$slug` ni listado `/lessons`.
- **`completeLesson`** server fn existe pero ninguna UI la llama.
- **`/achievements`**: badges hardcoded, no leen `progress.xp` ni `lesson_completions`.
- **Tabla `lessons`**: 0 filas. Migración `2be47e4b` creó schema pero no hizo seed.
- **Banco preguntas**: 37 filas. Plan original pedía 200. Faltan ~163 (regulations 8→45, airspace 6→30, weather 5→25, etc.).
- **`/map-lab`, `/weather-lab`, `/mission`**: interactivos pero no persisten resultados ni dan XP.

### No creado
- **PWA manifest** (`public/manifest.webmanifest`, link en `__root.tsx`, theme-color). No existe carpeta `public/`.
- **Iconos PWA** 192/512.
- **Pase de accesibilidad WCAG AA**: sin skip-link, sin `<main id>`, sin `aria-label` en toggles, sin atajos de teclado en flashcards/quizzes, sin `aria-live`.
- **Server fns de lecciones**: `getLessons`, `getLesson(slug)` no existen.
- **Link a "Plan 28 días" / lecciones** en `SiteHeader` y card en `dashboard`.

---

## 2. Plan para cerrar lo pendiente

Orden de ejecución para minimizar riesgo:

### Paso 1 — Seed de contenido (migración SQL idempotente)
- **165 preguntas nuevas** para llegar a 200, distribución por enum real:
  regulations +37, airspace +24, weather +20, sectional +12, performance +12, operations +22, adm +12, emergencies +8, remote_id +8, maintenance +10.
  Cada una: `question`, 4 `options` jsonb, `correct_index`, `explanation` ≥80 palabras citando fuente, `common_mistake`, `acs_code`, `source` (14 CFR §, AC 107-2A §, FAA-G-8082-22 p.), `difficulty`, `tags[]`, `content_hash = md5(lower(regexp_replace(question,'\s+',' ','g')))`. `ON CONFLICT (content_hash) DO NOTHING`.
- **28 lecciones** (4 semanas × 7 días) en `lessons`: `slug, week, day, order_index, title, summary, body_md` (markdown 500-700 palabras: Objetivos / Conceptos / Ejemplos / Errores comunes / Fuentes), `topic`, `est_minutes` 20-35, `sources` jsonb. `ON CONFLICT (slug) DO NOTHING`.

### Paso 2 — Backend de lecciones
- `src/server/lessons.functions.ts`:
  - `getLessons()` → lista todas + set de `lesson_completions` del usuario.
  - `getLesson(slug)` → lección + flag completed.
  - `completeLesson(slug)` ya existe en `study.functions.ts`; reutilizar; suma `+15 XP` a `progress`.

### Paso 3 — UI de lecciones
- `bun add react-markdown remark-gfm`.
- `src/routes/lessons.index.tsx` (`/lessons`): grid agrupado por semana, badge "Completada", barra progreso (X/28).
- `src/routes/lessons.$slug.tsx` (`/lessons/$slug`): render `body_md` con `react-markdown` + `remark-gfm`, TOC sticky en desktop, botón "Marcar completada", nav prev/next por `order_index`, lista de `sources`.
- Reescribir `/course` para leer `lessons` reales y enlazar a `/lessons/$slug`.
- Link "Lecciones" en `SiteHeader`, card en `/dashboard`.

### Paso 4 — Achievements dinámicos
- `getAchievements()` server fn: cuenta `lesson_completions`, mejor score por topic en `quiz_attempts`, simulacros >85 en `exam_simulations`, racha de `progress`.
- `/achievements`: derivar badges del resultado real, mostrar XP/nivel desde `progress.xp`.

### Paso 5 — Accesibilidad (WCAG AA)
- `__root.tsx`: skip-link "Saltar al contenido"; `PageShell` envuelve `main` con `id="main"` y `tabIndex={-1}`.
- `styles.css`: `:focus-visible` ring global a links/inputs/botones-icono.
- `aria-label` en toggles theme/idioma/menú móvil.
- Flashcards: `Space` voltea, teclas `1-4` califican SM-2, `aria-live="polite"` para feedback.
- Quizzes/Simulator: `role="radiogroup"`, navegación con flechas, `aria-live` para correcto/incorrecto.

### Paso 6 — PWA (sin service worker)
- Crear carpeta `public/`. `public/manifest.webmanifest`: name "107toFly", short_name "107toFly", `display: standalone`, `theme_color` token primary, `background_color` background, start_url `/`, icons 192/512 PNG (placeholder color primary con texto "107").
- `public/icon-192.png` y `public/icon-512.png` generados con script Node + sharp en `/tmp` y copiados a `public/`.
- `__root.tsx` head: `<link rel="manifest" href="/manifest.webmanifest">`, `<meta name="theme-color">`, `apple-touch-icon`.
- **Sin** `vite-plugin-pwa`, **sin** `sw.js` (rompe iframe preview).

---

## 3. Detalles técnicos

- Seeds van en migraciones SQL (es semilla inicial idempotente; aceptable mezclar data + schema con ON CONFLICT).
- `content_hash` calculado dentro del INSERT con `md5(lower(regexp_replace(question,'\s+',' ','g')))`.
- Iconos PWA: generación local con `sharp` antes de escribir a `public/`; el Worker no necesita `sharp` en runtime.
- Rutas TanStack: `lessons.index.tsx` y `lessons.$slug.tsx` (convención flat dot).
- `useRouter` de `@tanstack/react-router`, no `Route.useRouter()`.

## 4. Fuera de alcance (futuro)
- Mistake Coach con IA sobre histórico de fallos.
- Modo offline real (sync queue + service worker).
- Tests e2e.
- Persistencia de resultados de map-lab / weather-lab / mission con XP.

¿Apruebas? Procedo en orden: seeds → backend lecciones → UI lecciones → achievements dinámicos → a11y → PWA manifest.
