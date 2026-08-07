# Firebase Push Notifications — Design Spec

**Plan relacionado:** [[2026-05-07-firebase-push-notifications]]

**Date:** 2026-05-07  
**Author:** Santiago Nuñez  
**Status:** Approved

---

## Context

The `fruit-backend` already stores `fcm_token: string | null` in the User schema but never uses it. The goal is to connect Firebase Admin SDK and send real push notifications to Monitors (and Agronomists) when `SolicitudMuestreo` lifecycle events occur, complementing the existing WebSocket broadcast.

---

## Scope

- New `FcmModule` / `FcmService` in `fruit-backend`
- Push triggered on: solicitud **creation** and **state changes** (`CANCELADO`, `COMPLETADO`)
- Credentials via `FIREBASE_SERVICE_ACCOUNT_B64` environment variable (Base64-encoded JSON)
- No changes to `fruit-ms`, `fruit-inference`, or `zarza_ai` in this spec

---

## Architecture

### New module: `src/fcm/`

```
src/fcm/
  fcm.module.ts     — @Global() NestJS module, exports FcmService
  fcm.service.ts    — Firebase Admin init, sendToDevice, token cleanup
```

`FcmModule` is declared `@Global()` so downstream modules only need to import it once (in `AppModule`). `SolicitudesModule` does not need to import it explicitly after that.

### Dependency chain in SolicitudesService

```
SolicitudesService
  ├── NotificationsGateway   (WebSocket — existing)
  ├── FcmService             (push — new)
  └── UserRepositoryPort     (resolve asignado_a → User.fcm_token — existing port)
```

---

## FcmService API

```typescript
interface FcmNotification {
  title: string;
  body: string;
}

class FcmService {
  sendToDevice(fcmToken: string, notification: FcmNotification): Promise<void>
}
```

Single public method. No `data` payload in this iteration.

---

## Initialization

`FcmService.onModuleInit()` reads `FIREBASE_SERVICE_ACCOUNT_B64`, decodes from Base64, parses JSON, and calls `firebase-admin.initializeApp()`.

**Fail-fast:** if the env var is absent or the JSON is malformed, the service throws during module init — the server does not start. This prevents silent misconfiguration.

---

## Data Flow

### 1. Solicitud creation (`POST /solicitudes`)

```
[existing] Create MongoDB document
[existing] WebSocket broadcast 'nueva_solicitud'
[new]      FcmService
             └─ resolve asignado_a → User
             └─ if no fcm_token → log warning, return
             └─ sendToDevice(token, {
                  title: "Nueva solicitud: {campo.nombre}",
                  body:  "Fecha límite: {fecha_limite ?? 'sin fecha'}. Abre la app para ver detalles."
                })
```

`campo.nombre` is resolved via a `CamposService.findById(campo_id)` call within `SolicitudesService` before dispatching the push. The campo document already exists in DB at this point (campo_id is validated on creation). If the campo lookup returns null, fall back to using the `campo_id` string in the notification title.

### 2. State change (`PATCH /solicitudes/:id/estado`)

Only `CANCELADO` and `COMPLETADO` trigger a push. `EN_PROGRESO` and others do not.

```
[existing] Update MongoDB document
[new]      FcmService — only for CANCELADO / COMPLETADO
             └─ resolve asignado_a → User
             └─ if no fcm_token → log warning, return
             └─ sendToDevice(token, { title, body })
```

### Notification copy

| Event      | Title                          | Body                                               |
|------------|--------------------------------|----------------------------------------------------|
| Created    | `Nueva solicitud: {campo}`     | `Fecha límite: {fecha}. Abre la app para ver detalles.` |
| Cancelled  | `Solicitud cancelada: {campo}` | `La solicitud de muestreo fue cancelada.`          |
| Completed  | `Solicitud completada: {campo}`| `El análisis ha sido marcado como completado.`     |

---

## Error Handling

Push is always **best-effort** — a Firebase failure never fails the HTTP request or rolls back the solicitud operation.

| Situation | Behavior |
|-----------|----------|
| `asignado_a` is `null` | Early return, no log |
| User has no `fcm_token` (`null`) | `logger.warn('[FCM] Monitor {id} sin token registrado')`, return |
| Firebase: `registration-token-not-registered` | Set `user.fcm_token = null` in DB + `logger.info` |
| Firebase: any other error | `logger.error(...)`, swallow exception |

---

## Environment Variables

Add to `fruit-backend/.env` and Docker Compose:

```
FIREBASE_SERVICE_ACCOUNT_B64=<base64-encoded service account JSON>
```

---

## Testing

- **`FcmService` unit test** — mock Firebase Admin `messaging().send()`:
  - Calls send with correct token and payload
  - Logs warning when `fcm_token` is null, does not call send
  - Cleans `fcm_token` in DB when Firebase returns `registration-token-not-registered`
  - Swallows other Firebase errors without throwing

- **`SolicitudesService` unit test** — mock `FcmService`:
  - Calls `sendToDevice` on creation
  - Calls `sendToDevice` on `CANCELADO` and `COMPLETADO`
  - Does not call `sendToDevice` on `EN_PROGRESO`

---

## Out of Scope

- Flutter changes (FCM token registration on app side is already implemented)
- `data` payload for deep-linking (can be added later)
- Notification history / persistence in DB
- Multi-device support (one token per user)
