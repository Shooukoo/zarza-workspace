# Dates Bug Fix + User Names Implementation Plan

**Spec relacionado:** [[2026-05-20-dates-and-user-names-design]]

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix invisible analysis dates in home cards and add firstName/lastName to users for personalized greetings, stored in PostgreSQL and editable from the app.

**Architecture:** Two independent tracks. (1) A one-line parser fix in `FruitAnalysisModel`. (2) A vertical slice from Prisma schema → NestJS backend → Flutter domain/data/presentation, following the existing clean architecture pattern (UseCase → IRepository → RepositoryImpl → Datasource). Profile editing is exposed as `PATCH /auth/profile` and accessed by tapping the avatar on the home screen.

**Tech Stack:** NestJS 11 + Prisma + PostgreSQL (backend), Flutter 3 + BLoC + GetIt (mobile), Go Router for navigation.

---

## File Map

| File | Action |
|------|--------|
| `zarza_ai/lib/data/models/fruit_analysis_model.dart` | Modify — fallback `created_at` key |
| `packages/database/prisma/schema.prisma` | Modify — add `firstName`, `lastName` |
| `fruit-backend/src/auth/domain/entities/user.entity.ts` | Modify — add name fields |
| `fruit-backend/src/auth/ports/user-repository.port.ts` | Modify — add `updateProfile`, extend `CreateUserData` |
| `fruit-backend/src/auth/infrastructure/adapters/prisma-user.repository.ts` | Modify — read/write names, `updateProfile` |
| `fruit-backend/src/auth/infrastructure/adapters/in-memory-user.repository.ts` | Modify — keep in sync |
| `fruit-backend/src/auth/infrastructure/http/dtos/register.dto.ts` | Modify — add optional name fields |
| `fruit-backend/src/auth/infrastructure/http/dtos/update-profile.dto.ts` | Create — new DTO |
| `fruit-backend/src/auth/application/auth.service.ts` | Modify — pass names, include in responses |
| `fruit-backend/src/auth/infrastructure/http/auth.controller.ts` | Modify — add `PATCH /auth/profile` |
| `zarza_ai/lib/domain/entities/user_entity.dart` | Modify — add name fields + `displayName` |
| `zarza_ai/lib/data/datasources/local_auth_datasource.dart` | Modify — persist/restore names |
| `zarza_ai/lib/data/models/auth_response_model.dart` | Modify — parse names from JSON |
| `zarza_ai/lib/data/datasources/remote_auth_datasource.dart` | Modify — send names, add `updateProfile` |
| `zarza_ai/lib/domain/repositories/i_auth_repository.dart` | Modify — extend register, add `updateProfile` |
| `zarza_ai/lib/data/repositories/auth_repository_impl.dart` | Modify — pass names, implement `updateProfile` |
| `zarza_ai/lib/domain/usecases/register_usecase.dart` | Modify — forward name params |
| `zarza_ai/lib/domain/usecases/update_profile_usecase.dart` | Create — new use case |
| `zarza_ai/lib/core/auth/auth_cubit.dart` | Modify — update `register`, add `updateProfile` |
| `zarza_ai/lib/core/di/service_locator.dart` | Modify — register `UpdateProfileUseCase` |
| `zarza_ai/lib/presentation/auth/register_screen.dart` | Modify — add name fields |
| `zarza_ai/lib/presentation/profile/profile_edit_screen.dart` | Create — new screen |
| `zarza_ai/lib/core/router/app_router.dart` | Modify — add `/profile` route |
| `zarza_ai/lib/presentation/home/home_screen.dart` | Modify — use `displayName`, tap avatar |

---

## Task 1: Bug fix — fechas invisibles en las cards

**Files:**
- Modify: `zarza_ai/lib/data/models/fruit_analysis_model.dart`

- [ ] **Step 1: Localizar la línea del bug**

Abrir `zarza_ai/lib/data/models/fruit_analysis_model.dart`. En `fromJson`, la línea del `createdAt` (línea ~84) actualmente es:

```dart
createdAt: json['createdAt'] != null
    ? DateTime.tryParse(json['createdAt'] as String)
    : null,
```

El backend puede serializar el campo como `created_at` (snake_case). Si no hay match, `createdAt` llega `null` y las cards muestran `'—'`.

- [ ] **Step 2: Aplicar el fix**

Reemplazar esa línea con:

```dart
createdAt: (json['createdAt'] ?? json['created_at']) != null
    ? DateTime.tryParse(
        (json['createdAt'] ?? json['created_at']) as String)
    : null,
```

- [ ] **Step 3: Verificar compilación Flutter**

```bash
cd zarza_ai && flutter analyze lib/data/models/fruit_analysis_model.dart
```

Resultado esperado: `No issues found!`

- [ ] **Step 4: Commit**

```bash
git add zarza_ai/lib/data/models/fruit_analysis_model.dart
git commit -m "fix(home): fallback created_at snake_case when parsing analysis date"
```

---

## Task 2: Prisma schema — agregar firstName y lastName

**Files:**
- Modify: `packages/database/prisma/schema.prisma`

- [ ] **Step 1: Agregar campos al modelo User**

En `packages/database/prisma/schema.prisma`, dentro del modelo `User`, agregar las dos líneas después de `fcmToken`:

```prisma
model User {
  id           String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  email        String   @unique
  passwordHash String   @map("password_hash")
  role         Role
  fcmToken     String?  @map("fcm_token")
  firstName    String?  @map("first_name")
  lastName     String?  @map("last_name")
  createdAt    DateTime @default(now()) @map("created_at")
  updatedAt    DateTime @updatedAt @map("updated_at")
  // ... relaciones sin cambios
```

- [ ] **Step 2: Crear la migración**

```bash
cd packages/database && npx prisma migrate dev --name add_user_name
```

Resultado esperado: migración aplicada, archivo creado en `packages/database/prisma/migrations/`.

- [ ] **Step 3: Regenerar el cliente Prisma**

```bash
npx prisma generate
```

Resultado esperado: `Generated Prisma Client` sin errores.

- [ ] **Step 4: Commit**

```bash
git add packages/database/prisma/schema.prisma packages/database/prisma/migrations/
git commit -m "feat(db): add first_name and last_name to users table"
```

---

## Task 3: Backend — User entity y IUserRepository port

**Files:**
- Modify: `fruit-backend/src/auth/domain/entities/user.entity.ts`
- Modify: `fruit-backend/src/auth/ports/user-repository.port.ts`

- [ ] **Step 1: Actualizar User entity**

