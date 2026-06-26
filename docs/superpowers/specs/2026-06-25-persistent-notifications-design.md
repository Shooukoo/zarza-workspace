# Notificaciones In-App Persistentes

**Fecha:** 2026-06-25  
**Estado:** Aprobado  

## Contexto

El sistema actual entrega notificaciones exclusivamente vía WebSocket efímero y FCM push. Si el usuario está offline o no tiene la app abierta, pierde la notificación para siempre. Este spec define la capa de persistencia server-side y la UI de campana con historial leídas/no leídas.

Eventos notificables actuales: `analisis_listo`, `analysis_validated`, `nueva_solicitud`.

## Arquitectura general

```
fruit-ms → POST /internal/notify
              ↓
     NotificationsService.create()
       ├── INSERT notification en PostgreSQL (expiresAt = now + 30d)
       └── gateway.emitToUser()  ← sin cambios en el WS
              ↓
         Flutter recibe WS
           ├── snackbar (comportamiento existente, sin cambios)
           └── NotificationsBloc(WsReceived) → incrementa unreadCount
```

El usuario abre la campana → `NotificationsScreen` hace `GET /notifications` → lista completa desde el servidor.

## Modelo de datos (Prisma — PostgreSQL)

```prisma
model Notification {
  id        String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId    String   @map("user_id") @db.Uuid
  type      String   // 'analisis_listo' | 'analysis_validated' | 'nueva_solicitud'
  title     String
  body      String
  data      Json?    // payload original del evento (imageId, action, etc.)
  read      Boolean  @default(false)
  createdAt DateTime @default(now()) @map("created_at")
  expiresAt DateTime @map("expires_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, createdAt(sort: Desc)])
  @@index([expiresAt])
  @@map("notifications")
}
```

- **expiresAt** = `createdAt + 30 días`, calculado al crear el registro.
- **Hard delete** en borrado manual y en el cron de limpieza diaria.
- Índice `(userId, createdAt DESC)` para queries paginadas eficientes.
- Índice `(expiresAt)` para el cron de limpieza.

## Backend — fruit-backend

### Archivos nuevos

```
src/notifications/
  notification.entity.ts          ← tipo TypeScript del registro
  notification.repository.ts      ← wrapper Prisma (CRUD)
  notifications.service.ts        ← lógica de negocio + cron
  notifications.controller.ts     ← REST endpoints autenticados
```

### NotificationsService — métodos

| Método | Descripción |
|--------|-------------|
| `create(userId, type, title, body, data?)` | Persiste en DB + llama `gateway.emitToUser()` |
| `findForUser(userId, page, limit)` | Lista paginada + `unreadCount` |
| `markRead(id, userId)` | Valida ownership, `read = true` |
| `markAllRead(userId)` | `updateMany` donde `userId + read=false` |
| `delete(id, userId)` | Valida ownership, hard delete |
| `cleanupExpired()` | `@Cron` diario — `deleteMany` donde `expiresAt < now()` |

### REST endpoints

Todos protegidos con `JwtAuthGuard`. El usuario autenticado solo accede a sus propias notificaciones.

| Método | Ruta | Respuesta |
|--------|------|-----------|
| `GET` | `/notifications?page=1&limit=20` | `{ items, total, unreadCount }` |
| `PATCH` | `/notifications/read-all` | `204 No Content` |
| `PATCH` | `/notifications/:id/read` | `204 No Content` |
| `DELETE` | `/notifications/:id` | `204 No Content` |

### Modificación a InternalNotifyController

`notify()` llama `notificationsService.create(userId, event, title, body, data)` antes del envío WS/FCM. El mapeo `event → title/body` se centraliza aquí (mismo texto que ya usa el snackbar de Flutter).

### Prisma schema

Se agrega el modelo `Notification` al `packages/database/prisma/schema.prisma` y se añade la relación inversa `notifications Notification[]` en el modelo `User`.

Se ejecuta `prisma migrate dev` para generar la migración SQL.

## Flutter — zarza_ai

### Domain

**Entidad:**
```dart
class NotificationEntity {
  final String id;
  final String type;
  final String title;
  final String body;
  final Map<String, dynamic>? data;
  final bool isRead;
  final DateTime createdAt;
  final DateTime expiresAt;
}
```

**Extensión de `INotificationsRepository`:**
```dart
Future<NotificationsPage> fetchPage(int page);
Future<void> markRead(String id);
Future<void> markAllRead();
Future<void> delete(String id);
```

