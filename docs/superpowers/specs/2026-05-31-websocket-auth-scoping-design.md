---
name: websocket-auth-scoping
description: Diseño para añadir autenticación JWT y scoping por usuario al gateway WebSocket (SEG-01 + SEG-02 de la auditoría técnica)
metadata:
  type: project
---

# WebSocket Auth + Scoping — Diseño Técnico

**Plan relacionado:** [[2026-05-31-websocket-auth-scoping]]

**Fecha:** 2026-05-31
**Servicios afectados:** `fruit-backend`, `zarza_ai`
**Auditoría:** SEG-01 (WebSocket sin autenticación) + SEG-02 (broadcast sin scoping)

---

## 1. Problema

El gateway WebSocket en `/ws` tiene dos vulnerabilidades relacionadas:

**SEG-01:** Cualquier cliente puede conectarse sin presentar un JWT. El `handleConnection` acepta toda conexión sin validación.

**SEG-02:** Los métodos `broadcast()` del gateway envían eventos a **todos** los sockets conectados. Un productor puede recibir notificaciones de análisis de otro productor si ambos están conectados al mismo tiempo.

---

## 2. Solución

### Patrón: First-message authentication

1. El servidor acepta la conexión TCP/WS normalmente.
2. Inmediatamente arranca un timeout de 10 segundos.
3. El cliente debe enviar como primer mensaje `{"event":"auth","data":{"token":"<jwt>"}}`.
4. El servidor valida el JWT con el `JwtTokenService` existente.
5. Si el token es válido: registra el socket en dos maps internos y cancela el timeout.
6. Si el token es inválido o el timeout expira: cierra el socket con código `4001`.

Ventajas sobre query-param o headers:
- El token nunca aparece en logs de acceso de nginx/servidor.
- Funciona sin cambios en todas las plataformas (iOS, Android, web).
- Compatible con el adaptador `ws` de NestJS sin hooks adicionales.

---

## 3. Arquitectura del Gateway (Backend)

### 3.1 Estado interno

```typescript
// socket → userId autenticado
private readonly authenticated = new Map<WebSocket, string>();

// userId → conjunto de sockets activos (multi-dispositivo)
private readonly rooms = new Map<string, Set<WebSocket>>();

// socket → handle del timeout de auth pendiente
private readonly authTimeouts = new Map<WebSocket, NodeJS.Timeout>();
```

### 3.2 Ciclo de vida de una conexión

```
handleConnection(client)
  └─ authTimeouts.set(client, setTimeout(() => client.close(4001), 10_000))

@SubscribeMessage('auth')
  └─ payload: { token: string }
  └─ verifyToken(token) → JwtPayload { sub, email, role }
  └─ clearTimeout(authTimeouts.get(client))
  └─ authTimeouts.delete(client)
  └─ authenticated.set(client, sub)
  └─ rooms.get(sub) ?? rooms.set(sub, new Set())
  └─ rooms.get(sub).add(client)
  └─ client.send({ event: 'auth_ok' })

handleDisconnect(client)
  └─ clearTimeout(authTimeouts.get(client))  // si desconecta antes de auth
  └─ authTimeouts.delete(client)
  └─ userId = authenticated.get(client)
  └─ authenticated.delete(client)
  └─ rooms.get(userId)?.delete(client)
  └─ if rooms.get(userId)?.size === 0 → rooms.delete(userId)
```

### 3.3 Nuevo método `emitToUser`

```typescript
emitToUser(userId: string, event: string, data: unknown): void {
  const sockets = this.rooms.get(userId);
  if (!sockets?.size) return;
  const payload = JSON.stringify({ event, data });
  for (const client of sockets) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  }
}
```

`broadcast()` **se elimina** — era el origen de SEG-02.

### 3.4 Manejo de mensajes antes de autenticar

Si un socket no autenticado envía cualquier mensaje que no sea `auth`, se ignora silenciosamente. El timeout sigue corriendo.

---

## 4. Actualización de Callers de broadcast()

### 4.1 `InternalNotifyController` → `analisis_listo`

El payload de `POST /internal/notify` ya incluye `userId`. Cambio:

```typescript
// Antes
this.gateway.broadcast(body.event, body.data);

// Después
const userId = body.data?.userId as string | undefined;
if (userId) {
  this.gateway.emitToUser(userId, body.event, body.data);
}
```

### 4.2 `AnalysesController` → `analysis_validated`

El análisis ya tiene `productorId` disponible en `result`. Cambio:

```typescript
// Antes
this.notificationsGateway.broadcast('analysis_validated', { ... });

// Después
this.notificationsGateway.emitToUser(result.productorId, 'analysis_validated', { ... });
```

### 4.3 `SolicitudesService` → `nueva_solicitud`

La solicitud tiene `asignadoAId` (monitor). Para el agrónomo del campo se hace una consulta adicional: buscar en `UserCampo` los usuarios con `role === AGRONOMO` asignados al `campoId` de la solicitud. Se emite a ambos.

```typescript
// Emit al monitor asignado
this.notificationsGateway.emitToUser(solicitud.asignadoAId, 'nueva_solicitud', payload);

// Emit al/los agrónomo(s) del campo
const agronomo = await this.findAgronomo(solicitud.campoId);
if (agronomo) {
  this.notificationsGateway.emitToUser(agronomo.userId, 'nueva_solicitud', payload);
}
```

**`findAgronomos(campoId)`** — consulta `UserCampo` + `User` con join, devuelve todos los agrónomos asignados al campo:
```typescript
private async findAgronomos(campoId: string): Promise<string[]> {
  const ucs = await this.prisma.userCampo.findMany({
    where: { campoId, user: { role: 'AGRONOMO' } },
    select: { userId: true },
  });
  return ucs.map((uc) => uc.userId);
}
```