Reemplazar el contenido de `fruit-backend/src/auth/domain/entities/user.entity.ts`:

```typescript
import { Role } from '../enums/role.enum';

export class User {
  private _passwordHash: string;
  public fcm_token: string | null = null;

  constructor(
    public readonly id: string,
    public readonly email: string,
    passwordHash: string,
    public readonly role: Role,
    public readonly firstName: string | null = null,
    public readonly lastName: string | null = null,
  ) {
    this._passwordHash = passwordHash;
  }

  get hashedPassword(): string {
    return this._passwordHash;
  }

  withUpdatedPassword(newHash: string): User {
    return new User(
      this.id,
      this.email,
      newHash,
      this.role,
      this.firstName,
      this.lastName,
    );
  }
}
```

- [ ] **Step 2: Actualizar IUserRepository port**

Reemplazar el contenido de `fruit-backend/src/auth/ports/user-repository.port.ts`:

```typescript
import { User } from '../domain/entities/user.entity';
import { Role } from '../domain/enums/role.enum';

export const I_USER_REPOSITORY = Symbol('I_USER_REPOSITORY');

export type CreateUserData = {
  email: string;
  passwordHash: string;
  role: Role;
  firstName?: string;
  lastName?: string;
};

export type UserCampos = {
  id: string;
  camposAsignados: string[];
};

export interface IUserRepository {
  findByEmail(email: string): Promise<User | null>;
  save(data: CreateUserData): Promise<User>;
  findById(id: string): Promise<UserCampos | null>;
  findFcmTokenById(userId: string): Promise<string | null>;
  clearFcmToken(userId: string): Promise<void>;
  saveFcmToken(userId: string, token: string): Promise<void>;
  updateProfile(userId: string, data: { firstName?: string; lastName?: string }): Promise<void>;
}
```

- [ ] **Step 3: Verificar compilación TypeScript**

```bash
cd fruit-backend && pnpm run build 2>&1 | head -30
```

Resultado esperado: Errores únicamente en los adaptadores que aún no implementan `updateProfile` (eso se corrige en Task 4). No debe haber errores en los archivos recién editados.

- [ ] **Step 4: Commit**

```bash
git add fruit-backend/src/auth/domain/entities/user.entity.ts \
        fruit-backend/src/auth/ports/user-repository.port.ts
git commit -m "feat(auth): add firstName/lastName to User entity and IUserRepository"
```

---

## Task 4: Backend — PrismaUserRepository e InMemoryUserRepository

**Files:**
- Modify: `fruit-backend/src/auth/infrastructure/adapters/prisma-user.repository.ts`
- Modify: `fruit-backend/src/auth/infrastructure/adapters/in-memory-user.repository.ts`

- [ ] **Step 1: Actualizar PrismaUserRepository**

Reemplazar el contenido de `fruit-backend/src/auth/infrastructure/adapters/prisma-user.repository.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@rubus/database';
import { User } from '../../domain/entities/user.entity';
import { IUserRepository, CreateUserData, UserCampos } from '../../ports/user-repository.port';
import { Role } from '../../domain/enums/role.enum';

@Injectable()
export class PrismaUserRepository implements IUserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmail(email: string): Promise<User | null> {
    const doc = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });
    if (!doc) return null;
    return new User(
      doc.id,
      doc.email,
      doc.passwordHash,
      doc.role as Role,
      doc.firstName ?? null,
      doc.lastName ?? null,
    );
  }

  async save(data: CreateUserData): Promise<User> {
    const created = await this.prisma.user.create({
      data: {
        email: data.email,
        passwordHash: data.passwordHash,
        role: data.role,
        firstName: data.firstName ?? null,
        lastName: data.lastName ?? null,
      },
    });
    return new User(
      created.id,
      created.email,
      created.passwordHash,
      created.role as Role,
      created.firstName ?? null,
      created.lastName ?? null,
    );
  }

  async findById(id: string): Promise<UserCampos | null> {
    const doc = await this.prisma.user.findUnique({
      where: { id },
      include: { camposAsignados: { select: { campoId: true } } },
    });
    if (!doc) return null;
    return {
      id: doc.id,
      camposAsignados: doc.camposAsignados.map((uc) => uc.campoId),
    };
  }

  async findFcmTokenById(userId: string): Promise<string | null> {
    const doc = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { fcmToken: true },
    });
    return doc?.fcmToken ?? null;
  }

  async clearFcmToken(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { fcmToken: null },
    });
  }

  async saveFcmToken(userId: string, token: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { fcmToken: token },
    });
  }

  async updateProfile(
    userId: string,
    data: { firstName?: string; lastName?: string },
  ): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(data.firstName !== undefined && { firstName: data.firstName }),
        ...(data.lastName !== undefined && { lastName: data.lastName }),
      },
    });
  }
}
```

- [ ] **Step 2: Actualizar InMemoryUserRepository**

Reemplazar el contenido de `fruit-backend/src/auth/infrastructure/adapters/in-memory-user.repository.ts`:

```typescript
import { User } from '../../domain/entities/user.entity';
import { IUserRepository, CreateUserData, UserCampos } from '../../ports/user-repository.port';
import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';

@Injectable()
export class InMemoryUserRepository implements IUserRepository {
  private readonly users: User[] = [];

  async findByEmail(email: string): Promise<User | null> {
    return this.users.find((u) => u.email === email) ?? null;
  }

  async save(data: CreateUserData): Promise<User> {
    const newUser = new User(
      randomUUID(),
      data.email,
      data.passwordHash,
      data.role,
      data.firstName ?? null,
      data.lastName ?? null,
    );
    this.users.push(newUser);
    return newUser;
  }

  async findById(id: string): Promise<UserCampos | null> {
    const user = this.users.find((u) => u.id === id);
    if (!user) return null;
    return { id, camposAsignados: [] };
  }

  async findFcmTokenById(userId: string): Promise<string | null> {
    return this.users.find((u) => u.id === userId)?.fcm_token ?? null;
  }

  async clearFcmToken(userId: string): Promise<void> {
    const user = this.users.find((u) => u.id === userId);
    if (user) user.fcm_token = null;
  }

  async saveFcmToken(userId: string, token: string): Promise<void> {
    const user = this.users.find((u) => u.id === userId);
    if (user) user.fcm_token = token;
  }

  async updateProfile(
    userId: string,
    data: { firstName?: string; lastName?: string },
  ): Promise<void> {
    // InMemory es inmutable en User; en tests, verificar directamente el repo state
  }
}
```

