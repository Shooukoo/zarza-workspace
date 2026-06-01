---
name: refresh-tokens
description: Diseño de refresh tokens con rotación y detección de robo para resolver SEG-03 — JWT de 7 días sin revocación
metadata:
  type: project
---

# Refresh Tokens con Rotación — Diseño Técnico

**Fecha:** 2026-06-01
**Servicios afectados:** `fruit-backend`, `zarza_ai`
**Auditoría:** SEG-03 (JWT con expiración larga sin refresh token)

---

## 1. Problema

Los JWT actuales expiran a los 7 días. No existe mecanismo de revocación server-side: un token robado (dispositivo perdido, log inadvertido) permanece válido durante toda su vida útil. El logout solo limpia la cookie/storage del cliente — el token sigue siendo criptográficamente válido.

---

## 2. Solución

**Access token** corto (JWT, 15 min) + **refresh token** opaco (random, 7 días) con rotación en cada uso y detección de robo por familia.

El refresh token NO es un JWT — es una cadena aleatoria de 256 bits en base64url. Se persiste hasheada (SHA-256) en PostgreSQL. Esto permite revocación server-side sin Redis.

---

## 3. Modelo de Datos

Nueva tabla en `packages/database/prisma/schema.prisma`:

```prisma
model RefreshToken {
  id        String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tokenHash String    @unique @map("token_hash")
  userId    String    @map("user_id") @db.Uuid
  familyId  String    @map("family_id") @db.Uuid
  expiresAt DateTime  @map("expires_at")
  revokedAt DateTime? @map("revoked_at")
  createdAt DateTime  @default(now()) @map("created_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([familyId])
  @@map("refresh_tokens")
}
```

**Campos clave:**
- `tokenHash`: SHA-256 del token en claro. Nunca se almacena el token en claro.
- `familyId`: UUID generado en el primer login y heredado por todos los tokens rotados de esa sesión.
- `revokedAt`: `null` = activo. Non-null = rotado (reemplazado) o detectado como robado.

El modelo `User` en `schema.prisma` necesita la relación inversa:

```prisma
model User {
  ...
  refreshTokens RefreshToken[]
}
```

---

## 4. Variables de Entorno

### fruit-backend/.env

| Variable | Antes | Después |
|----------|-------|---------|
| `JWT_EXPIRES_IN` | `7d` | Eliminada |
| `JWT_ACCESS_EXPIRES_IN` | — | `15m` |
| `JWT_REFRESH_EXPIRES_IN` | — | `7d` |

**`fruit-backend/src/config/envs.ts`** — actualizar `EnvVars`, `envSchema` y `envs`:

```typescript
interface EnvVars {
  // ... campos existentes sin JWT_EXPIRES_IN ...
  JWT_ACCESS_EXPIRES_IN: string;
  JWT_REFRESH_EXPIRES_IN: string;
}

const envSchema = joi.object({
  // ... validaciones existentes, eliminar JWT_EXPIRES_IN ...
  JWT_ACCESS_EXPIRES_IN: joi.string().required(),
  JWT_REFRESH_EXPIRES_IN: joi.string().required(),
  // ...
});

export const envs = {
  // ... sin jwtExpiresIn ...
  jwtAccessExpiresIn: envVars.JWT_ACCESS_EXPIRES_IN,
  jwtRefreshExpiresIn: envVars.JWT_REFRESH_EXPIRES_IN,
};
```

**`auth.module.ts`** — actualizar `JwtModule.registerAsync` para usar `JWT_ACCESS_EXPIRES_IN`:

```typescript
signOptions: {
  expiresIn: configService.get<string>('JWT_ACCESS_EXPIRES_IN'),
},
```

---

## 5. Backend — Clean Architecture

### 5.1 Puerto: `IRefreshTokenRepository`

Nuevo archivo: `fruit-backend/src/auth/ports/refresh-token-repository.port.ts`

