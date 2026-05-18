# Estado de sprints

## ✅ Sprint 1 — Performance dashboard
- `getDashboardBundle` server fn (consolida 14+ llamadas → 1 round trip).
- `DashboardSkeleton` reemplazó "Cargando…" plano.

## ✅ Sprint 1.5 — Skeletons restantes
- `LessonsListSkeleton`, `LessonDetailSkeleton`, `PracticeSkeleton` en sus rutas.
- PWA manifest 401: gating del entorno preview, no defecto de código.

## ✅ Sprint 2 — i18n completo
- **B1** Landing hero ES (claves `landing.hero.*`).
- **B2** `src/lib/auth-errors.ts` con `mapAuthError()` → claves `auth.errors.*`; aplicado en auth/forgot/reset.
- **B3** Auditoría loose strings: `certificate.tsx` PDF + badge, `AdminAppShell` botón "← App" → todas en `t()`. Claves `student.certificate.pdfTitle*`, `pdfBody1/2`, `courseCompletionBadge`, `issuedOn`, `verifyLabel`, `*Upper`, `admin.nav.backToAppShort` añadidas a `es.ts` + `en.ts`. `programLine`/`thisCertifies` ES corregidas (estaban en EN).
- **B4** Switcher ES/EN visible en `SiteHeader` (público) y `StudentAppShell` (desktop + mobile), persistido en `localStorage` + `profiles.locale`.

---

# Candidatos Sprint 3

Elegir 1-2 según prioridad de producto:

### Opción A — Calidad/QA (estabilidad antes de lanzar)
- Tests E2E críticos (auth, lesson flow, practice, certificate issuance) con Vitest + happy-dom.
- Error boundaries por ruta con `errorComponent` consistente.
- Sentry/console error tracking centralizado.

### Opción B — UX/Accesibilidad
- Auditoría a11y (focus rings, ARIA, contraste en dark mode).
- Mejorar empty states (lessons, achievements, flashcards).
- Loading states optimistas (mutations sin spinner).

### Opción C — Engagement/Retention
- Notificaciones de reminder (campo `reminderOn` en settings ya existe, falta scheduler).
- Streak system + push web notifications.
- Email transaccional (welcome, certificate issued).

### Opción D — SEO/Marketing landing
- Meta tags por ruta (og:image dinámica para `/verify/$id`).
- Sitemap + robots.txt.
- Schema.org JSON-LD para Course/Certification.

### Opción E — Admin polish
- Bulk operations (delete múltiple en users/lessons).
- Filtros + búsqueda en admin tables.
- Audit log de cambios admin.