- [ ] **Step 3: Verificar que compila**

```bash
cd fruit-backend && pnpm run build 2>&1 | head -30
```

Resultado esperado: solo quedan errores en `auth.service.ts` y `auth.controller.ts` (se corrigen en Tasks 5-6).

- [ ] **Step 4: Commit**

```bash
git add fruit-backend/src/auth/infrastructure/adapters/
git commit -m "feat(auth): update user repositories to read/write name fields"
```

---

## Task 5: Backend — DTOs y AuthService

**Files:**
- Modify: `fruit-backend/src/auth/infrastructure/http/dtos/register.dto.ts`
- Create: `fruit-backend/src/auth/infrastructure/http/dtos/update-profile.dto.ts`
- Modify: `fruit-backend/src/auth/application/auth.service.ts`

- [ ] **Step 1: Actualizar RegisterDto**

Reemplazar el contenido de `fruit-backend/src/auth/infrastructure/http/dtos/register.dto.ts`:

```typescript
import { IsEmail, IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password!: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  lastName?: string;
}
```

- [ ] **Step 2: Crear UpdateProfileDto**

Crear `fruit-backend/src/auth/infrastructure/http/dtos/update-profile.dto.ts`:

```typescript
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(60)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  lastName?: string;
}
```

- [ ] **Step 3: Actualizar AuthService**

Reemplazar el contenido de `fruit-backend/src/auth/application/auth.service.ts`:

```typescript
import { User } from '../domain/entities/user.entity';
import { Role } from '../domain/enums/role.enum';
import { IUserRepository } from '../ports/user-repository.port';
import { IHasherPort } from '../ports/hasher.port';
import { ITokenPort } from '../ports/token.port';
import {
  InvalidCredentialsError,
  UserAlreadyExistsError,
} from '../domain/errors/auth.errors';

export type UserProfile = {
  id: string;
  email: string;
  role: Role;
  firstName: string | null;
  lastName: string | null;
};

export type RegisteredUserResult = {
  user: UserProfile;
  token: string;
};

export class AuthService {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly hasher: IHasherPort,
    private readonly tokenService: ITokenPort,
  ) {}

  async register(
    email: string,
    plainPassword: string,
    firstName?: string,
    lastName?: string,
  ): Promise<RegisteredUserResult> {
    const existingUser = await this.userRepository.findByEmail(email);
    if (existingUser) {
      throw new UserAlreadyExistsError(email);
    }

    const passwordHash = await this.hasher.hash(plainPassword);

    const newUser = await this.userRepository.save({
      email,
      passwordHash,
      role: Role.MONITOR,
      firstName: firstName?.trim() || null,
      lastName: lastName?.trim() || null,
    });

    const token = await this.tokenService.generateToken({
      sub: newUser.id,
      email: newUser.email,
      role: newUser.role,
    });

    return {
      user: this._toProfile(newUser),
      token,
    };
  }

  async login(
    email: string,
    plainPassword: string,
  ): Promise<{ token: string; user: UserProfile }> {
    const user = await this.userRepository.findByEmail(email);
    if (!user) throw new InvalidCredentialsError();

    const isPasswordValid = await this.hasher.compare(
      plainPassword,
      user.hashedPassword,
    );
    if (!isPasswordValid) throw new InvalidCredentialsError();

    const token = await this.tokenService.generateToken({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    return { token, user: this._toProfile(user) };
  }

  private _toProfile(user: User): UserProfile {
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
    };
  }
}
```

- [ ] **Step 4: Verificar compilación**

```bash
cd fruit-backend && pnpm run build 2>&1 | head -30
```

Resultado esperado: solo errores en `auth.controller.ts` (Task 6).

- [ ] **Step 5: Commit**

```bash
git add fruit-backend/src/auth/infrastructure/http/dtos/ \
        fruit-backend/src/auth/application/auth.service.ts
git commit -m "feat(auth): add name fields to register DTO and auth service responses"
```

---

## Task 6: Backend — AuthController

**Files:**
- Modify: `fruit-backend/src/auth/infrastructure/http/auth.controller.ts`

- [ ] **Step 1: Actualizar el controlador**

Reemplazar el contenido de `fruit-backend/src/auth/infrastructure/http/auth.controller.ts`:

```typescript
import {
  Controller,
  Post,
  Patch,
  Get,
  Body,
  HttpCode,
  HttpStatus,
  BadRequestException,
  UnauthorizedException,
  Inject,
  UseGuards,
  Req,
  Res,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { IsString, MaxLength } from 'class-validator';

class FcmTokenDto {
  @IsString()
  @MaxLength(512)
  token: string;
}

import type { FastifyReply } from 'fastify';
import { AuthService } from '../../application/auth.service';
import {
  UserAlreadyExistsError,
  InvalidCredentialsError,
} from '../../domain/errors/auth.errors';
import { RegisterDto } from './dtos/register.dto';
import { LoginDto } from './dtos/login.dto';
import { UpdateProfileDto } from './dtos/update-profile.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';
import { Role } from '../../domain/enums/role.enum';
import { I_USER_REPOSITORY, type IUserRepository } from '../../ports/user-repository.port';

export const AUTH_SERVICE = Symbol('AUTH_SERVICE');

const COOKIE_NAME = 'access_token';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7;

@Controller('auth')
export class AuthController {
  constructor(
    @Inject(AUTH_SERVICE) private readonly authService: AuthService,
    @Inject(I_USER_REPOSITORY) private readonly userRepository: IUserRepository,
  ) {}

  @Post('register')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async register(@Body() dto: RegisterDto) {
    try {
      return await this.authService.register(
        dto.email,
        dto.password,
        dto.firstName,
        dto.lastName,
      );
    } catch (error) {
      if (error instanceof UserAlreadyExistsError) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ auth: { limit: 10, ttl: 60000 } })
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    try {
      const result = await this.authService.login(
        loginDto.email,
        loginDto.password,
      );
      reply.setCookie(COOKIE_NAME, result.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
        path: '/',
        maxAge: COOKIE_MAX_AGE,
      });
      return result;
    } catch (error) {
      if (error instanceof InvalidCredentialsError) {
        throw new UnauthorizedException('Invalid email or password');
      }
      throw error;
    }
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@Req() req: any) {
    return req.user;
  }

  @Patch('profile')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  async updateProfile(@Req() req: any, @Body() dto: UpdateProfileDto) {
    await this.userRepository.updateProfile(req.user.sub, {
      firstName: dto.firstName,
      lastName: dto.lastName,
    });
  }

  @Patch('fcm-token')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  async registerFcmToken(@Req() req: any, @Body() body: FcmTokenDto) {
    await this.userRepository.saveFcmToken(req.user.sub, body.token);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Req() req: any, @Res({ passthrough: true }) reply: FastifyReply) {
    if (req.user?.sub) {
      await this.userRepository.clearFcmToken(req.user.sub).catch(() => {});
    }
    reply.clearCookie(COOKIE_NAME, { path: '/' });
    return { message: 'Logged out' };
  }
}
```

