# 107toFly — Auditoría vs Plan Maestro

## ✅ Ya implementado

**Diseño & shell**
- Estética Apple-like con glassmorphism, aurora, dark/light toggle (persistente en localStorage), header sticky, footer con disclaimer FAA (ES).
- Routing TanStack Start, 14 rutas creadas.

**Backend (Lovable Cloud)**
- Auth email/password (`/auth`), trigger que crea `profiles` + `progress` al signup, RLS por usuario.
- Dashboard protegido leyendo `progress` real (rings, streak, XP, readiness).

**Pantallas existentes (mayormente UI demo, datos hardcodeados)**
- Landing (`/`), Course map 28 días, Lesson player, Quiz demo, Flashcards (SR UI), Map Lab, Weather Lab (decoder METAR funcional), Mission Planner (Go/No-Go), Simulator preview, Achievements (7 niveles + 8 badges), Onboarding (4 pasos), Certificate mock-up.
- **FlyCoach AI funcional** vía Lovable AI Gateway (gemini-2.5-flash) con system prompt restringido a Part 107.

---

## ❌ Lo que falta vs el plan maestro

### Bloqueantes para considerar el MVP "real"
1. **Banco de preguntas oficial** — hoy hay ~3 preguntas hardcodeadas. Necesitamos tabla `questions` con metadatos ACS, ~150–250 preguntas seed alineadas al UAG.
2. **Persistencia real de progreso** — lecciones, quizzes, flashcards y simulacros NO escriben en BD. El dashboard muestra ceros.
3. **Simulador UAG funcional** — falta motor de 60 preguntas, timer 2h, scoring por dominio ACS, reporte post-examen.
4. **Spaced repetition real** — UI existe pero sin algoritmo SM-2 ni tabla de revisiones.
5. **i18n ES/EN** — todo el copy está en español hardcodeado. Falta i18next + diccionarios + auto-detección + toggle.
6. **Certificado real** — generación PDF (no mock) con ID único verificable + página pública `/verify/:id`, gating por criterios reales.
7. **Recuperación de contraseña** — no hay flujo `/forgot-password` ni `/reset-password`.
8. **Onboarding persistente** — el wizard no guarda nada en `profiles`.

### Importantes (V1.5)
9. **Lecciones con contenido real** — hoy una sola lección demo. Necesitamos al menos 28 lessons seed (una por día) con bloques estructurados.
10. **PWA** — manifest, service worker, installable, offline cache de lecciones vistas.
11. **Mistake Coach** — analizar errores acumulados con FlyCoach.
12. **Notificaciones** (email recordatorios diarios vía cron).
13. **Accesibilidad WCAG** — auditoría de contraste, focus rings, alt texts, reduce-motion.

### Nice-to-have (V2+)
- Admin CMS, leaderboard, videos, Apple/Google sign-in, monetización, team accounts.

---

## 🚀 Plan de fases propuesto

### Fase 4 — Datos reales y persistencia (próxima)
- **Migración BD**: tablas `questions`, `quiz_attempts`, `quiz_answers`, `flashcards`, `srs_reviews`, `lesson_completions`, `exam_simulations`, `certificates`. Todas con RLS por usuario.
- **Seed de banco de preguntas**: 80–120 preguntas iniciales (Reglas, Espacio aéreo, Sectional, Clima, Performance, ADM, Emergencias) con `acs_code`, `source`, `explanation`.
- **Server functions**: `submitQuizAttempt`, `recordLessonComplete`, `gradeFlashcard` (algoritmo SM-2), `recomputeProgress` (recalcula `progress.readiness`, `study_pct`, etc.).
- **Hook `progress` en lesson/quiz/flashcard**: cada acción persiste y dispara recálculo.
- **Onboarding** guarda `experience_level`, `study_goal_date` en `profiles`.

### Fase 5 — Simulador UAG + Certificado
- `/simulator` real: 60 preguntas ponderadas por dominio, timer 2h, autoguardado, página de review.
- Reporte post-examen con score por categoría, top 5 debilidades, recomendaciones IA.
- Server function `issueCertificate` con criterios (≥85% en último simulacro, todos los módulos, ≥80% promedio). Genera PDF (jsPDF) y guarda fila en `certificates` con UUID.
- Ruta pública `/verify/$id` para validar certificados.

### Fase 6 — i18n + Auth completa + Recovery
- Integrar `i18next` + `react-i18next`, diccionarios `es-LATAM` y `en-US`, auto-detect `navigator.language`, toggle en header, persistencia en `profiles.locale`.
- Migrar todos los strings de las pantallas existentes a `t('key')`.
- Flujos `/forgot-password` (envía email reset) y `/reset-password` (set new password).
- Disclaimer FAA bilingüe.

### Fase 7 — Contenido + PWA + Pulido
- Seed de 28 lecciones estructuradas (bloques: rule, visual, common-mistake, checkpoint).
- 8 lecciones con visuales reales (SVG inline) para airspace classes.
- PWA: manifest, iconos, service worker (Workbox vía vite-plugin-pwa), offline para lecciones vistas.
- Pase de accesibilidad: focus visible, aria-labels, contraste.
- Mistake Coach (analiza `quiz_answers` fallidas con FlyCoach).

### Fase 8 (opcional) — Recordatorios + Social login
- Cron diario que envía email "tu lección está lista" (Resend o Lovable AI gateway no aplica → usar Resend).
- Sign in with Google (managed Lovable Cloud).

---

## 📋 Detalles técnicos clave

- **Algoritmo SR**: SM-2 simplificado (`ease_factor`, `interval`, `repetitions`, `due_date`). Calificaciones Again/Hard/Good/Easy → 0/3/4/5.
- **Readiness score**: `0.4*quiz_avg + 0.25*sim_score + 0.2*sr_retention + 0.15*acs_coverage`.
- **Sources of truth**: cada pregunta lleva `source` (ej. "14 CFR 107.51", "ACS UA.II.A.K1") visible al revisar.
- **PDF certificado**: jsPDF con QR al endpoint público de verificación.
- **i18n keys**: namespaces por feature (`dashboard`, `quiz`, `lesson`, `auth`...).

---

## 🎯 Recomendación

Empezar por **Fase 4** — sin datos reales y persistencia, las pantallas son demos vacías y el dashboard nunca cambia. Es la base sobre la que se apoyan Simulador, Certificado y Mistake Coach.

¿Apruebas que arranquemos con **Fase 4 (Datos reales + persistencia + seed de preguntas)**? Si quieres priorizar otra fase primero (p.ej. i18n antes que datos), dímelo y lo reordeno.
