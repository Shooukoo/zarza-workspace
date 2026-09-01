# Autogestión de Cuenta/Perfil Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dar autogestión de cuenta a cualquier usuario autenticado de `zarza-web`: una página `/perfil` (editar nombre/apellido, cambiar contraseña propia con revocación de otras sesiones) y una política de contraseña fuerte compartida (longitud + composición + score `zxcvbn`) aplicada en los tres flujos que fijan una contraseña — alta por admin, reseteo por admin, y el cambio propio nuevo.

**Architecture:** Backend (`fruit-backend`, Clean Architecture existente en `auth/`): un validador `class-validator` compartido (`@IsStrongPassword()`) reemplaza las reglas `@MinLength` dispersas e inconsistentes; un método nuevo `AuthService.changePassword()` valida la contraseña actual, actualiza el hash vía una extensión del puerto `IUserRepository`, y revoca sesiones vía una extensión de `IRefreshTokenRepository`. Frontend (`zarza-web`): una función pura `evaluatePassword()` y un componente `PasswordStrengthMeter` en `shared/`, reutilizados por la nueva página `perfil/ProfilePage.tsx` y por los formularios de admin (`CreateUserModal`, `UserDrawer`) que hoy fijan contraseñas de otros usuarios.

**Tech Stack:** NestJS 11 + Fastify + class-validator + Prisma (`fruit-backend`), React 18 + antd 5 + react-query (`zarza-web`), `@zxcvbn-ts/core` + `@zxcvbn-ts/language-common` + `@zxcvbn-ts/language-es-es` (nuevo en ambos paquetes) para el score de fortaleza.

**Spec:** [[2026-08-31-autogestion-perfil-design]]

---

## Notas de implementación (decisiones tomadas al escribir este plan, no en el spec)

- **Versiones exactas de zxcvbn-ts** (verificadas contra el registro de npm): `@zxcvbn-ts/core@4.2.0`, `@zxcvbn-ts/language-common@4.1.3`, `@zxcvbn-ts/language-es-es@4.1.2` — el paquete de español se llama `language-es-es`, no `language-es` (ese nombre no existe en npm).
- **API real de `@zxcvbn-ts/core@4.2.0`**: no exporta `zxcvbn`/`zxcvbnOptions` como funciones sueltas (eso era la API de v2/v3). Se usa la clase `ZxcvbnFactory`: `new ZxcvbnFactory({ dictionary, graphs, translations })`, y luego `instance.check(password, userInputs?)` (síncrono) devuelve `{ score: 0|1|2|3|4, ... }`.
- **Status code del endpoint nuevo:** el spec proponía `200 OK`, pero los otros dos endpoints de autogestión ya existentes en `auth.controller.ts` (`PATCH profile`, `PATCH fcm-token`) devuelven `204 No Content` sin body. Este plan sigue esa convención ya establecida en el archivo que se está modificando: `PATCH auth/password` devuelve `204`.
- **Puntajes reales de zxcvbn verificados** (con las tres dependencias exactas de arriba, para que los tests del plan no describan un comportamiento no verificado):
  - `"Passw0rd!1"` (10 caracteres, 4 tipos, cumple composición) → `score: 1` — ejemplo real de "cumple composición pero es adivinable" (patrón "password" + l33t).
  - `"aB1!aB1!aB"` (10 caracteres, 4 tipos) → `score: 2` — caso límite que sí pasa (score mínimo aceptado).
  - `"Tr0pic@lBerry9"` → `score: 4` — ejemplo de contraseña fuerte real.
- Los DTOs `CreateUserDto` y `UpdatePasswordDto` en `admin.controller.ts` están declarados como `class` sin `export` (no son importables desde un archivo de test aparte). Este plan les agrega `export` en la Tarea 10 — cambio aditivo, no rompe nada — para poder testear su validación con `class-validator` `validate()`, como pide el spec.
- `fruit-backend/src/auth/domain/entities/user.entity.ts` ya tiene un método `withUpdatedPassword(newHash): User` sin ningún uso hoy en el repo (aparentemente dejado ahí anticipando este proyecto). Se usa en la Tarea 5 para `InMemoryUserRepository.updatePassword()`.
- `packages/database/prisma/schema.prisma` — el modelo `RefreshToken` ya tiene `@@index([userId])` (línea 284): **no hace falta ninguna migración de Prisma** para `revokeAllByUserId`.

---

## Tarea 1: Dependencias de `zxcvbn-ts` en `fruit-backend`

**Files:**
- Modify: `fruit-backend/package.json`

- [ ] **Paso 1: Instalar las dependencias**

```bash
cd fruit-backend
pnpm add @zxcvbn-ts/core@4.2.0 @zxcvbn-ts/language-common@4.1.3 @zxcvbn-ts/language-es-es@4.1.2
```

- [ ] **Paso 2: Verificar que quedaron en `dependencies` (no `devDependencies`)**

Abrir `fruit-backend/package.json` y confirmar que las tres líneas aparecen bajo `"dependencies"` (se usan en runtime, no solo en tests).

- [ ] **Paso 3: Commit**

```bash
git add fruit-backend/package.json fruit-backend/pnpm-lock.yaml
git commit -m "chore(fruit-backend): agregar dependencias de zxcvbn-ts"
```

---

## Tarea 2: `password-policy.ts` — lógica pura de política de contraseña (backend)

**Files:**
- Create: `fruit-backend/src/common/validators/password-policy.ts`
- Test: `fruit-backend/src/common/validators/password-policy.spec.ts`

- [ ] **Paso 1: Escribir el test que falla**

```typescript
// fruit-backend/src/common/validators/password-policy.spec.ts
import { isStrongPassword, MIN_LENGTH, MIN_TYPES, MIN_SCORE } from './password-policy';

describe('isStrongPassword', () => {
  it('rechaza contraseñas más cortas que el mínimo', () => {
    expect(isStrongPassword('Ab1!Ab1!')).toBe(false); // 8 chars, < MIN_LENGTH (10)
  });

  it('rechaza contraseñas que no cumplen al menos 3 de 4 tipos', () => {
    // Solo minúsculas y números (2 tipos), 12 caracteres
    expect(isStrongPassword('abcdefghij12')).toBe(false);
  });

  it('rechaza una contraseña que cumple longitud y composición pero es adivinable (score bajo)', () => {
    // 10 caracteres, 4 tipos (mayúscula, minúscula, número, símbolo) — pero es "password"
    // con sustituciones l33t obvias; zxcvbn real le da score 1.
    expect(isStrongPassword('Passw0rd!1')).toBe(false);
  });

  it('acepta una contraseña en el límite exacto de score aceptable (score 2)', () => {
    expect(isStrongPassword('aB1!aB1!aB')).toBe(true);
  });

  it('acepta una contraseña fuerte real', () => {
    expect(isStrongPassword('Tr0pic@lBerry9')).toBe(true);
  });

  it('expone las constantes de la política', () => {
    expect(MIN_LENGTH).toBe(10);
    expect(MIN_TYPES).toBe(3);
    expect(MIN_SCORE).toBe(2);
  });
});
```

- [ ] **Paso 2: Correr el test y verificar que falla**

Run: `cd fruit-backend && pnpm exec jest common/validators/password-policy.spec.ts`
Expected: FAIL — `Cannot find module './password-policy'`

- [ ] **Paso 3: Implementar `password-policy.ts`**

```typescript
// fruit-backend/src/common/validators/password-policy.ts
import { ZxcvbnFactory } from '@zxcvbn-ts/core';
import * as zxcvbnCommonPackage from '@zxcvbn-ts/language-common';
import * as zxcvbnEsEsPackage from '@zxcvbn-ts/language-es-es';

const zxcvbnInstance = new ZxcvbnFactory({
  dictionary: {
    ...zxcvbnCommonPackage.dictionary,
    ...zxcvbnEsEsPackage.dictionary,
  },
  graphs: zxcvbnCommonPackage.adjacencyGraphs,
  translations: zxcvbnEsEsPackage.translations,
});

export const MIN_LENGTH = 10;
export const MIN_TYPES = 3;
export const MIN_SCORE = 2;

export function isStrongPassword(password: string): boolean {
  if (typeof password !== 'string' || password.length === 0) return false;

  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSymbol = /[^A-Za-z0-9]/.test(password);
  const typesCount = [hasUpper, hasLower, hasNumber, hasSymbol].filter(
    Boolean,
  ).length;

  const meetsComposition = password.length >= MIN_LENGTH && typesCount >= MIN_TYPES;
  if (!meetsComposition) return false;

  const result = zxcvbnInstance.check(password);
  return result.score >= MIN_SCORE;
}
```