```typescript
export const I_REFRESH_TOKEN_REPOSITORY = Symbol('I_REFRESH_TOKEN_REPOSITORY');

export type RefreshTokenRecord = {
  id: string;
  tokenHash: string;
  userId: string;
  familyId: string;
  expiresAt: Date;
  revokedAt: Date | null;
};

export interface IRefreshTokenRepository {
  create(params: {
    tokenHash: string;
    userId: string;
    familyId: string;
    expiresAt: Date;
  }): Promise<void>;

  findByTokenHash(hash: string): Promise<RefreshTokenRecord | null>;

  revokeByTokenHash(hash: string): Promise<void>;

  revokeByFamilyId(familyId: string): Promise<void>;

  deleteExpired(): Promise<number>;
}
```

### 5.2 Adaptador: `PrismaRefreshTokenRepository`

Nuevo archivo: `fruit-backend/src/auth/infrastructure/adapters/prisma-refresh-token.repository.ts`

```typescript
@Injectable()
export class PrismaRefreshTokenRepository implements IRefreshTokenRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(params: { tokenHash: string; userId: string; familyId: string; expiresAt: Date }): Promise<void> {
    await this.prisma.refreshToken.create({ data: params });
  }

  async findByTokenHash(hash: string): Promise<RefreshTokenRecord | null> {
    return this.prisma.refreshToken.findUnique({ where: { tokenHash: hash } });
  }

  async revokeByTokenHash(hash: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash: hash },
      data: { revokedAt: new Date() },
    });
  }

  async revokeByFamilyId(familyId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { familyId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async deleteExpired(): Promise<number> {
    const result = await this.prisma.refreshToken.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
    return result.count;
  }
}
```

### 5.3 Helpers en `AuthService`

```typescript
import { randomBytes, createHash } from 'crypto';

private generateRefreshToken(): string {
  return randomBytes(32).toString('base64url');
}

private hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
```

### 5.4 `AuthService` — métodos actualizados

**`login()`** ahora devuelve también `refreshToken`:

```typescript
async login(email: string, plainPassword: string): Promise<{
  token: string;
  refreshToken: string;
  user: UserProfile;
}> {
  // ... validación existente ...

  const accessToken = await this.tokenService.generateToken({
    sub: user.id, email: user.email, role: user.role,
  });

  const refreshToken = this.generateRefreshToken();
  const familyId = randomUUID();
  const expiresAt = new Date(Date.now() + this.refreshExpiresMs);

  await this.refreshTokenRepo.create({
    tokenHash: this.hashToken(refreshToken),
    userId: user.id,
    familyId,
    expiresAt,
  });

  return { token: accessToken, refreshToken, user: this._toProfile(user) };
}
```

**Nuevo `refresh(refreshToken: string)`**:

```typescript
async refresh(rawToken: string): Promise<{ token: string; refreshToken: string }> {
  const hash = this.hashToken(rawToken);
  const record = await this.refreshTokenRepo.findByTokenHash(hash);

  if (!record) throw new UnauthorizedException('Refresh token inválido');

  if (record.revokedAt !== null) {
    // Robo detectado: invalidar toda la familia
    await this.refreshTokenRepo.revokeByFamilyId(record.familyId);
    throw new UnauthorizedException('Refresh token reutilizado — sesión invalidada');
  }

  if (record.expiresAt < new Date()) {
    throw new UnauthorizedException('Refresh token expirado');
  }

  // Rotación: revocar el actual, emitir nuevos
  await this.refreshTokenRepo.revokeByTokenHash(hash);

  const user = await this.userRepository.findById(record.userId);
  if (!user) throw new UnauthorizedException('Usuario no encontrado');

  const newAccessToken = await this.tokenService.generateToken({
    sub: user.id, email: user.email, role: user.role,
  });
  const newRefreshToken = this.generateRefreshToken();
  const expiresAt = new Date(Date.now() + this.refreshExpiresMs);

  await this.refreshTokenRepo.create({
    tokenHash: this.hashToken(newRefreshToken),
    userId: user.id,
    familyId: record.familyId,  // mismo familyId — misma familia
    expiresAt,
  });

  return { token: newAccessToken, refreshToken: newRefreshToken };
}
```

