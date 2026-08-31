# Autogestión de cuenta/perfil — Diseño

**Plan relacionado:** [[2026-08-31-autogestion-perfil]]

**Fecha:** 2026-08-31
**Alcance:** `zarza-web` (nueva página `/perfil`, ítem "Configuración" en el dropdown del avatar, medidor de fortaleza de contraseña reutilizado en flujos de admin), `fruit-backend` (nuevo endpoint de cambio de contraseña propio, política de contraseña compartida aplicada en los 3 flujos que fijan una contraseña).

## Problema

El ítem #2 del roadmap de tareas "fuera de alcance" (`docs/superpowers/2026-08-31-orden-implementacion-fuera-de-alcance.md`): no existe autogestión de cuenta. El dropdown del avatar en `zarza-web` (`src/shared/AppShell.tsx`) solo tiene un header no interactivo (email + rol) y "Cerrar sesión" — la opción "Configuración" fue mencionada y deliberadamente omitida en el spec que rediseñó la top bar (`2026-08-07-appshell-topbar-design.md`), dejada "para un proyecto futuro". El spec de gestión de usuarios (`2026-05-05-gestion-usuarios-design.md`) también dejó fuera de scope el "cambio de contraseña por el propio usuario". Hoy, si un usuario quiere cambiar su contraseña o corregir su nombre, depende de que un ADMIN lo haga por él vía `admin/users/:id`.

De paso, el proyecto expone una inconsistencia existente en la política de contraseñas: `CreateUserDto`/`UpdatePasswordDto` en `admin.controller.ts` exigen `@MinLength(6)`, mientras que `RegisterDto` (usado por `POST auth/register`, solo ADMIN) exige `@MinLength(8)` — ninguno exige composición ni descarta contraseñas obvias. Este diseño introduce una política única y la aplica en los tres lugares donde se fija una contraseña.

## Alcance

**Incluye:**
- Página `/perfil` en `zarza-web`, accesible desde un nuevo ítem "Configuración" en el dropdown del avatar.
- Edición de `firstName`/`lastName` propios (reutiliza `PATCH auth/profile`, ya existente).
- Cambio de contraseña propia, con validación de la contraseña actual.
- Al cambiar la contraseña, revocación de todas las sesiones activas del usuario salvo la actual.
- Política de contraseña compartida (mínimo 10 caracteres + al menos 3 de 4 tipos de carácter + score `zxcvbn` ≥ 2), con feedback visual en vivo (checklist + barra de fortaleza), aplicada en los tres flujos que fijan contraseña: alta de usuario por admin, reseteo de contraseña por admin, y el cambio propio nuevo.

**Fuera de alcance:**
- Cambio de email (requeriría un flujo de re-verificación que no existe).
- Avatar/foto de perfil y teléfono (no existen esos campos en `User` de `packages/database/prisma/schema.prisma`; agregarlos requiere migración y no fue pedido).
- Autogestión desde `zarza_ai` (el ítem del roadmap la limita explícitamente a `zarza-web`).
- Adopción de un secret manager o cambios a `JWT_SECRET` (no relacionado).

## Sección 1 — Backend: política de contraseña compartida

**Validador nuevo:** `fruit-backend/src/common/validators/is-strong-password.validator.ts` — decorador `@IsStrongPassword()` de `class-validator`, creado con `registerDecorator` (no existe ningún validador custom en el repo hoy; se define el patrón desde cero). Evalúa, en este orden:

1. Longitud mínima 10 caracteres.
2. Al menos 3 de estas 4 categorías presentes: mayúscula, minúscula, número, símbolo.
3. Score de `@zxcvbn-ts/core` ≥ 2 (rango 0-4). Usa `@zxcvbn-ts/language-common` + `@zxcvbn-ts/language-es` para el diccionario en español. Estas tres dependencias (`@zxcvbn-ts/core`, `@zxcvbn-ts/language-common`, `@zxcvbn-ts/language-es`) se agregan a `fruit-backend/package.json` — no existen hoy en el repo. La configuración de `zxcvbnOptions` (diccionarios + traducciones) se inicializa una sola vez en un módulo compartido (ej. `common/validators/zxcvbn-config.ts`), importado por el validador.

Si cualquiera de los tres criterios falla, la validación falla con un mensaje único y genérico (el backend es la red de seguridad, no la UX principal — el frontend ya bloquea el submit antes de llegar aquí con el mismo criterio, ver Sección 3): *"La contraseña debe tener al menos 10 caracteres, incluir al menos 3 de: mayúscula, minúscula, número o símbolo, y no ser fácil de adivinar."*