- [ ] **Step 2: Verificar que el backend compila sin errores**

```bash
cd fruit-backend && pnpm run build
```

Resultado esperado: `Successfully compiled` sin errores TypeScript.

- [ ] **Step 3: Commit**

```bash
git add fruit-backend/src/auth/infrastructure/http/auth.controller.ts
git commit -m "feat(auth): add PATCH /auth/profile endpoint for name updates"
```

---

## Task 7: Flutter — UserEntity

**Files:**
- Modify: `zarza_ai/lib/domain/entities/user_entity.dart`

- [ ] **Step 1: Reemplazar el contenido del archivo**

```dart
import 'package:equatable/equatable.dart';

import '../enums/user_role.dart';

class UserEntity extends Equatable {
  const UserEntity({
    required this.id,
    required this.email,
    required this.role,
    this.firstName,
    this.lastName,
  });

  final String id;
  final String email;
  final UserRole role;
  final String? firstName;
  final String? lastName;

  /// Nombre a mostrar en saludos: firstName si existe, sino prefijo del email.
  String get displayName => firstName ?? email.split('@').first;

  @override
  List<Object?> get props => [id, email, role, firstName, lastName];
}
```

- [ ] **Step 2: Verificar compilación Flutter**

```bash
cd zarza_ai && flutter analyze lib/domain/entities/user_entity.dart
```

Resultado esperado: `No issues found!`

- [ ] **Step 3: Commit**

```bash
git add zarza_ai/lib/domain/entities/user_entity.dart
git commit -m "feat(auth): add firstName, lastName, displayName to UserEntity"
```

---

## Task 8: Flutter — LocalAuthDatasource

**Files:**
- Modify: `zarza_ai/lib/data/datasources/local_auth_datasource.dart`

- [ ] **Step 1: Actualizar saveUser y getUser para persistir nombres**

Reemplazar el contenido de `zarza_ai/lib/data/datasources/local_auth_datasource.dart`:

```dart
import 'dart:convert';

import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import '../../domain/entities/user_entity.dart';
import '../../domain/enums/user_role.dart';

class LocalAuthDatasource {
  LocalAuthDatasource(this._storage);
  final FlutterSecureStorage _storage;

  static const _tokenKey = 'auth_token';
  static const _userKey = 'auth_user';

  Future<void> saveToken(String token) =>
      _storage.write(key: _tokenKey, value: token);

  Future<String?> getToken() => _storage.read(key: _tokenKey);

  Future<void> deleteToken() => _storage.delete(key: _tokenKey);

  Future<void> saveUser(UserEntity user) async {
    final json = jsonEncode({
      'id': user.id,
      'email': user.email,
      'role': user.role.name.toUpperCase(),
      if (user.firstName != null) 'firstName': user.firstName,
      if (user.lastName != null) 'lastName': user.lastName,
    });
    await _storage.write(key: _userKey, value: json);
  }

  Future<UserEntity?> getUser() async {
    final raw = await _storage.read(key: _userKey);
    if (raw == null) return null;
    final map = jsonDecode(raw) as Map<String, dynamic>;
    return UserEntity(
      id: map['id'] as String,
      email: map['email'] as String,
      role: UserRole.fromString(map['role'] as String),
      firstName: map['firstName'] as String?,
      lastName: map['lastName'] as String?,
    );
  }

  Future<void> deleteUser() => _storage.delete(key: _userKey);

  Future<void> clearAll() async {
    await deleteToken();
    await deleteUser();
  }
}
```

- [ ] **Step 2: Verificar compilación**

```bash
cd zarza_ai && flutter analyze lib/data/datasources/local_auth_datasource.dart
```

Resultado esperado: `No issues found!`

- [ ] **Step 3: Commit**

```bash
git add zarza_ai/lib/data/datasources/local_auth_datasource.dart
git commit -m "feat(auth): persist firstName/lastName in secure local storage"
```

---

## Task 9: Flutter — AuthResponseModel

**Files:**
- Modify: `zarza_ai/lib/data/models/auth_response_model.dart`

- [ ] **Step 1: Actualizar fromJson para parsear nombres**

Reemplazar el contenido de `zarza_ai/lib/data/models/auth_response_model.dart`:

```dart
import '../../domain/entities/auth_result_entity.dart';
import '../../domain/entities/user_entity.dart';
import '../../domain/enums/user_role.dart';

class AuthResponseModel {
  const AuthResponseModel._({
    required this.token,
    required this.user,
  });

  final String token;
  final UserEntity user;

  factory AuthResponseModel.fromJson(
    Map<String, dynamic> json, {
    UserEntity? fallbackUser,
  }) {
    final userJson = json['user'] as Map<String, dynamic>?;

    final UserEntity user;
    if (userJson != null) {
      user = UserEntity(
        id: userJson['id'] as String? ?? '',
        email: userJson['email'] as String? ?? '',
        role: UserRole.fromString(userJson['role'] as String? ?? 'MONITOR'),
        firstName: userJson['firstName'] as String?,
        lastName: userJson['lastName'] as String?,
      );
    } else if (fallbackUser != null) {
      user = fallbackUser;
    } else {
      user = const UserEntity(id: '', email: '', role: UserRole.monitor);
    }

    return AuthResponseModel._(
      token: json['token'] as String,
      user: user,
    );
  }

  AuthResultEntity toEntity() => AuthResultEntity(token: token, user: user);
}
```

- [ ] **Step 2: Verificar compilación**

```bash
cd zarza_ai && flutter analyze lib/data/models/auth_response_model.dart
```

Resultado esperado: `No issues found!`

- [ ] **Step 3: Commit**

```bash
git add zarza_ai/lib/data/models/auth_response_model.dart
git commit -m "feat(auth): parse firstName/lastName from auth JSON response"
```

---

## Task 10: Flutter — RemoteAuthDatasource, IAuthRepository, AuthRepositoryImpl