- [ ] **Paso 4: Correr el test y verificar que pasa**

Run: `cd fruit-backend && pnpm exec jest common/validators/password-policy.spec.ts`
Expected: PASS (5 tests)

- [ ] **Paso 5: Commit**

```bash
git add fruit-backend/src/common/validators/password-policy.ts fruit-backend/src/common/validators/password-policy.spec.ts
git commit -m "feat(fruit-backend): agregar lógica de política de contraseña fuerte"
```

---

## Tarea 3: `@IsStrongPassword()` — decorador de `class-validator` (backend)

**Files:**
- Create: `fruit-backend/src/common/validators/is-strong-password.validator.ts`
- Test: `fruit-backend/src/common/validators/is-strong-password.validator.spec.ts`

- [ ] **Paso 1: Escribir el test que falla**

```typescript
// fruit-backend/src/common/validators/is-strong-password.validator.spec.ts
import { validate } from 'class-validator';
import { IsStrongPassword } from './is-strong-password.validator';

class TestDto {
  @IsStrongPassword()
  password: string;
}

describe('@IsStrongPassword()', () => {
  it('no reporta errores para una contraseña fuerte', async () => {
    const dto = new TestDto();
    dto.password = 'Tr0pic@lBerry9';

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('reporta un error con mensaje descriptivo para una contraseña débil', async () => {
    const dto = new TestDto();
    dto.password = 'abc123';

    const errors = await validate(dto);

    expect(errors).toHaveLength(1);
    expect(errors[0].constraints?.isStrongPassword).toContain('10 caracteres');
  });

  it('reporta un error para una contraseña que cumple composición pero tiene score bajo', async () => {
    const dto = new TestDto();
    dto.password = 'Passw0rd!1';

    const errors = await validate(dto);

    expect(errors).toHaveLength(1);
  });
});
```

- [ ] **Paso 2: Correr el test y verificar que falla**

Run: `cd fruit-backend && pnpm exec jest common/validators/is-strong-password.validator.spec.ts`
Expected: FAIL — `Cannot find module './is-strong-password.validator'`

- [ ] **Paso 3: Implementar el decorador**

```typescript
// fruit-backend/src/common/validators/is-strong-password.validator.ts
import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';
import { isStrongPassword } from './password-policy';

const ERROR_MESSAGE =
  'La contraseña debe tener al menos 10 caracteres, incluir al menos 3 de: ' +
  'mayúscula, minúscula, número o símbolo, y no ser fácil de adivinar.';

export function IsStrongPassword(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string): void {
    registerDecorator({
      name: 'isStrongPassword',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown, _args: ValidationArguments): boolean {
          return typeof value === 'string' && isStrongPassword(value);
        },
        defaultMessage(_args: ValidationArguments): string {
          return ERROR_MESSAGE;
        },
      },
    });
  };
}
```

- [ ] **Paso 4: Correr el test y verificar que pasa**

Run: `cd fruit-backend && pnpm exec jest common/validators/is-strong-password.validator.spec.ts`
Expected: PASS (3 tests)

- [ ] **Paso 5: Commit**

```bash
git add fruit-backend/src/common/validators/is-strong-password.validator.ts fruit-backend/src/common/validators/is-strong-password.validator.spec.ts
git commit -m "feat(fruit-backend): agregar decorador @IsStrongPassword de class-validator"
```

---

## Tarea 4: Errores de dominio nuevos para el cambio de contraseña propio

**Files:**
- Modify: `fruit-backend/src/auth/domain/errors/auth.errors.ts`

- [ ] **Paso 1: Agregar las dos clases de error**

Agregar al final de `fruit-backend/src/auth/domain/errors/auth.errors.ts` (después de `UserNotFoundError`):

```typescript
export class InvalidCurrentPasswordError extends Error {
  constructor() {
    super('Current password is incorrect');
    this.name = 'InvalidCurrentPasswordError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class SamePasswordError extends Error {
  constructor() {
    super('New password must be different from the current password');
    this.name = 'SamePasswordError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
```

- [ ] **Paso 2: Verificar que compila**

Run: `cd fruit-backend && pnpm exec tsc --noEmit`
Expected: sin nuevos errores relacionados a `auth.errors.ts` (el proyecto tiene una base conocida de ~8 errores preexistentes de `tsc` sin relación a este módulo — no te bloquees en esos).

- [ ] **Paso 3: Commit**

```bash
git add fruit-backend/src/auth/domain/errors/auth.errors.ts
git commit -m "feat(fruit-backend): agregar errores de dominio para cambio de contraseña propio"
```

---

## Tarea 5: `IUserRepository.updatePassword()` — puerto + adaptadores

**Files:**
- Modify: `fruit-backend/src/auth/ports/user-repository.port.ts`
- Modify: `fruit-backend/src/auth/infrastructure/adapters/prisma-user.repository.ts`
- Modify: `fruit-backend/src/auth/infrastructure/adapters/in-memory-user.repository.ts`
- Modify: `fruit-backend/src/auth/infrastructure/adapters/prisma-user.repository.spec.ts`
- Modify: `fruit-backend/src/auth/application/auth.service.spec.ts` (agregar el stub al mock, sin usarlo todavía)

- [ ] **Paso 1: Escribir el test que falla para `PrismaUserRepository.updatePassword()`**

Agregar a `fruit-backend/src/auth/infrastructure/adapters/prisma-user.repository.spec.ts`, en un `describe` nuevo (el archivo ya tiene `mockPrisma.user` con `findUnique`/`update` — solo hace falta el describe nuevo, `update` ya está mockeado):

```typescript
  describe('updatePassword()', () => {
    it('actualiza passwordHash del usuario indicado', async () => {
      mockPrisma.user.update.mockResolvedValue({});

      await repo.updatePassword('user-1', 'new-hashed-value');

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { passwordHash: 'new-hashed-value' },
      });
    });
  });
```

- [ ] **Paso 2: Correr el test y verificar que falla**

Run: `cd fruit-backend && pnpm exec jest prisma-user.repository.spec.ts`
Expected: FAIL — `repo.updatePassword is not a function`

- [ ] **Paso 3: Extender el puerto `IUserRepository`**

En `fruit-backend/src/auth/ports/user-repository.port.ts`, agregar al final de la interfaz (después de `updateProfile`):

```typescript
  updatePassword(userId: string, hashedPassword: string): Promise<void>;
```

- [ ] **Paso 4: Implementar en `PrismaUserRepository`**

En `fruit-backend/src/auth/infrastructure/adapters/prisma-user.repository.ts`, agregar el método (después de `updateProfile`, antes de `toDomain`):

```typescript
  async updatePassword(userId: string, hashedPassword: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: hashedPassword },
    });
  }
```

- [ ] **Paso 5: Implementar en `InMemoryUserRepository`** (para que siga cumpliendo la interfaz)

En `fruit-backend/src/auth/infrastructure/adapters/in-memory-user.repository.ts`, agregar al final de la clase (después de `updateProfile`):

```typescript
  async updatePassword(userId: string, hashedPassword: string): Promise<void> {
    const idx = this.users.findIndex((u) => u.id === userId);
    if (idx !== -1) {
      this.users[idx] = this.users[idx].withUpdatedPassword(hashedPassword);
    }
  }
```

- [ ] **Paso 6: Agregar el stub al mock de `auth.service.spec.ts`** (para que siga compilando; no se usa todavía)

En `fruit-backend/src/auth/application/auth.service.spec.ts`, dentro de `mockUserRepo`, agregar una línea:

```typescript
const mockUserRepo = {
  findByEmail: jest.fn(),
  save: jest.fn(),
  findById: jest.fn(),
  findUserById: jest.fn(),
  findFcmTokenById: jest.fn(),
  clearFcmToken: jest.fn(),
  saveFcmToken: jest.fn(),
  updateProfile: jest.fn(),
  updatePassword: jest.fn(),
};
```

- [ ] **Paso 7: Correr los tests y verificar que pasan**

Run: `cd fruit-backend && pnpm exec jest prisma-user.repository.spec.ts auth.service.spec.ts`
Expected: PASS (todos los tests existentes + el nuevo)

- [ ] **Paso 8: Commit**