**Dónde se aplica**, reemplazando las reglas actuales:

| DTO | Archivo | Regla actual | Regla nueva |
|---|---|---|---|
| `CreateUserDto.password` | `admin.controller.ts` (alta por admin) | `@MinLength(6)` | `@IsStrongPassword()` |
| `UpdatePasswordDto.password` | `admin.controller.ts` (reseteo por admin) | `@MinLength(6)` | `@IsStrongPassword()` |
| `RegisterDto.password` | `auth/infrastructure/http/dtos/register.dto.ts` | `@MinLength(8)` | `@IsStrongPassword()` |
| `ChangePasswordDto.newPassword` | nuevo, ver Sección 2 | — | `@IsStrongPassword()` |

`ChangePasswordDto.currentPassword` **no** lleva este validador (es una contraseña ya existente, solo se valida que sea un string no vacío).

## Sección 2 — Backend: endpoint de cambio de contraseña propio

**Endpoint:** `PATCH auth/password` en `auth/infrastructure/http/auth.controller.ts`, junto a `profile` y `fcm-token`. Guardado por `JwtAuthGuard`. Throttling: `@Throttle({ auth: { limit: 5, ttl: 60000 } })` — mismo límite que `refresh`, porque valida un secreto (`currentPassword`) y es superficie de fuerza bruta igual que login.

**DTO nuevo:** `ChangePasswordDto` en `auth/infrastructure/http/dtos/change-password.dto.ts`:
```ts
class ChangePasswordDto {
  @IsString() @IsNotEmpty()
  currentPassword: string;

  @IsStrongPassword()
  newPassword: string;
}
```

**Flujo, nuevo método `AuthService.changePassword(userId, currentPassword, newPassword)`**, siguiendo el patrón de puertos existente de `auth/` (`IUserRepository`, `I_HASHER_PORT`, `IRefreshTokenRepository` inyectados por símbolo DI — sin tocar Prisma directo, a diferencia de `AdminService`):

1. Busca el usuario por `userId` (de `req.user.sub`) vía `IUserRepository`.
2. Verifica `currentPassword` con `IHasherPort.compare()` contra `user.hashedPassword`. Si no coincide → error de dominio mapeado a `400 Bad Request` ("La contraseña actual no es correcta"), mismo patrón de mapeo de errores que `admin.controller.ts`.
3. Si `newPassword` coincide (via `compare()`) con la contraseña actual → `400 Bad Request` ("La nueva contraseña debe ser distinta a la actual").
4. Hashea `newPassword` con `IHasherPort.hash()` y actualiza el usuario. Requiere extender `IUserRepository` con un método nuevo `updatePassword(userId: string, hashedPassword: string): Promise<void>`, implementado en `PrismaUserRepository` (hoy el puerto no lo tiene; solo `AdminService` toca Prisma directo para esto).
5. Revoca todas las demás sesiones: extiende `IRefreshTokenRepository` con `revokeAllByUserId(userId: string, exceptFamilyId?: string): Promise<void>`. Para preservar la sesión actual, el controller intenta leer la cookie de refresh token de la request; si está presente, resuelve su `familyId` (reutilizando la lógica de lookup que ya usa `POST auth/refresh`) y lo pasa como excepción. Si no hay cookie de refresh en la request, se revocan todas las sesiones sin excepción (fail-safe; la sesión actual seguirá funcionando con el access token vigente hasta que expire — máx. 15 min — y en ese momento tendrá que volver a loguearse).

**Respuesta:** `200 OK` sin body relevante (mismo patrón que `PATCH admin/users/:id/password`).

## Sección 3 — Frontend: página de perfil y medidor de fortaleza compartido

**Componentes compartidos nuevos**, en `zarza-web/src/shared/` (los usan 3 formularios: perfil propio, `CreateUserModal` y `UserDrawer` de admin):

- `passwordPolicy.ts` — función pura `evaluatePassword(password, userInputs?: string[])` que corre la misma regla de composición del backend (10+ caracteres, 3 de 4 tipos) y `@zxcvbn-ts/core` (mismas tres dependencias que el backend, agregadas también a `zarza-web/package.json`; `userInputs` recibe email/nombre del usuario para que zxcvbn penalice contraseñas basadas en esos datos). Devuelve `{ hasMinLength, hasUpper, hasLower, hasNumber, hasSymbol, typesCount, score, valid }`.
- `PasswordStrengthMeter.tsx` — checklist en vivo (✓/✗ por criterio) + barra de color (rojo/amarillo/verde según `score`), usando `evaluatePassword` y los tokens de `lightTheme` (`T.danger`, `T.brand`, etc.).

