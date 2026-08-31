# RubusAI — Inventario de "Fuera de Alcance" en specs de diseño

**Fecha:** 2026-08-31
**Origen:** Revisión de los 29 documentos en `docs/superpowers/specs/`, extrayendo lo que cada feature decidió explícitamente dejar fuera de su alcance al momento de diseñarse. A diferencia del backlog general (ver [[2026-06-24-roadmap-tareas-pendientes]]), esto son decisiones deliberadas de scope tomadas dentro de features que ya se implementaron — no trabajo pendiente sin dueño.

---

## Sin sección explícita de "fuera de alcance"

Estos 10 specs no declaran nada excluido formalmente (algunos tienen equivalentes como "Sin cambios en" o "Archivos no tocados"):

`offline-sync` (04-29) · `analisis-validacion` (05-05) · `vista-por-productor` (05-05, tiene "Sin cambios en") · `solicitudes-tab` (05-07) · `mobile-ui-improvements` (05-18) · `dates-and-user-names` (05-20, tiene "Archivos no tocados") · `image-preprocessing` (05-20) · `websocket-auth-scoping` (05-31) · `refresh-tokens` (06-01, mención suelta en tabla de edge cases) · `fruit-ms-retries-dlx` (07-09, solo descarta alternativas de implementación)

---

## Con fuera de alcance declarado

### `zarza-web-panel` (04-30) — Panel web base
- Módulo de usuarios/roles, historial de análisis, notificaciones WS en web, i18n, tests unitarios/E2E (todo "futuro")

### `gestion-usuarios` (05-05)
- Cambio de contraseña por el propio usuario, invitación por email, suspensión/desactivación (solo eliminación), auditoría de cambios de rol

### `agronomo-phase1` (05-06)
- Dashboard propio de AGRONOMO con quick actions, redirect post-login, alertas por umbrales → todo pospuesto a "Fase 2"

### `firebase-push-notifications` (05-07)
- Cambios en Flutter (ya implementado), payload `data` para deep-linking, historial de notificaciones en BD, multi-device (un token por usuario)

### `mongodb-to-postgresql-migration` (05-07)
- Migración de datos existentes (no había datos de prod), PostGIS/heatmaps, cambios en `fruit-inference`/`zarza_ai`, migración a Supabase
- *(del plan)* nota de seguimiento no explícita en el spec: los consumidores de la API tendrán que adaptarse a camelCase como trabajo posterior

### `user-manual` (05-19)
- Contenido hardcodeado (sin backend en fase 1), sin multilenguaje (fase 4), sin video, sin buscador, sin feedback loop, sin analytics — todo "Post-MVP"

### `image-compression-flutter` (06-25)
- Compresión/recodificación server-side, upload progresivo/chunked, calidad configurable por el usuario, formatos no-JPEG

### `persistent-notifications` (06-25)
- Panel admin de notificaciones ajenas, notificaciones silenciosas sin WS, preferencias por tipo

### `redis-dashboard-cache` (07-08)
- Cache para otros endpoints (`/admin/users`, queries de análisis), Redis para sesiones/rate limiting/colas, invalidación granular por productor

### `security-fixes-fcm-inference` (07-08)
- Backfill de tokens FCM ya en texto plano, fix del manejo de excepciones de `download_image_bytes` (preexistente, deliberadamente no tocado), rotación de `FCM_TOKEN_ENCRYPTION_KEY`/`INFERENCE_AUTH_TOKEN`

### `flutter-flavors` (07-09)
- Schemes/configurations de iOS (no existe proyecto iOS), despliegue real de staging/prod, firma de release por flavor

### `appshell-topbar` (08-07)
- Migrar Usuarios/Campos/Solicitudes/Revisión IA al tema claro (proyecto separado), página de perfil/configuración, responsive/mobile de la top bar

### `dashboard-light-theme` (08-07)
- Tema claro para el resto del panel (quedan oscuras), `aria-label` del ícono de `Input.Password`, rediseño de grid inspirado en Figma (descartado)

### `brand-palette-rebrand` (08-08)
- Migrar Usuarios/Campos/Solicitudes/Análisis al tema claro, recolorear 15 hex legacy en `UserDrawer`/`AnalisisDetailModal`/`SolicitudDetailDrawer`

### `dashboard-kpis-redesign` (08-09)
- Sidebar global estilo H-care (descartado), endpoint nuevo de "merma por etapa", cambios a `useDashboard.ts`, tests automatizados de `DashboardPage.tsx`

### `deteccion-feedback` (08-11) — fase 1 de reentrenamiento
- Fine-tuning/versionado de modelos (spec separado, ver abajo), backfill de análisis históricos sin detecciones, taxonomía de enfermedad/plaga (solo binario SANO/ENFERMO), notificaciones en tiempo real de correcciones, priorización de cola por confidence

### `pipeline-reentrenamiento` (08-12) — fase 2
- GPU dedicada, taxonomía de enfermedad específica, split de validación fijo entre jobs, paquete Python compartido con `fruit-inference` (se duplica + test de consistencia), entrenamientos programados (cron), acceso de AGRONOMO a la pantalla, notificaciones en tiempo real del progreso
- Limitación aceptada aparte: no se puede saber en qué etapa fenológica está un fruto enfermo (se descartó combinar clases tipo `naranja_enfermo` por poca data)

### `mapas-calor` (08-16)
- Clustering en la vista general, exportar mapa como PNG, edición geométrica avanzada (multi-polígono, recorte, unión), soporte offline en `zarza_ai`, cache de queries

### `editor-poligono-ux` (08-19)
- Confirmación al cancelar con cambios sin guardar, undo de puntos individuales, rediseño de la barra de `leaflet-draw`, recordar posición del mapa entre sesiones, geocoding fuera de México

---

## Patrón general

Casi todo lo "fuera de alcance" cae en tres cubetas:

1. **Trabajo pospuesto a un spec futuro ya nombrado** — tema claro del resto del panel, taxonomía de enfermedades, Fase 2 de agrónomo.
2. **Infraestructura que se decide no construir por ahora** — secret manager, cron de entrenamiento, tooling de replay de DLQ.
3. **Alcance de otra capa que ya funciona y no se toca** — Flutter en push notifications, `fruit-inference` en la migración de BD.

---

*Generado a partir de una revisión de los 29 archivos en `docs/superpowers/specs/` — ver [[2026-06-24-roadmap-tareas-pendientes]] para el backlog general de tareas no comenzadas.*