```bash
git add fruit-backend/src/auth/ports/user-repository.port.ts \
        fruit-backend/src/auth/infrastructure/adapters/prisma-user.repository.ts \
        fruit-backend/src/auth/infrastructure/adapters/prisma-user.repository.spec.ts \
        fruit-backend/src/auth/infrastructure/adapters/in-memory-user.repository.ts \
        fruit-backend/src/auth/application/auth.service.spec.ts
git commit -m "feat(fruit-backend): agregar updatePassword al puerto IUserRepository"
```

---

## Tarea 6: `IRefreshTokenRepository.revokeAllByUserId()` — puerto + adaptador

**Files:**
- Modify: `fruit-backend/src/auth/ports/refresh-token-repository.port.ts`
- Modify: `fruit-backend/src/auth/infrastructure/adapters/prisma-refresh-token.repository.ts`
- Modify: `fruit-backend/src/auth/infrastructure/adapters/prisma-refresh-token.repository.spec.ts`
- Modify: `fruit-backend/src/auth/application/auth.service.spec.ts` (agregar el stub al mock)

- [ ] **Paso 1: Escribir los tests que fallan**

Agregar a `fruit-backend/src/auth/infrastructure/adapters/prisma-refresh-token.repository.spec.ts`, un `describe` nuevo antes de `deleteExpired()`:

```typescript
  describe('revokeAllByUserId()', () => {
    it('revoca todos los tokens activos del usuario cuando no se excluye ninguna familia', async () => {
      mockPrisma.refreshToken.updateMany.mockResolvedValue({ count: 2 });

      await repo.revokeAllByUserId('user-1');

      expect(mockPrisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', revokedAt: null },
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        data: { revokedAt: expect.any(Date) },
      });
    });

    it('excluye la familia indicada al revocar', async () => {
      mockPrisma.refreshToken.updateMany.mockResolvedValue({ count: 1 });

      await repo.revokeAllByUserId('user-1', 'family-actual');

      expect(mockPrisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          revokedAt: null,
          familyId: { not: 'family-actual' },
        },
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        data: { revokedAt: expect.any(Date) },
      });
    });
  });
```

- [ ] **Paso 2: Correr el test y verificar que falla**

Run: `cd fruit-backend && pnpm exec jest prisma-refresh-token.repository.spec.ts`
Expected: FAIL — `repo.revokeAllByUserId is not a function`

- [ ] **Paso 3: Extender el puerto `IRefreshTokenRepository`**

En `fruit-backend/src/auth/ports/refresh-token-repository.port.ts`, agregar antes de `deleteExpired(): Promise<number>;`:

```typescript
  revokeAllByUserId(userId: string, exceptFamilyId?: string): Promise<void>;
```

- [ ] **Paso 4: Implementar en `PrismaRefreshTokenRepository`**

En `fruit-backend/src/auth/infrastructure/adapters/prisma-refresh-token.repository.ts`, agregar el método (después de `revokeByFamilyId`, antes de `deleteExpired`):

```typescript
  async revokeAllByUserId(
    userId: string,
    exceptFamilyId?: string,
  ): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: {
        userId,
        revokedAt: null,
        ...(exceptFamilyId ? { familyId: { not: exceptFamilyId } } : {}),
      },
      data: { revokedAt: new Date() },
    });
  }
```

- [ ] **Paso 5: Agregar el stub al mock de `auth.service.spec.ts`**

En `fruit-backend/src/auth/application/auth.service.spec.ts`, dentro de `mockRefreshRepo`, agregar una línea:

```typescript
const mockRefreshRepo = {
  create: jest.fn(),
  findByTokenHash: jest.fn(),
  revokeByTokenHash: jest.fn(),
  revokeByFamilyId: jest.fn(),
  revokeAllByUserId: jest.fn(),
  deleteExpired: jest.fn(),
};
```

- [ ] **Paso 6: Correr los tests y verificar que pasan**

Run: `cd fruit-backend && pnpm exec jest prisma-refresh-token.repository.spec.ts auth.service.spec.ts`
Expected: PASS (todos los tests existentes + los 2 nuevos)

- [ ] **Paso 7: Commit**

```bash
git add fruit-backend/src/auth/ports/refresh-token-repository.port.ts \
        fruit-backend/src/auth/infrastructure/adapters/prisma-refresh-token.repository.ts \
        fruit-backend/src/auth/infrastructure/adapters/prisma-refresh-token.repository.spec.ts \
        fruit-backend/src/auth/application/auth.service.spec.ts
git commit -m "feat(fruit-backend): agregar revokeAllByUserId al puerto IRefreshTokenRepository"
```

---

## Tarea 7: `AuthService.changePassword()`

**Files:**
- Modify: `fruit-backend/src/auth/application/auth.service.ts`
- Modify: `fruit-backend/src/auth/application/auth.service.spec.ts`

- [ ] **Paso 1: Escribir los tests que fallan**

Agregar a `fruit-backend/src/auth/application/auth.service.spec.ts`, un `describe` nuevo antes del cierre del `describe('AuthService', ...)` (después de `getProfile()`), y actualizar el import del inicio del archivo:

```typescript
import {
  InvalidCredentialsError,
  InvalidCurrentPasswordError,
  SamePasswordError,
} from '../domain/errors/auth.errors';
```

```typescript
  describe('changePassword()', () => {
    it('cambia la contraseña y revoca las demás sesiones excluyendo la familia actual', async () => {
      const user = makeUser({ id: 'user-1' });
      mockUserRepo.findUserById.mockResolvedValue(user);
      mockHasher.compare
        .mockResolvedValueOnce(true) // currentPassword coincide
        .mockResolvedValueOnce(false); // newPassword no es igual a la actual
      mockHasher.hash.mockResolvedValue('new-hashed-value');
      mockRefreshRepo.findByTokenHash.mockResolvedValue({
        id: 'rt-1',
        tokenHash: 'hash-actual',
        userId: 'user-1',
        familyId: 'family-actual',
        expiresAt: new Date(Date.now() + 60_000),
        revokedAt: null,
      });

      await service.changePassword(
        'user-1',
        'old-password',
        'New-Strong-Pass9!',
        'raw-current-refresh-token',
      );

      expect(mockUserRepo.updatePassword).toHaveBeenCalledWith(
        'user-1',
        'new-hashed-value',
      );
      expect(mockRefreshRepo.revokeAllByUserId).toHaveBeenCalledWith(
        'user-1',
        'family-actual',
      );
    });

    it('revoca todas las sesiones sin excepción si no hay refresh token actual', async () => {
      const user = makeUser({ id: 'user-1' });
      mockUserRepo.findUserById.mockResolvedValue(user);
      mockHasher.compare.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
      mockHasher.hash.mockResolvedValue('new-hashed-value');

      await service.changePassword(
        'user-1',
        'old-password',
        'New-Strong-Pass9!',
        undefined,
      );

      expect(mockRefreshRepo.findByTokenHash).not.toHaveBeenCalled();
      expect(mockRefreshRepo.revokeAllByUserId).toHaveBeenCalledWith(
        'user-1',
        undefined,
      );
    });

    it('lanza InvalidCurrentPasswordError si la contraseña actual no coincide', async () => {
      const user = makeUser({ id: 'user-1' });
      mockUserRepo.findUserById.mockResolvedValue(user);
      mockHasher.compare.mockResolvedValueOnce(false);

      await expect(
        service.changePassword('user-1', 'wrong', 'New-Strong-Pass9!'),
      ).rejects.toThrow(InvalidCurrentPasswordError);
      expect(mockUserRepo.updatePassword).not.toHaveBeenCalled();
    });

    it('lanza SamePasswordError si la nueva contraseña es igual a la actual', async () => {
      const user = makeUser({ id: 'user-1' });
      mockUserRepo.findUserById.mockResolvedValue(user);
      mockHasher.compare.mockResolvedValueOnce(true).mockResolvedValueOnce(true);

      await expect(
        service.changePassword('user-1', 'same-pass', 'same-pass'),
      ).rejects.toThrow(SamePasswordError);
      expect(mockUserRepo.updatePassword).not.toHaveBeenCalled();
    });

    it('lanza 401 si el userId no corresponde a ningún usuario', async () => {
      mockUserRepo.findUserById.mockResolvedValue(null);

      await expect(
        service.changePassword('missing-id', 'x', 'y'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
```

- [ ] **Paso 2: Correr los tests y verificar que fallan**

Run: `cd fruit-backend && pnpm exec jest auth.service.spec.ts`
Expected: FAIL — `service.changePassword is not a function`

