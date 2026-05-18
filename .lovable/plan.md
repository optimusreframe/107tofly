# Continuación — Sprint 1.5 (cierre perf) + Sprint 2 (i18n)

Sprint 1 dejó `/dashboard` con bundle único + skeleton. Cierro perf en las otras rutas críticas y arranco i18n, que es el siguiente bloqueante de calidad percibida.

---

## Bloque A — Cerrar Sprint 1 (skeletons restantes)

1. **`LessonsListSkeleton`** en `src/components/`  
   Cards grises con shimmer (6 items). Usar en `src/routes/lessons.index.tsx` reemplazando el `Cargando...` actual.

2. **`LessonDetailSkeleton`**  
   Hero + 3 bloques de contenido + botón. Usar en `src/routes/lessons.$slug.tsx` y `src/routes/lesson.tsx`.

3. **`PracticeSkeleton`**  
   Card de pregunta + 4 opciones placeholder. Usar en `src/routes/practice.tsx`.

4. **Fix manifest PWA**  
   Verificar `public/manifest.webmanifest` se sirve público (no 401). Revisar `vite.config.ts` / `wrangler.jsonc` si hay regla que requiera auth en `/manifest.webmanifest`.

**Aceptación:** ninguna ruta del student app muestra texto "Cargando…" plano; manifest devuelve 200 sin sesión.

---

## Bloque B — Sprint 2: i18n completo

### B1. Landing Hero ES real
- Auditar `src/routes/index.tsx`: cualquier string EN hardcoded → `t('landing.hero.*')` con keys nuevas en `src/i18n/en.ts` y `src/i18n/es.ts`.
- Si el hero ya lee de `landing_sections` (CMS), asegurar que el render usa `locale` actual con fallback EN→ES.

### B2. Mapeo de errores de auth a i18n
- Nuevo archivo `src/lib/auth-errors.ts` con función `mapAuthError(err: unknown): string` que traduce los mensajes comunes de Supabase:
  - `Invalid login credentials` → `auth.errors.invalidCredentials`
  - `Email not confirmed` → `auth.errors.emailNotConfirmed`
  - `User already registered` → `auth.errors.userExists`
  - `Password should be at least 6 characters` → `auth.errors.weakPassword`
  - fallback → `auth.errors.generic`
- Aplicar en `src/routes/auth.tsx`, `forgot-password.tsx`, `reset-password.tsx`, `onboarding.tsx`.

### B3. Auditoría de strings sueltos
Pasar por:
- `src/routes/admin.*` (labels, botones, toasts)
- `src/routes/settings.tsx`
- `src/routes/certificate.tsx`, `verify.$id.tsx`
- `src/components/layouts/StudentAppShell.tsx`, `AdminAppShell.tsx`

Cada string visible no envuelto en `t(...)` se mueve a `i18n/en.ts` + `i18n/es.ts`. Sin renombrar keys existentes.

### B4. Locale switcher visible
- Botón ES/EN en `SiteHeader.tsx` (público) y en `StudentAppShell.tsx` (privado).
- Persistir en `localStorage.locale` (ya soportado en `src/i18n/index.ts`).
- Toggle inmediato sin recarga: `i18n.changeLanguage(next)` + `localStorage.setItem`.

**Aceptación:** con `locale=es` no hay texto EN visible en landing, auth, dashboard, lessons, practice, settings, admin. Switcher funcional en header público y privado.

---

## Detalles técnicos

- No tocar `client.ts`, `types.ts`, archivos auto-generados.
- No introducir dependencias nuevas.
- No tocar lógica de negocio — sólo UI/strings/skeletons.
- Typecheck obligatorio al final de cada bloque (`bunx tsc --noEmit`).

---

## Orden de ejecución

```text
A1-A3 (skeletons)  →  A4 (manifest)  →  B1 (hero)  →  B2 (auth errors)  →  B3 (audit)  →  B4 (switcher)
```

## Pregunta

¿Ejecuto **Bloque A completo + B1 (hero)** en este turno y dejo B2–B4 para el siguiente, o prefieres que arranque directo por **B1 (hero ES)** porque es lo más visible para usuarios?