**Nuevo `logout(refreshToken: string | undefined)`**:

```typescript
async logout(rawToken: string | undefined): Promise<void> {
  if (!rawToken) return;
  const hash = this.hashToken(rawToken);
  await this.refreshTokenRepo.revokeByTokenHash(hash);
}
```

`AuthService` recibe `refreshExpiresMs: number` como quinto parámetro del constructor. El valor se calcula en `auth.module.ts` al registrar el factory, usando la librería `ms` (incluida en NestJS):

```typescript
// auth.module.ts — useFactory del AUTH_SERVICE
useFactory: (userRepo, hasher, tokenPort, refreshTokenRepo, configService: ConfigService) => {
  const rawExpiry = configService.get<string>('JWT_REFRESH_EXPIRES_IN');
  return new AuthService(userRepo, hasher, tokenPort, refreshTokenRepo, ms(rawExpiry));
},
inject: [I_USER_REPOSITORY, I_HASHER_PORT, I_TOKEN_PORT, I_REFRESH_TOKEN_REPOSITORY, ConfigService],
```

`import ms from 'ms'` al inicio de `auth.module.ts`.

### 5.5 `AuthController` — cambios

**`COOKIE_MAX_AGE`**: cambiar de `604800` a `900` (15 min, coincide con access token).

**`login()`**: re-setear cookie con el nuevo `maxAge`, devolver `{ token, refreshToken, user }`.

**Nuevo endpoint `POST /auth/refresh`**:

```typescript
@Post('refresh')
@HttpCode(HttpStatus.OK)
@Throttle({ auth: { limit: 5, ttl: 60000 } })
async refresh(
  @Body() body: RefreshTokenDto,
  @Res({ passthrough: true }) reply: FastifyReply,
) {
  const result = await this.authService.refresh(body.refreshToken);
  reply.setCookie(COOKIE_NAME, result.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    path: '/',
    maxAge: 900,
  });
  return result;  // { token, refreshToken }
}
```

`RefreshTokenDto`:
```typescript
class RefreshTokenDto {
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}
```

**`logout()`**: acepta `refreshToken` en body y lo revoca:

```typescript
@Post('logout')
@HttpCode(HttpStatus.OK)
async logout(
  @Body() body: LogoutDto,
  @Req() req: any,
  @Res({ passthrough: true }) reply: FastifyReply,
) {
  await this.authService.logout(body?.refreshToken);
  if (req.user?.sub) {
    await this.userRepository.clearFcmToken(req.user.sub).catch(() => {});
  }
  reply.clearCookie(COOKIE_NAME, { path: '/' });
  return { message: 'Logged out' };
}
```

`LogoutDto`:
```typescript
class LogoutDto {
  @IsString()
  @IsOptional()
  refreshToken?: string;
}
```

### 5.6 `AuthModule` — registrar nuevo provider

```typescript
providers: [
  { provide: I_USER_REPOSITORY, useClass: PrismaUserRepository },
  { provide: I_HASHER_PORT, useClass: BcryptHasher },
  { provide: I_TOKEN_PORT, useClass: JwtTokenService },
  { provide: I_REFRESH_TOKEN_REPOSITORY, useClass: PrismaRefreshTokenRepository },
  {
    provide: AUTH_SERVICE,
    useFactory: (userRepo, hasher, tokenPort, refreshTokenRepo) =>
      new AuthService(userRepo, hasher, tokenPort, refreshTokenRepo),
    inject: [I_USER_REPOSITORY, I_HASHER_PORT, I_TOKEN_PORT, I_REFRESH_TOKEN_REPOSITORY],
  },
],
```

---

## 6. Flutter — Cambios

### 6.1 `LocalAuthDatasource` — nuevas claves

```dart
static const _refreshTokenKey = 'auth_refresh_token';

Future<void> saveRefreshToken(String token) =>
    _storage.write(key: _refreshTokenKey, value: token);

Future<String?> getRefreshToken() =>
    _storage.read(key: _refreshTokenKey);

Future<void> deleteRefreshToken() =>
    _storage.delete(key: _refreshTokenKey);
```