**Feature nueva `zarza-web/src/perfil/`:**
```
src/perfil/
  ProfilePage.tsx        ← 2 secciones, mismo patrón visual de Form por sección que UserDrawer
  hooks/useProfile.ts     ← useUpdateOwnProfile (PATCH auth/profile) + useChangePassword (PATCH auth/password)
```

- **Sección "Datos personales":** `firstName`/`lastName`, reusa `PATCH auth/profile`. Al éxito, actualiza el `user` de `AuthContext` para que cualquier lugar que lea `firstName`/`lastName` se refresque sin recargar la página.
- **Sección "Cambiar contraseña":** `currentPassword` (`Input.Password`), `newPassword` (`Input.Password` + `PasswordStrengthMeter` debajo), `confirmNewPassword` (valida match contra `newPassword`, solo client-side, no se envía al backend). Botón submit deshabilitado hasta que `evaluatePassword(newPassword).valid === true` y `confirmNewPassword === newPassword`. Al éxito: limpia el formulario y `message.success('Contraseña actualizada. Se cerraron las demás sesiones activas.')`. Si falla por `currentPassword` incorrecta, error inline en ese campo.

**Ruta:** en `App.tsx`, `<Route path="/perfil" element={<ProfilePage />} />` dentro de `<AppShell>`, sin restricción de rol.

**`AppShell.tsx`:** agrega un ítem "Configuración" (`<Link to="/perfil" role="menuitem">`) entre el header no interactivo y "Cerrar sesión" del dropdown del avatar.

**Reuso en flujos de admin:** `CreateUserModal.tsx` y la sección "④ Zona de riesgo" de `UserDrawer.tsx` reemplazan su regla actual `{ min: 6 }` por `PasswordStrengthMeter` + `evaluatePassword`, sin otros cambios al resto de cada formulario.

## Testing

| Componente | Qué probar |
|---|---|
| `is-strong-password.validator.spec.ts` | Pasa con 10+/3-de-4/score alto; falla por longitud; falla por menos de 3 tipos; falla por score bajo aunque cumpla composición (ej. patrón secuencial/basado en palabra común). |
| `auth.service.spec.ts` (extender) | `changePassword()`: éxito con revocación de sesiones excluyendo la familia actual; rechazo por `currentPassword` incorrecta; rechazo por `newPassword === currentPassword`; sin cookie de refresh → revoca todas sin excepción. |
| `prisma-user.repository.spec.ts` / `prisma-refresh-token.repository.spec.ts` | Cobertura de los métodos nuevos (`updatePassword`, `revokeAllByUserId`), siguiendo el patrón de tests de integración ya existente para estos adapters. |
| DTOs (`CreateUserDto`, `UpdatePasswordDto`, `RegisterDto`, `ChangePasswordDto`) | `class-validator` `validate()` rechaza contraseñas débiles/cortas con el mensaje esperado. |
| `zarza-web` (manual, sin cultura de tests unitarios en el repo hoy) | Flujo perfil propio completo (editar nombre, cambiar contraseña con actual incorrecta, con contraseña débil bloqueada, con contraseña válida exitosa); verificar que otra sesión (otro navegador/pestaña logueado) queda deslogueada tras el cambio; verificar que `CreateUserModal`/`UserDrawer` siguen funcionando con el nuevo medidor. |
| E2E contra stack local | Cambio de contraseña real → verificar en Postgres que `passwordHash` cambió y que las filas de `RefreshToken` de otras sesiones quedaron revocadas (documentado como paso del plan de implementación, no automatizado). |

## No incluido en este diseño

- Cambio de email propio (requiere flujo de re-verificación, no existe hoy).
- Avatar/foto de perfil, teléfono u otros campos nuevos en `User` (requieren migración de Prisma, no pedidos).
- Autogestión desde `zarza_ai` — limitado a `zarza-web` por el propio ítem del roadmap.
- Un botón explícito de "cerrar todas las sesiones" independiente del cambio de contraseña (se evaluó implícitamente al decidir la revocación automática; no se pidió como feature separada).
- Historial/auditoría de cambios de contraseña.
