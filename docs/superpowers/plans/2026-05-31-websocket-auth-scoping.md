# WebSocket Auth + Scoping — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Añadir autenticación JWT por primer mensaje y scoping por usuario al gateway WebSocket de fruit-backend, y actualizar zarza_ai para enviar el token al conectar.

**Architecture:** El servidor acepta toda conexión WS pero abre un timeout de 10 s; el cliente envía `{"event":"auth","data":{"token":"<jwt>"}}` como primer mensaje; el servidor valida el JWT con el `ITokenPort` existente, registra el socket en un `Map<userId, Set<WebSocket>>` (rooms), y emite los eventos solo a la room del usuario destinatario usando `emitToUser()` en lugar del antiguo `broadcast()`.

**Tech Stack:** NestJS 11 + `ws` adapter, `@nestjs/websockets`, Flutter `web_socket_channel`, Jest, `flutter_secure_storage`.

---

## File Map

| Acción | Archivo |
|--------|---------|
| Crear | `fruit-backend/src/notifications/notifications.gateway.spec.ts` |
| Modificar | `fruit-backend/src/notifications/notifications.gateway.ts` |
| Modificar | `fruit-backend/src/solicitudes/solicitudes.service.spec.ts` |
| Modificar | `fruit-backend/src/solicitudes/solicitudes.service.ts` |
| Modificar | `fruit-backend/src/notifications/internal-notify.controller.ts` |
| Modificar | `fruit-backend/src/analyses/analyses.controller.ts` |
| Modificar | `zarza_ai/lib/data/datasources/websocket_datasource.dart` |
| Modificar | `zarza_ai/lib/data/repositories/notifications_repository_impl.dart` |
| Modificar | `zarza_ai/lib/core/di/service_locator.dart` |

---

### Task 1: NotificationsGateway — escribir tests

**Files:**
- Create: `fruit-backend/src/notifications/notifications.gateway.spec.ts`

- [ ] **Step 1: Crear el archivo de tests**

