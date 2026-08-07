# Design: Fechas en Cards + Nombres de Usuario

**Plan relacionado:** [[2026-05-20-dates-and-user-names]]

**Fecha**: 2026-05-20  
**Estado**: Aprobado

---

## Resumen

Dos mejoras en la app rubusAI:

1. **Bug**: Las fechas de los análisis no se ven en las cards de la home page.
2. **Feature**: Agregar `firstName` y `lastName` al modelo de usuario para personalizar saludos y bienvenidas en la app.

---

## Sección 1 — Bug: Fechas invisibles en las cards

### Causa

En `zarza_ai/lib/data/models/fruit_analysis_model.dart`, `fromJson` busca `json['createdAt']`. Al pasar por el pipeline RabbitMQ → `fruit-ms` → `fruit-backend`, la serialización de Prisma puede devolver el campo como `created_at` (snake_case). Si la clave no coincide, `createdAt` llega `null`, se muestra `'—'` con el color `AppTheme.dataGray` que es casi imperceptible sobre el fondo oscuro del tile.

### Fix

Hacer el parsing robusto con fallback snake_case:

```dart
createdAt: (json['createdAt'] ?? json['created_at']) != null
    ? DateTime.tryParse((json['createdAt'] ?? json['created_at']) as String)
    : null,
```

**Archivo afectado**: `zarza_ai/lib/data/models/fruit_analysis_model.dart` — solo la línea de `createdAt` en `fromJson`.

---

## Sección 2 — Feature: Nombres de usuario

### Decisiones de diseño

- **Dos campos separados** (`firstName` + `lastName`) en la DB para poder saludar con solo el nombre de pila.
- **Opcionales** tanto al registrar como en la DB (nullable). Fallback al prefijo del email si están vacíos.
- **Almacenamiento en PostgreSQL** vía Prisma, en la tabla `users`.
- **Edición**: desde la pantalla de perfil, accesible tocando el avatar circular en el greeting de la home.
- **Registro**: dos campos opcionales adicionales en la pantalla de registro.

---

## Cambios en Backend (`fruit-backend` + `packages/database`)

### Prisma Schema (`packages/database/prisma/schema.prisma`)

Agregar al modelo `User`:

```prisma
firstName String? @map("first_name")
lastName  String? @map("last_name")
```

Crear migración: `npx prisma migrate dev --name add_user_name`

### `packages/database` — regenerar cliente Prisma

```bash
npx prisma generate
```

### `user.entity.ts`

Agregar campos opcionales:

```typescript
constructor(
  public readonly id: string,
  public readonly email: string,
  passwordHash: string,
  public readonly role: Role,
  public readonly firstName: string | null = null,
  public readonly lastName: string | null = null,
) {}
```

### `register.dto.ts`

```typescript
@IsOptional()
@IsString()
@MaxLength(60)
firstName?: string;

@IsOptional()
@IsString()
@MaxLength(60)
lastName?: string;
```

### `auth.service.ts`

- `register()`: pasar `firstName`/`lastName` al `userRepository.save()` y retornarlos en el resultado.
- `login()`: retornar `firstName`/`lastName` en el resultado.
- Tipo `RegisteredUserResult` y return de `login()` incluyen `firstName: string | null` y `lastName: string | null`.

### `user-repository.port.ts`

- Agregar `firstName` y `lastName` opcionales a `CreateUserData`.
- Agregar método `updateProfile(userId: string, data: { firstName?: string; lastName?: string }): Promise<void>`.

### `prisma-user.repository.ts`

- `save()`: incluir `firstName`/`lastName` en el `prisma.user.create`.
- `findByEmail()`: retornar `firstName`/`lastName` en la instancia `User`.
- Nuevo método `updateProfile()`:

```typescript
async updateProfile(userId: string, data: { firstName?: string; lastName?: string }): Promise<void> {
  await this.prisma.user.update({ where: { id: userId }, data });
}
```

### `auth.controller.ts`

Nuevo endpoint:

```typescript
@Patch('profile')
@UseGuards(JwtAuthGuard)
async updateProfile(@Req() req: any, @Body() body: UpdateProfileDto) {
  await this.userRepository.updateProfile(req.user.sub, body);
}
```

Nuevo `UpdateProfileDto`:

```typescript
export class UpdateProfileDto {
  @IsOptional() @IsString() @MaxLength(60) firstName?: string;
  @IsOptional() @IsString() @MaxLength(60) lastName?: string;
}
```

---

## Cambios en Flutter (`zarza_ai`)

La cadena de capas por feature sigue el patrón existente del proyecto:
`Screen → AuthCubit → UseCase → IAuthRepository → RemoteAuthDatasource → AuthResponseModel`