- [ ] **Paso 3: Implementar `changePassword()`**

En `fruit-backend/src/auth/application/auth.service.ts`, actualizar el import de errores:

```typescript
import {
  InvalidCredentialsError,
  InvalidCurrentPasswordError,
  SamePasswordError,
  UserAlreadyExistsError,
} from '../domain/errors/auth.errors';
```

Y agregar el método (después de `getProfile`, antes de los métodos privados `_generateRefreshToken`):

```typescript
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
    currentRawRefreshToken?: string,
  ): Promise<void> {
    const user = await this.userRepository.findUserById(userId);
    if (!user) throw new UnauthorizedException('Usuario no encontrado');

    const isCurrentValid = await this.hasher.compare(
      currentPassword,
      user.hashedPassword,
    );
    if (!isCurrentValid) throw new InvalidCurrentPasswordError();

    const isSameAsCurrent = await this.hasher.compare(
      newPassword,
      user.hashedPassword,
    );
    if (isSameAsCurrent) throw new SamePasswordError();

    const newHash = await this.hasher.hash(newPassword);
    await this.userRepository.updatePassword(userId, newHash);

    let exceptFamilyId: string | undefined;
    if (currentRawRefreshToken) {
      const record = await this.refreshTokenRepo.findByTokenHash(
        this._hashToken(currentRawRefreshToken),
      );
      exceptFamilyId = record?.familyId;
    }
    await this.refreshTokenRepo.revokeAllByUserId(userId, exceptFamilyId);
  }
```

- [ ] **Paso 4: Correr los tests y verificar que pasan**

Run: `cd fruit-backend && pnpm exec jest auth.service.spec.ts`
Expected: PASS (todos los tests existentes + los 5 nuevos)

- [ ] **Paso 5: Commit**

```bash
git add fruit-backend/src/auth/application/auth.service.ts fruit-backend/src/auth/application/auth.service.spec.ts
git commit -m "feat(fruit-backend): agregar AuthService.changePassword con revocación de sesiones"
```

---

## Tarea 8: `ChangePasswordDto` + endpoint `PATCH auth/password`

**Files:**
- Create: `fruit-backend/src/auth/infrastructure/http/dtos/change-password.dto.ts`
- Modify: `fruit-backend/src/auth/infrastructure/http/auth.controller.ts`

- [ ] **Paso 1: Crear el DTO**

```typescript
// fruit-backend/src/auth/infrastructure/http/dtos/change-password.dto.ts
import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { IsStrongPassword } from '../../../../common/validators/is-strong-password.validator';

export class ChangePasswordDto {
  @ApiProperty({
    description: 'Contraseña actual del usuario, para verificar identidad.',
    example: 'MiContraseñaActual1!',
  })
  @IsString()
  @IsNotEmpty()
  currentPassword!: string;

  @ApiProperty({
    description:
      'Nueva contraseña. Mínimo 10 caracteres, al menos 3 de: mayúscula, ' +
      'minúscula, número, símbolo, y no debe ser fácil de adivinar.',
    example: 'Tr0pic@lBerry9',
    minLength: 10,
  })
  @IsStrongPassword()
  newPassword!: string;
}
```

- [ ] **Paso 2: Verificar que compila**

Run: `cd fruit-backend && pnpm exec tsc --noEmit`
Expected: sin nuevos errores (más allá de la base conocida de ~8 preexistentes sin relación a este archivo).

- [ ] **Paso 3: Agregar el endpoint al controller**

En `fruit-backend/src/auth/infrastructure/http/auth.controller.ts`, agregar los imports:

```typescript
import { ChangePasswordDto } from './dtos/change-password.dto';
import {
  UserAlreadyExistsError,
  InvalidCredentialsError,
  InvalidCurrentPasswordError,
  SamePasswordError,
} from '../../domain/errors/auth.errors';
```

(reemplaza el import existente de `UserAlreadyExistsError, InvalidCredentialsError` por este, que agrega los dos errores nuevos).

Y agregar el endpoint (después de `updateProfile`, antes de `registerFcmToken`):

```typescript
  @Patch('password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  @Throttle({ auth: { limit: 5, ttl: 60000 } })
  @ApiBearerAuth()
  @ApiCookieAuth('access_token')
  @ApiOperation({
    summary: 'Cambiar contraseña propia',
    description:
      'Cambia la contraseña del usuario autenticado, validando la contraseña ' +
      'actual. Revoca todas las demás sesiones activas, preservando la sesión ' +
      'actual cuando se puede identificar por su cookie de refresh token.',
  })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Contraseña actualizada correctamente.',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description:
      'La contraseña actual no es correcta, la nueva no cumple la política, ' +
      'o es igual a la actual.',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Se requiere autenticación.',
  })
  async changePassword(
    @Req()
    req: FastifyRequest & {
      user?: { sub: string };
      cookies?: Record<string, string>;
    },
    @Body() dto: ChangePasswordDto,
  ) {
    try {
      const rawRefreshToken = req.cookies?.[REFRESH_COOKIE_NAME];
      await this.authService.changePassword(
        req.user!.sub,
        dto.currentPassword,
        dto.newPassword,
        rawRefreshToken,
      );
    } catch (error) {
      if (error instanceof InvalidCurrentPasswordError) {
        throw new BadRequestException('La contraseña actual no es correcta');
      }
      if (error instanceof SamePasswordError) {
        throw new BadRequestException(
          'La nueva contraseña debe ser distinta a la actual',
        );
      }
      throw error;
    }
  }
```

- [ ] **Paso 4: Verificar que compila y que el resto de tests de auth siguen pasando**

Run: `cd fruit-backend && pnpm exec tsc --noEmit && pnpm exec jest auth.service.spec.ts`
Expected: sin nuevos errores de compilación; tests en PASS.

- [ ] **Paso 5: Commit**

```bash
git add fruit-backend/src/auth/infrastructure/http/dtos/change-password.dto.ts \
        fruit-backend/src/auth/infrastructure/http/auth.controller.ts
git commit -m "feat(fruit-backend): agregar endpoint PATCH auth/password"
```

---

## Tarea 9: Unificar `RegisterDto.password` con la política nueva

**Files:**
- Modify: `fruit-backend/src/auth/infrastructure/http/dtos/register.dto.ts`
- Test: `fruit-backend/src/auth/infrastructure/http/dtos/register.dto.spec.ts`

- [ ] **Paso 1: Escribir el test que falla**

```typescript
// fruit-backend/src/auth/infrastructure/http/dtos/register.dto.spec.ts
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { RegisterDto } from './register.dto';

describe('RegisterDto', () => {
  it('rechaza una contraseña de 8 caracteres que antes pasaba (MinLength(8) legado)', async () => {
    const dto = plainToInstance(RegisterDto, {
      email: 'user@example.com',
      password: 'abcdefg1', // 8 chars, pasaba con la regla vieja @MinLength(8)
    });

    const errors = await validate(dto);

    expect(errors.some((e) => e.property === 'password')).toBe(true);
  });

  it('acepta una contraseña que cumple la nueva política', async () => {
    const dto = plainToInstance(RegisterDto, {
      email: 'user@example.com',
      password: 'Tr0pic@lBerry9',
    });

    const errors = await validate(dto);

    expect(errors.some((e) => e.property === 'password')).toBe(false);
  });
});
```

- [ ] **Paso 2: Correr el test y verificar que falla**

Run: `cd fruit-backend && pnpm exec jest register.dto.spec.ts`
Expected: FAIL — la contraseña de 8 caracteres hoy pasa la validación (`@MinLength(8)`), así que el primer test falla.

- [ ] **Paso 3: Reemplazar `@MinLength(8)` por `@IsStrongPassword()`**

En `fruit-backend/src/auth/infrastructure/http/dtos/register.dto.ts`, reemplazar:

```typescript
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
```

por:

```typescript
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { IsStrongPassword } from '../../../../common/validators/is-strong-password.validator';
```

Y reemplazar el campo `password`:

```typescript
  @ApiProperty({
    description:
      'Contraseña de usuario. Mínimo 10 caracteres, al menos 3 de: ' +
      'mayúscula, minúscula, número, símbolo, y no debe ser fácil de adivinar.',
    example: 'Tr0pic@lBerry9',
    minLength: 10,
    format: 'password',
  })
  @IsStrongPassword()
  password!: string;
```

- [ ] **Paso 4: Correr el test y verificar que pasa**

Run: `cd fruit-backend && pnpm exec jest register.dto.spec.ts`
Expected: PASS (2 tests)