```typescript
// fruit-backend/src/notifications/notifications.gateway.spec.ts
import { Test } from '@nestjs/testing';
import { WebSocket } from 'ws';
import { NotificationsGateway } from './notifications.gateway';
import { I_TOKEN_PORT } from '../auth/ports/token.port';

const mockTokenService = { verifyToken: jest.fn() };

function makeSocket(readyState = WebSocket.OPEN): WebSocket {
  return {
    send: jest.fn(),
    close: jest.fn(),
    readyState,
  } as unknown as WebSocket;
}

describe('NotificationsGateway', () => {
  let gateway: NotificationsGateway;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        NotificationsGateway,
        { provide: I_TOKEN_PORT, useValue: mockTokenService },
      ],
    }).compile();
    gateway = module.get(NotificationsGateway);
    jest.clearAllMocks();
  });

  describe('handleConnection()', () => {
    it('cierra socket con 4001 tras 10 segundos sin auth', () => {
      jest.useFakeTimers();
      const client = makeSocket();

      gateway.handleConnection(client);

      expect(client.close).not.toHaveBeenCalled();
      jest.advanceTimersByTime(10_000);
      expect(client.close).toHaveBeenCalledWith(4001, 'Auth timeout');
      jest.useRealTimers();
    });
  });

  describe('handleAuth()', () => {
    it('registra socket en rooms y envía auth_ok con token válido', async () => {
      const client = makeSocket();
      mockTokenService.verifyToken.mockResolvedValue({
        sub: 'user-1',
        email: 'a@b.com',
        role: 'PRODUCTOR',
      });

      gateway.handleConnection(client);
      await gateway.handleAuth(client, { token: 'valid-jwt' });

      expect(client.send).toHaveBeenCalledWith(
        JSON.stringify({ event: 'auth_ok' }),
      );
    });

    it('cancela el timeout de auth al recibir token válido', async () => {
      jest.useFakeTimers();
      const client = makeSocket();
      mockTokenService.verifyToken.mockResolvedValue({
        sub: 'user-1',
        email: 'a@b.com',
        role: 'PRODUCTOR',
      });

      gateway.handleConnection(client);
      await gateway.handleAuth(client, { token: 'valid-jwt' });
      jest.advanceTimersByTime(10_000);

      expect(client.close).not.toHaveBeenCalledWith(4001, 'Auth timeout');
      jest.useRealTimers();
    });

    it('cierra socket con 4001 con token inválido', async () => {
      const client = makeSocket();
      mockTokenService.verifyToken.mockRejectedValue(new Error('expired'));

      gateway.handleConnection(client);
      await gateway.handleAuth(client, { token: 'bad-jwt' });

      expect(client.close).toHaveBeenCalledWith(4001, 'Invalid token');
      expect(client.send).not.toHaveBeenCalledWith(
        JSON.stringify({ event: 'auth_ok' }),
      );
    });
  });

  describe('handleDisconnect()', () => {
    it('cancela timeout si el cliente desconecta antes de auth', () => {
      jest.useFakeTimers();
      const client = makeSocket();

      gateway.handleConnection(client);
      gateway.handleDisconnect(client);
      jest.advanceTimersByTime(10_000);

      expect(client.close).not.toHaveBeenCalled();
      jest.useRealTimers();
    });

    it('elimina el socket de la room tras autenticar y desconectar', async () => {
      const client = makeSocket();
      mockTokenService.verifyToken.mockResolvedValue({
        sub: 'user-1',
        email: 'a@b.com',
        role: 'PRODUCTOR',
      });

      gateway.handleConnection(client);
      await gateway.handleAuth(client, { token: 'valid' });
      gateway.handleDisconnect(client);

      // emitToUser no debe enviar nada tras desconectar
      (client.send as jest.Mock).mockClear();
      gateway.emitToUser('user-1', 'test', {});
      expect(client.send).not.toHaveBeenCalled();
    });
  });

  describe('emitToUser()', () => {
    it('envía a todos los sockets de la room del usuario', async () => {
      const client1 = makeSocket();
      const client2 = makeSocket();
      mockTokenService.verifyToken.mockResolvedValue({
        sub: 'user-1',
        email: 'a@b.com',
        role: 'PRODUCTOR',
      });

      gateway.handleConnection(client1);
      await gateway.handleAuth(client1, { token: 'jwt' });
      gateway.handleConnection(client2);
      await gateway.handleAuth(client2, { token: 'jwt' });

      (client1.send as jest.Mock).mockClear();
      (client2.send as jest.Mock).mockClear();

      gateway.emitToUser('user-1', 'analisis_listo', { id: 'abc' });

      const expected = JSON.stringify({ event: 'analisis_listo', data: { id: 'abc' } });
      expect(client1.send).toHaveBeenCalledWith(expected);
      expect(client2.send).toHaveBeenCalledWith(expected);
    });

    it('no envía a sockets de otro usuario', async () => {
      const clientA = makeSocket();
      const clientB = makeSocket();
      mockTokenService.verifyToken
        .mockResolvedValueOnce({ sub: 'user-A', email: 'a@b.com', role: 'PRODUCTOR' })
        .mockResolvedValueOnce({ sub: 'user-B', email: 'b@b.com', role: 'PRODUCTOR' });

      gateway.handleConnection(clientA);
      await gateway.handleAuth(clientA, { token: 'jwtA' });
      gateway.handleConnection(clientB);
      await gateway.handleAuth(clientB, { token: 'jwtB' });

      (clientA.send as jest.Mock).mockClear();
      (clientB.send as jest.Mock).mockClear();

      gateway.emitToUser('user-A', 'test', {});

      expect(clientA.send).toHaveBeenCalled();
      expect(clientB.send).not.toHaveBeenCalled();
    });

    it('no lanza error cuando userId no tiene sockets registrados', () => {
      expect(() => gateway.emitToUser('ghost-user', 'test', {})).not.toThrow();
    });

    it('omite sockets con readyState !== OPEN', async () => {
      const closedClient = makeSocket(WebSocket.CLOSED);
      mockTokenService.verifyToken.mockResolvedValue({
        sub: 'user-1',
        email: 'a@b.com',
        role: 'PRODUCTOR',
      });

      gateway.handleConnection(closedClient);
      await gateway.handleAuth(closedClient, { token: 'valid' });

      (closedClient.send as jest.Mock).mockClear();
      gateway.emitToUser('user-1', 'test', {});

      expect(closedClient.send).not.toHaveBeenCalled();
    });
  });
});
```

- [ ] **Step 2: Correr tests — deben fallar porque `NotificationsGateway` aún no tiene `handleAuth` ni `emitToUser`**

```bash
cd fruit-backend && pnpm run test -- --testPathPattern="notifications.gateway.spec" --no-coverage
```

Resultado esperado: múltiples `FAIL` — `gateway.handleAuth is not a function`, `gateway.emitToUser is not a function`.

---

