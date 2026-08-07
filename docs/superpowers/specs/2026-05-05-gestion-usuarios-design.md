# Gestión de Usuarios — Design Spec

**Plan relacionado:** [[2026-05-05-gestion-usuarios]]

**Fecha:** 2026-05-05
**Feature:** Pantalla de administración de usuarios en zarza-web
**Scope:** Backend (fruit-backend) + Frontend (zarza-web)

---

## Contexto

El panel web no tiene forma de crear ni gestionar usuarios. Actualmente el único usuario se crea via `pnpm run seed:admin`. Esta feature agrega una pantalla completa de CRUD de usuarios, accesible solo para el rol `ADMIN`.

---

## Operaciones soportadas

| Operación | Descripción |
|-----------|-------------|
| Listar | Tabla paginada, filtrable por rol |
| Crear | Modal con email, contraseña, rol |
| Cambiar rol | Sección ① del drawer |
| Asignar campos | Sección ② del drawer (checkboxes de `campos_asignados`) |
| Establecer contraseña | Sección ③ del drawer — admin impone contraseña permanente, sin flujo de email |
| Eliminar | Sección ③ del drawer — con Popconfirm |

---

## Backend — Endpoints nuevos

Todos en `AdminController` / `AdminService`. Guard: `JwtAuthGuard + RolesGuard(ADMIN)`.

### `PATCH /admin/users/:id/campos`
```ts
// Body DTO
class UpdateCamposDto {
  @IsArray()
  @IsMongoId({ each: true })
  campos_ids: string[];
}
```
Reemplaza completamente `campos_asignados` del usuario con el array recibido. Array vacío `[]` limpia los campos asignados. Retorna el usuario actualizado.

### `DELETE /admin/users/:id`
Sin body. Valida que `req.user.sub !== id` (no auto-eliminación) — retorna 400 si se viola. Elimina el documento del usuario. Retorna 204.

### `PATCH /admin/users/:id/password`
```ts
class UpdatePasswordDto {
  @IsString()
  @MinLength(6)
  password: string;
}
```
Hashea la nueva contraseña con bcrypt y actualiza `passwordHash`. El admin se la comunica al usuario por canal externo. Retorna 200.

---

## Frontend — Estructura de archivos

Nuevo módulo `src/admin/` en zarza-web:

```
src/admin/
  UsersPage.tsx          ← tabla paginada con filtro por rol y botón "Nuevo usuario"
  UserDrawer.tsx         ← drawer lateral con 3 secciones
  CreateUserModal.tsx    ← modal: email + contraseña + rol
  hooks/useUsers.ts      ← useQuery / useMutation para todas las operaciones
  types.ts               ← interface User
```

### `types.ts`
```ts
export interface User {
  _id: string;
  email: string;
  role: Role;
  campos_asignados: string[];
  createdAt: string;
}
```

### Ruta y navegación

- Ruta: `/usuarios`
- Acceso: solo `Role.ADMIN`
- Sidebar: nuevo ítem "Usuarios" con `TeamOutlined`, visible solo para ADMIN, posición entre Dashboard y Campos

---

## Frontend — Comportamiento

### `UsersPage`
- Tabla con columnas: Email, Rol (tag con color), Campos asignados (count), Fecha de alta
- Filtro por rol (Select) en la barra superior
- Paginación: 20 por página
- Clic en fila → abre `UserDrawer` con usuario seleccionado
- Botón "Nuevo usuario" → abre `CreateUserModal`

### `CreateUserModal`
- Campos: email (validación email), contraseña (min 6), rol (Select, excluye ADMIN)
- Submit: `POST /admin/users` → cierra modal + refresca tabla
- Rol por defecto: MONITOR

### `UserDrawer`
Drawer de Ant Design, ancho 380px, desde la derecha, `destroyOnClose`.

**Sección ① — Rol**
- Select con opciones PRODUCTOR, AGRONOMO, MONITOR (sin ADMIN)
- Botón "Guardar rol" → `PATCH /admin/users/:id/role`

**Sección ② — Campos asignados**
- Lista de checkboxes con todos los campos del sistema (query a `GET /campos` con rol ADMIN)
- Checkboxes pre-marcados según `campos_asignados` del usuario
- Botón "Guardar campos" → `PATCH /admin/users/:id/campos` con array de IDs seleccionados
- Si no hay campos en el sistema: mensaje vacío "No hay campos registrados"

**Sección ③ — Zona de riesgo**
- Input contraseña (min 6 chars, requerido solo al presionar guardar)
- Botón "Guardar contraseña" → `PATCH /admin/users/:id/password`
- Botón "Eliminar usuario" con `Popconfirm` → `DELETE /admin/users/:id` → cierra drawer + refresca tabla
- El botón eliminar se oculta si el usuario del drawer es el mismo usuario logueado (`user._id === authUser.sub`)

---

## Manejo de errores y casos borde

| Caso | Comportamiento |
|------|----------------|
| Auto-eliminación | Botón oculto en frontend; backend retorna 400 como segunda línea de defensa |
| Array campos vacío | Backend acepta `[]` y limpia `campos_asignados` — comportamiento esperado |
| Contraseña vacía al guardar | Validación frontend antes de llamar a la API (Form.Item con `required`) |
| Error de servidor | `notification.error` con mensaje del servidor si disponible |
| Éxito en cualquier operación | `notification.success` + invalidación de query `['admin', 'users']` |

---

## Hooks — `useUsers.ts`

```ts
useUsers(page, rol?)   // GET /admin/users — query key: ['admin', 'users', page, rol]
useCreateUser()        // POST /admin/users — mutateAsync({ email, password, role })
useUpdateRole()        // PATCH /admin/users/:id/role — mutateAsync({ id, role })
useUpdateCampos()      // PATCH /admin/users/:id/campos — mutateAsync({ id, campos_ids })
useUpdatePassword()    // PATCH /admin/users/:id/password — mutateAsync({ id, password })
useDeleteUser()        // DELETE /admin/users/:id — mutateAsync(id)
useCamposAll()         // GET /campos — reutiliza query key ['campos'] ya existente
```

Todas las mutaciones invalidan `['admin', 'users']` en `onSuccess`.

---

## Testing

No hay tests unitarios pendientes de implementar en el proyecto (según CLAUDE.md, los specs E2E son plantillas). Esta feature sigue el mismo patrón — sin tests adicionales por ahora.

---

## Fuera de scope

- Cambio de contraseña por el propio usuario (depende de pantalla en zarza_ai)
- Invitación por email (no hay servicio de email en el stack)
- Suspensión/desactivación de usuario (solo eliminación)
- Auditoría de cambios de rol