- [ ] **Paso 5: Commit**

```bash
git add fruit-backend/src/auth/infrastructure/http/dtos/register.dto.ts \
        fruit-backend/src/auth/infrastructure/http/dtos/register.dto.spec.ts
git commit -m "fix(fruit-backend): unificar RegisterDto.password con la política de contraseña fuerte"
```

---

## Tarea 10: Unificar `CreateUserDto`/`UpdatePasswordDto` (admin) con la política nueva

**Files:**
- Modify: `fruit-backend/src/admin/admin.controller.ts`
- Test: `fruit-backend/src/admin/admin.controller.dto.spec.ts`

- [ ] **Paso 1: Exportar los DTOs afectados**

En `fruit-backend/src/admin/admin.controller.ts`, cambiar:

```typescript
class CreateUserDto {
```
a
```typescript
export class CreateUserDto {
```

y

```typescript
class UpdatePasswordDto {
```
a
```typescript
export class UpdatePasswordDto {
```

(cambio aditivo: `admin.controller.ts` sigue usándolas igual internamente; solo se vuelven importables desde otro archivo).

- [ ] **Paso 2: Escribir el test que falla**

```typescript
// fruit-backend/src/admin/admin.controller.dto.spec.ts
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateUserDto, UpdatePasswordDto } from './admin.controller';
import { Role } from '../auth/domain/enums/role.enum';

describe('CreateUserDto', () => {
  it('rechaza una contraseña de 6 caracteres que antes pasaba (MinLength(6) legado)', async () => {
    const dto = plainToInstance(CreateUserDto, {
      email: 'user@example.com',
      password: 'abc123', // 6 chars, pasaba con la regla vieja @MinLength(6)
      role: Role.MONITOR,
    });

    const errors = await validate(dto);

    expect(errors.some((e) => e.property === 'password')).toBe(true);
  });

  it('acepta una contraseña que cumple la nueva política', async () => {
    const dto = plainToInstance(CreateUserDto, {
      email: 'user@example.com',
      password: 'Tr0pic@lBerry9',
      role: Role.MONITOR,
    });

    const errors = await validate(dto);

    expect(errors.some((e) => e.property === 'password')).toBe(false);
  });
});

describe('UpdatePasswordDto', () => {
  it('rechaza una contraseña de 6 caracteres que antes pasaba (MinLength(6) legado)', async () => {
    const dto = plainToInstance(UpdatePasswordDto, { password: 'abc123' });

    const errors = await validate(dto);

    expect(errors.some((e) => e.property === 'password')).toBe(true);
  });

  it('acepta una contraseña que cumple la nueva política', async () => {
    const dto = plainToInstance(UpdatePasswordDto, {
      password: 'Tr0pic@lBerry9',
    });

    const errors = await validate(dto);

    expect(errors.some((e) => e.property === 'password')).toBe(false);
  });
});
```

- [ ] **Paso 3: Correr el test y verificar que falla**

Run: `cd fruit-backend && pnpm exec jest admin.controller.dto.spec.ts`
Expected: FAIL — ambas contraseñas de 6 caracteres hoy pasan (`@MinLength(6)`).

- [ ] **Paso 4: Reemplazar `@MinLength(6)` por `@IsStrongPassword()` en ambos DTOs**

En `fruit-backend/src/admin/admin.controller.ts`, actualizar el import de `class-validator` (quitar `MinLength`, que ya no se usa en ningún DTO de este archivo):

```typescript
import {
  IsEmail,
  IsEnum,
  IsString,
  IsOptional,
  IsArray,
  IsUUID,
} from 'class-validator';
```

Agregar el import del validador nuevo:

```typescript
import { IsStrongPassword } from '../common/validators/is-strong-password.validator';
```

En `CreateUserDto`, reemplazar el campo `password`:

```typescript
  @ApiProperty({
    description:
      'Contraseña de usuario. Mínimo 10 caracteres, al menos 3 de: ' +
      'mayúscula, minúscula, número, símbolo, y no debe ser fácil de adivinar.',
    example: 'Tr0pic@lBerry9',
    minLength: 10,
  })
  @IsStrongPassword()
  password: string;
```

En `UpdatePasswordDto`, reemplazar el campo `password`:

```typescript
export class UpdatePasswordDto {
  @ApiProperty({
    description:
      'Nueva contraseña para el usuario. Mínimo 10 caracteres, al menos 3 ' +
      'de: mayúscula, minúscula, número, símbolo, y no debe ser fácil de adivinar.',
    example: 'Tr0pic@lBerry9',
    minLength: 10,
  })
  @IsStrongPassword()
  password: string;
}
```

- [ ] **Paso 5: Correr el test y verificar que pasa**

Run: `cd fruit-backend && pnpm exec jest admin.controller.dto.spec.ts`
Expected: PASS (4 tests)

- [ ] **Paso 6: Correr toda la suite de `admin` y `auth` para verificar que nada se rompió**

Run: `cd fruit-backend && pnpm exec jest admin auth`
Expected: PASS (los patrones `admin`/`auth` matchean por substring todos los `.spec.ts` bajo `src/admin/` y `src/auth/`, consistente con `rootDir: "src"` del jest config)

- [ ] **Paso 7: Commit**

```bash
git add fruit-backend/src/admin/admin.controller.ts fruit-backend/src/admin/admin.controller.dto.spec.ts
git commit -m "fix(fruit-backend): unificar CreateUserDto/UpdatePasswordDto con la política de contraseña fuerte"
```

---

## Tarea 11: Dependencias de `zxcvbn-ts` en `zarza-web`

**Files:**
- Modify: `zarza-web/package.json`

- [ ] **Paso 1: Instalar las dependencias**

```bash
cd zarza-web
npm install @zxcvbn-ts/core@4.2.0 @zxcvbn-ts/language-common@4.1.3 @zxcvbn-ts/language-es-es@4.1.2
```

- [ ] **Paso 2: Commit**

```bash
git add zarza-web/package.json zarza-web/package-lock.json
git commit -m "chore(zarza-web): agregar dependencias de zxcvbn-ts"
```

---

## Tarea 12: `passwordPolicy.ts` — evaluación de contraseña (frontend)

**Files:**
- Create: `zarza-web/src/shared/passwordPolicy.ts`

> `zarza-web` no tiene framework de tests unitarios configurado en el repo (confirmado: sin `vitest`/`jest` en `package.json`) — esta tarea no lleva TDD, se verifica manualmente al integrar el componente en la Tarea 16 en adelante.

- [ ] **Paso 1: Crear el archivo**

```typescript
// zarza-web/src/shared/passwordPolicy.ts
import { ZxcvbnFactory } from '@zxcvbn-ts/core';
import * as zxcvbnCommonPackage from '@zxcvbn-ts/language-common';
import * as zxcvbnEsEsPackage from '@zxcvbn-ts/language-es-es';

const zxcvbnInstance = new ZxcvbnFactory({
  dictionary: {
    ...zxcvbnCommonPackage.dictionary,
    ...zxcvbnEsEsPackage.dictionary,
  },
  graphs: zxcvbnCommonPackage.adjacencyGraphs,
  translations: zxcvbnEsEsPackage.translations,
});

export const MIN_LENGTH = 10;
export const MIN_TYPES = 3;
export const MIN_SCORE = 2;

export interface PasswordEvaluation {
  hasMinLength: boolean;
  hasUpper: boolean;
  hasLower: boolean;
  hasNumber: boolean;
  hasSymbol: boolean;
  typesCount: number;
  meetsComposition: boolean;
  score: 0 | 1 | 2 | 3 | 4;
  meetsScore: boolean;
  valid: boolean;
}

export function evaluatePassword(
  password: string,
  userInputs: string[] = [],
): PasswordEvaluation {
  const hasMinLength = password.length >= MIN_LENGTH;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSymbol = /[^A-Za-z0-9]/.test(password);
  const typesCount = [hasUpper, hasLower, hasNumber, hasSymbol].filter(
    Boolean,
  ).length;
  const meetsComposition = hasMinLength && typesCount >= MIN_TYPES;

  const result = password ? zxcvbnInstance.check(password, userInputs) : null;
  const score = (result?.score ?? 0) as 0 | 1 | 2 | 3 | 4;
  const meetsScore = score >= MIN_SCORE;

  return {
    hasMinLength,
    hasUpper,
    hasLower,
    hasNumber,
    hasSymbol,
    typesCount,
    meetsComposition,
    score,
    meetsScore,
    valid: meetsComposition && meetsScore,
  };
}
```

