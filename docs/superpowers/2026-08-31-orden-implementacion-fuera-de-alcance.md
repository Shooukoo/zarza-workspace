# RubusAI — Orden de implementación de tareas "fuera de alcance"

**Fecha:** 2026-08-31
**Origen:** Decomposición de [[2026-08-31-inventario-fuera-de-alcance]] en sub-proyectos independientes. Cada grupo abajo tiene su propio ciclo spec → plan → implementación (vía brainstorming skill), uno a la vez, en el orden acordado con el usuario.

**Cómo usar este documento:** según se vaya arrancando/terminando cada grupo, actualizar su estado (⬜ no iniciado / 🟡 en spec o en progreso / ✅ completado) y enlazar el spec resultante en `docs/superpowers/specs/`.

---

## Orden acordado

### 1. Secretos centralizados — ✅ Completado
Rotación automatizada de los 4 secretos (`INTERNAL_NOTIFY_TOKEN`, `INFERENCE_AUTH_TOKEN`, `TRAINING_INTERNAL_TOKEN`, `FCM_TOKEN_ENCRYPTION_KEY`) vía `scripts/rotate-secret.sh` y `fruit-backend/scripts/rotate-fcm-key.ts`, con backfill de tokens FCM en texto plano resuelto en la misma pasada. Spec: [[2026-08-31-secretos-centralizados-design]]. Verificación E2E (2026-08-31) contra el stack local: los 4 secretos rotados de verdad y redesplegados con éxito — los 3 tokens compartidos vía `rotate-secret.sh` (healthcheck + logs sin rechazos) y `FCM_TOKEN_ENCRYPTION_KEY` vía `rotate-fcm-key.ts --apply` (corrido por el usuario, ya que la mutación de BD quedó bloqueada para el agente por el classifier de auto mode; `fruit-backend` healthy tras el redeploy). No se adoptó secret manager externo (evaluado y descartado en el spec).
*Por qué primero:* bajo esfuerzo, gana seguridad rápido, sin dependencias de otros grupos.

### 2. Autogestión de cuenta/perfil — ⬜ No iniciado
Cambio de contraseña por el propio usuario + página de perfil/configuración en `zarza-web` (la opción "Configuración" del menú del avatar, mencionada pero nunca construida).
*Por qué segundo:* proyecto chico, independiente de los demás.

### 3. Tema claro completo — ⬜ No iniciado
Migrar Usuarios/Campos/Solicitudes/Análisis/Revisión IA al tema claro y recolorear los 15 hex legacy en `UserDrawer`/`AnalisisDetailModal`/`SolicitudDetailDrawer`.
*Por qué tercero:* solo toca `zarza-web`, patrón visual ya establecido en specs previos (`dashboard-light-theme`, `brand-palette-rebrand`).

### 4. Mapas v2 — ⬜ No iniciado
Clustering en la vista general, exportar mapa como PNG, edición geométrica avanzada de polígonos, cache de queries de mapas de calor; confirmación al cancelar el editor con cambios sin guardar, undo de puntos individuales, rediseño de la barra de `leaflet-draw`, recordar posición del mapa entre sesiones, geocoding fuera de México.
*Por qué cuarto:* mejoras incrementales sobre código que ya existe y funciona (`mapas-calor`, `editor-poligono-ux`).

### 5. Notificaciones v2 — ⬜ No iniciado
Payload `data` para deep-linking, soporte multi-dispositivo (FCM), panel admin para ver notificaciones ajenas, notificaciones silenciosas/solo badge, preferencias por tipo, extender notificaciones en tiempo real a correcciones de detección y a progreso de jobs de entrenamiento.
*Por qué quinto:* toca varios servicios (`fruit-backend`, `zarza-web`, `zarza_ai`), pero extiende infraestructura de WS/FCM que ya existe.

### 6. Releases reales de zarza_ai — ⬜ No iniciado
Schemes/configurations de iOS, despliegue real de backends de staging/producción con sus URLs, firma de release por flavor (`signingConfig` propio en vez del de debug).
*Por qué sexto:* infraestructura/ops, importante antes de tener una build de producción real, pero no bloquea trabajo de producto.

### 7. Internacionalización (i18n) — ⬜ No iniciado
Soporte multi-idioma en `zarza-web` y en el manual de usuario de `zarza_ai` (fase 4 del spec de `user-manual`).
*Por qué séptimo:* decisión transversal (web + móvil) que conviene resolver una sola vez, mejor con el resto del producto ya estable.

### 8. Taxonomía de enfermedad/plaga — ⬜ No iniciado
Reemplazar el estado binario `SANO`/`ENFERMO` por tipos específicos de enfermedad/plaga — toca modelo (`fruit-inference`), BD (`ModelFeedback`), UI de revisión de detecciones y pipeline de entrenamiento (`fruit-training`) a la vez.
*Por qué último:* el más grande, y probablemente bloqueado por conseguir imágenes reales etiquetadas de enfermedades — no es solo trabajo de ingeniería, depende de un insumo externo (equipo agronómico).

---

## Tareas sueltas (sin spec propio, se hacen cuando haya espacio)

No ameritan su propio ciclo de brainstorming — se resuelven como tickets puntuales dentro de otro trabajo o en huecos de agenda:

- **Migración a Supabase** (de `mongodb-to-postgresql-migration`) — decisión de infraestructura/despliegue, solo requiere cambiar `DATABASE_URL`.
- **Extender Redis** más allá del dashboard (cache de otros endpoints, sesiones, rate limiting, invalidación granular) — de `redis-dashboard-cache`.
- **Endpoint de "merma por etapa"** en el dashboard — de `dashboard-kpis-redesign`.
- **Compresión avanzada en Flutter**: upload progresivo/chunked, soporte de formatos no-JPEG — de `image-compression-flutter`.
- **`aria-label` del ícono de `Input.Password`** en el login — de `dashboard-light-theme`, fix de accesibilidad trivial.
- **Ventana de gracia de 1s para refresh concurrente** — de `refresh-tokens`, edge case menor de auth.
- **Responsive/mobile de la top bar** de `zarza-web` — de `appshell-topbar`, depende de una decisión de producto más grande (¿`zarza-web` va a soportar mobile alguna vez?) antes de tener sentido como ticket.

---

*Ver también: [[2026-08-31-inventario-fuera-de-alcance]] (detalle completo de cada ítem por spec de origen) y [[2026-06-24-roadmap-tareas-pendientes]] (backlog general no relacionado a "fuera de alcance").*