**Files:**
- Modify: `zarza_ai/lib/data/datasources/remote_auth_datasource.dart`
- Modify: `zarza_ai/lib/domain/repositories/i_auth_repository.dart`
- Modify: `zarza_ai/lib/data/repositories/auth_repository_impl.dart`

- [ ] **Step 1: Actualizar RemoteAuthDatasource**

Reemplazar el contenido de `zarza_ai/lib/data/datasources/remote_auth_datasource.dart`:

```dart
import 'dart:developer' as developer;
import 'package:dio/dio.dart';

import '../../core/constants/app_constants.dart';
import '../../domain/entities/user_entity.dart';
import '../models/auth_response_model.dart';

class RemoteAuthDatasource {
  RemoteAuthDatasource(this._dio);
  final Dio _dio;

  Future<AuthResponseModel> login({
    required String email,
    required String password,
  }) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        AppConstants.loginEndpoint,
        data: {'email': email, 'password': password},
      );
      return AuthResponseModel.fromJson(response.data!);
    } on DioException catch (e) {
      if (e.type == DioExceptionType.connectionTimeout ||
          e.type == DioExceptionType.receiveTimeout ||
          e.type == DioExceptionType.sendTimeout) {
        developer.log('[RemoteAuthDatasource] Login timeout: ${e.type}');
        throw DioException(
          requestOptions: e.requestOptions,
          type: e.type,
          message: 'Tiempo de conexión agotado. Verifica tu red.',
        );
      }
      developer.log(
          '[RemoteAuthDatasource] DioError: ${e.type} - ${e.response?.statusCode}');
      rethrow;
    } catch (e, stack) {
      developer.log('[RemoteAuthDatasource] Error general',
          error: e, stackTrace: stack);
      rethrow;
    }
  }

  Future<AuthResponseModel> register({
    required String email,
    required String password,
    String? firstName,
    String? lastName,
  }) async {
    final response = await _dio.post<Map<String, dynamic>>(
      AppConstants.registerEndpoint,
      data: {
        'email': email,
        'password': password,
        if (firstName != null && firstName.isNotEmpty) 'firstName': firstName,
        if (lastName != null && lastName.isNotEmpty) 'lastName': lastName,
      },
    );
    return AuthResponseModel.fromJson(response.data!);
  }

}
```

**Nota:** `RemoteAuthDatasource` no necesita un método `updateProfile` — `AuthRepositoryImpl.updateProfile()` llama `_dio.patch` directamente porque el endpoint devuelve 204 (sin cuerpo) y la reconstitución del `UserEntity` con los nuevos valores se hace en el repositorio combinando el stored user con los nuevos campos.

- [ ] **Step 2: Actualizar IAuthRepository**

Reemplazar el contenido de `zarza_ai/lib/domain/repositories/i_auth_repository.dart`:

```dart
import '../entities/auth_result_entity.dart';
import '../entities/user_entity.dart';

abstract class IAuthRepository {
  Future<AuthResultEntity> login({
    required String email,
    required String password,
  });

  Future<AuthResultEntity> register({
    required String email,
    required String password,
    String? firstName,
    String? lastName,
  });

  Future<void> logout();

  Future<String?> getStoredToken();

  Future<UserEntity?> getStoredUser();

  /// Actualiza el nombre del usuario en el backend y en el almacenamiento local.
  /// Retorna el [UserEntity] actualizado.
  Future<UserEntity> updateProfile({
    String? firstName,
    String? lastName,
  });
}
```

- [ ] **Step 3: Actualizar AuthRepositoryImpl**

Reemplazar el contenido de `zarza_ai/lib/data/repositories/auth_repository_impl.dart`:

```dart
import 'package:dio/dio.dart';

import '../../core/constants/app_constants.dart';
import '../../domain/entities/auth_result_entity.dart';
import '../../domain/entities/user_entity.dart';
import '../../domain/repositories/i_auth_repository.dart';
import '../datasources/local_auth_datasource.dart';
import '../datasources/remote_auth_datasource.dart';

class AuthRepositoryImpl implements IAuthRepository {
  AuthRepositoryImpl({
    required RemoteAuthDatasource remote,
    required LocalAuthDatasource local,
    required Dio dio,
  })  : _remote = remote,
        _local = local,
        _dio = dio;

  final RemoteAuthDatasource _remote;
  final LocalAuthDatasource _local;
  final Dio _dio;

  @override
  Future<AuthResultEntity> login({
    required String email,
    required String password,
  }) async {
    final model = await _remote.login(email: email, password: password);
    final entity = model.toEntity();
    await _local.saveToken(entity.token);
    await _local.saveUser(entity.user);
    return entity;
  }

  @override
  Future<AuthResultEntity> register({
    required String email,
    required String password,
    String? firstName,
    String? lastName,
  }) async {
    final model = await _remote.register(
      email: email,
      password: password,
      firstName: firstName,
      lastName: lastName,
    );
    final entity = model.toEntity();
    await _local.saveToken(entity.token);
    await _local.saveUser(entity.user);
    return entity;
  }

  @override
  Future<void> logout() => _local.clearAll();

  @override
  Future<String?> getStoredToken() => _local.getToken();

  @override
  Future<UserEntity?> getStoredUser() => _local.getUser();

  @override
  Future<UserEntity> updateProfile({
    String? firstName,
    String? lastName,
  }) async {
    await _dio.patch<void>(
      '${AppConstants.baseUrl}/auth/profile',
      data: {
        if (firstName != null) 'firstName': firstName,
        if (lastName != null) 'lastName': lastName,
      },
    );
    // Reconstruir UserEntity combinando el stored user con los nuevos valores
    final stored = await _local.getUser();
    final updated = UserEntity(
      id: stored!.id,
      email: stored.email,
      role: stored.role,
      firstName: firstName ?? stored.firstName,
      lastName: lastName ?? stored.lastName,
    );
    await _local.saveUser(updated);
    return updated;
  }
}
```

- [ ] **Step 4: Actualizar el registro en service_locator para pasar Dio**

En `zarza_ai/lib/core/di/service_locator.dart`, localizar la línea que registra `IAuthRepository` (~línea 117) y cambiarla:

```dart
  sl.registerLazySingleton<IAuthRepository>(
    () => AuthRepositoryImpl(
      remote: sl<RemoteAuthDatasource>(),
      local: sl<LocalAuthDatasource>(),
      dio: sl<Dio>(),
    ),
  );
```

- [ ] **Step 5: Verificar compilación**

```bash
cd zarza_ai && flutter analyze lib/data/ lib/domain/repositories/
```

