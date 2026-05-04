# Plan: Banco 200 preguntas + Fase 7

## Estado actual
- 37 preguntas en `questions`. Faltan ~165 únicas.
- Sin `lessons` seed, sin manifest PWA, sin service worker, sin pase de a11y.

## Parte A — Banco a 200 preguntas (165 nuevas)

**Fuentes oficiales** (campo `source` por pregunta):
- 14 CFR Part 107 (subparts A–D), Part 89 (Remote ID)
- AC 107-2A (Small UAS)
- FAA-G-8082-22 (Remote Pilot Study Guide)
- ACS UA (Airman Certification Standards – sUAS)
- Aeronautical Chart Users' Guide / AIM (espacio aéreo, METAR/TAF)

**Distribución por dominio ACS** (~165 nuevas, sumando a las 37 actuales para totales objetivo):
- Regulations (Part 107/89): 50 totales
- Airspace & requirements: 35
- Weather sources & effects: 30
- Loading & performance: 20
- Operations (CRM, emergencias, mantenimiento, fisiología): 35
- Night ops / waivers / Remote ID específico: 30

**Anti-duplicados**:
1. Generación en script local con set de hashes normalizados (lowercase + strip + colapso de espacios sobre `question`).
2. Pre-check contra las 37 existentes (descarga vía `supabase--read_query`) antes de insertar.
3. Cada pregunta lleva `acs_code` específico (p.ej. `UA.I.B.K10`), `topic` (enum existente), `difficulty`, `explanation` con cita de la regla, `common_mistake`, `tags[]`.

**Entrega**: una migración SQL con 165 INSERTs idempotentes (`ON CONFLICT DO NOTHING` sobre hash único). Para soportarlo añado columna `content_hash text unique` + índice, y backfill de las 37 existentes en la misma migración.

## Parte B — Fase 7

### B1. Seed de 28 lecciones (currículo 4 semanas)
- Nueva tabla `lessons` (slug PK, week int, day int, title, summary, body_md, topic enum, est_minutes, sources jsonb, order_index). RLS: lectura para `authenticated`.
- Migración con 28 filas estructuradas por semana:
  - **S1 Fundamentos**: intro UAS, Part 107 visión, registro, Remote ID, responsabilidades RPIC, documentación, repaso.
  - **S2 Espacio aéreo y cartas**: clases A–G, sectionals, símbolos, LAANC, NOTAMs, TFRs, repaso.
  - **S3 Meteorología y performance**: METAR, TAF, vientos, density altitude, micrometeorología, peso/balance, repaso.
  - **S4 Operaciones y examen**: CRM, emergencias, fisiología, mantenimiento, waivers/night, simulacros, día examen.
- Página `/lessons` lista por semana; `/lessons/$slug` renderiza markdown (usar `react-markdown`) + botón "Marcar completada" (escribe en `lesson_completions`, ya existe).
- Hook que recalcula `progress.study_pct` = completadas/28 al marcar.

### B2. PWA
- `public/manifest.webmanifest` con name "107toFly", theme/bg colors del design system, icons 192/512 (generar PNG simples con el logo actual).
- `public/sw.js` minimal: precache shell (`/`, `/dashboard`, `/practice`, `/flashcards`, `/simulator`, `/lessons`) + runtime cache stale-while-revalidate para assets, network-first para `/api/*` y Supabase.
- Registro del SW en `src/routes/__root.tsx` solo en producción y en cliente.
- `<link rel="manifest">` y meta theme-color en `head()` del root.

### B3. Accesibilidad (pase WCAG AA)
- Auditoría con foco en: contraste de glass/aurora (ajustar tokens si <4.5:1), `aria-label` en iconos-only buttons (toggle tema, idioma, cerrar modal), `aria-live` en feedback de quiz, focus rings visibles (`:focus-visible`), navegación por teclado en flashcards (Space=flip, 1–4=grade), `prefers-reduced-motion` desactiva aurora.
- Skip-link "Saltar al contenido" en `__root`.
- Roles/labels en simulador (timer con `role="timer" aria-live="off"`, progreso con `role="progressbar"`).
- Verificación: pasada manual + axe-core en dev.

## Orden de ejecución
1. Migración: `content_hash` + backfill + 165 inserts.
2. Migración: tabla `lessons` + 28 inserts + RLS.
3. Rutas `/lessons` y `/lessons/$slug` + markdown + completion.
4. Manifest, icons, SW, registro.
5. Pase a11y + tokens de contraste + skip-link + atajos teclado.

## Detalles técnicos
- `react-markdown` + `remark-gfm` (instalar con `bun add`).
- Iconos PWA generados en build con script Node + `sharp`… ojo: `sharp` no va en Worker pero sí en build local del repo; alternativa: incluir PNGs ya generados en `public/icons/`.
- Hash de pregunta calculado en script de generación (Node `crypto.createHash('sha256')`).
- SW: archivo plano servido desde `/sw.js`, no pasar por Vite plugin.

## Fuera de alcance (para fases siguientes)
- Mistake Coach con Lovable AI.
- Modo offline real de quizzes (requiere sync queue).
- Tests e2e.