### Task 2: NotificationsGateway — reescribir implementación

**Files:**
- Modify: `fruit-backend/src/notifications/notifications.gateway.ts`

- [ ] **Step 1: Reemplazar el contenido completo del gateway**

```typescript
// fruit-backend/src/notifications/notifications.gateway.ts
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Inject, Logger } from '@nestjs/common';
import { Server, WebSocket } from 'ws';
import { I_TOKEN_PORT, type ITokenPort } from '../auth/ports/token.port';

@WebSocketGateway({ path: '/ws' })
export class NotificationsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationsGateway.name);

  // socket → userId autenticado
  private readonly authenticated = new Map<WebSocket, string>();
  // userId → sockets activos (multi-dispositivo)
  private readonly rooms = new Map<string, Set<WebSocket>>();
  // socket → handle del timeout de auth pendiente
  private readonly authTimeouts = new Map<WebSocket, NodeJS.Timeout>();

  constructor(@Inject(I_TOKEN_PORT) private readonly tokenService: ITokenPort) {}

  handleConnection(client: WebSocket) {
    this.logger.log('Cliente WebSocket conectado, esperando auth...');
    const timeout = setTimeout(() => {
      this.logger.warn('Timeout de auth — cerrando socket');
      client.close(4001, 'Auth timeout');
    }, 10_000);
    this.authTimeouts.set(client, timeout);
  }

  handleDisconnect(client: WebSocket) {
    const timeout = this.authTimeouts.get(client);
    if (timeout) {
      clearTimeout(timeout);
      this.authTimeouts.delete(client);
    }
    const userId = this.authenticated.get(client);
    this.authenticated.delete(client);
    if (userId) {
      const room = this.rooms.get(userId);
      if (room) {
        room.delete(client);
        if (room.size === 0) this.rooms.delete(userId);
      }
    }
    this.logger.log(
      `Cliente desconectado${userId ? ` (userId=${userId})` : ' (no autenticado)'}`,
    );
  }

  @SubscribeMessage('auth')
  async handleAuth(
    @ConnectedSocket() client: WebSocket,
    @MessageBody() payload: { token: string },
  ): Promise<void> {
    const timeout = this.authTimeouts.get(client);
    if (timeout) {
      clearTimeout(timeout);
      this.authTimeouts.delete(client);
    }

    try {
      const { sub } = await this.tokenService.verifyToken(payload?.token ?? '');
      this.authenticated.set(client, sub);
      if (!this.rooms.has(sub)) this.rooms.set(sub, new Set());
      this.rooms.get(sub)!.add(client);
      client.send(JSON.stringify({ event: 'auth_ok' }));
      this.logger.log(`Socket autenticado: userId=${sub}`);
    } catch {
      this.logger.warn('Token inválido — cerrando socket');
      client.close(4001, 'Invalid token');
    }
  }

  @SubscribeMessage('ping')
  handlePing(@MessageBody() _data: unknown): { event: string; data: string } {
    return { event: 'pong', data: 'ok' };
  }

  emitToUser(userId: string, event: string, data: unknown): void {
    const sockets = this.rooms.get(userId);
    if (!sockets?.size) return;
    const payload = JSON.stringify({ event, data });
    for (const client of sockets) {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(payload);
        } catch (err) {
          this.logger.warn(
            `Error enviando a userId=${userId}: ${(err as Error).message}`,
          );
        }
      }
    }
  }
}
```

- [ ] **Step 2: Correr tests — deben pasar todos**

```bash
cd fruit-backend && pnpm run test -- --testPathPattern="notifications.gateway.spec" --no-coverage
```

Resultado esperado: `9 passed`.

- [ ] **Step 3: Commit**

```bash
cd fruit-backend && git add src/notifications/notifications.gateway.ts src/notifications/notifications.gateway.spec.ts
git commit -m "feat(ws): rewrite gateway with first-message auth and user rooms (SEG-01 + SEG-02)"
```

---

### Task 3: SolicitudesService — actualizar tests e implementación

**Files:**
- Modify: `fruit-backend/src/solicitudes/solicitudes.service.spec.ts`
- Modify: `fruit-backend/src/solicitudes/solicitudes.service.ts`

- [ ] **Step 1: Actualizar el mock del gateway en el spec (línea 20) y añadir `userCampo` a `mockPrisma`**

En `solicitudes.service.spec.ts`, reemplazar:

```typescript
const mockGateway = { broadcast: jest.fn() };
```

por:

```typescript
const mockGateway = { emitToUser: jest.fn() };
```

Y en `mockPrisma` (después de `solicitudMuestreo`), añadir:

```typescript
  userCampo: {
    findMany: jest.fn(),
  },
```

El bloque completo de mocks queda:

```typescript
const mockPrisma = {
  solicitudMuestreo: {
    create: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  userCampo: {
    findMany: jest.fn(),
  },
};

const mockGateway = { emitToUser: jest.fn() };
```

- [ ] **Step 2: Agregar tests de `emitToUser` dentro del describe `create()` existente**

Añadir estos dos `it()` al final del bloque `describe('create()', ...)`, antes del `});` de cierre:

```typescript
    it('emite nueva_solicitud al monitor asignado', async () => {
      mockUserRepo.findFcmTokenById.mockResolvedValue(null);
      mockPrisma.userCampo.findMany.mockResolvedValue([]);

      await service.create('admin-id', dto);

      expect(mockGateway.emitToUser).toHaveBeenCalledWith(
        MONITOR_ID,
        'nueva_solicitud',
        expect.objectContaining({ solicitud_id: SOL_ID }),
      );
    });

    it('emite nueva_solicitud a cada agrónomo del campo', async () => {
      const AGRONOMO_ID = 'd4d4d4d4-0000-0000-0000-000000000001';
      mockUserRepo.findFcmTokenById.mockResolvedValue(null);
      mockPrisma.userCampo.findMany.mockResolvedValue([
        { userId: AGRONOMO_ID },
      ]);

      await service.create('admin-id', dto);

      expect(mockGateway.emitToUser).toHaveBeenCalledWith(
        AGRONOMO_ID,
        'nueva_solicitud',
        expect.objectContaining({ solicitud_id: SOL_ID }),
      );
    });
```

- [ ] **Step 3: Correr tests — los dos nuevos tests deben fallar**

```bash
cd fruit-backend && pnpm run test -- --testPathPattern="solicitudes.service.spec" --no-coverage
```

Resultado esperado: los 2 tests nuevos `FAIL` con `mockGateway.emitToUser` not called.

- [ ] **Step 4: Actualizar `SolicitudesService.create()` — reemplazar `broadcast` con `emitToUser` + `findAgronomos`**

En `fruit-backend/src/solicitudes/solicitudes.service.ts`, reemplazar el bloque que llama a `broadcast` (líneas 37-43 actuales):

```typescript
    this.notificationsGateway.broadcast('nueva_solicitud', {
      solicitud_id: solicitud.id,
      asignado_a: dto.asignado_a,
      campo_id: dto.campo_id,
      mensaje: dto.mensaje,
    });
```

por:

```typescript
    const wsPayload = {
      solicitud_id: solicitud.id,
      asignado_a: dto.asignado_a,
      campo_id: dto.campo_id,
      mensaje: dto.mensaje,
    };
    this.notificationsGateway.emitToUser(solicitud.asignadoAId, 'nueva_solicitud', wsPayload);
    const agronomiIds = await this.findAgronomos(solicitud.campoId);
    for (const id of agronomiIds) {
      this.notificationsGateway.emitToUser(id, 'nueva_solicitud', wsPayload);
    }
```

- [ ] **Step 5: Añadir el método privado `findAgronomos` al final de la clase, antes del cierre `}`**

```typescript
  private async findAgronomos(campoId: string): Promise<string[]> {
    const ucs = await this.prisma.userCampo.findMany({
      where: { campoId, user: { role: 'AGRONOMO' } },
      select: { userId: true },
    });
    return ucs.map((uc) => uc.userId);
  }
```

- [ ] **Step 6: Correr todos los tests del servicio — deben pasar**

```bash
cd fruit-backend && pnpm run test -- --testPathPattern="solicitudes.service.spec" --no-coverage
```

Resultado esperado: todos los tests `PASS` (incluyendo los de FCM existentes).

- [ ] **Step 7: Commit**

```bash
cd fruit-backend && git add src/solicitudes/solicitudes.service.ts src/solicitudes/solicitudes.service.spec.ts
git commit -m "feat(ws): scope nueva_solicitud to monitor + agronomos of campo"
```

---

### Task 4: InternalNotifyController — reemplazar `broadcast()`

**Files:**
- Modify: `fruit-backend/src/notifications/internal-notify.controller.ts`

- [ ] **Step 1: Reemplazar la llamada a `broadcast` por `emitToUser`**

En `internal-notify.controller.ts`, reemplazar la línea 26:

