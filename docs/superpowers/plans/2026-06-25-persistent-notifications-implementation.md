# Notificaciones In-App Persistentes — Plan de Implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Agregar persistencia server-side a notificaciones, exponer endpoints REST, mostrar campana con historial en Flutter con badge de no leídas y pantalla de historial completo.

**Architecture:** Backend persiste notificaciones en PostgreSQL al dispararlas, Flutter consulta vía REST para historial y actualiza badge optimista al recibir WS. AppBar global en shell con campana. TTL 30 días con limpieza cron diaria.

**Tech Stack:** NestJS + Prisma (PostgreSQL) backend; Flutter 3 + BLoC frontend; Dio para HTTP.

## Global Constraints

- TTL: 30 días desde creación → expiración automática
- Hard delete (sin soft-delete)
- Tres tipos de evento: `analisis_listo`, `analysis_validated`, `nueva_solicitud`
- WS sigue siendo canal de entrega en tiempo real; DB es historial
- Badge debe actualizarse instantáneamente al recibir WS (optimista)
- Navegación contextual desde notificación: `analisis_listo`/`analysis_validated` → `/history`, `nueva_solicitud` → `/solicitudes`

---

## Task 1: Backend — Agregar modelo Notification a Prisma

**Files:**
- Modify: `packages/database/prisma/schema.prisma`

**Interfaces:**
- Produces: `Notification` model con campos: `id`, `userId`, `type`, `title`, `body`, `data`, `read`, `createdAt`, `expiresAt`; relación a `User` con onDelete Cascade; índices en `(userId, createdAt DESC)` y `(expiresAt)`

- [ ] **Step 1: Abrir schema.prisma y agregar modelo Notification**

Después del modelo `RefreshToken` (línea ~150), agrega:

```prisma
model Notification {
  id        String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId    String    @map("user_id") @db.Uuid
  type      String
  title     String
  body      String
  data      Json?
  read      Boolean   @default(false)
  createdAt DateTime  @default(now()) @map("created_at")
  expiresAt DateTime  @map("expires_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, createdAt(sort: Desc)])
  @@index([expiresAt])
  @@map("notifications")
}
```

- [ ] **Step 2: Agregar relación inversa en modelo User**

En el modelo `User` (línea ~31), al final de las relaciones (después de `refreshTokens RefreshToken[]`), agrega:

```prisma
notifications Notification[]
```

- [ ] **Step 3: Generar migración**

```bash
cd packages/database
npx prisma migrate dev --name add_notifications
```

Expected output: "Migration <timestamp>_add_notifications created successfully" y archivo generado en `prisma/migrations/`.

- [ ] **Step 4: Verificar que Prisma client se generó**

```bash
cd packages/database
npx prisma generate
```

Expected: "✔ Generated Prisma Client (v5.x.x) to ./generated/client in 1.5s"

- [ ] **Step 5: Commit**

```bash
git add packages/database/prisma/schema.prisma packages/database/prisma/migrations/
git commit -m "feat(db): add Notification model with 30-day TTL"
```

---

## Task 2: Backend — NotificationEntity y Repository

**Files:**
- Create: `fruit-backend/src/notifications/notification.entity.ts`
- Create: `fruit-backend/src/notifications/notification.repository.ts`

**Interfaces:**
- Consumes: Prisma `Notification` model (Task 1)
- Produces: `NotificationEntity` (id, userId, type, title, body, data?, isRead, createdAt, expiresAt); `NotificationRepository` con métodos: `create()`, `findByUserPaginated()`, `markRead()`, `markAllRead()`, `delete()`, `deleteExpired()`

- [ ] **Step 1: Crear notification.entity.ts**

```typescript
// fruit-backend/src/notifications/notification.entity.ts
export class NotificationEntity {
  constructor(
    readonly id: string,
    readonly userId: string,
    readonly type: string,
    readonly title: string,
    readonly body: string,
    readonly data: Record<string, any> | null,
    readonly isRead: boolean,
    readonly createdAt: Date,
    readonly expiresAt: Date,
  ) {}
}
```

- [ ] **Step 2: Crear notification.repository.ts**

```typescript
// fruit-backend/src/notifications/notification.repository.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@rubus/database';
import { NotificationEntity } from './notification.entity';

@Injectable()
export class NotificationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    userId: string,
    type: string,
    title: string,
    body: string,
    data?: Record<string, any>,
  ): Promise<NotificationEntity> {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    const doc = await this.prisma.notification.create({
      data: {
        userId,
        type,
        title,
        body,
        data: data || null,
        expiresAt,
      },
    });

    return this.toDomain(doc);
  }

  async findByUserPaginated(
    userId: string,
    page: number,
    limit: number,
  ): Promise<{ items: NotificationEntity[]; total: number; unreadCount: number }> {
    const skip = (page - 1) * limit;

    const [docs, total, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.notification.count({ where: { userId } }),
      this.prisma.notification.count({ where: { userId, read: false } }),
    ]);

    return {
      items: docs.map((d) => this.toDomain(d)),
      total,
      unreadCount,
    };
  }

  async markRead(id: string, userId: string): Promise<void> {
    await this.prisma.notification.updateMany({
      where: { id, userId },
      data: { read: true },
    });
  }

  async markAllRead(userId: string): Promise<void> {
    await this.prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
  }

  async delete(id: string, userId: string): Promise<void> {
    await this.prisma.notification.deleteMany({
      where: { id, userId },
    });
  }

  async deleteExpired(): Promise<number> {
    const result = await this.prisma.notification.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
    return result.count;
  }

  private toDomain(doc: any): NotificationEntity {
    return new NotificationEntity(
      doc.id,
      doc.userId,
      doc.type,
      doc.title,
      doc.body,
      doc.data,
      doc.read,
      doc.createdAt,
      doc.expiresAt,
    );
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add fruit-backend/src/notifications/notification.entity.ts fruit-backend/src/notifications/notification.repository.ts
git commit -m "feat(notifications): add entity and repository"
```