Resultado esperado: `No issues found!`

- [ ] **Step 6: Commit**

```bash
git add zarza_ai/lib/data/datasources/remote_auth_datasource.dart \
        zarza_ai/lib/domain/repositories/i_auth_repository.dart \
        zarza_ai/lib/data/repositories/auth_repository_impl.dart \
        zarza_ai/lib/core/di/service_locator.dart
git commit -m "feat(auth): add name params to register and updateProfile to auth repo"
```

---

## Task 11: Flutter — UseCases

**Files:**
- Modify: `zarza_ai/lib/domain/usecases/register_usecase.dart`
- Create: `zarza_ai/lib/domain/usecases/update_profile_usecase.dart`

- [ ] **Step 1: Actualizar RegisterUseCase**

Reemplazar el contenido de `zarza_ai/lib/domain/usecases/register_usecase.dart`:

```dart
import '../entities/auth_result_entity.dart';
import '../repositories/i_auth_repository.dart';

class RegisterUseCase {
  const RegisterUseCase(this._repository);
  final IAuthRepository _repository;

  Future<AuthResultEntity> call({
    required String email,
    required String password,
    String? firstName,
    String? lastName,
  }) {
    return _repository.register(
      email: email,
      password: password,
      firstName: firstName,
      lastName: lastName,
    );
  }
}
```

- [ ] **Step 2: Crear UpdateProfileUseCase**

Crear `zarza_ai/lib/domain/usecases/update_profile_usecase.dart`:

```dart
import '../entities/user_entity.dart';
import '../repositories/i_auth_repository.dart';

class UpdateProfileUseCase {
  const UpdateProfileUseCase(this._repository);
  final IAuthRepository _repository;

  Future<UserEntity> call({
    String? firstName,
    String? lastName,
  }) {
    return _repository.updateProfile(
      firstName: firstName,
      lastName: lastName,
    );
  }
}
```

- [ ] **Step 3: Verificar compilación**

```bash
cd zarza_ai && flutter analyze lib/domain/usecases/
```

Resultado esperado: `No issues found!`

- [ ] **Step 4: Commit**

```bash
git add zarza_ai/lib/domain/usecases/register_usecase.dart \
        zarza_ai/lib/domain/usecases/update_profile_usecase.dart
git commit -m "feat(auth): forward name fields in RegisterUseCase, add UpdateProfileUseCase"
```

---

## Task 12: Flutter — AuthCubit

**Files:**
- Modify: `zarza_ai/lib/core/auth/auth_cubit.dart`

- [ ] **Step 1: Reemplazar el contenido**

```dart
import 'dart:developer' as developer;
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:get_it/get_it.dart';

import '../../core/services/fcm_service.dart';
import '../../domain/usecases/get_current_user_usecase.dart';
import '../../domain/usecases/login_usecase.dart';
import '../../domain/usecases/logout_usecase.dart';
import '../../domain/usecases/register_usecase.dart';
import '../../domain/usecases/update_profile_usecase.dart';
import 'auth_state.dart';

class AuthCubit extends Cubit<AuthState> {
  AuthCubit({
    required LoginUseCase loginUseCase,
    required RegisterUseCase registerUseCase,
    required LogoutUseCase logoutUseCase,
    required GetCurrentUserUseCase getCurrentUserUseCase,
    required UpdateProfileUseCase updateProfileUseCase,
  })  : _login = loginUseCase,
        _register = registerUseCase,
        _logout = logoutUseCase,
        _getCurrentUser = getCurrentUserUseCase,
        _updateProfile = updateProfileUseCase,
        super(const AuthInitial());

  final LoginUseCase _login;
  final RegisterUseCase _register;
  final LogoutUseCase _logout;
  final GetCurrentUserUseCase _getCurrentUser;
  final UpdateProfileUseCase _updateProfile;

  Future<void> checkSession() async {
    emit(const AuthLoading());
    try {
      final user = await _getCurrentUser();
      if (user != null) {
        emit(AuthAuthenticated(user: user, token: ''));
      } else {
        emit(const AuthUnauthenticated());
      }
    } catch (_) {
      emit(const AuthUnauthenticated());
    }
  }

  Future<void> login({
    required String email,
    required String password,
  }) async {
    emit(const AuthLoading());
    try {
      final result = await _login(email: email, password: password);
      emit(AuthAuthenticated(user: result.user, token: result.token));
      GetIt.I<FcmService>().init().catchError((_) {});
    } on Exception catch (e, stack) {
      developer.log('[AuthCubit] login error', error: e, stackTrace: stack);
      emit(AuthError(_friendlyMessage(e)));
    } catch (e, stack) {
      developer.log('[AuthCubit] login unexpected error',
          error: e, stackTrace: stack);
      emit(AuthError('Error desconocido.'));
    }
  }

  Future<void> register({
    required String email,
    required String password,
    String? firstName,
    String? lastName,
  }) async {
    emit(const AuthLoading());
    try {
      final result = await _register(
        email: email,
        password: password,
        firstName: firstName,
        lastName: lastName,
      );
      emit(AuthAuthenticated(user: result.user, token: result.token));
      GetIt.I<FcmService>().init().catchError((_) {});
    } on Exception catch (e, stack) {
      developer.log('[AuthCubit] register error', error: e, stackTrace: stack);
      emit(AuthError(_friendlyMessage(e)));
    } catch (e, stack) {
      developer.log('[AuthCubit] register unexpected error',
          error: e, stackTrace: stack);
      emit(AuthError('Error desconocido.'));
    }
  }

  /// Actualiza el nombre en el backend y re-emite el estado autenticado.
  Future<void> updateProfile({
    String? firstName,
    String? lastName,
  }) async {
    final current = state;
    if (current is! AuthAuthenticated) return;
    try {
      final updated = await _updateProfile(
        firstName: firstName?.trim().isEmpty ?? true ? null : firstName!.trim(),
        lastName: lastName?.trim().isEmpty ?? true ? null : lastName!.trim(),
      );
      emit(AuthAuthenticated(user: updated, token: current.token));
    } on Exception catch (e, stack) {
      developer.log('[AuthCubit] updateProfile error',
          error: e, stackTrace: stack);
      // No cambia de estado; el error se muestra en la UI del ProfileEditScreen
      rethrow;
    }
  }

  Future<void> logout() async {
    await _logout();
    emit(const AuthUnauthenticated());
  }

  String _friendlyMessage(Exception e) {
    final msg = e.toString().toLowerCase();
    if (msg.contains('401') ||
        msg.contains('unauthorized') ||
        msg.contains('invalid')) {
      return 'Correo o contraseña incorrectos.';
    }
    if (msg.contains('400') || msg.contains('already exists')) {
      return 'El correo ya está registrado.';
    }
    if (msg.contains('timeout') || msg.contains('connection')) {
      return 'Sin conexión con el servidor. Verifica tu red.';
    }
    return 'Ocurrió un error. Intenta de nuevo.';
  }
}
```