```typescript
    this.gateway.broadcast(body.event, body.data);
```

por:

```typescript
    const userId = body.data?.userId as string | undefined;
    if (userId) {
      this.gateway.emitToUser(userId, body.event, body.data);
    }
```

El método `notify` completo queda:

```typescript
  @Post('notify')
  @HttpCode(204)
  async notify(
    @Headers('x-internal-token') token: string,
    @Body() body: { event: string; data: Record<string, unknown> },
  ) {
    const expected = process.env.INTERNAL_NOTIFY_TOKEN;
    if (!expected || token !== expected) {
      throw new UnauthorizedException('Invalid internal token');
    }
    const userId = body.data?.userId as string | undefined;
    if (userId) {
      this.gateway.emitToUser(userId, body.event, body.data);
    }

    if (body.event === 'analisis_listo') {
      await this.sendAnalisisPush(body.data);
    }
  }
```

- [ ] **Step 2: Verificar que el proyecto compila sin errores de TypeScript**

```bash
cd fruit-backend && pnpm run build 2>&1 | tail -20
```

Resultado esperado: `Successfully compiled` sin errores. Si hay errores de tipo sobre `broadcast` referenciado en algún otro lugar, corregirlos.

- [ ] **Step 3: Commit**

```bash
cd fruit-backend && git add src/notifications/internal-notify.controller.ts
git commit -m "feat(ws): route analisis_listo to owner userId only"
```

---

### Task 5: AnalysesController — reemplazar `broadcast()`

**Files:**
- Modify: `fruit-backend/src/analyses/analyses.controller.ts`

- [ ] **Step 1: Reemplazar la llamada a `broadcast` en el método `validate`**

En `analyses.controller.ts`, localizar el bloque en el método `validate` (alrededor de la línea 91):

```typescript
    this.notificationsGateway.broadcast('analysis_validated', {
      analysisId: id,
      action: dto.action,
      validatedBy: req.user.email,
      productorId: result.productorId,
    });
```

Reemplazarlo por:

```typescript
    if (result.productorId) {
      this.notificationsGateway.emitToUser(result.productorId, 'analysis_validated', {
        analysisId: id,
        action: dto.action,
        validatedBy: req.user.email,
        productorId: result.productorId,
      });
    }
```

- [ ] **Step 2: Verificar compilación**

```bash
cd fruit-backend && pnpm run build 2>&1 | tail -20
```

Resultado esperado: sin errores de TypeScript.

- [ ] **Step 3: Verificar que `broadcast` ya no se usa en ningún lugar del proyecto**

```bash
cd fruit-backend && grep -r "\.broadcast(" src/
```

Resultado esperado: sin resultados (0 ocurrencias).

- [ ] **Step 4: Commit**

```bash
cd fruit-backend && git add src/analyses/analyses.controller.ts
git commit -m "feat(ws): route analysis_validated to productor only"
```

---

### Task 6: Flutter — WebSocketDatasource con token

**Files:**
- Modify: `zarza_ai/lib/data/datasources/websocket_datasource.dart`

- [ ] **Step 1: Reemplazar el contenido del datasource**

```dart
// zarza_ai/lib/data/datasources/websocket_datasource.dart
import 'dart:async';
import 'dart:convert';
import 'package:web_socket_channel/web_socket_channel.dart';
import '../../core/constants/app_constants.dart';

class WebSocketDatasource {
  WebSocketDatasource();

  final StreamController<String> _controller =
      StreamController<String>.broadcast();

  bool _disposed = false;
  bool _connecting = false;
  int _retryCount = 0;
  String? _token;
  StreamSubscription<dynamic>? _subscription;

  Stream<String> get stream => _controller.stream;

  void setToken(String? token) {
    _token = token;
  }

  void connect() {
    if (_disposed) return;
    _connectAsync();
  }

  Future<void> _connectAsync() async {
    if (_disposed || _connecting) return;
    _connecting = true;

    WebSocketChannel channel;
    try {
      channel = WebSocketChannel.connect(Uri.parse(AppConstants.wsUrl));
    } catch (_) {
      _connecting = false;
      _scheduleReconnect();
      return;
    }

    // Subscribe FIRST so handshake errors land in onError instead of
    // becoming unhandled async exceptions (web_socket_channel v3 quirk).
    _subscription = channel.stream.listen(
      (message) {
        if (_disposed) return;
        _retryCount = 0;
        final String decoded;
        if (message is String) {
          decoded = message;
        } else if (message is List<int>) {
          decoded = String.fromCharCodes(message);
        } else {
          decoded = message.toString();
        }
        if (!_controller.isClosed) _controller.add(decoded);
      },
      onError: (Object _) {
        _subscription?.cancel();
        _subscription = null;
        _connecting = false;
        _scheduleReconnect();
      },
      onDone: () {
        _subscription?.cancel();
        _subscription = null;
        _connecting = false;
        _scheduleReconnect();
      },
      cancelOnError: true,
    );

    try {
      await channel.ready;
      _connecting = false;

      // Send auth message immediately after connection is ready
      if (_token != null) {
        channel.sink.add(jsonEncode({
          'event': 'auth',
          'data': {'token': _token},
        }));
      }
    } catch (_) {
      _subscription?.cancel();
      _subscription = null;
      _connecting = false;
      _scheduleReconnect();
    }
  }

  void _scheduleReconnect() {
    if (_disposed) return;
    _retryCount++;
    final seconds = (_retryCount * 5).clamp(5, 60);
    Future.delayed(Duration(seconds: seconds), () {
      if (!_disposed) _connectAsync();
    });
  }

  void dispose() {
    _disposed = true;
    _subscription?.cancel();
    if (!_controller.isClosed) _controller.close();
  }
}
```

