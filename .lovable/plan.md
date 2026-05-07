# 107toFly — Mega QA Audit Plan

Estoy en modo plan (solo lectura), así que no puedo ejecutar la auditoría ni generar el PDF en este turno. Apruébame el plan y en el siguiente turno ejecuto todo y entrego el PDF descargable. No tocaré código de la app.

## Alcance

Auditoría profunda **read-only** de:
- Landing pública (`/`)
- Auth (`/auth`, `/forgot-password`, `/reset-password`)
- Student App (todas las rutas listadas)
- Admin App (todas las rutas `/admin/*`)
- Backend (tablas, RLS, conteos, server functions)
- i18n ES/EN, dark/light, responsive (mobile/tablet/desktop), PWA
- Comparación contra el plan inicial

No se modifica código, base de datos ni configuración.

## Metodología

1. **Inspección de código** (read-only)
   - Leer rutas en `src/routes/*`, server functions en `src/server/*`, i18n en `src/i18n/*`, layouts y `app_settings`/runtime hooks.
   - Mapear cada feature del plan inicial a archivos reales y a server functions usadas.
   - Identificar mocks, hardcodes, keys crudas, placeholders, botones muertos.

2. **Inspección de DB** (solo SELECT vía `supabase--read_query`)
   - Conteos por tabla, ejemplos de filas representativas.
   - Verificar dedupe `translation_group_id`, `lesson_quiz_progress`, `app_settings` activos.
   - Confirmar RLS y `user_roles` para el admin de prueba.

3. **Pruebas en navegador** (browser tools, sesión real)
   - Login con las credenciales provistas.
   - Recorrer cada ruta Student y Admin en viewports 1440 (desktop), 820 (tablet), 390 (iPhone).
   - Probar dark/light, ES/EN, navegación, formularios, mutaciones clave (sin acciones destructivas en datos reales: no revoke real, no reset progress, no delete usuarios; se documenta el comportamiento sin ejecutar).
   - Capturar errores de consola y network.
   - Screenshots por sección clave (para incrustar en el PDF).

4. **Análisis cruzado**
   - Cada hallazgo se etiqueta por: severidad (P0/P1/P2/P3), área, evidencia (archivo + ruta + screenshot), recomendación.

## Acciones destructivas — explícitamente NO se ejecutan

Para no contaminar la cuenta admin real:
- No se revoca/emite certificados reales.
- No se cambian roles ni membresía.
- No se hace reset progress.
- No se publican cambios en landing/lessons/questions.
- No se generan traducciones AI (consume LOVABLE_API_KEY).
- Se documenta UX y backend leyendo el código + abriendo el modal sin confirmar.

Si quieres que SÍ se ejecuten algunas (ej. probar AI translation con 1 pregunta), dímelo antes de aprobar.

## Entregable

**Un PDF descargable** en `/mnt/documents/107tofly-audit-report.pdf` con la estructura exacta que pediste:

A. Executive Summary
B. Critical Bugs (tabla)
C. Functional Gaps (tabla)
D. Visual / UX Issues (tabla, por ruta + device)
E. i18n Issues (tabla)
F. Admin App Issues (tabla por módulo)
G. Student App Issues (tabla por módulo)
H. Backend / DB Issues (tabla)
I. Initial Plan Completion Matrix (✅/🟡/❌/⚠️ por requisito)
J. Prioritized Fix Plan (P0/P1/P2/P3 con archivos, backend, riesgo, orden, criterios de aceptación)

El PDF se genera con `reportlab` (texto + tablas + screenshots embebidos), se hace QA visual página por página, y se entrega con `<presentation-artifact>` para descarga directa.

## Tiempo / costo estimado

Auditoría profunda + browser walk + PDF: ~varios minutos de ejecución, varias llamadas a tools. Sin cambios en la app, sin costo de AI gateway (no se generan traducciones).

## Lo que NO incluye este sprint

- Ningún fix de código.
- Ninguna migración.
- Ningún cambio de configuración.
- Ningún seed de contenido.

Después del PDF, tú eliges qué sprint atacar primero.

---

Apruébalo y procedo a ejecutar la auditoría completa y entregarte el PDF.