**Use cases nuevos:**
- `GetNotificationsUseCase`
- `MarkReadUseCase`
- `MarkAllReadUseCase`
- `DeleteNotificationUseCase`

### Data

- `NotificationModel` — `fromJson` + `toEntity()`
- `RemoteNotificationsDatasource` — 4 métodos HTTP con Dio
- `NotificationsRepositoryImpl` — implementa los métodos REST nuevos; mantiene el WS stream existente

### Presentation — NotificationsBloc

**Eventos:**
```dart
LoadNotifications
LoadMoreNotifications
MarkNotificationRead(String id)
MarkAllNotificationsRead
DeleteNotification(String id)
WsNotificationReceived   // dispara ScaffoldWithBottomNav al recibir WS
```

**Estado:**
```dart
class NotificationsState {
  final List<NotificationEntity> items;
  final int unreadCount;
  final int page;
  final bool hasMore;
  final NotificationsStatus status; // initial | loading | success | failure
}
```

**Comportamiento clave:**
- `WsNotificationReceived` → incrementa `unreadCount` sin fetch (badge instantáneo)
- `LoadNotifications` → fetch completo desde REST, reemplaza lista
- `LoadMoreNotifications` → append página siguiente (scroll infinito)
- `MarkNotificationRead` / `DeleteNotification` → actualización optimista + confirmación REST
- `MarkAllNotificationsRead` → `unreadCount = 0` optimista + llamada REST

### UI

**`NotificationsBellWidget`**
- `IconButton(icon: Icon(Icons.notifications_outlined))`
- `Badge` de Material 3 con `unreadCount` (solo visible si > 0)
- Al pulsar → `context.push('/notifications')`
- Se ubica en el `AppBar` global de `ScaffoldWithBottomNav`

**`ScaffoldWithBottomNav`**
- Se agrega un `AppBar` con título vacío/logo y la campana a la derecha
- Para evitar doble AppBar, las pantallas hijas del shell (`HomeScreen`, `HistoryScreen`, `SolicitudesScreen`) dejarán de definir su propio `AppBar` en el `Scaffold` raíz y usarán el del shell; si alguna pantalla necesita título propio, se pasa como parámetro al shell
- `_onWsEvent()` mantiene snackbar actual + añade `context.read<NotificationsBloc>().add(WsNotificationReceived())`

**`NotificationsScreen`** (`/notifications`)
- `AppBar` con título "Notificaciones" + acción "Marcar todo leído"
- `RefreshIndicator` + `ListView.builder` con paginación al llegar al final
- Ítem: título, body, timestamp relativo (`hace 2h`), punto de color si no leído
- `Dismissible` para swipe-to-delete (dirección izquierda)
- Al pulsar ítem → `MarkNotificationRead` + navegación según `type`: `analisis_listo` y `analysis_validated` → `/history`; `nueva_solicitud` → `/solicitudes`
- Estado vacío: ilustración + texto "Sin notificaciones"

## Flujo de datos completo

```
1. fruit-ms llama POST /internal/notify { event, data }
2. NotificationsService.create() inserta en DB
3. gateway.emitToUser() envía WS (igual que hoy)
4. Flutter recibe WS:
     a. ScaffoldWithBottomNav muestra snackbar (sin cambios)
     b. NotificationsBloc recibe WsNotificationReceived → unreadCount++
     c. Badge de la campana se actualiza en pantalla
5. Usuario pulsa campana → /notifications
6. NotificationsBloc(LoadNotifications) → GET /notifications?page=1
7. Lista renderizada; notificaciones no leídas destacadas visualmente
8. Usuario pulsa ítem → PATCH /notifications/:id/read → navega a pantalla relevante
9. Usuario hace swipe → DELETE /notifications/:id → ítem desaparece
10. Cron diario (medianoche) → DELETE WHERE expiresAt < now()
```

## Decisiones tomadas

- **Persistencia server-side** (no local/Drift) — historial sobrevive reinstalaciones y cambios de dispositivo.
- **Hard delete** — sin soft-delete; simplicidad sobre recuperabilidad.
- **TTL 30 días** con limpieza automática diaria.
- **WS conserva rol de entrega en tiempo real** — la DB es solo el historial; no se cambia el protocolo WS.
- **Badge optimista vía WsReceived** — no hay round-trip extra al recibir una notificación; la campana se actualiza instantáneamente.
- **AppBar global** en `ScaffoldWithBottomNav` — campana visible en todas las pantallas.

## Fuera de scope

- Panel admin de notificaciones (ver notificaciones de otros usuarios)
- Notificaciones silenciosas / solo badge sin WS
- Preferencias de notificación por tipo