- [ ] **Paso 2: Verificar que compila**

Run: `cd zarza-web && npx tsc -b --noEmit`
Expected: sin errores nuevos.

- [ ] **Paso 3: Commit**

```bash
git add zarza-web/src/shared/passwordPolicy.ts
git commit -m "feat(zarza-web): agregar evaluatePassword (política de contraseña + score zxcvbn)"
```

---

## Tarea 13: `PasswordStrengthMeter` — componente compartido

**Files:**
- Create: `zarza-web/src/shared/PasswordStrengthMeter.tsx`

- [ ] **Paso 1: Crear el componente**

```tsx
// zarza-web/src/shared/PasswordStrengthMeter.tsx
import { lightTheme } from './lightTheme';
import type { PasswordEvaluation } from './passwordPolicy';

const T = lightTheme;

const SCORE_COLOR: Record<number, string> = {
  0: T.danger,
  1: T.danger,
  2: T.warn,
  3: T.emerald,
  4: T.emerald,
};

const SCORE_LABEL: Record<number, string> = {
  0: 'Muy débil',
  1: 'Débil',
  2: 'Aceptable',
  3: 'Buena',
  4: 'Excelente',
};

const CRITERIA: { key: keyof PasswordEvaluation; label: string }[] = [
  { key: 'hasMinLength', label: 'Al menos 10 caracteres' },
  { key: 'hasUpper', label: 'Una mayúscula' },
  { key: 'hasLower', label: 'Una minúscula' },
  { key: 'hasNumber', label: 'Un número' },
  { key: 'hasSymbol', label: 'Un símbolo' },
];

interface Props {
  evaluation: PasswordEvaluation;
}

export function PasswordStrengthMeter({ evaluation }: Props) {
  return (
    <div style={{ marginTop: 4, marginBottom: 12 }}>
      <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            style={{
              height: 4,
              flex: 1,
              borderRadius: 2,
              background:
                i <= evaluation.score ? SCORE_COLOR[evaluation.score] : T.grayLine,
            }}
          />
        ))}
      </div>
      <div
        style={{ fontSize: 11, color: SCORE_COLOR[evaluation.score], marginBottom: 6 }}
      >
        {SCORE_LABEL[evaluation.score]}
        {!evaluation.meetsScore && ' — podría ser fácil de adivinar'}
      </div>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: 11 }}>
        {CRITERIA.map((c) => {
          const met = Boolean(evaluation[c.key]);
          return (
            <li key={c.key} style={{ color: met ? T.emerald : T.gray, marginBottom: 2 }}>
              {met ? '✓' : '✗'} {c.label}
            </li>
          );
        })}
        <li style={{ color: evaluation.typesCount >= 3 ? T.emerald : T.gray }}>
          {evaluation.typesCount >= 3 ? '✓' : '✗'} Al menos 3 de los 4 anteriores
        </li>
      </ul>
    </div>
  );
}
```

- [ ] **Paso 2: Verificar que compila**

Run: `cd zarza-web && npx tsc -b --noEmit`
Expected: sin errores nuevos.

- [ ] **Paso 3: Commit**

```bash
git add zarza-web/src/shared/PasswordStrengthMeter.tsx
git commit -m "feat(zarza-web): agregar componente PasswordStrengthMeter"
```

---

## Tarea 14: `AuthContext.refreshUser()`

**Files:**
- Modify: `zarza-web/src/auth/AuthContext.tsx`

- [ ] **Paso 1: Agregar `refreshUser` al contexto**

En `zarza-web/src/auth/AuthContext.tsx`, reemplazar la interfaz:

```typescript
interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}
```

Agregar la función (después de `logout`, antes del `return`):

```typescript
  async function refreshUser(): Promise<void> {
    const res = await apiClient.get<BackendUserProfile>('/auth/me');
    setUser(toAuthUser(res.data));
  }
```

Y actualizar el `Provider`:

```typescript
  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
```

- [ ] **Paso 2: Verificar que compila**

Run: `cd zarza-web && npx tsc -b --noEmit`
Expected: sin errores nuevos.

- [ ] **Paso 3: Commit**

```bash
git add zarza-web/src/auth/AuthContext.tsx
git commit -m "feat(zarza-web): agregar refreshUser al AuthContext"
```

---

## Tarea 15: `perfil/hooks/useProfile.ts`

**Files:**
- Create: `zarza-web/src/perfil/hooks/useProfile.ts`

- [ ] **Paso 1: Crear el archivo**

```typescript
// zarza-web/src/perfil/hooks/useProfile.ts
import { useMutation } from '@tanstack/react-query';
import { apiClient } from '../../api/client';

export function useUpdateOwnProfile() {
  return useMutation({
    mutationFn: (dto: { firstName?: string; lastName?: string }) =>
      apiClient.patch('/auth/profile', dto),
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (dto: { currentPassword: string; newPassword: string }) =>
      apiClient.patch('/auth/password', dto),
  });
}
```

- [ ] **Paso 2: Verificar que compila**

Run: `cd zarza-web && npx tsc -b --noEmit`
Expected: sin errores nuevos.

- [ ] **Paso 3: Commit**

```bash
git add zarza-web/src/perfil/hooks/useProfile.ts
git commit -m "feat(zarza-web): agregar hooks de perfil propio (useUpdateOwnProfile, useChangePassword)"
```

---

## Tarea 16: `perfil/ProfilePage.tsx`

**Files:**
- Create: `zarza-web/src/perfil/ProfilePage.tsx`

- [ ] **Paso 1: Crear la página**

```tsx
// zarza-web/src/perfil/ProfilePage.tsx
import type { CSSProperties } from 'react';
import { Button, Divider, Form, Input, Typography, notification } from 'antd';
import { useAuth } from '../auth/useAuth';
import { useChangePassword, useUpdateOwnProfile } from './hooks/useProfile';
import { PasswordStrengthMeter } from '../shared/PasswordStrengthMeter';
import { evaluatePassword } from '../shared/passwordPolicy';
import { lightTheme } from '../shared/lightTheme';

const T = lightTheme;
const { Title, Text } = Typography;

interface NameFormValues {
  firstName?: string;
  lastName?: string;
}

interface PasswordFormValues {
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
}

function sectionStyle(): CSSProperties {
  return {
    background: T.surface,
    borderRadius: 12,
    padding: 20,
    border: `1px solid ${T.grayLine}`,
  };
}

function sectionLabelStyle(): CSSProperties {
  return {
    color: T.brand,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  };
}

export function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const updateProfileMutation = useUpdateOwnProfile();
  const changePasswordMutation = useChangePassword();

  const [nameForm] = Form.useForm<NameFormValues>();
  const [passwordForm] = Form.useForm<PasswordFormValues>();
  const newPassword = Form.useWatch('newPassword', passwordForm);

  const userInputs = [user?.email, user?.firstName, user?.lastName].filter(
    (v): v is string => Boolean(v),
  );
  const passwordEvaluation = evaluatePassword(newPassword ?? '', userInputs);

  async function handleSaveName(values: NameFormValues) {
    try {
      await updateProfileMutation.mutateAsync(values);
      await refreshUser();
      notification.success({ message: 'Datos actualizados' });
    } catch {
      notification.error({ message: 'Error al actualizar los datos' });
    }
  }

  async function handleChangePassword(values: PasswordFormValues) {
    try {
      await changePasswordMutation.mutateAsync({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      notification.success({
        message: 'Contraseña actualizada',
        description: 'Se cerraron las demás sesiones activas.',
      });
      passwordForm.resetFields();
    } catch (err) {
      const backendMessage = (
        err as { response?: { data?: { message?: string | string[] } } }
      )?.response?.data?.message;
      const message = Array.isArray(backendMessage)
        ? backendMessage[0]
        : (backendMessage ?? 'Error al cambiar la contraseña');
      notification.error({ message });
    }
  }

  return (
    <div style={{ maxWidth: 480 }}>
      <Title level={4} style={{ color: T.ink }}>
        Mi perfil
      </Title>

      <div style={sectionStyle()}>
        <Text strong style={sectionLabelStyle()}>
          Datos personales
        </Text>
        <Form
          form={nameForm}
          layout="vertical"
          onFinish={handleSaveName}
          initialValues={{
            firstName: user?.firstName ?? '',
            lastName: user?.lastName ?? '',
          }}
          style={{ marginTop: 12 }}
        >
          <div style={{ display: 'flex', gap: 8 }}>
            <Form.Item name="firstName" label="Nombre" style={{ flex: 1 }}>
              <Input placeholder="Juan" />
            </Form.Item>
            <Form.Item name="lastName" label="Apellido" style={{ flex: 1 }}>
              <Input placeholder="García" />
            </Form.Item>
          </div>
          <Button
            htmlType="submit"
            type="primary"
            loading={updateProfileMutation.isPending}
          >
            Guardar datos
          </Button>
        </Form>
      </div>

      <Divider />

      <div style={sectionStyle()}>
        <Text strong style={sectionLabelStyle()}>
          Cambiar contraseña
        </Text>
        <Form
          form={passwordForm}
          layout="vertical"
          onFinish={handleChangePassword}
          style={{ marginTop: 12 }}
        >
          <Form.Item
            name="currentPassword"
            label="Contraseña actual"
            rules={[{ required: true, message: 'Ingresa tu contraseña actual' }]}
          >
            <Input.Password placeholder="••••••••••" />
          </Form.Item>

          <Form.Item
            name="newPassword"
            label="Nueva contraseña"
            rules={[
              { required: true, message: 'Ingresa la nueva contraseña' },
              {
                validator: async (_, value: string) => {
                  if (!value || evaluatePassword(value, userInputs).valid) {
                    return Promise.resolve();
                  }
                  return Promise.reject(
                    new Error('La contraseña no cumple los requisitos de seguridad'),
                  );
                },
              },
            ]}
          >
            <Input.Password placeholder="••••••••••" />
          </Form.Item>

          <PasswordStrengthMeter evaluation={passwordEvaluation} />

          <Form.Item
            name="confirmNewPassword"
            label="Confirmar nueva contraseña"
            dependencies={['newPassword']}
            rules={[
              { required: true, message: 'Repite la nueva contraseña' },
              ({ getFieldValue }) => ({
                validator(_, value: string) {
                  if (!value || value === getFieldValue('newPassword')) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('Las contraseñas no coinciden'));
                },
              }),
            ]}
          >
            <Input.Password placeholder="••••••••••" />
          </Form.Item>

          <Button
            htmlType="submit"
            type="primary"
            loading={changePasswordMutation.isPending}
            disabled={!passwordEvaluation.valid}
          >
            Cambiar contraseña
          </Button>
        </Form>
      </div>
    </div>
  );
}
```

