## Estado actual
- DB: 37 preguntas, 0 lecciones. Tablas `questions` (con `content_hash` único) y `lessons` listas.
- Rutas existentes: `lesson.tsx` (demo single page). Falta `/lessons` (índice) y `/lessons/$slug`.
- Sin manifest PWA, sin a11y pass formal.

## Lo que voy a hacer

### 1. Seed 165 preguntas nuevas (banco a 200)
- Generar 165 preguntas únicas mapeadas a fuentes oficiales: 14 CFR Part 107, Part 89 (Remote ID), AC 107-2A, FAA-G-8082-22, ACS UA, Pilot's Handbook of Aeronautical Knowledge (cap. weather/airspace), Chart Supplement, AIM cap. relevantes.
- Distribución por topic (enum existente):
  - regulations: 45
  - airspace: 30
  - weather: 25
  - loading_performance: 15
  - operations: 25
  - emergency: 10
  - night_operations: 5
  - maintenance: 5
  - radio_comm: 5
- Cada pregunta: `question`, 4 `options`, `correct_index`, `explanation` detallada, `common_mistake`, `acs_code`, `source` (cita exacta tipo "14 CFR 107.51(b)"), `difficulty`, `tags`, `content_hash` (md5 del texto normalizado) — el índice único bloquea duplicados.
- Insertadas vía `INSERT ... ON CONFLICT (content_hash) DO NOTHING`.

### 2. Seed 28 lecciones (4 semanas × 7 días)
- Semana 1 Fundamentos · Semana 2 Espacio aéreo · Semana 3 Meteorología · Semana 4 Operaciones/Examen.
- Cada lección: `slug`, `week`, `day`, `order_index`, `title`, `summary`, `body_md` (markdown 400–800 palabras con secciones, ejemplos, "Errores comunes", "Fuentes"), `topic`, `est_minutes`, `sources` (jsonb con citas).

### 3. UI de lecciones
- `src/routes/lessons.index.tsx` → `/lessons`: grid por semana, badges de progreso (lee `lesson_completions`), CTA "Continuar".
- `src/routes/lessons.$slug.tsx` → `/lessons/$slug`: render Markdown con `react-markdown` + `remark-gfm`, TOC sticky, botón "Marcar como completada" (insert en `lesson_completions`, +XP en `progress`), nav prev/next.
- Añadir `react-markdown` y `remark-gfm` con `bun add`.
- Link "Plan 28 días" en header y dashboard.

### 4. Accesibilidad (WCAG AA)
- Skip-link "Saltar al contenido" en `__root.tsx`.
- Focus rings visibles globalmente (Tailwind `focus-visible:ring-2 ring-primary`).
- `aria-label` en iconos-botón (theme toggle, lang toggle, nav móvil).
- Flashcards: `Space` voltea, `1–4` califica SM-2, foco gestionado.
- Quizzes: roles `radiogroup`/`radio`, navegación por flechas, anuncios `aria-live` para feedback.
- Auditoría rápida de contraste en tokens (ajustar muted-foreground si <4.5:1).

### 5. PWA — solo manifest (sin service worker)
- `public/manifest.webmanifest` con name, short_name "107toFly", `display: "standalone"`, theme_color, icons 192/512 (PNGs ya existentes en `public/icons/` o generadas).
- Link en `__root.tsx` head + meta theme-color y apple-touch-icon.
- **No** instalo `vite-plugin-pwa` ni service worker (rompe el preview en iframe). Esto da "Add to Home Screen" sin offline. Si quieres offline real más adelante, lo planifico aparte.

## Fuera de alcance
- Mistake Coach con IA (fase posterior).
- Offline real de quizzes (requiere sync queue + SW).
- Tests e2e.

## ¿Apruebas?
Procedo con seeds → UI lecciones → a11y → manifest, en ese orden.