### `domain/entities/user_entity.dart`

Agregar `firstName` y `lastName` opcionales, y getter `displayName`:

```dart
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

  String get displayName => firstName ?? email.split('@').first;
}
```

### `data/models/auth_response_model.dart`

En `fromJson`, parsear `firstName` y `lastName` del objeto `user` del JSON:

```dart
user = UserEntity(
  id: userJson['id'] as String? ?? '',
  email: userJson['email'] as String? ?? '',
  role: UserRole.fromString(userJson['role'] as String? ?? 'MONITOR'),
  firstName: userJson['firstName'] as String?,
  lastName: userJson['lastName'] as String?,
);
```

### `data/datasources/remote_auth_datasource.dart`

- `login()`: incluir `firstName`/`lastName` opcionales en el body enviado (si el backend los retorna en el response, se parsean en `AuthResponseModel`).
- `register()`: incluir `firstName`/`lastName` opcionales en el body enviado.
- Nuevo método `updateProfile({ String? firstName, String? lastName })` que llama a `PATCH /auth/profile`.

### `domain/repositories/i_auth_repository.dart`

- Agregar `firstName` y `lastName` opcionales a la firma de `register()`.
- Agregar método `updateProfile({ String? firstName, String? lastName }): Future<UserEntity>`.

### `data/repositories/auth_repository_impl.dart`

- Actualizar `register()` para pasar `firstName`/`lastName` al datasource.
- Implementar `updateProfile()` llamando a `RemoteAuthDatasource.updateProfile()` y retornando `UserEntity` actualizada.

### `domain/usecases/register_usecase.dart`

Agregar `firstName` y `lastName` opcionales a `call()`:

```dart
Future<AuthResultEntity> call({
  required String email,
  required String password,
  String? firstName,
  String? lastName,
})
```

### Nuevo `domain/usecases/update_profile_usecase.dart`

```dart
class UpdateProfileUseCase {
  const UpdateProfileUseCase(this._repository);
  final IAuthRepository _repository;

  Future<UserEntity> call({ String? firstName, String? lastName }) =>
      _repository.updateProfile(firstName: firstName, lastName: lastName);
}
```

### `core/auth/auth_cubit.dart`

- Actualizar `register()` para recibir `firstName`/`lastName` opcionales y pasarlos al `RegisterUseCase`.
- Agregar dependencia `UpdateProfileUseCase` e inyectarla en el constructor.
- Agregar método `updateProfile(String? firstName, String? lastName)`:
  - Llama a `UpdateProfileUseCase`.
  - Si exitoso, emite nuevo `AuthAuthenticated` con `UserEntity` actualizada, manteniendo el mismo token.

### `presentation/home/home_screen.dart`

En `_UserGreeting` y `_AppDrawer`:
- Cambiar `userName` de `email.split('@').first` a `user.displayName`.
- El avatar se envuelve en `GestureDetector` que navega a `/profile`.

```dart
GestureDetector(
  onTap: () => context.push('/profile'),
  child: Container(/* avatar circular existente */),
)
```

### `presentation/auth/register_screen.dart`

Agregar dos `TextFormField` opcionales (Nombre / Apellido) antes del campo de contraseña. Se envían al `AuthCubit.register()`.

### `presentation/profile/profile_edit_screen.dart` (nueva)

Pantalla simple:
- `AppBar` con título "Mi Perfil" y botón atrás.
- Dos `TextFormField` pre-llenados con `firstName`/`lastName` del `AuthCubit.state`.
- Botón "Guardar" que llama a `AuthCubit.updateProfile()`.
- Loading state (deshabilita botón) mientras guarda.
- `SnackBar` de confirmación al éxito.

### Router (`core/router/app_router.dart`)

Agregar ruta `/profile` → `ProfileEditScreen`.

### `core/di/service_locator.dart`

Registrar `UpdateProfileUseCase` e inyectarlo en `AuthCubit`.

---

## Flujo completo

```
[Home] Avatar tocado
  → push('/profile')
  → ProfileEditScreen carga firstName/lastName del AuthCubit state
  → Usuario edita y toca Guardar
  → AuthCubit.updateProfile() → PATCH /auth/profile
  → Backend actualiza DB
  → Flutter emite nuevo AuthAuthenticated con nombres actualizados
  → Al volver a Home, greeting muestra el nombre nuevo
```

---

## Archivos no tocados

- `auth_state.dart` — `AuthAuthenticated` ya tiene `UserEntity`, no cambia la estructura.
- `login.dto.ts` — login no recibe nombre.
- JWT payload — no incluye nombre (se lee del state en memoria).