- [ ] **Step 2: Verificar compilación**

```bash
cd zarza_ai && flutter analyze lib/core/auth/
```

Resultado esperado: `No issues found!`

- [ ] **Step 3: Commit**

```bash
git add zarza_ai/lib/core/auth/auth_cubit.dart
git commit -m "feat(auth): add name params to register and updateProfile method in AuthCubit"
```

---

## Task 13: Flutter — service_locator

**Files:**
- Modify: `zarza_ai/lib/core/di/service_locator.dart`

- [ ] **Step 1: Agregar import de UpdateProfileUseCase**

Agregar después de la línea que importa `get_current_user_usecase.dart` (~línea 41):

```dart
import '../../domain/usecases/update_profile_usecase.dart';
```

- [ ] **Step 2: Registrar UpdateProfileUseCase**

Agregar después del registro de `GetCurrentUserUseCase` (~línea 135):

```dart
  sl.registerLazySingleton<UpdateProfileUseCase>(
    () => UpdateProfileUseCase(sl<IAuthRepository>()),
  );
```

- [ ] **Step 3: Actualizar el registro de AuthCubit**

Localizar el bloque `sl.registerLazySingleton<AuthCubit>` (~línea 139) y agregar `updateProfileUseCase`:

```dart
  sl.registerLazySingleton<AuthCubit>(
    () => AuthCubit(
      loginUseCase: sl<LoginUseCase>(),
      registerUseCase: sl<RegisterUseCase>(),
      logoutUseCase: sl<LogoutUseCase>(),
      getCurrentUserUseCase: sl<GetCurrentUserUseCase>(),
      updateProfileUseCase: sl<UpdateProfileUseCase>(),
    ),
  );
```

- [ ] **Step 4: Verificar compilación completa**

```bash
cd zarza_ai && flutter analyze
```

Resultado esperado: `No issues found!`

- [ ] **Step 5: Commit**

```bash
git add zarza_ai/lib/core/di/service_locator.dart
git commit -m "feat(auth): register UpdateProfileUseCase and wire into AuthCubit"
```

---

## Task 14: Flutter — RegisterScreen

**Files:**
- Modify: `zarza_ai/lib/presentation/auth/register_screen.dart`

- [ ] **Step 1: Agregar controllers para nombre y apellido**

En `_RegisterScreenState`, agregar después de `_confirmCtrl`:

```dart
  final _firstNameCtrl = TextEditingController();
  final _lastNameCtrl = TextEditingController();
```

- [ ] **Step 2: Actualizar dispose()**

Agregar en el método `dispose()` antes de `super.dispose()`:

```dart
    _firstNameCtrl.dispose();
    _lastNameCtrl.dispose();
```

- [ ] **Step 3: Actualizar _submit() para pasar nombres**

Reemplazar el método `_submit()`:

```dart
  void _submit() {
    if (!_formKey.currentState!.validate()) return;
    context.read<AuthCubit>().register(
          email: _emailCtrl.text.trim(),
          password: _passwordCtrl.text,
          firstName: _firstNameCtrl.text.trim().isEmpty
              ? null
              : _firstNameCtrl.text.trim(),
          lastName: _lastNameCtrl.text.trim().isEmpty
              ? null
              : _lastNameCtrl.text.trim(),
        );
  }
```

- [ ] **Step 4: Agregar campos de nombre en el Form**

En el `Column` del `Form`, agregar los dos `AuthTextField` justo después del campo de email y antes del campo de contraseña:

```dart
                          const SizedBox(height: 16),
                          AuthTextField(
                            controller: _firstNameCtrl,
                            label: 'Nombre (opcional)',
                            icon: Icons.person_outline_rounded,
                            keyboardType: TextInputType.name,
                            validator: (_) => null,
                          ),
                          const SizedBox(height: 16),
                          AuthTextField(
                            controller: _lastNameCtrl,
                            label: 'Apellido (opcional)',
                            icon: Icons.person_outline_rounded,
                            keyboardType: TextInputType.name,
                            validator: (_) => null,
                          ),
```

Colocar esto entre el `SizedBox(height: 16)` que sigue al campo de email y el campo de contraseña.

- [ ] **Step 5: Verificar compilación**

```bash
cd zarza_ai && flutter analyze lib/presentation/auth/register_screen.dart
```

Resultado esperado: `No issues found!`

- [ ] **Step 6: Commit**

```bash
git add zarza_ai/lib/presentation/auth/register_screen.dart
git commit -m "feat(auth): add optional first/last name fields to register screen"
```

---

## Task 15: Flutter — ProfileEditScreen, Router y HomeScreen avatar

**Files:**
- Create: `zarza_ai/lib/presentation/profile/profile_edit_screen.dart`
- Modify: `zarza_ai/lib/core/router/app_router.dart`
- Modify: `zarza_ai/lib/presentation/home/home_screen.dart`

- [ ] **Step 1: Crear ProfileEditScreen**

Crear `zarza_ai/lib/presentation/profile/profile_edit_screen.dart`:

```dart
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:get_it/get_it.dart';

import '../../core/auth/auth_cubit.dart';
import '../../core/auth/auth_state.dart';
import '../../core/theme/app_theme.dart';

class ProfileEditScreen extends StatefulWidget {
  const ProfileEditScreen({super.key});

  @override
  State<ProfileEditScreen> createState() => _ProfileEditScreenState();
}

class _ProfileEditScreenState extends State<ProfileEditScreen> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _firstNameCtrl;
  late final TextEditingController _lastNameCtrl;
  bool _loading = false;

  @override
  void initState() {
    super.initState();
    final authState = GetIt.I<AuthCubit>().state;
    final user =
        authState is AuthAuthenticated ? authState.user : null;
    _firstNameCtrl =
        TextEditingController(text: user?.firstName ?? '');
    _lastNameCtrl =
        TextEditingController(text: user?.lastName ?? '');
  }

  @override
  void dispose() {
    _firstNameCtrl.dispose();
    _lastNameCtrl.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _loading = true);
    try {
      await GetIt.I<AuthCubit>().updateProfile(
        firstName: _firstNameCtrl.text.trim().isEmpty
            ? null
            : _firstNameCtrl.text.trim(),
        lastName: _lastNameCtrl.text.trim().isEmpty
            ? null
            : _lastNameCtrl.text.trim(),
      );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Perfil actualizado'),
            backgroundColor: AppTheme.emerald,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Error al guardar. Intenta de nuevo.'),
            backgroundColor: AppTheme.danger,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text(
          'Mi Perfil',
          style: TextStyle(fontFamily: 'Lexend', fontWeight: FontWeight.w600),
        ),
      ),
      body: BlocListener<AuthCubit, AuthState>(
        listener: (ctx, state) {
          // Sincronizar campos si el estado cambia externamente
        },
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Nombre',
                  style: TextStyle(
                    fontSize: 12,
                    color: AppTheme.dataGray,
                    fontFamily: 'Lexend',
                  ),
                ),
                const SizedBox(height: 8),
                TextFormField(
                  controller: _firstNameCtrl,
                  keyboardType: TextInputType.name,
                  textCapitalization: TextCapitalization.words,
                  style: const TextStyle(
                    fontFamily: 'Lexend',
                    color: AppTheme.frost,
                  ),
                  decoration: InputDecoration(
                    hintText: 'Tu nombre',
                    hintStyle:
                        const TextStyle(color: AppTheme.dataGray),
                    filled: true,
                    fillColor: Colors.white.withValues(alpha: 0.05),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: BorderSide(
                          color: Colors.white.withValues(alpha: 0.1)),
                    ),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: BorderSide(
                          color: Colors.white.withValues(alpha: 0.1)),
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide:
                          const BorderSide(color: AppTheme.rubus),
                    ),
                  ),
                ),
                const SizedBox(height: 20),
                const Text(
                  'Apellido',
                  style: TextStyle(
                    fontSize: 12,
                    color: AppTheme.dataGray,
                    fontFamily: 'Lexend',
                  ),
                ),
                const SizedBox(height: 8),
                TextFormField(
                  controller: _lastNameCtrl,
                  keyboardType: TextInputType.name,
                  textCapitalization: TextCapitalization.words,
                  style: const TextStyle(
                    fontFamily: 'Lexend',
                    color: AppTheme.frost,
                  ),
                  decoration: InputDecoration(
                    hintText: 'Tu apellido',
                    hintStyle:
                        const TextStyle(color: AppTheme.dataGray),
                    filled: true,
                    fillColor: Colors.white.withValues(alpha: 0.05),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: BorderSide(
                          color: Colors.white.withValues(alpha: 0.1)),
                    ),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: BorderSide(
                          color: Colors.white.withValues(alpha: 0.1)),
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide:
                          const BorderSide(color: AppTheme.rubus),
                    ),
                  ),
                ),
                const SizedBox(height: 32),
                SizedBox(
                  width: double.infinity,
                  height: 52,
                  child: ElevatedButton(
                    onPressed: _loading ? null : _save,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppTheme.rubus,
                      foregroundColor: Colors.white,
                      disabledBackgroundColor:
                          AppTheme.rubus.withValues(alpha: 0.4),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(14),
                      ),
                    ),
                    child: _loading
                        ? const SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: Colors.white,
                            ),
                          )
                        : const Text(
                            'Guardar',
                            style: TextStyle(
                              fontFamily: 'Lexend',
                              fontWeight: FontWeight.w600,
                              fontSize: 15,
                            ),
                          ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
```

- [ ] **Step 2: Agregar la ruta /profile en app_router.dart**

En `zarza_ai/lib/core/router/app_router.dart`, agregar el import al inicio:

```dart
import '../../presentation/profile/profile_edit_screen.dart';
```

Dentro del `ShellRoute` de rutas móviles (dentro del bloque `routes:` del primer `ShellRoute`), agregar la ruta `/profile` junto a las otras rutas del shell:

```dart
          GoRoute(
            path: '/profile',
            builder: (context, state) => const ProfileEditScreen(),
          ),
```

Colocarla después del `GoRoute` de `/history`.

- [ ] **Step 3: Actualizar HomeScreen — usar displayName y hacer tap en avatar**

En `zarza_ai/lib/presentation/home/home_screen.dart`, localizar la función build de `HomeScreen` (~línea 59):

```dart
    final userName = authState is AuthAuthenticated
        ? authState.user.email.split('@').first
        : '';
```

Cambiar por:

```dart
    final user = authState is AuthAuthenticated ? authState.user : null;
    final userName = user?.displayName ?? '';
```

Luego en `_AppDrawer`, actualizar el constructor call en la línea `drawer: _AppDrawer(userName: userName)` — no cambia.

En la clase `_UserGreeting`, localizar el widget `Container` del avatar circular (~línea 205). Envolver el `Container` existente en un `GestureDetector`:

```dart
          GestureDetector(
            onTap: () => context.push('/profile'),
            child: Container(
              width: 40,
              height: 40,
              decoration: const BoxDecoration(
                gradient: LinearGradient(
                  colors: [Color(0xFF3D006A), AppTheme.rubus],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                shape: BoxShape.circle,
              ),
              child: Center(
                child: Text(
                  userName.isNotEmpty ? userName[0].toUpperCase() : 'U',
                  style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                    color: Colors.white,
                    fontFamily: 'Lexend',
                  ),
                ),
              ),
            ),
          ),
```

- [ ] **Step 4: Verificar compilación completa**

```bash
cd zarza_ai && flutter analyze
```

Resultado esperado: `No issues found!`

- [ ] **Step 5: Commit final**

```bash
git add zarza_ai/lib/presentation/profile/ \
        zarza_ai/lib/core/router/app_router.dart \
        zarza_ai/lib/presentation/home/home_screen.dart
git commit -m "feat(profile): add ProfileEditScreen, /profile route, and avatar tap on home"
```

---

## Verificación end-to-end

- [ ] Levantar el stack: `docker compose up --build`
- [ ] Registrar usuario nuevo con nombre y apellido → verificar que el greeting muestra el nombre en home
- [ ] Tocar el avatar en home → abre ProfileEditScreen con los campos pre-llenados
- [ ] Editar nombre → guardar → volver a home → el greeting debe reflejar el cambio
- [ ] Las cards de análisis deben mostrar la fecha relativa (ej. "hace 2h") y la fecha exacta (ej. "6 de marzo · 06:11")
- [ ] Cerrar sesión y volver a iniciar → el nombre persiste (viene del backend en el login response)