- [ ] **Paso 2: Verificar que compila**

Run: `cd zarza-web && npx tsc -b --noEmit`
Expected: sin errores nuevos.

- [ ] **Paso 3: Commit**

```bash
git add zarza-web/src/perfil/ProfilePage.tsx
git commit -m "feat(zarza-web): agregar página de perfil propio (ProfilePage)"
```

---

## Tarea 17: Ruta `/perfil`

**Files:**
- Modify: `zarza-web/src/App.tsx`

- [ ] **Paso 1: Registrar la ruta**

En `zarza-web/src/App.tsx`, agregar el import:

```typescript
import { ProfilePage } from './perfil/ProfilePage';
```

Y agregar la ruta dentro de `<Route element={<AppShell />}>`, junto a `<Route path="/" element={<RootRedirect />} />` (sin `PrivateRoute` de rol adicional — cualquier usuario autenticado accede a su propio perfil):

```tsx
          <Route path="/" element={<RootRedirect />} />
          <Route path="/perfil" element={<ProfilePage />} />
```

- [ ] **Paso 2: Verificar que compila**

Run: `cd zarza-web && npx tsc -b --noEmit`
Expected: sin errores nuevos.

- [ ] **Paso 3: Commit**

```bash
git add zarza-web/src/App.tsx
git commit -m "feat(zarza-web): registrar ruta /perfil"
```

---

## Tarea 18: Ítem "Configuración" en el dropdown del avatar

**Files:**
- Modify: `zarza-web/src/shared/AppShell.tsx`

- [ ] **Paso 1: Agregar el import de `Link`** (ya está importado — `Link` viene de `react-router-dom` en la línea 2 del archivo, no requiere cambio de import)

- [ ] **Paso 2: Agregar el ítem al dropdown**

En `zarza-web/src/shared/AppShell.tsx`, dentro del `popupRender` de `TopBar`, agregar el ítem "Configuración" entre el header no interactivo y el botón "Cerrar sesión":

```tsx
            <div style={{ padding: '12px 14px', borderBottom: `1px solid ${T.grayLine}` }}>
              <div style={{
                fontSize: 12, fontWeight: 600, color: T.ink,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {user?.email ?? '—'}
              </div>
              <div style={{ fontSize: 10, color: T.gray, marginTop: 1 }}>
                {user ? ROLE_LABEL[user.role] : ''}
              </div>
            </div>
            <Link
              to="/perfil"
              role="menuitem"
              onClick={() => setMenuOpen(false)}
              style={{
                display: 'block', width: '100%', textAlign: 'left',
                padding: '10px 14px', fontSize: 13, color: T.ink, cursor: 'pointer',
                textDecoration: 'none',
              }}
            >
              Configuración
            </Link>
            <button
              type="button"
              role="menuitem"
              onClick={onLogout}
              style={{
                display: 'block', width: '100%', textAlign: 'left',
                padding: '10px 14px', fontSize: 13, color: T.danger, cursor: 'pointer',
                background: 'none', border: 'none', font: 'inherit',
              }}
            >
              Cerrar sesión
            </button>
```

(el `TopBar` ya tiene `setMenuOpen` en su estado local — se usa aquí para cerrar el dropdown al navegar, igual que ocurre implícitamente al hacer click en "Cerrar sesión", que desmonta el componente).

- [ ] **Paso 3: Verificar que compila**

Run: `cd zarza-web && npx tsc -b --noEmit`
Expected: sin errores nuevos.

- [ ] **Paso 4: Commit**

```bash
git add zarza-web/src/shared/AppShell.tsx
git commit -m "feat(zarza-web): agregar ítem Configuración al dropdown del avatar"
```

---

## Tarea 19: Integrar `PasswordStrengthMeter` en `CreateUserModal`

**Files:**
- Modify: `zarza-web/src/admin/CreateUserModal.tsx`

- [ ] **Paso 1: Actualizar el componente**

Reemplazar el contenido completo de `zarza-web/src/admin/CreateUserModal.tsx`:

```tsx
import { Modal, Form, Input, Select, notification } from 'antd';
import { useCreateUser } from './hooks/useUsers';
import { Role } from '../auth/types';
import { PasswordStrengthMeter } from '../shared/PasswordStrengthMeter';
import { evaluatePassword } from '../shared/passwordPolicy';

interface Props {
  open: boolean;
  onClose: () => void;
}

interface FormValues {
  email: string;
  password: string;
  role: Role;
  firstName?: string;
  lastName?: string;
}

const ROLE_OPTIONS = [
  { value: Role.PRODUCTOR, label: 'Productor' },
  { value: Role.AGRONOMO, label: 'Agrónomo' },
  { value: Role.MONITOR, label: 'Monitor' },
];

export function CreateUserModal({ open, onClose }: Props) {
  const [form] = Form.useForm<FormValues>();
  const createMutation = useCreateUser();

  const email = Form.useWatch('email', form);
  const password = Form.useWatch('password', form);
  const userInputs = [email].filter((v): v is string => Boolean(v));
  const passwordEvaluation = evaluatePassword(password ?? '', userInputs);

  async function onFinish(values: FormValues) {
    try {
      await createMutation.mutateAsync(values);
      notification.success({ message: 'Usuario creado exitosamente' });
      form.resetFields();
      onClose();
    } catch {
      notification.error({ message: 'Error al crear usuario' });
    }
  }

  return (
    <Modal
      title="Nuevo Usuario"
      open={open}
      onOk={form.submit}
      onCancel={() => {
        form.resetFields();
        onClose();
      }}
      confirmLoading={createMutation.isPending}
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        initialValues={{ role: Role.MONITOR }}
      >
        <div style={{ display: 'flex', gap: 12 }}>
          <Form.Item label="Nombre" name="firstName" style={{ flex: 1, marginBottom: 12 }}>
            <Input placeholder="Juan" />
          </Form.Item>
          <Form.Item label="Apellido" name="lastName" style={{ flex: 1, marginBottom: 12 }}>
            <Input placeholder="García" />
          </Form.Item>
        </div>

        <Form.Item
          label="Email"
          name="email"
          rules={[
            { required: true, message: 'Ingresa el email' },
            { type: 'email', message: 'Email inválido' },
          ]}
        >
          <Input placeholder="usuario@rubus.com" />
        </Form.Item>

        <Form.Item
          label="Contraseña"
          name="password"
          rules={[
            { required: true, message: 'Ingresa la contraseña' },
            {
              validator: async (_, value: string) => {
                if (!value || evaluatePassword(value, userInputs).valid) {
                  return Promise.resolve();
                }
                return Promise.reject(
                  new Error('La contraseña no cumple los requisitos de seguridad'),
                );
              },
            },
          ]}
        >
          <Input.Password />
        </Form.Item>

        <PasswordStrengthMeter evaluation={passwordEvaluation} />

        <Form.Item
          label="Rol"
          name="role"
          rules={[{ required: true, message: 'Selecciona un rol' }]}
        >
          <Select options={ROLE_OPTIONS} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
```