Y el loop de emisión:
```typescript
const agronomiIds = await this.findAgronomos(solicitud.campoId);
for (const id of agronomiIds) {
  this.notificationsGateway.emitToUser(id, 'nueva_solicitud', payload);
}
```

---

## 5. Cambios en Flutter (`zarza_ai`)

### 5.1 `WebSocketDatasource`

Cambios en `_connectAsync()`:

1. Recibir el JWT como dependencia inyectada (string, puede ser nulo si no hay sesión).
2. Tras `await channel.ready`, enviar inmediatamente el mensaje de auth:

```dart
await channel.ready;
_connecting = false;

// Enviar auth inmediatamente tras conectar
if (_token != null) {
  channel.sink.add(jsonEncode({
    'event': 'auth',
    'data': {'token': _token},
  }));
}
```

3. El datasource recibe `_token` como parámetro en el constructor o como setter. El `WebSocketBloc` (o quien gestione la conexión) obtiene el token de `flutter_secure_storage` antes de llamar a `connect()`.

4. Si el servidor cierra con código `4001` (auth rechazado), el `onDone` del stream ya lanza el reconector exponencial existente — no se necesita lógica extra.

### 5.2 Obtención del token

El token vive en `flutter_secure_storage` bajo la clave `'auth_token'` (definida en `LocalAuthDatasource._tokenKey`). El patrón de inyección existente es: `NotificationsRepositoryImpl` ya recibe `WebSocketDatasource` y llama a `connect()`. Se añade `LocalAuthDatasource` como segunda dependencia de `NotificationsRepositoryImpl`. Al conectar, el repositorio lee el token y lo pasa al datasource:

```dart
// NotificationsRepositoryImpl
final token = await _localAuth.getToken();  // lee 'auth_token'
_datasource.setToken(token);
_datasource.connect();
```

El `service_locator.dart` pasa ambas dependencias al repositorio:
```dart
sl.registerLazySingleton<INotificationsRepository>(
  () => NotificationsRepositoryImpl(
    sl<WebSocketDatasource>(),
    sl<LocalAuthDatasource>(),
  ),
);
```

### 5.3 Evento `auth_ok`

El servidor envía `{"event":"auth_ok"}` tras autenticar correctamente. El datasource puede filtrar este evento internamente (no propagarlo al stream de negocio) o dejarlo pasar — la UI puede ignorarlo ya que no tiene semántica de negocio.

---

## 6. Flujo Completo

```
Flutter                          fruit-backend
  │  WS connect /ws               │
  ├────────────────────────────►  │ handleConnection → timeout 10s
  │                               │
  │  {"event":"auth",             │
  │   "data":{"token":"JWT"}}     │
  ├────────────────────────────►  │ @SubscribeMessage('auth')
  │                               │   verifyToken → JwtPayload
  │                               │   authenticated.set(socket, sub)
  │                               │   rooms.get(sub).add(socket)
  │  {"event":"auth_ok"}          │   clearTimeout
  │◄───────────────────────────── │
  │                               │
  │  (evento de negocio)          │
  │◄───────────────────────────── │ emitToUser(userId, event, data)
```

---

## 7. Casos de Borde

| Escenario | Comportamiento |
|-----------|----------------|
| Token expirado en el mensaje auth | `verifyToken` lanza excepción → socket cerrado con 4001 |
| Cliente desconecta antes del auth | `handleDisconnect` cancela el timeout y limpia los maps |
| Usuario con múltiples dispositivos conectados | `rooms.get(userId)` es un `Set` — recibe el evento en todos los sockets |
| Socket envía mensajes antes de auth | Ignorados silenciosamente |
| Token renovado (futura impl. refresh) | El cliente reconnecta con el nuevo token — el reconnect exponencial ya existe |
| `emitToUser` a userId sin sockets activos | `rooms.get(userId)` es undefined → early return, sin error |

---

## 8. Tests

### Backend (fruit-backend)
- Unit: `NotificationsGateway` — auth válida registra socket en maps, auth inválida cierra socket, timeout cierra socket si no llega auth, `handleDisconnect` limpia maps correctamente.
- Unit: `emitToUser` — solo emite a los sockets de la room del userId dado.
- Unit: `SolicitudesService.create` — verifica que se llama `emitToUser` con el monitorId y el agronomo del campo.

### Flutter (zarza_ai)
- Unit: `WebSocketDatasource` — verifica que tras `channel.ready` se envía el mensaje auth con el token correcto.

---

## 9. Archivos a Modificar

| Archivo | Cambio |
|---------|--------|
| `fruit-backend/src/notifications/notifications.gateway.ts` | Auth por primer mensaje, maps de rooms, `emitToUser`, eliminar `broadcast` |
| `fruit-backend/src/notifications/internal-notify.controller.ts` | Usar `emitToUser(data.userId, ...)` |
| `fruit-backend/src/analyses/analyses.controller.ts` | Usar `emitToUser(result.productorId, ...)` |
| `fruit-backend/src/solicitudes/solicitudes.service.ts` | Usar `emitToUser` para monitor + agrónomo, añadir `findAgronomo` |
| `zarza_ai/lib/data/datasources/websocket_datasource.dart` | Enviar mensaje auth tras `channel.ready` |
| `zarza_ai/lib/presentation/blocs/websocket_bloc.dart` (o equivalente) | Leer token de storage y pasarlo al datasource |