`clearAll()` debe incluir `deleteRefreshToken()`:

```dart
Future<void> clearAll() async {
  await deleteToken();
  await deleteRefreshToken();
  await deleteUser();
}
```

### 6.2 `AuthRepositoryImpl` — guardar refresh token

**`login()`**:

```dart
Future<AuthResultEntity> login({...}) async {
  final model = await _remote.login(email: email, password: password);
  final entity = model.toEntity();
  await _local.saveToken(entity.token);
  await _local.saveRefreshToken(entity.refreshToken);
  await _local.saveUser(entity.user);
  return entity;
}
```

**`logout()`**: ahora llama al backend antes de limpiar storage:

```dart
Future<void> logout() async {
  final refreshToken = await _local.getRefreshToken();
  try {
    await _dio.post<void>(
      '/api/auth/logout',
      data: refreshToken != null ? {'refreshToken': refreshToken} : {},
    );
  } catch (_) {
    // Si falla la llamada al backend, igual limpiamos local
  }
  await _local.clearAll();
}
```

### 6.3 `AuthInterceptor` — silent refresh

```dart
```dart
class AuthInterceptor extends Interceptor {
  AuthInterceptor(this._local);
  final LocalAuthDatasource _local;

  bool _isRefreshing = false;

  // Dio limpio sin interceptores para la llamada de refresh.
  // Usar el Dio principal crearía un bucle: el interceptor añadiría
  // el token caducado a la llamada de refresh, y un 401 re-entrante
  // volvería a disparar el interceptor indefinidamente.
  late final Dio _refreshDio = Dio(
    BaseOptions(baseUrl: AppConstants.baseUrl),
  );

  @override
  Future<void> onRequest(RequestOptions options, RequestInterceptorHandler handler) async {
    final token = await _local.getToken();
    if (token != null && token.isNotEmpty) {
      options.headers['Authorization'] = 'Bearer $token';
    }
    handler.next(options);
  }

  @override
  Future<void> onError(DioException err, ErrorInterceptorHandler handler) async {
    final isAuthEndpoint = err.requestOptions.path.contains('/auth/');

    if (err.response?.statusCode == 401 && !isAuthEndpoint) {
      if (_isRefreshing) {
        sl<AuthCubit>().logout();
        return handler.next(err);
      }

      final refreshToken = await _local.getRefreshToken();
      if (refreshToken == null) {
        sl<AuthCubit>().logout();
        return handler.next(err);
      }

      _isRefreshing = true;
      try {
        final response = await _refreshDio.post<Map<String, dynamic>>(
          '/api/auth/refresh',
          data: {'refreshToken': refreshToken},
        );
        final data = response.data!;
        await _local.saveToken(data['token'] as String);
        await _local.saveRefreshToken(data['refreshToken'] as String);

        // Reintentar la request original con el nuevo access token
        final retryOptions = err.requestOptions;
        retryOptions.headers['Authorization'] = 'Bearer ${data['token']}';
        final retryResponse = await _refreshDio.fetch<dynamic>(retryOptions);
        return handler.resolve(retryResponse);
      } catch (_) {
        sl<AuthCubit>().logout();
        return handler.next(err);
      } finally {
        _isRefreshing = false;
      }
    }

    handler.next(err);
  }
}
```

**`service_locator.dart`**: `AuthInterceptor` sigue recibiendo solo `sl<LocalAuthDatasource>()` — no necesita el Dio principal porque usa su propio `_refreshDio` interno.

### 6.4 `AuthResultEntity` y modelo remoto

`AuthResultEntity` incluye el nuevo campo:

```dart
class AuthResultEntity {
  final String token;
  final String refreshToken;
  final UserEntity user;
}
```

El modelo de respuesta del backend (`AuthResultModel`) se actualiza para parsear `refreshToken` del JSON.

---

## 7. Flujos de Seguridad

### Flujo normal (login → refresh → refresh)

```
Cliente                    Backend
  │  POST /auth/login        │
  ├─────────────────────────►│ genera accessToken (15m) + refreshToken
  │  { token, refreshToken } │ guarda hash(refreshToken), familyId=UUID
  │◄─────────────────────────│
  │                          │
  │  [15 min después]        │
  │  POST /auth/refresh      │
  │  { refreshToken: RT1 }   │
  ├─────────────────────────►│ hash(RT1) → encontrado, revokedAt=null, no expirado
  │                          │ → revoca RT1 (revokedAt=now)
  │                          │ → genera accessToken2 + RT2 (mismo familyId)
  │  { token2, RT2 }         │ → guarda hash(RT2)
  │◄─────────────────────────│