---

## Task 3: Backend — NotificationsService con Cron

**Files:**
- Create: `fruit-backend/src/notifications/notifications.service.ts`

**Interfaces:**
- Consumes: `NotificationRepository` (Task 2), `NotificationsGateway` (existing)
- Produces: `NotificationsService` con métodos: `create()`, `findForUser()`, `markRead()`, `markAllRead()`, `delete()`, `cleanupExpired()` (cron)

- [ ] **Step 1: Crear notifications.service.ts**

```typescript
// fruit-backend/src/notifications/notifications.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { NotificationRepository } from './notification.repository';
import { NotificationsGateway } from './notifications.gateway';
import { NotificationEntity } from './notification.entity';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly repository: NotificationRepository,
    private readonly gateway: NotificationsGateway,
  ) {}

  async create(
    userId: string,
    type: string,
    title: string,
    body: string,
    data?: Record<string, any>,
  ): Promise<NotificationEntity> {
    const notification = await this.repository.create(userId, type, title, body, data);
    // Envía WS inmediatamente
    this.gateway.emitToUser(userId, type, data);
    return notification;
  }

  async findForUser(
    userId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{ items: NotificationEntity[]; total: number; unreadCount: number }> {
    return this.repository.findByUserPaginated(userId, page, limit);
  }

  async markRead(id: string, userId: string): Promise<void> {
    await this.repository.markRead(id, userId);
  }

  async markAllRead(userId: string): Promise<void> {
    await this.repository.markAllRead(userId);
  }

  async delete(id: string, userId: string): Promise<void> {
    await this.repository.delete(id, userId);
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async cleanupExpired(): Promise<void> {
    const count = await this.repository.deleteExpired();
    this.logger.log(`[Cron] Cleaned up ${count} expired notifications`);
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add fruit-backend/src/notifications/notifications.service.ts
git commit -m "feat(notifications): add service with cron cleanup"
```

---

## Task 4: Backend — NotificationsController y actualizar Module

**Files:**
- Create: `fruit-backend/src/notifications/notifications.controller.ts`
- Modify: `fruit-backend/src/notifications/notifications.module.ts`

**Interfaces:**
- Consumes: `NotificationsService` (Task 3), `JwtAuthGuard` (existing)
- Produces: REST endpoints: `GET /notifications`, `PATCH /notifications/read-all`, `PATCH /notifications/:id/read`, `DELETE /notifications/:id`

- [ ] **Step 1: Crear notifications.controller.ts**

```typescript
// fruit-backend/src/notifications/notifications.controller.ts
import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  Query,
  UseGuards,
  Req,
  HttpCode,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/infrastructure/http/guards/jwt-auth.guard';
import { NotificationsService } from './notifications.service';
import { NotificationEntity } from './notification.entity';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  @Get()
  async getNotifications(
    @Req() req: any,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
  ) {
    const { items, total, unreadCount } = await this.service.findForUser(
      req.user.sub,
      parseInt(page, 10),
      parseInt(limit, 10),
    );

    return {
      items: items.map((n) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        body: n.body,
        data: n.data,
        isRead: n.isRead,
        createdAt: n.createdAt,
        expiresAt: n.expiresAt,
      })),
      total,
      unreadCount,
      page: parseInt(page, 10),
    };
  }

  @Patch('read-all')
  @HttpCode(204)
  async markAllRead(@Req() req: any): Promise<void> {
    await this.service.markAllRead(req.user.sub);
  }

  @Patch(':id/read')
  @HttpCode(204)
  async markRead(@Req() req: any, @Param('id') id: string): Promise<void> {
    await this.service.markRead(id, req.user.sub);
  }

  @Delete(':id')
  @HttpCode(204)
  async deleteNotification(@Req() req: any, @Param('id') id: string): Promise<void> {
    await this.service.delete(id, req.user.sub);
  }
}
```

- [ ] **Step 2: Actualizar notifications.module.ts**

```typescript
// fruit-backend/src/notifications/notifications.module.ts
import { Module } from '@nestjs/common';
import { PrismaService } from '@rubus/database';
import { NotificationsGateway } from './notifications.gateway';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { NotificationRepository } from './notification.repository';
import { AuthModule } from '../auth/infrastructure/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [NotificationsController],
  providers: [
    NotificationsGateway,
    NotificationsService,
    NotificationRepository,
    PrismaService,
  ],
  exports: [NotificationsGateway, NotificationsService],
})
export class NotificationsModule {}
```

- [ ] **Step 3: Commit**

```bash
git add fruit-backend/src/notifications/notifications.controller.ts fruit-backend/src/notifications/notifications.module.ts
git commit -m "feat(notifications): add REST controller and update module"
```

---

## Task 5: Backend — Integración en InternalNotifyController

**Files:**
- Modify: `fruit-backend/src/notifications/internal-notify.controller.ts`

**Interfaces:**
- Consumes: `NotificationsService` (Task 3)
- Produces: El controlador ahora persiste notificaciones antes de enviar WS

- [ ] **Step 1: Abrir internal-notify.controller.ts y agregar inyección de NotificationsService**

En el constructor (línea ~10), agrega el parámetro:

```typescript
constructor(
  private readonly gateway: NotificationsGateway,
  private readonly fcmService: FcmService,
  @Inject(I_USER_REPOSITORY) private readonly userRepository: IUserRepository,
  private readonly notificationsService: NotificationsService, // AGREGAR
) {}
```

- [ ] **Step 2: Modificar método notify() para persistir notificación**

