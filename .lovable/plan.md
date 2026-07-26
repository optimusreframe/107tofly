# Sprint 1 — Foundation Integrity

Gate obligatorio antes de tocar el nuevo modelo educativo (learning_units, Session Player, etc.). Este sprint solo endurece el motor actual y añade pruebas. No hay rediseño ni features nuevas.

## 1. Evaluación server-side + DTO seguro

**Problema:** el frontend recibe `correct_index` y calcula `is_correct`. Se puede forjar 100%.

- Crear `src/lib/quiz-eval.server.ts` con:
  - `evaluateAttempt({ questionIds, picks, mode })` → carga preguntas con service role, calcula `is_correct` y `score` en el servidor, devuelve `{ score, results:[{question_id, is_correct, correct_index, explanation}] }`.
- Nuevo tipo `PublicQuestion` (sin `correct_index`, sin `explanation`) usado por todos los fetchers públicos:
  - `src/lib/study.functions.ts` → `fetchPracticeQuestions` proyecta solo columnas públicas.
  - `src/lib/lesson-quiz.functions.ts` → `getLessonQuiz` idem.
  - `simulator` fetch idem.
- Server functions de submit reciben solo `picks` (índices) y `questionIds`, ignoran cualquier `is_correct` cliente:
  - `submitLessonQuiz` (lesson-quiz.functions)
  - `submitPractice` / `submitSimulator` (study.functions)
- Respuesta post-submit devuelve `correct_index` + `explanation` **solo entonces**, para pintar feedback.

## 2. Frontend adaptado al nuevo contrato

- `LessonDailyQuiz.tsx`, `practice.tsx`, `simulator.tsx`:
  - Quitar acceso a `q.correct_index` durante la fase de respuesta.
  - Guardar `picks[]`; llamar al submit del servidor; renderizar feedback usando el `results[]` que vuelve.
- Admin (`admin.questions.tsx`, `admin-translations`) sigue usando el DTO completo (fetcher administrativo separado que ya requiere `requireSupabaseAuth` + rol admin) — sin cambios de UI.

## 3. Conteo dinámico de lecciones y certificados correctos

- Eliminar el literal “28 días / 28 lecciones”.
- Fuente única: `countPublishedLessons({ locale })` en `src/lib/lessons.functions.ts` que cuenta `lessons` con `status='published'` deduplicando por `slug` (canonical: prefiere locale del usuario, cae a `en`).
- Reemplazar usos en `lessons.functions.ts` (badge “Halfway”), dashboard bundle, readiness y en `issueCertificate` (`hours_estimated` y umbral de cobertura basados en el conteo real).
- Readiness: verificar que `lessonsTotal` y `questionsTotal` provienen del mismo conteo canonical y no cambian por locale.

## 4. .env y secretos

- Añadir a `.gitignore`: `.env`, `.env.*`, `!.env.example`.
- Verificar que no hay `.env` trackeado; si aparece, `git rm --cached`. Crear `.env.example` con nombres (sin valores).

## 5. Testing + CI

- Vitest (`vitest.config.ts`, `bun add -d vitest @vitest/coverage-v8`):
  - `quiz-eval.server.test.ts` — evalúa correcto/incorrecto, ignora `is_correct` inyectado, rechaza `questionIds` inexistentes, calcula score bien con preguntas mixtas.
  - `lessons-count.test.ts` — deduplicación por slug y filtro por status.
  - `readiness.test.ts` — no cambia por locale, no da 100 sin cobertura.
- Playwright (`playwright.config.ts`, `bun add -d @playwright/test`):
  - smoke: landing renderiza, `/auth` carga, login test user, dashboard muestra Daily Flight sin errores console, quiz de lección responde y guarda score.
- GitHub Actions `.github/workflows/ci.yml`:
  - jobs: `install → typecheck (tsgo) → lint → vitest → build:dev → playwright smoke` en push/PR a `main`.

## 6. Criterios de aceptación (verificación)

- `curl` a un endpoint de práctica no contiene `correct_index` en el payload inicial.
- Test que envía `is_correct:true` con `picks` incorrectos → servidor devuelve score 0.
- Certificado emitido usa `lessonsTotal` real (no 28).
- `bun run build:dev`, `tsgo`, `vitest`, `playwright` verdes en CI.
- `git ls-files | grep -E '^\.env$'` vacío.

## Fuera de alcance (Sprint 2+)

- Nuevas tablas `learning_units / concepts / exercises / mastery`.
- Session Player, Daily Flight adaptativo, Map/Weather Lab 2.0, Mission Engine, Readiness 2.0, Simulator 2.0.
- Rediseño visual estilo Duolingo.

## Detalles técnicos

- `PublicQuestion = Pick<Question,'id'|'topic'|'acs_code'|'source'|'question'|'options'|'locale'|'translation_group_id'>`.
- `evaluateAttempt` usa `supabaseAdmin` cargado con `await import('@/integrations/supabase/client.server')` dentro del handler (import graph safety).
- Submits siguen otorgando XP vía `runtime-settings` y flashcards de errores exactamente como hoy — solo cambia la fuente de verdad de `is_correct`.
- `admin.questions.tsx` mantiene su DTO completo detrás de `requireSupabaseAuth` + `has_role('admin')`; no se toca UI.
- No se borran tablas ni columnas; `correct_index` sigue en DB, solo deja de salir en respuestas públicas.