```

### Detección de robo

```
Atacante usa RT1 (ya rotado por el usuario legítimo):

Atacante                   Backend
  │  POST /auth/refresh      │
  │  { refreshToken: RT1 }   │
  ├─────────────────────────►│ hash(RT1) → encontrado, revokedAt != null
  │                          │ → ROBO DETECTADO
  │  401 Unauthorized        │ → revoca TODA la familia (incluye RT2 activo)
  │◄─────────────────────────│

Usuario legítimo intenta usar RT2 → también 401 → forzado a re-login
```

---

## 8. Casos de Borde

| Escenario | Comportamiento |
|-----------|----------------|
| Refresh token expirado | 401, cliente va a login |
| Refresh token no encontrado (malformado) | 401 |
| Refresh concurrente desde dos dispositivos | El segundo refresh recibe RT1 ya revocado → detección de robo → ambas sesiones invalidadas. Alternativa: usar ventana de gracia de 1s (fuera de scope) |
| Usuario eliminado | `onDelete: Cascade` en Prisma elimina todos sus refresh tokens |
| Backend caído durante refresh | Flutter reintenta en el siguiente request que retorne 401 |
| `_isRefreshing = true` concurrente en Flutter | La segunda request 401 hace logout directo para evitar bucle |

---

## 9. Tests

### Backend
- `AuthService.login()`: devuelve `token`, `refreshToken` y `user`; persiste el hash en la BD.
- `AuthService.refresh()`: token válido → rota correctamente; token revocado → revoca familia; token expirado → 401.
- `AuthService.logout()`: revoca el token en BD.
- `PrismaRefreshTokenRepository`: `revokeByFamilyId` actualiza todos los registros de la familia.

### Flutter
- `LocalAuthDatasource`: `saveRefreshToken` / `getRefreshToken` / `clearAll` incluye refresh token.
- `AuthInterceptor`: en 401, llama a `/auth/refresh`, guarda nuevos tokens, reintenta la request. En segundo 401 (refresh fallido), hace logout.

---

## 10. Archivos a Modificar / Crear

| Acción | Archivo |
|--------|---------|
| Modificar | `packages/database/prisma/schema.prisma` |
| Crear migración | `packages/database/prisma/migrations/...` |
| Crear | `fruit-backend/src/auth/ports/refresh-token-repository.port.ts` |
| Crear | `fruit-backend/src/auth/infrastructure/adapters/prisma-refresh-token.repository.ts` |
| Modificar | `fruit-backend/src/auth/application/auth.service.ts` |
| Modificar | `fruit-backend/src/auth/infrastructure/http/auth.controller.ts` |
| Modificar | `fruit-backend/src/auth/infrastructure/auth.module.ts` |
| Modificar | `fruit-backend/src/config/envs.ts` |
| Modificar | `fruit-backend/.env` (renombrar variable) |
| Modificar | `zarza_ai/lib/data/datasources/local_auth_datasource.dart` |
| Modificar | `zarza_ai/lib/data/repositories/auth_repository_impl.dart` |
| Modificar | `zarza_ai/lib/core/network/auth_interceptor.dart` |
| Modificar | `zarza_ai/lib/core/di/service_locator.dart` |
| Modificar | `zarza_ai/lib/domain/entities/auth_result_entity.dart` |
| Modificar | `zarza_ai/lib/data/datasources/remote_auth_datasource.dart` (parsear `refreshToken`) |