Reemplaza el contenido del método `notify()` (línea ~18-34):

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
  const eventType = body.event;

  // Mapeo de evento → título/body (debe coincidir con el snackbar de Flutter)
  let title = '';
  let bodyText = '';
  switch (eventType) {
    case 'analisis_listo':
      title = '¡Análisis listo!';
      bodyText = 'Tu análisis ya está disponible en el historial.';
      break;
    case 'analysis_validated':
      title =
        (body.data?.action as string) === 'validado'
          ? 'Análisis validado ✓'
          : 'Análisis rechazado';
      bodyText =
        (body.data?.action as string) === 'validado'
          ? 'Un agrónomo validó tu análisis.'
          : 'Un agrónomo rechazó tu análisis. Revisa las observaciones.';
      break;
    case 'nueva_solicitud':
      title = 'Nueva solicitud de muestreo';
      bodyText = 'Tienes una nueva solicitud asignada. Revísala en Solicitudes.';
      break;
    default:
      title = 'Notificación';
      bodyText = '';
  }

  // Persiste en DB
  if (userId && title) {
    await this.notificationsService.create(userId, eventType, title, bodyText, body.data);
  } else {
    // Si no hay titulo mapeado, solo envía WS sin persistir
    if (userId) this.gateway.emitToUser(userId, eventType, body.data);
  }

  // Envía push FCM
  if (eventType === 'analisis_listo') {
    await this.sendAnalisisPush(body.data);
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add fruit-backend/src/notifications/internal-notify.controller.ts
git commit -m "feat(notifications): integrate persistence in notify handler"
```

---

## Task 6: Flutter — Domain — NotificationEntity y actualizar INotificationsRepository

**Files:**
- Create: `zarza_ai/lib/domain/entities/notification_entity.dart`
- Modify: `zarza_ai/lib/domain/repositories/i_notifications_repository.dart`

**Interfaces:**
- Consumes: None
- Produces: `NotificationEntity` (id, type, title, body, data?, isRead, createdAt, expiresAt); `INotificationsRepository` con métodos: `fetchPage()`, `markRead()`, `markAllRead()`, `delete()`

- [ ] **Step 1: Crear notification_entity.dart**

```dart
// zarza_ai/lib/domain/entities/notification_entity.dart
class NotificationEntity {
  final String id;
  final String type;
  final String title;
  final String body;
  final Map<String, dynamic>? data;
  final bool isRead;
  final DateTime createdAt;
  final DateTime expiresAt;

  NotificationEntity({
    required this.id,
    required this.type,
    required this.title,
    required this.body,
    this.data,
    required this.isRead,
    required this.createdAt,
    required this.expiresAt,
  });
}
```

- [ ] **Step 2: Actualizar i_notifications_repository.dart**

Reemplaza el contenido actual:

```dart
// zarza_ai/lib/domain/repositories/i_notifications_repository.dart
import '../entities/notification_entity.dart';

class NotificationsPage {
  final List<NotificationEntity> items;
  final int total;
  final int unreadCount;
  final int page;

  NotificationsPage({
    required this.items,
    required this.total,
    required this.unreadCount,
    required this.page,
  });
}

abstract class INotificationsRepository {
  // WebSocket stream (existente)
  Stream<String> watchNotifications();

  // Métodos REST nuevos
  Future<NotificationsPage> fetchPage(int page, {int limit = 20});
  Future<void> markRead(String id);
  Future<void> markAllRead();
  Future<void> delete(String id);

  void dispose();
}
```

- [ ] **Step 3: Commit**

```bash
git add zarza_ai/lib/domain/entities/notification_entity.dart zarza_ai/lib/domain/repositories/i_notifications_repository.dart
git commit -m "feat(domain): add NotificationEntity and extend repository"
```

---

## Task 7: Flutter — Domain — Use Cases

**Files:**
- Create: `zarza_ai/lib/domain/usecases/get_notifications_usecase.dart`
- Create: `zarza_ai/lib/domain/usecases/mark_read_usecase.dart`
- Create: `zarza_ai/lib/domain/usecases/mark_all_read_usecase.dart`
- Create: `zarza_ai/lib/domain/usecases/delete_notification_usecase.dart`

**Interfaces:**
- Consumes: `INotificationsRepository` (Task 6)
- Produces: 4 use cases

- [ ] **Step 1: Crear get_notifications_usecase.dart**

```dart
// zarza_ai/lib/domain/usecases/get_notifications_usecase.dart
import '../repositories/i_notifications_repository.dart';

class GetNotificationsUseCase {
  const GetNotificationsUseCase(this._repository);
  final INotificationsRepository _repository;

  Future<NotificationsPage> call(int page, {int limit = 20}) =>
      _repository.fetchPage(page, limit: limit);
}
```

- [ ] **Step 2: Crear mark_read_usecase.dart**

```dart
// zarza_ai/lib/domain/usecases/mark_read_usecase.dart
import '../repositories/i_notifications_repository.dart';

class MarkReadUseCase {
  const MarkReadUseCase(this._repository);
  final INotificationsRepository _repository;

  Future<void> call(String id) => _repository.markRead(id);
}
```

- [ ] **Step 3: Crear mark_all_read_usecase.dart**

```dart
// zarza_ai/lib/domain/usecases/mark_all_read_usecase.dart
import '../repositories/i_notifications_repository.dart';

class MarkAllReadUseCase {
  const MarkAllReadUseCase(this._repository);
  final INotificationsRepository _repository;

  Future<void> call() => _repository.markAllRead();
}
```

- [ ] **Step 4: Crear delete_notification_usecase.dart**

```dart
// zarza_ai/lib/domain/usecases/delete_notification_usecase.dart
import '../repositories/i_notifications_repository.dart';

class DeleteNotificationUseCase {
  const DeleteNotificationUseCase(this._repository);
  final INotificationsRepository _repository;

  Future<void> call(String id) => _repository.delete(id);
}
```

- [ ] **Step 5: Commit**

```bash
git add zarza_ai/lib/domain/usecases/get_notifications_usecase.dart zarza_ai/lib/domain/usecases/mark_read_usecase.dart zarza_ai/lib/domain/usecases/mark_all_read_usecase.dart zarza_ai/lib/domain/usecases/delete_notification_usecase.dart
git commit -m "feat(domain): add notification use cases"
```

---

## Task 8: Flutter — Data — NotificationModel y RemoteNotificationsDatasource

**Files:**
- Create: `zarza_ai/lib/data/models/notification_model.dart`
- Create: `zarza_ai/lib/data/datasources/remote_notifications_datasource.dart`

**Interfaces:**
- Consumes: `NotificationEntity` (Task 6)
- Produces: `NotificationModel` con `fromJson()` / `toEntity()`; `RemoteNotificationsDatasource` con métodos: `fetchPage()`, `markRead()`, `markAllRead()`, `delete()`

- [ ] **Step 1: Crear notification_model.dart**

```dart
// zarza_ai/lib/data/models/notification_model.dart
import '../../domain/entities/notification_entity.dart';

class NotificationModel {
  final String id;
  final String type;
  final String title;
  final String body;
  final Map<String, dynamic>? data;
  final bool isRead;
  final DateTime createdAt;
  final DateTime expiresAt;

  NotificationModel({
    required this.id,
    required this.type,
    required this.title,
    required this.body,
    this.data,
    required this.isRead,
    required this.createdAt,
    required this.expiresAt,
  });

  factory NotificationModel.fromJson(Map<String, dynamic> json) {
    return NotificationModel(
      id: json['id'] as String,
      type: json['type'] as String,
      title: json['title'] as String,
      body: json['body'] as String,
      data: json['data'] as Map<String, dynamic>?,
      isRead: json['isRead'] as bool? ?? false,
      createdAt: DateTime.parse(json['createdAt'] as String),
      expiresAt: DateTime.parse(json['expiresAt'] as String),
    );
  }

  NotificationEntity toEntity() => NotificationEntity(
        id: id,
        type: type,
        title: title,
        body: body,
        data: data,
        isRead: isRead,
        createdAt: createdAt,
        expiresAt: expiresAt,
      );
}
```

- [ ] **Step 2: Crear remote_notifications_datasource.dart**

```dart
// zarza_ai/lib/data/datasources/remote_notifications_datasource.dart
import 'package:dio/dio.dart';
import '../models/notification_model.dart';
import '../../domain/repositories/i_notifications_repository.dart';
import '../../core/constants/app_constants.dart';

class RemoteNotificationsDatasource {
  RemoteNotificationsDatasource(this._dio);

  final Dio _dio;
  final String _baseUrl = '${AppConstants.apiUrl}/notifications';

  Future<NotificationsPage> fetchPage(int page, {int limit = 20}) async {
    final response = await _dio.get(
      _baseUrl,
      queryParameters: {'page': page, 'limit': limit},
    );

    final data = response.data as Map<String, dynamic>;
    final itemsJson = (data['items'] as List<dynamic>)
        .cast<Map<String, dynamic>>();

    return NotificationsPage(
      items: itemsJson
          .map((json) => NotificationModel.fromJson(json).toEntity())
          .toList(),
      total: data['total'] as int,
      unreadCount: data['unreadCount'] as int,
      page: data['page'] as int,
    );
  }

  Future<void> markRead(String id) async {
    await _dio.patch('$_baseUrl/$id/read');
  }

  Future<void> markAllRead() async {
    await _dio.patch('$_baseUrl/read-all');
  }

  Future<void> delete(String id) async {
    await _dio.delete('$_baseUrl/$id');
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add zarza_ai/lib/data/models/notification_model.dart zarza_ai/lib/data/datasources/remote_notifications_datasource.dart
git commit -m "feat(data): add notification model and remote datasource"
```

---

## Task 9: Flutter — Data — Actualizar NotificationsRepositoryImpl

**Files:**
- Modify: `zarza_ai/lib/data/repositories/notifications_repository_impl.dart`

**Interfaces:**
- Consumes: `RemoteNotificationsDatasource` (Task 8), `WebSocketDatasource` (existing)
- Produces: `NotificationsRepositoryImpl` implementa métodos REST + mantiene WS stream

- [ ] **Step 1: Reemplazar contenido de notifications_repository_impl.dart**

```dart
// zarza_ai/lib/data/repositories/notifications_repository_impl.dart
import 'dart:async';

import '../../domain/repositories/i_notifications_repository.dart';
import '../datasources/local_auth_datasource.dart';
import '../datasources/websocket_datasource.dart';
import '../datasources/remote_notifications_datasource.dart';

class NotificationsRepositoryImpl implements INotificationsRepository {
  NotificationsRepositoryImpl(
    this._datasource,
    this._localAuth,
    this._remoteNotifications,
  ) {
    unawaited(_init());
  }

  final WebSocketDatasource _datasource;
  final LocalAuthDatasource _localAuth;
  final RemoteNotificationsDatasource _remoteNotifications;

  Future<void> _init() async {
    final token = await _localAuth.getToken();
    _datasource.setToken(token);
    _datasource.connect();
  }

  @override
  Stream<String> watchNotifications() => _datasource.stream;

  @override
  Future<NotificationsPage> fetchPage(int page, {int limit = 20}) =>
      _remoteNotifications.fetchPage(page, limit: limit);

  @override
  Future<void> markRead(String id) => _remoteNotifications.markRead(id);

  @override
  Future<void> markAllRead() => _remoteNotifications.markAllRead();

  @override
  Future<void> delete(String id) => _remoteNotifications.delete(id);

  @override
  void dispose() => _datasource.dispose();
}
```

- [ ] **Step 2: Commit**

```bash
git add zarza_ai/lib/data/repositories/notifications_repository_impl.dart
git commit -m "feat(data): implement REST methods in notifications repository"
```

---

## Task 10: Flutter — Presentation — NotificationsBloc, Event y State

**Files:**
- Create: `zarza_ai/lib/presentation/notifications/notifications_event.dart`
- Create: `zarza_ai/lib/presentation/notifications/notifications_state.dart`
- Create: `zarza_ai/lib/presentation/notifications/notifications_bloc.dart`

**Interfaces:**
- Consumes: Use cases (Task 7)
- Produces: `NotificationsBloc` con eventos y estados

- [ ] **Step 1: Crear notifications_event.dart**

```dart
// zarza_ai/lib/presentation/notifications/notifications_event.dart
abstract class NotificationsEvent {}

class LoadNotifications extends NotificationsEvent {}

class LoadMoreNotifications extends NotificationsEvent {}

class MarkNotificationRead extends NotificationsEvent {
  MarkNotificationRead(this.id);
  final String id;
}

class MarkAllNotificationsRead extends NotificationsEvent {}

class DeleteNotification extends NotificationsEvent {
  DeleteNotification(this.id);
  final String id;
}

class WsNotificationReceived extends NotificationsEvent {}
```

- [ ] **Step 2: Crear notifications_state.dart**

```dart
// zarza_ai/lib/presentation/notifications/notifications_state.dart
import '../../domain/entities/notification_entity.dart';

enum NotificationsStatus { initial, loading, success, failure }

class NotificationsState {
  final List<NotificationEntity> items;
  final int unreadCount;
  final int page;
  final bool hasMore;
  final NotificationsStatus status;
  final String? errorMessage;

  NotificationsState({
    required this.items,
    required this.unreadCount,
    required this.page,
    required this.hasMore,
    required this.status,
    this.errorMessage,
  });

  NotificationsState copyWith({
    List<NotificationEntity>? items,
    int? unreadCount,
    int? page,
    bool? hasMore,
    NotificationsStatus? status,
    String? errorMessage,
  }) {
    return NotificationsState(
      items: items ?? this.items,
      unreadCount: unreadCount ?? this.unreadCount,
      page: page ?? this.page,
      hasMore: hasMore ?? this.hasMore,
      status: status ?? this.status,
      errorMessage: errorMessage ?? this.errorMessage,
    );
  }
}
```

- [ ] **Step 3: Crear notifications_bloc.dart**

```dart
// zarza_ai/lib/presentation/notifications/notifications_bloc.dart
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../domain/usecases/get_notifications_usecase.dart';
import '../../domain/usecases/mark_read_usecase.dart';
import '../../domain/usecases/mark_all_read_usecase.dart';
import '../../domain/usecases/delete_notification_usecase.dart';
import 'notifications_event.dart';
import 'notifications_state.dart';

class NotificationsBloc extends Bloc<NotificationsEvent, NotificationsState> {
  NotificationsBloc({
    required GetNotificationsUseCase getNotifications,
    required MarkReadUseCase markRead,
    required MarkAllReadUseCase markAllRead,
    required DeleteNotificationUseCase delete,
  })  : _getNotifications = getNotifications,
        _markRead = markRead,
        _markAllRead = markAllRead,
        _delete = delete,
        super(
          NotificationsState(
            items: [],
            unreadCount: 0,
            page: 1,
            hasMore: true,
            status: NotificationsStatus.initial,
          ),
        ) {
    on<LoadNotifications>(_onLoad);
    on<LoadMoreNotifications>(_onLoadMore);
    on<MarkNotificationRead>(_onMarkRead);
    on<MarkAllNotificationsRead>(_onMarkAllRead);
    on<DeleteNotification>(_onDelete);
    on<WsNotificationReceived>(_onWsReceived);
  }

  final GetNotificationsUseCase _getNotifications;
  final MarkReadUseCase _markRead;
  final MarkAllReadUseCase _markAllRead;
  final DeleteNotificationUseCase _delete;

  Future<void> _onLoad(
    LoadNotifications event,
    Emitter<NotificationsState> emit,
  ) async {
    emit(state.copyWith(status: NotificationsStatus.loading, page: 1));
    try {
      final page = await _getNotifications(1);
      emit(
        state.copyWith(
          items: page.items,
          unreadCount: page.unreadCount,
          page: 1,
          hasMore: page.items.length == 20,
          status: NotificationsStatus.success,
        ),
      );
    } catch (e) {
      emit(
        state.copyWith(
          status: NotificationsStatus.failure,
          errorMessage: e.toString(),
        ),
      );
    }
  }

  Future<void> _onLoadMore(
    LoadMoreNotifications event,
    Emitter<NotificationsState> emit,
  ) async {
    if (!state.hasMore) return;
    final nextPage = state.page + 1;
    try {
      final page = await _getNotifications(nextPage);
      emit(
        state.copyWith(
          items: [...state.items, ...page.items],
          page: nextPage,
          hasMore: page.items.length == 20,
        ),
      );
    } catch (e) {
      // No-op on error; permite reintentar
    }
  }

  Future<void> _onMarkRead(
    MarkNotificationRead event,
    Emitter<NotificationsState> emit,
  ) async {
    // Actualización optimista
    final updatedItems = state.items.map((n) {
      if (n.id == event.id && !n.isRead) {
        return NotificationEntity(
          id: n.id,
          type: n.type,
          title: n.title,
          body: n.body,
          data: n.data,
          isRead: true,
          createdAt: n.createdAt,
          expiresAt: n.expiresAt,
        );
      }
      return n;
    }).toList();
    emit(state.copyWith(unreadCount: state.unreadCount - 1, items: updatedItems));

    try {
      await _markRead(event.id);
    } catch (e) {
      // Revert on error
      emit(state.copyWith(unreadCount: state.unreadCount + 1, items: state.items));
    }
  }

  Future<void> _onMarkAllRead(
    MarkAllNotificationsRead event,
    Emitter<NotificationsState> emit,
  ) async {
    // Actualización optimista
    emit(state.copyWith(unreadCount: 0));

    try {
      await _markAllRead();
    } catch (e) {
      // Revert on error
      emit(state.copyWith(unreadCount: state.items.where((n) => !n.isRead).length));
    }
  }

  Future<void> _onDelete(
    DeleteNotification event,
    Emitter<NotificationsState> emit,
  ) async {
    // Actualización optimista
    final updatedItems = state.items.where((n) => n.id != event.id).toList();
    emit(state.copyWith(items: updatedItems));

    try {
      await _delete(event.id);
    } catch (e) {
      // Revert on error
      emit(state.copyWith(items: state.items));
    }
  }

  Future<void> _onWsReceived(
    WsNotificationReceived event,
    Emitter<NotificationsState> emit,
  ) async {
    emit(state.copyWith(unreadCount: state.unreadCount + 1));
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add zarza_ai/lib/presentation/notifications/notifications_event.dart zarza_ai/lib/presentation/notifications/notifications_state.dart zarza_ai/lib/presentation/notifications/notifications_bloc.dart
git commit -m "feat(presentation): add notifications bloc with events and states"
```

---

## Task 11: Flutter — Presentation — NotificationsBellWidget

**Files:**
- Create: `zarza_ai/lib/presentation/notifications/notifications_bell_widget.dart`

**Interfaces:**
- Consumes: `NotificationsBloc` (Task 10), routing
- Produces: Widget con icono campana + badge

- [ ] **Step 1: Crear notifications_bell_widget.dart**

```dart
// zarza_ai/lib/presentation/notifications/notifications_bell_widget.dart
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'notifications_bloc.dart';

class NotificationsBellWidget extends StatelessWidget {
  const NotificationsBellWidget({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<NotificationsBloc, NotificationsState>(
      builder: (context, state) {
        final showBadge = state.unreadCount > 0;

        return Stack(
          children: [
            IconButton(
              icon: const Icon(Icons.notifications_outlined),
              onPressed: () => context.push('/notifications'),
            ),
            if (showBadge)
              Positioned(
                top: 8,
                right: 8,
                child: Container(
                  padding: const EdgeInsets.all(4),
                  decoration: BoxDecoration(
                    color: Colors.red,
                    shape: BoxShape.circle,
                  ),
                  child: Text(
                    state.unreadCount > 99 ? '99+' : '${state.unreadCount}',
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 10,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ),
          ],
        );
      },
    );
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add zarza_ai/lib/presentation/notifications/notifications_bell_widget.dart
git commit -m "feat(presentation): add notifications bell widget with badge"
```

---

## Task 12: Flutter — Presentation — NotificationsScreen

**Files:**
- Create: `zarza_ai/lib/presentation/notifications/notifications_screen.dart`

**Interfaces:**
- Consumes: `NotificationsBloc` (Task 10), routing, time formatting utilities
- Produces: Pantalla con lista de notificaciones, pull-to-refresh, swipe-to-delete

- [ ] **Step 1: Crear notifications_screen.dart**

```dart
// zarza_ai/lib/presentation/notifications/notifications_screen.dart
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import '../../domain/entities/notification_entity.dart';
import 'notifications_bloc.dart';

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  final _scrollController = ScrollController();

  @override
  void initState() {
    super.initState();
    context.read<NotificationsBloc>().add(LoadNotifications());
    _scrollController.addListener(_onScroll);
  }

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  void _onScroll() {
    if (_scrollController.position.pixels >=
        _scrollController.position.maxScrollExtent - 100) {
      context.read<NotificationsBloc>().add(LoadMoreNotifications());
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Notificaciones'),
        actions: [
          IconButton(
            icon: const Icon(Icons.done_all_rounded),
            tooltip: 'Marcar todo como leído',
            onPressed: () {
              context.read<NotificationsBloc>().add(MarkAllNotificationsRead());
            },
          ),
        ],
      ),
      body: BlocBuilder<NotificationsBloc, NotificationsState>(
        builder: (context, state) {
          if (state.status == NotificationsStatus.loading) {
            return const Center(child: CircularProgressIndicator());
          }

          if (state.status == NotificationsStatus.failure) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.error_outline, size: 48, color: Colors.grey),
                  const SizedBox(height: 16),
                  const Text('Error al cargar notificaciones'),
                  const SizedBox(height: 16),
                  ElevatedButton(
                    onPressed: () {
                      context.read<NotificationsBloc>().add(LoadNotifications());
                    },
                    child: const Text('Reintentar'),
                  ),
                ],
              ),
            );
          }

          if (state.items.isEmpty) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: const [
                  Icon(Icons.notifications_none_rounded, size: 48, color: Colors.grey),
                  SizedBox(height: 16),
                  Text('Sin notificaciones'),
                ],
              ),
            );
          }

          return RefreshIndicator(
            onRefresh: () async {
              context.read<NotificationsBloc>().add(LoadNotifications());
            },
            child: ListView.builder(
              controller: _scrollController,
              itemCount: state.items.length,
              itemBuilder: (context, index) {
                final notification = state.items[index];
                return _NotificationTile(
                  notification: notification,
                  onRead: () {
                    context
                        .read<NotificationsBloc>()
                        .add(MarkNotificationRead(notification.id));
                    _navigateFromNotification(context, notification);
                  },
                  onDelete: () {
                    context
                        .read<NotificationsBloc>()
                        .add(DeleteNotification(notification.id));
                  },
                );
              },
            ),
          );
        },
      ),
    );
  }

  void _navigateFromNotification(
    BuildContext context,
    NotificationEntity notification,
  ) {
    switch (notification.type) {
      case 'analisis_listo':
      case 'analysis_validated':
        context.go('/history');
        break;
      case 'nueva_solicitud':
        context.go('/solicitudes');
        break;
    }
  }
}