- [ ] **Paso 2: Verificar que compila**

Run: `cd zarza-web && npx tsc -b --noEmit`
Expected: sin errores nuevos.

- [ ] **Paso 3: Verificación manual en navegador**

Con el stack local corriendo (`docker compose up postgres rabbitmq redis` + `pnpm --filter fruit-backend run start:dev` + `cd zarza-web && npm run dev`), loguearse como ADMIN, ir a "Usuarios" → "Nuevo Usuario", y confirmar:
- El medidor de fortaleza aparece y se actualiza en vivo al escribir la contraseña.
- Una contraseña débil (ej. `abc123`) bloquea el submit con el mensaje de error.
- Una contraseña fuerte (ej. `Tr0pic@lBerry9`) permite crear el usuario.

- [ ] **Paso 4: Commit**

```bash
git add zarza-web/src/admin/CreateUserModal.tsx
git commit -m "feat(zarza-web): integrar PasswordStrengthMeter en CreateUserModal"
```

---

## Tarea 20: Integrar `PasswordStrengthMeter` en `UserDrawer`

**Files:**
- Modify: `zarza-web/src/admin/UserDrawer.tsx`

- [ ] **Paso 1: Agregar los imports**

En `zarza-web/src/admin/UserDrawer.tsx`, agregar:

```typescript
import { PasswordStrengthMeter } from '../shared/PasswordStrengthMeter';
import { evaluatePassword } from '../shared/passwordPolicy';
```

- [ ] **Paso 2: Observar el campo de contraseña y calcular la evaluación**

Dentro de `UserDrawer`, después de la declaración de `passwordForm`, agregar:

```typescript
  const watchedPassword = Form.useWatch('password', passwordForm);
  const passwordUserInputs = user?.email ? [user.email] : [];
  const passwordEvaluation = evaluatePassword(watchedPassword ?? '', passwordUserInputs);
```

- [ ] **Paso 3: Reemplazar la regla `{ min: 6 }` y agregar el medidor**

Reemplazar el bloque de la sección "④ Zona de riesgo" (el `Form.Item name="password"` y su botón):

```tsx
              <Form.Item
                name="password"
                label="Nueva contraseña"
                rules={[
                  { required: true, message: 'Ingresa la contraseña' },
                  {
                    validator: async (_, value: string) => {
                      if (!value || evaluatePassword(value, passwordUserInputs).valid) {
                        return Promise.resolve();
                      }
                      return Promise.reject(
                        new Error('La contraseña no cumple los requisitos de seguridad'),
                      );
                    },
                  },
                ]}
              >
                <Input.Password placeholder="••••••" />
              </Form.Item>
              <PasswordStrengthMeter evaluation={passwordEvaluation} />
              <Button
                htmlType="submit"
                block
                loading={updatePasswordMutation.isPending}
                style={{
                  marginBottom: 8,
                  borderColor: '#cf1322',
                  color: '#cf1322',
                }}
              >
                Guardar contraseña
              </Button>
```

- [ ] **Paso 4: Verificar que compila**

Run: `cd zarza-web && npx tsc -b --noEmit`
Expected: sin errores nuevos.

- [ ] **Paso 5: Verificación manual en navegador**

Con el stack local corriendo, loguearse como ADMIN, ir a "Usuarios", abrir el drawer de un usuario existente, y confirmar en la sección "④ Zona de riesgo" el mismo comportamiento que en la Tarea 19 (medidor en vivo, bloqueo con contraseña débil, éxito con contraseña fuerte).

- [ ] **Paso 6: Commit**

```bash
git add zarza-web/src/admin/UserDrawer.tsx
git commit -m "feat(zarza-web): integrar PasswordStrengthMeter en UserDrawer"
```

---

## Tarea 21: Verificación E2E completa contra el stack local

**Files:** ninguno (solo verificación manual, no automatizada — mismo patrón que el spec de secretos centralizados).

- [ ] **Paso 1: Levantar el stack local**

```bash
docker compose up postgres rabbitmq redis -d
cd fruit-backend && pnpm run start:dev &
cd zarza-web && npm run dev &
```

- [ ] **Paso 2: Verificar el flujo de perfil propio**

Loguearse con cualquier usuario, hacer click en el avatar → "Configuración", y confirmar:
- La página `/perfil` carga con el nombre/apellido actuales precargados.
- Cambiar nombre/apellido y guardar — el cambio persiste al recargar la página (`GET /auth/me` refleja el nuevo valor).
- Intentar cambiar la contraseña con la "contraseña actual" incorrecta → error inline, la contraseña NO cambia (verificar con un nuevo login usando la vieja).
- Cambiar la contraseña con la actual correcta y una nueva fuerte → éxito, notificación de sesiones cerradas.

- [ ] **Paso 3: Verificar la revocación de sesiones**

Antes de cambiar la contraseña, abrir una segunda sesión del mismo usuario en otra pestaña/navegador (login normal). Cambiar la contraseña desde la primera pestaña. Verificar:
- La segunda pestaña, al intentar una acción que dispare un refresh (o tras 15 min, o forzando `POST /auth/refresh` manualmente), queda deslogueada.
- La pestaña donde se hizo el cambio sigue funcionando sin pedir volver a loguearse.

- [ ] **Paso 4: Verificar en la base de datos**

```bash
docker compose exec postgres psql -U <usuario_configurado_en_DATABASE_URL> -d <nombre_de_bd> -c \
  "SELECT id, family_id, revoked_at FROM refresh_tokens WHERE user_id = '<uuid_del_usuario_de_prueba>' ORDER BY created_at DESC;"
```

Confirmar que todas las filas salvo la de la sesión actual tienen `revoked_at` no nulo, y que `password_hash` del usuario cambió (`SELECT password_hash FROM users WHERE id = '<uuid>';` antes/después).

- [ ] **Paso 5: Verificar los flujos de admin sin romper**

Repetir el flujo de "Nuevo Usuario" y "reseteo de contraseña" (Tareas 19 y 20) una vez más de punta a punta contra el stack real, no solo en aislamiento.

- [ ] **Paso 6: Verificación final de build/test completos**

```bash
cd fruit-backend && pnpm run build && pnpm run test && pnpm exec tsc --noEmit
cd zarza-web && npm run build
```

Expected: `pnpm run build` y `pnpm run test` en verde; los ~8 errores de `tsc --noEmit` preexistentes en `fruit-backend` (base conocida, sin relación a este proyecto) pueden seguir apareciendo — confirmar que no aumentaron en cantidad ni tocan archivos de este plan. `npm run build` de `zarza-web` (que corre `tsc -b`) debe terminar sin errores.

- [ ] **Paso 7: Actualizar el roadmap**

En `docs/superpowers/2026-08-31-orden-implementacion-fuera-de-alcance.md`, marcar el ítem 2 como completado:

```markdown
### 2. Autogestión de cuenta/perfil — ✅ Completado
Cambio de contraseña por el propio usuario + página de perfil/configuración en `zarza-web` (ruta `/perfil`, ítem "Configuración" en el dropdown del avatar). Incluye política de contraseña fuerte compartida (mínimo 10 caracteres, 3 de 4 tipos, score zxcvbn ≥ 2) aplicada también en alta y reseteo de contraseña por admin. Spec: [[2026-08-31-autogestion-perfil-design]].
*Por qué segundo:* proyecto chico, independiente de los demás.
```

```bash
git add docs/superpowers/2026-08-31-orden-implementacion-fuera-de-alcance.md
git commit -m "docs: marcar autogestión de cuenta/perfil como completado"
```
