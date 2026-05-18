
# Plan Maestro — 107toFly Production Ready

Basado en la auditoría QA previa. 6 sprints secuenciales. Cada uno es entregable independiente.

---

## Sprint 1 — P0 Performance & UX Fundamentals
**Objetivo:** que la app deje de sentirse lenta y rota en la primera carga.

1. **Consolidar loaders de `/dashboard`**
   - Combinar los 12+ `serverFn` del `StudentAppShell` + `dashboard.tsx` en 1–2 `getDashboardBundle()` server functions.
   - Devolver `{ profile, progress, streak, nextLesson, recentAttempts, settings }` en una sola llamada.
   - Archivos: `src/server/study.functions.ts`, `src/routes/dashboard.tsx`, `src/components/layouts/StudentAppShell.tsx`.

2. **Skeletons en lugar de "Cargando..."**
   - Crear `DashboardSkeleton`, `LessonsListSkeleton`, `LessonDetailSkeleton`, `PracticeSkeleton`.
   - Reemplazar todos los `if (loading) return <p>Cargando...</p>`.

3. **Fix manifest PWA 401** en preview (revisar headers en `vite.config.ts` / wrangler).

**Criterio de aceptación:** `/dashboard` carga < 1.5s con skeleton inmediato.

---

## Sprint 2 — P1 i18n Completo
**Objetivo:** español real en toda la app pública y privada.

1. **Landing Hero ES** — el hero hardcoded en `src/routes/index.tsx` lee `landing_sections` o i18n key, no string EN.
2. **Auth errors mapeados** — wrapper en `src/lib/auth-errors.ts` que traduce `Invalid login credentials`, `Email not confirmed`, etc. a i18n keys.
3. **Audit completo de strings sueltos** en `admin.*`, `settings`, `onboarding`, `certificate`, `verify.$id`.
4. **Locale switcher visible** en header público + student app.

**Criterio:** 0 strings EN visibles cuando `locale=es`.

---

## Sprint 3 — P1 Contenido ES (Bulk AI Translation)
**Objetivo:** poblar `lessons` y `questions` en español usando la infraestructura AI ya construida.

1. **Bulk action en `/admin/lessons`** — botón "Traducir todas las published EN faltantes" → loop con rate-limit (1/seg) llamando `generateLessonTranslation`, dejar en `translation_status='ai_draft'`.
2. **Bulk action en `/admin/questions`** — idem.
3. **Dashboard de cobertura de traducción** — card que muestra `X/Y lessons ES`, `X/Y questions ES`, link a revisar drafts.
4. **Review queue UI** — vista filtrada `translation_status='ai_draft'` con accept/edit/publish rápido.

**Criterio:** ≥ 90% del contenido published EN tiene draft ES generado.

---

## Sprint 4 — P2 E2E Validation & Real Data
**Objetivo:** validar flujos completos con datos reales.

1. **Seed de cuenta de prueba** — script `bun run scripts/seed-test-student.ts` que crea un alumno con attempts, progress, 1 certificado.
2. **Flujo certificate E2E** — completar simulator con pass score → emite certificado → `/verify/:id` lo muestra → PDF download usa `certificate.disclaimer_es` y `template_style`.
3. **Lesson → Quiz → XP → Streak** validado.
4. **Flashcards SRS** revisar que `due_date` avanza correctamente.

**Criterio:** flujo "registro → onboarding → 1 lesson → 1 quiz → 1 sim → cert" sin errores.

---

## Sprint 5 — P2 Mobile QA Sistemático
**Objetivo:** admin y student usables en 390px.

1. **Admin responsive** — `admin.lessons`, `admin.questions`, `admin.users`, `admin.settings` con tabla → cards en mobile.
2. **Student app polish** — bottom nav fija, safe areas iOS, scroll horizontal eliminado.
3. **PWA install prompt** + testing real en iOS/Android.

**Criterio:** Lighthouse mobile ≥ 90 en performance, accessibility, best-practices.

---

## Sprint 6 — P3 Hardening Producción
**Objetivo:** robustez y observabilidad.

1. **Error boundaries** por route + `defaultErrorComponent` en router.
2. **Rate limiting** en server functions sensibles (AI translation, certificate emit).
3. **Audit logs view** — `/admin/audit` con filtros.
4. **SEO completo** — meta tags por route, sitemap.xml, robots.txt, JSON-LD del curso.
5. **Analytics events** — track login, lesson_complete, quiz_pass, cert_issued.
6. **Backup strategy** — documentar export periódico de DB.

**Criterio:** app publicada, monitoreada, lista para usuarios reales.

---

## Orden recomendado de ejecución

```text
S1 (perf+skel) → S2 (i18n) → S3 (contenido ES) → S4 (E2E) → S5 (mobile) → S6 (hardening)
```

S1 y S2 desbloquean percepción de calidad inmediata. S3 desbloquea el valor real para usuarios hispanohablantes. S4–S6 son pre-launch.

---

## Decisiones pendientes que necesito de ti

1. ¿Empezamos por **S1 (performance)** o prefieres **S3 (contenido ES bulk)** primero porque ya está la infra?
2. ¿Hay un **deadline** o evento de lanzamiento que deba respetar el orden?
3. ¿Quieres incluir **pagos/memberships** en este roadmap o se queda fuera?