class _NotificationTile extends StatelessWidget {
  const _NotificationTile({
    required this.notification,
    required this.onRead,
    required this.onDelete,
  });

  final NotificationEntity notification;
  final VoidCallback onRead;
  final VoidCallback onDelete;

  String _timeAgo(DateTime date) {
    final now = DateTime.now();
    final diff = now.difference(date);

    if (diff.inMinutes < 1) return 'hace un momento';
    if (diff.inMinutes < 60) return 'hace ${diff.inMinutes}m';
    if (diff.inHours < 24) return 'hace ${diff.inHours}h';
    if (diff.inDays < 7) return 'hace ${diff.inDays}d';

    return 'hace ${(diff.inDays / 7).floor()}w';
  }

  @override
  Widget build(BuildContext context) {
    return Dismissible(
      key: ValueKey(notification.id),
      direction: DismissDirection.startToEnd,
      onDismissed: (_) => onDelete(),
      background: Container(
        color: Colors.red.withOpacity(0.7),
        alignment: Alignment.centerLeft,
        padding: const EdgeInsets.only(left: 16),
        child: const Icon(Icons.delete_outline, color: Colors.white),
      ),
      child: ListTile(
        onTap: onRead,
        leading: Container(
          width: 12,
          height: 12,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: notification.isRead ? Colors.transparent : Colors.blue,
          ),
        ),
        title: Text(
          notification.title,
          style: TextStyle(
            fontWeight: notification.isRead ? FontWeight.normal : FontWeight.bold,
          ),
        ),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const SizedBox(height: 4),
            Text(notification.body, maxLines: 2, overflow: TextOverflow.ellipsis),
            const SizedBox(height: 4),
            Text(
              _timeAgo(notification.createdAt),
              style: Theme.of(context).textTheme.bodySmall,
            ),
          ],
        ),
        trailing: notification.isRead ? null : const Icon(Icons.circle, size: 8, color: Colors.blue),
      ),
    );
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add zarza_ai/lib/presentation/notifications/notifications_screen.dart
git commit -m "feat(presentation): add notifications screen with swipe-to-delete"
```

---

## Task 13: Flutter — Presentation — Integración en ScaffoldWithBottomNav

**Files:**
- Modify: `zarza_ai/lib/presentation/shell/scaffold_with_bottom_nav.dart`

**Interfaces:**
- Consumes: `NotificationsBellWidget` (Task 11), `NotificationsBloc` (Task 10)
- Produces: AppBar global + campana + disparo de WsNotificationReceived

- [ ] **Step 1: Agregar import de NotificationsBloc y BellWidget al inicio**

Después del último import de `core/`:

```dart
import '../notifications/notifications_bell_widget.dart';
import '../notifications/notifications_bloc.dart';
```

- [ ] **Step 2: Reemplazar el widget build()**

Reemplaza el método `build()` (línea ~123) con:

```dart
@override
Widget build(BuildContext context) {
  final location = GoRouterState.of(context).uri.path;
  final selectedIndex = _selectedIndex(location);

  return Scaffold(
    appBar: AppBar(
      title: const SizedBox.shrink(), // Título vacío
      actions: const [NotificationsBellWidget()],
      elevation: 0,
    ),
    body: widget.child,
    bottomNavigationBar: NavigationBar(
      selectedIndex: selectedIndex,
      onDestinationSelected: (index) => _onTap(context, index),
      destinations: [
        const NavigationDestination(
          icon: Icon(Icons.home_outlined),
          selectedIcon: Icon(Icons.home_rounded),
          label: 'Inicio',
        ),
        if (_canSeeSolicitudes)
          const NavigationDestination(
            icon: Icon(Icons.assignment_outlined),
            selectedIcon: Icon(Icons.assignment_rounded),
            label: 'Solicitudes',
          ),
        const NavigationDestination(
          icon: Icon(Icons.history_outlined),
          selectedIcon: Icon(Icons.history_rounded),
          label: 'Historial',
        ),
      ],
    ),
  );
}
```

- [ ] **Step 3: Modificar `_onWsEvent()` para dispara WsNotificationReceived**

En el método `_onWsEvent()`, justo después de `_notifications.showNotification(...)` (línea ~87), agrega:

```dart
// Notifica al bloc que llegó una notificación WS
if (mounted) {
  context.read<NotificationsBloc>().add(WsNotificationReceived());
}
```

- [ ] **Step 4: Commit**

```bash
git add zarza_ai/lib/presentation/shell/scaffold_with_bottom_nav.dart
git commit -m "feat(presentation): integrate notifications bell in global appbar"
```

---

## Task 14: Flutter — Setup — Inyección de dependencias

**Files:**
- Modify: `zarza_ai/lib/core/di/service_locator.dart` (o similar, según proyecto)

**Interfaces:**
- Consumes: Use cases (Task 7), Bloc (Task 10), Datasource (Task 8)
- Produces: Registros en GetIt para todos los componentes

**Nota:** Ubica el archivo de DI del proyecto. Usualmente está en `core/di/` o `main.dart`. Si no existe, créalo en `core/di/service_locator.dart`.

- [ ] **Step 1: Localizar archivo de DI y abrir**

```bash
find zarza_ai/lib -name "*service_locator*" -o -name "*get_it*" | head -5
```

Si no existe, el proyecto usa `main.dart`. Identifica dónde se registran otros BLoCs/use cases.

- [ ] **Step 2: Registrar RemoteNotificationsDatasource**

En el bloque donde se registran datasources (búsca por `RemoteAuthDatasource` o similar), agrega:

```dart
// Notifications
getIt.registerSingleton<RemoteNotificationsDatasource>(
  RemoteNotificationsDatasource(getIt<Dio>()),
);
```

- [ ] **Step 3: Registrar use cases**

En el bloque de use cases, agrega:

```dart
getIt.registerSingleton<GetNotificationsUseCase>(
  GetNotificationsUseCase(getIt<INotificationsRepository>()),
);
getIt.registerSingleton<MarkReadUseCase>(
  MarkReadUseCase(getIt<INotificationsRepository>()),
);
getIt.registerSingleton<MarkAllReadUseCase>(
  MarkAllReadUseCase(getIt<INotificationsRepository>()),
);
getIt.registerSingleton<DeleteNotificationUseCase>(
  DeleteNotificationUseCase(getIt<INotificationsRepository>()),
);
```

- [ ] **Step 4: Registrar NotificationsBloc**

En el bloque de BLoCs, agrega:

```dart
getIt.registerSingleton<NotificationsBloc>(
  NotificationsBloc(
    getNotifications: getIt<GetNotificationsUseCase>(),
    markRead: getIt<MarkReadUseCase>(),
    markAllRead: getIt<MarkAllReadUseCase>(),
    delete: getIt<DeleteNotificationUseCase>(),
  ),
);
```

- [ ] **Step 5: Actualizar NotificationsRepositoryImpl en el registro existente**

Busca donde se registra `INotificationsRepository` (probablemente `NotificationsRepositoryImpl`). Actualiza la construcción para inyectar `RemoteNotificationsDatasource`:

```dart
getIt.registerSingleton<INotificationsRepository>(
  NotificationsRepositoryImpl(
    getIt<WebSocketDatasource>(),
    getIt<LocalAuthDatasource>(),
    getIt<RemoteNotificationsDatasource>(), // AGREGAR
  ),
);
```

- [ ] **Step 6: Commit**

```bash
git add zarza_ai/lib/core/di/service_locator.dart  # Ajusta la ruta según tu estructura
git commit -m "feat(di): register notification dependencies"
```

---

## Task 15: Flutter — Router — Agregar ruta /notifications

**Files:**
- Modify: `zarza_ai/lib/core/router/app_router.dart` (o donde esté el router)

**Interfaces:**
- Consumes: `NotificationsScreen` (Task 12)
- Produces: Ruta `/notifications`

- [ ] **Step 1: Localizar y abrir el archivo del router**

```bash
find zarza_ai/lib -name "*router*" -o -name "*app_router*" | head -3
```

- [ ] **Step 2: Importar NotificationsScreen**

Al inicio del archivo, agrega:

```dart
import '../presentation/notifications/notifications_screen.dart';
```

- [ ] **Step 3: Agregar ruta /notifications**

En la definición de rutas (dentro de `GoRouter`), agrega una nueva ruta al mismo nivel que `/history`, `/solicitudes`, etc.:

```dart
GoRoute(
  path: '/notifications',
  pageBuilder: (context, state) => const MaterialPage(
    child: NotificationsScreen(),
  ),
),
```

- [ ] **Step 4: Commit**

```bash
git add zarza_ai/lib/core/router/app_router.dart
git commit -m "feat(router): add /notifications route"
```

---

## Task 16: Integración completa y prueba manual

**Files:**
- No new files; solo verificación

**Interfaces:**
- Consumes: Todos los cambios previos (Tasks 1–15)
- Produces: Verificación de flujo end-to-end

- [ ] **Step 1: Compilar backend**

```bash
cd fruit-backend
pnpm run build
```

Expected: `dist/` creado sin errores.

- [ ] **Step 2: Compilar/ejecutar Flutter**

```bash
cd zarza_ai
flutter pub get
flutter run -d <device>
```

Expected: App inicia sin errores de compilación.

- [ ] **Step 3: Verificar que la campana aparece en el AppBar**

Al lanzar la app, verifica que haya un icono de campana en la esquina superior derecha del AppBar.

- [ ] **Step 4: Probar clic en campana → abre NotificationsScreen**

Pulsa la campana. Debe abrir `/notifications` con lista vacía (sin notificaciones previas).

- [ ] **Step 5: Verificar pull-to-refresh**

En NotificationsScreen, haz pull-to-refresh. Debe recargar (aunque siga vacío).

- [ ] **Step 6: Trigger manual de notificación vía API**

Desde `curl` o Postman, llama a `POST /internal/notify` en fruit-backend:

```bash
curl -X POST http://localhost:3001/internal/notify \
  -H "x-internal-token: <tu-token-interno>" \
  -H "Content-Type: application/json" \
  -d '{
    "event": "analisis_listo",
    "data": {
      "userId": "<test-user-id>",
      "imageId": "test-123"
    }
  }'
```

Esperado: Crea registro en DB, envía WS.

- [ ] **Step 7: Verificar badge en campana**

Si estás autenticado en la app con ese userId, el badge debe mostrar "1" después de recibir el WS.

- [ ] **Step 8: Abrir NotificationsScreen y verificar que aparece la notificación**

La pantalla debe listar la notificación creada hace un momento.

- [ ] **Step 9: Pulsar la notificación**

Debe marcar como leída (badge desaparece) y navegar a `/history` (si es `analisis_listo`).

- [ ] **Step 10: Hacer swipe-to-delete**

En NotificationsScreen, swipe hacia la derecha sobre la notificación. Debe desaparecer de la lista.

- [ ] **Step 11: Commit final**

```bash
git add -A
git commit -m "feat: complete persistent notifications implementation

- Backend: Notification model, service, REST controller, cron cleanup
- Flutter: Domain/data/presentation layers, NotificationsBloc, UI
- Integration: AppBar bell, WS/REST sync, contextual navigation
- TTL: 30 days with daily cleanup

All manual tests passing."
```