- [ ] **Step 2: Verificar que Flutter analiza sin errores**

```bash
cd zarza_ai && flutter analyze lib/data/datasources/websocket_datasource.dart
```

Resultado esperado: `No issues found!`

---

### Task 7: Flutter — NotificationsRepositoryImpl + DI

**Files:**
- Modify: `zarza_ai/lib/data/repositories/notifications_repository_impl.dart`
- Modify: `zarza_ai/lib/core/di/service_locator.dart`

- [ ] **Step 1: Actualizar `NotificationsRepositoryImpl` para inyectar `LocalAuthDatasource` y pasar el token**

```dart
// zarza_ai/lib/data/repositories/notifications_repository_impl.dart
import '../../domain/repositories/i_notifications_repository.dart';
import '../datasources/local_auth_datasource.dart';
import '../datasources/websocket_datasource.dart';

class NotificationsRepositoryImpl implements INotificationsRepository {
  NotificationsRepositoryImpl(this._datasource, this._localAuth) {
    _init();
  }

  final WebSocketDatasource _datasource;
  final LocalAuthDatasource _localAuth;

  Future<void> _init() async {
    final token = await _localAuth.getToken();
    _datasource.setToken(token);
    _datasource.connect();
  }

  @override
  Stream<String> watchNotifications() => _datasource.stream;

  @override
  void dispose() => _datasource.dispose();
}
```

- [ ] **Step 2: Actualizar el registro en `service_locator.dart`**

En `zarza_ai/lib/core/di/service_locator.dart`, localizar la línea (alrededor de la 212):

```dart
  sl.registerLazySingleton<INotificationsRepository>(
      () => NotificationsRepositoryImpl(sl<WebSocketDatasource>()));
```

Reemplazarla por:

```dart
  sl.registerLazySingleton<INotificationsRepository>(
      () => NotificationsRepositoryImpl(
            sl<WebSocketDatasource>(),
            sl<LocalAuthDatasource>(),
          ));
```

- [ ] **Step 3: Verificar que Flutter analiza toda la app sin errores**

```bash
cd zarza_ai && flutter analyze
```

Resultado esperado: `No issues found!` (o solo warnings de deprecación pre-existentes, no errores nuevos).

- [ ] **Step 4: Commit**

```bash
cd zarza_ai && git add lib/data/datasources/websocket_datasource.dart lib/data/repositories/notifications_repository_impl.dart lib/core/di/service_locator.dart
git commit -m "feat(ws): send JWT auth message on WebSocket connect"
```

---

## Verificación Final

Después de completar todas las tasks:

- [ ] Correr todos los tests de fruit-backend:

```bash
cd fruit-backend && pnpm run test --no-coverage
```

Resultado esperado: todos los tests pasan sin errores de TypeScript.

- [ ] Levantar el stack y verificar manualmente que una conexión WS sin token es rechazada tras 10 s:

```bash
# En la raíz del workspace
docker compose up mongo rabbitmq -d
cd fruit-backend && pnpm run start:dev
```

Conectar desde un cliente WS (ej. `wscat -c ws://localhost:3001/ws`) sin enviar nada y esperar 10 segundos — debe desconectar con código 4001.
