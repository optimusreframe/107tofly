# Plan

## Parte A — Marcar Memberships / Payments / Support como "Próximamente"

Actualmente **no hay UI pública** de pricing/support/upgrade en la Student App ni en la Landing; lo único vivo es el bloque de **Membership** dentro de `src/routes/admin.users.tsx` (override manual del admin) y las columnas `membership_plan` / `membership_status` en `profiles`. No se toca lógica de negocio ni pagos.

Cambios:

1. `src/routes/admin.users.tsx`
   - Ocultar/deshabilitar el bloque "Membership" (filas ~458-483) detrás de un estado `disabled` con overlay "Próximamente".
   - Quitar el filtro por `membershipPlan` del listado y esconder los badges `membershipPlan`/`membershipStatus` en las tarjetas (líneas 213-214, 264-265).
2. `src/routes/admin.tsx` (dashboard admin) — si aparecen KPIs de membership, marcarlos como "Próximamente" (verificar antes de tocar).
3. **No** crear `/pricing`, `/upgrade` ni `/support` todavía.
4. Documentar en `docs/ox/coming-soon-payments.md` que memberships/support/payments quedan en pausa oficial.

---

## Parte B — Roadmap "Superior a Duolingo": convertir 107toFly en app altamente interactiva

Duolingo compite en 4 ejes: **motivación diaria, feedback inmediato, social, y hábito**. Ya tienes buena base (SRS, mastery, XP, streak, flight-path, daily-flight, simulador). Lo que falta para superarlo, organizado en 6 sprints temáticos ejecutables uno por uno.

### Sprint I1 — Feedback sensorial y microinteracciones
Objetivo: que **cada acción se sienta viva** (donde Duolingo gana hoy).
- Sonidos: correcto/incorrecto/level-up/streak (Web Audio, respetar `prefers-reduced-motion` y toggle en `/settings`).
- Haptics móvil (`navigator.vibrate`).
- Confetti + shake en respuestas, animación de barra de mastery llenándose, contador XP animado.
- Mascota-copiloto "Otto" (drone SVG animado) con estados: idle, celebra, piensa, triste. Aparece en session player y summary.
- Transiciones entre ejercicios (slide/fade), skeleton loaders unificados.

### Sprint I2 — Sistema de vidas, combos y boosts (economía del hábito)
- **Combo counter** dentro de sesión: aciertos consecutivos multiplican XP (x1.2, x1.5, x2). Se rompe con error.
- **Streak Freeze** (1 gratis/semana) + **Streak Repair** (costoso) para no perder racha.
- **XP Boost** de 15 min tras completar Daily Flight.
- **Weekend Warrior** / **Perfect Lesson** achievements con recompensas concretas.
- Tabla `user_inventory` (freezes, boosts) + `xp_events` para auditar.

### Sprint I3 — Social y competición
Aquí Duolingo tiene "Ligas". Lo replicamos y mejoramos con contexto de piloto.
- **Leaderboards semanales** por XP (global + país + amigos), con promoción/descenso tipo liga (Bronze → Diamond → Ace Pilot).
- **Duels asíncronos 1v1**: reto de 5 preguntas mismo topic, notificación cuando el oponente responde.
- **Squadrons** (grupos de 5-10 pilotos) con misión semanal cooperativa.
- **Perfil público** con badges, mastery ring, tiempo total volado.
- Requiere: nuevas tablas `leagues`, `league_members`, `duels`, `squadrons`; jobs semanales vía `pg_cron` → server route en `/api/public/cron/*`.

### Sprint I4 — AI conversacional y voz (diferenciador real vs Duolingo)
Duolingo apenas empieza con conversación AI; aquí es donde 107toFly puede volar.
- **FlyCoach Voice**: modo voz en `/flycoach` usando Web Speech API (STT) + Lovable AI TTS. El estudiante habla scenarios ATC ("N123AB, Denver Tower, cleared for takeoff…") y la AI responde en tiempo real.
- **Radio Trainer**: transcripción evaluada contra frases estándar FAA.
- **Scenario Branching**: historias interactivas ("Estás volando y aparece TFR; qué haces?") con ramas y consecuencias.
- **AI Debrief** al terminar simulador: coach explica errores en lenguaje natural (Gemini 2.5 Flash, ya integrado).

### Sprint I5 — Contenido visual e inmersivo
- **3D/2.5D Airspace Explorer**: vista interactiva de clases de espacio aéreo (Three.js o deck.gl); tocar una clase abre reglas + quiz.
- **Sectional Chart Reader** con panning/zoom y hotspots interactivos (extensión de `/map-lab`).
- **Real METAR/TAF live** de aeropuertos elegidos por el estudiante en `/weather-lab`.
- **Video micro-lecciones** (30-60s) embed en lessons — CDN externo, no auto-hosted.
- **Sim de vuelo simplificado**: mini-canvas donde practicas maniobras Part 107 (line-of-sight, altitude limits).

### Sprint I6 — Retención, PWA y notificaciones
- **PWA**: manifest + service worker, instalable, offline para lecciones ya vistas y flashcards del día.
- **Push notifications** (web push) para: streak en riesgo, nuevos duels, tarjetas por revisar hoy, misión semanal cerrando.
- **Email digest** semanal (usar dominio propio ya configurado) con progreso, badge nuevos, liga actual.
- **Referral program**: código único, +200 XP al invitador cuando el amigo completa 1 lección.
- **Share cards** OG dinámicas: "Terminé mi primera Daily Flight con 92% — únete".

---

## Prioridad recomendada
`Parte A` (1 turno) → **I1** (sensorial, base para todo lo demás) → **I2** (economía) → **I3** (social) → **I4** (voz/AI) → **I5** (visual) → **I6** (retención).

Cada sprint sigue el mismo patrón que S11-S18: implementar → validar `tsgo` → doc en `docs/ox/sprint-I<n>.md`.

## Preguntas antes de arrancar
1. ¿Ejecuto **Parte A** ahora y luego arrancamos **I1**, o prefieres que primero elijas los sprints I* que quieres priorizar?
2. Para I3 (social/ligas): ¿nombres reales o handles/callsigns anónimos por defecto?
3. Para I4 (voz): ¿OK con permiso de micrófono y usar Lovable AI para TTS/STT en Gemini?
