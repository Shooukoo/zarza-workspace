# Gestión de Usuarios — Implementation Plan

**Spec relacionado:** [[2026-05-05-gestion-usuarios-design]]

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Agregar CRUD completo de usuarios en zarza-web (tabla + drawer) con tres nuevos endpoints en fruit-backend.

**Architecture:** Backend: tres métodos nuevos en `AdminService` + tres endpoints en `AdminController` + extensión de `UserSummary` para incluir `campos_asignados`. Frontend: módulo `src/admin/` con `UsersPage`, `UserDrawer`, `CreateUserModal` y hooks `useUsers`, conectado a ruta `/usuarios` visible solo para ADMIN.

**Tech Stack:** NestJS 11 + Mongoose + class-validator (backend) · React 18 + Ant Design v5 + TanStack Query v5 + Axios (frontend)

---

## File Map

### Backend — modificados
| Archivo | Cambio |
|---------|--------|
| `fruit-backend/src/admin/admin.service.ts` | Extender `UserSummary` con `campos_asignados`; actualizar `findAllUsers`; agregar `updateCampos`, `deleteUser`, `updatePassword` |
| `fruit-backend/src/admin/admin.controller.ts` | Agregar `UpdateCamposDto`, `UpdatePasswordDto`; tres endpoints nuevos; import `Delete`, `HttpCode`, `HttpStatus`, `IsArray`, `IsMongoId` |

### Frontend — nuevos
| Archivo | Responsabilidad |
|---------|-----------------|
| `zarza-web/src/admin/types.ts` | Interface `User` que mapea la respuesta de `UserSummary` del backend |
| `zarza-web/src/admin/hooks/useUsers.ts` | Todos los hooks de React Query para operaciones de usuario |
| `zarza-web/src/admin/CreateUserModal.tsx` | Modal para crear nuevo usuario (email, password, rol) |
| `zarza-web/src/admin/UserDrawer.tsx` | Drawer con 3 secciones: rol / campos / zona de riesgo |
| `zarza-web/src/admin/UsersPage.tsx` | Tabla paginada con filtro por rol |

### Frontend — modificados
| Archivo | Cambio |
|---------|--------|
| `zarza-web/src/App.tsx` | Ruta `/usuarios` con `PrivateRoute allowedRoles={[Role.ADMIN]}` |
| `zarza-web/src/shared/AppShell.tsx` | Ítem "Usuarios" con `TeamOutlined` en `NAV_ITEMS`, solo `Role.ADMIN` |

---

## Task 1: Extender AdminService — UserSummary + 3 métodos nuevos

**Files:**
- Modify: `fruit-backend/src/admin/admin.service.ts`

- [ ] **Step 1: Actualizar la interfaz `UserSummary` para incluir `campos_asignados`**

Reemplaza el bloque de interfaces al inicio del archivo (líneas 14–25 aprox):

```typescript
export interface UserSummary {
  id: string;
  email: string;
  role: Role;
  campos_asignados: string[];
  createdAt: Date;
  totalAnalyses?: number;
}
```

- [ ] **Step 2: Actualizar el tipo `.lean<>()` y el `.map()` en `findAllUsers`**

En el método `findAllUsers`, el bloque del `Promise.all` tiene un `.lean<...>()` — reemplaza su tipo genérico y el `.map()` final:

```typescript
// Tipo del lean (dentro de Promise.all → userModel.find()):
.lean<{ _id: any; email: string; role: Role; createdAt: Date; campos_asignados: Types.ObjectId[] }[]>()

// Map final (reemplaza el bloque data = docs.map(...)):
const data = docs.map((d) => {
  const id = d._id.toString();
  return {
    id,
    email: d.email,
    role: d.role,
    createdAt: d.createdAt,
    campos_asignados: (d.campos_asignados ?? []).map((oid) => oid.toString()),
    totalAnalyses: countMap.get(id) ?? 0,
  };
});
```

- [ ] **Step 3: Agregar método `updateCampos` al final de la clase `AdminService`**

```typescript
async updateCampos(userId: string, camposIds: string[]): Promise<UserSummary> {
  if (!Types.ObjectId.isValid(userId)) {
    throw new BadRequestException(`Invalid user id: ${userId}`);
  }
  const doc = await this.userModel
    .findByIdAndUpdate(
      new Types.ObjectId(userId),
      { campos_asignados: camposIds.map((id) => new Types.ObjectId(id)) },
      { new: true },
    )
    .select('-passwordHash')
    .lean<{
      _id: any;
      email: string;
      role: Role;
      createdAt: Date;
      campos_asignados: Types.ObjectId[];
    }>()
    .exec();
  if (!doc) throw new Error(`User ${userId} not found`);
  return {
    id: doc._id.toString(),
    email: doc.email,
    role: doc.role,
    createdAt: doc.createdAt,
    campos_asignados: (doc.campos_asignados ?? []).map((oid) => oid.toString()),
  };
}
```

- [ ] **Step 4: Agregar método `deleteUser`**

```typescript
async deleteUser(userId: string, requesterId: string): Promise<void> {
  if (userId === requesterId) {
    throw new BadRequestException('No puedes eliminar tu propio usuario');
  }
  if (!Types.ObjectId.isValid(userId)) {
    throw new BadRequestException(`Invalid user id: ${userId}`);
  }
  const result = await this.userModel
    .findByIdAndDelete(new Types.ObjectId(userId))
    .exec();
  if (!result) throw new Error(`User ${userId} not found`);
}
```

- [ ] **Step 5: Agregar método `updatePassword`**

```typescript
async updatePassword(userId: string, plainPassword: string): Promise<void> {
  if (!Types.ObjectId.isValid(userId)) {
    throw new BadRequestException(`Invalid user id: ${userId}`);
  }
  const passwordHash = await this.hasher.hash(plainPassword);
  const result = await this.userModel
    .findByIdAndUpdate(new Types.ObjectId(userId), { passwordHash })
    .exec();
  if (!result) throw new Error(`User ${userId} not found`);
}
```

- [ ] **Step 6: Compilar para verificar sin errores de TypeScript**

```bash
cd fruit-backend && pnpm run build
```

Resultado esperado: sin errores de compilación.

- [ ] **Step 7: Commit**

```bash
git add fruit-backend/src/admin/admin.service.ts
git commit -m "feat(admin): extend UserSummary with campos_asignados, add updateCampos/deleteUser/updatePassword methods"
```

---

## Task 2: Agregar endpoints en AdminController

**Files:**
- Modify: `fruit-backend/src/admin/admin.controller.ts`

- [ ] **Step 1: Actualizar imports de `@nestjs/common`**

Reemplaza la línea de imports de `@nestjs/common` (primera línea del archivo):

```typescript
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  Req,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
  DefaultValuePipe,
  UseGuards,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
```

- [ ] **Step 2: Actualizar imports de `class-validator`**

Reemplaza la línea de imports de `class-validator`:

```typescript
import {
  IsEmail,
  IsEnum,
  IsString,
  MinLength,
  IsArray,
  IsMongoId,
} from 'class-validator';
```

- [ ] **Step 3: Agregar los dos DTOs nuevos después de `CreateUserDto`**

Después del bloque `class CreateUserDto { ... }` y antes del `import { AdminDashboardService }`:

```typescript
class UpdateCamposDto {
  @IsArray()
  @IsMongoId({ each: true })
  campos_ids: string[];
}

class UpdatePasswordDto {
  @IsString()
  @MinLength(6)
  password: string;
}
```

- [ ] **Step 4: Agregar los tres endpoints en `AdminController`**

Después del método `updateUserRole` (línea ~97) y antes de `getStats`:

```typescript
@Patch('users/:id/campos')
async updateUserCampos(
  @Param('id') id: string,
  @Body() dto: UpdateCamposDto,
) {
  try {
    return await this.adminService.updateCampos(id, dto.campos_ids);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes('not found')) throw new NotFoundException(msg);
    throw new BadRequestException(msg);
  }
}

@Delete('users/:id')
@HttpCode(HttpStatus.NO_CONTENT)
async deleteUser(@Param('id') id: string, @Req() req: any) {
  try {
    await this.adminService.deleteUser(id, req.user.sub as string);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes('not found')) throw new NotFoundException(msg);
    throw new BadRequestException(msg);
  }
}

@Patch('users/:id/password')
async updateUserPassword(
  @Param('id') id: string,
  @Body() dto: UpdatePasswordDto,
) {
  try {
    await this.adminService.updatePassword(id, dto.password);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes('not found')) throw new NotFoundException(msg);
    throw new BadRequestException(msg);
  }
}
```

- [ ] **Step 5: Compilar**

```bash
cd fruit-backend && pnpm run build
```

Resultado esperado: sin errores.

- [ ] **Step 6: Commit**

```bash
git add fruit-backend/src/admin/admin.controller.ts
git commit -m "feat(admin): add PATCH users/:id/campos, DELETE users/:id, PATCH users/:id/password endpoints"
```

---

## Task 3: Frontend — types.ts + useUsers.ts

**Files:**
- Create: `zarza-web/src/admin/types.ts`
- Create: `zarza-web/src/admin/hooks/useUsers.ts`

- [ ] **Step 1: Crear `zarza-web/src/admin/types.ts`**

> Nota: el backend retorna `id` (sin guión bajo) en `UserSummary`, no `_id`.

```typescript
import { Role } from '../auth/types';

export interface User {
  id: string;
  email: string;
  role: Role;
  campos_asignados: string[];
  createdAt: string;
  totalAnalyses?: number;
}
```

- [ ] **Step 2: Crear `zarza-web/src/admin/hooks/useUsers.ts`**

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../api/client';
import type { User } from '../types';
import type { Role } from '../../auth/types';

interface UsersResponse {
  data: User[];
  total: number;
  page: number;
  limit: number;
}

export function useUsers(page: number, rol?: Role) {
  return useQuery<UsersResponse>({
    queryKey: ['admin', 'users', page, rol],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (rol) params.set('rol', rol);
      return apiClient
        .get<UsersResponse>(`/admin/users?${params}`)
        .then((r) => r.data);
    },
  });
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: { email: string; password: string; role: Role }) =>
      apiClient.post<User>('/admin/users', dto).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
  });
}

export function useUpdateRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, role }: { id: string; role: Role }) =>
      apiClient
        .patch<User>(`/admin/users/${id}/role`, { role })
        .then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
  });
}

export function useUpdateCampos() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, campos_ids }: { id: string; campos_ids: string[] }) =>
      apiClient
        .patch<User>(`/admin/users/${id}/campos`, { campos_ids })
        .then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
  });
}

export function useUpdatePassword() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, password }: { id: string; password: string }) =>
      apiClient.patch(`/admin/users/${id}/password`, { password }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
  });
}

export function useDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/admin/users/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
  });
}
```

- [ ] **Step 3: Verificar TypeScript**

```bash
cd zarza-web && npx tsc --noEmit
```

Resultado esperado: sin errores en los archivos nuevos.

- [ ] **Step 4: Commit**

```bash
git add zarza-web/src/admin/types.ts zarza-web/src/admin/hooks/useUsers.ts
git commit -m "feat(zarza-web): add admin types and useUsers hooks"
```

---

## Task 4: Frontend — CreateUserModal.tsx

**Files:**
- Create: `zarza-web/src/admin/CreateUserModal.tsx`

- [ ] **Step 1: Crear el archivo**

```typescript
import { Modal, Form, Input, Select, notification } from 'antd';
import { useCreateUser } from './hooks/useUsers';
import { Role } from '../auth/types';

interface Props {
  open: boolean;
  onClose: () => void;
}

interface FormValues {
  email: string;
  password: string;
  role: Role;
}

const ROLE_OPTIONS = [
  { value: Role.PRODUCTOR, label: 'Productor' },
  { value: Role.AGRONOMO, label: 'Agrónomo' },
  { value: Role.MONITOR, label: 'Monitor' },
];

export function CreateUserModal({ open, onClose }: Props) {
  const [form] = Form.useForm<FormValues>();
  const createMutation = useCreateUser();

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
        <Form.Item
          label="Email"
          name="email"
          rules={[
            { required: true, message: 'Ingresa el email' },
            { type: 'email', message: 'Email inválido' },
          ]}
        >
          <Input placeholder="usuario@zarza.mx" />
        </Form.Item>

        <Form.Item
          label="Contraseña"
          name="password"
          rules={[
            { required: true, message: 'Ingresa la contraseña' },
            { min: 6, message: 'Mínimo 6 caracteres' },
          ]}
        >
          <Input.Password />
        </Form.Item>

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

- [ ] **Step 2: Verificar TypeScript**

```bash
cd zarza-web && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add zarza-web/src/admin/CreateUserModal.tsx
git commit -m "feat(zarza-web): add CreateUserModal for admin user management"
```

---

## Task 5: Frontend — UserDrawer.tsx

**Files:**
- Create: `zarza-web/src/admin/UserDrawer.tsx`

> `useCampos` ya existe en `campos/hooks/useCampos.ts` y retorna `Campo[]` con `_id` — se reutiliza directamente.

- [ ] **Step 1: Crear el archivo**

```typescript
import { useEffect, useState } from 'react';
import {
  Button,
  Checkbox,
  Divider,
  Drawer,
  Form,
  Input,
  notification,
  Popconfirm,
  Select,
  Typography,
} from 'antd';
import { useCampos } from '../campos/hooks/useCampos';
import {
  useDeleteUser,
  useUpdateCampos,
  useUpdatePassword,
  useUpdateRole,
} from './hooks/useUsers';
import { useAuth } from '../auth/useAuth';
import { Role } from '../auth/types';
import type { User } from './types';

const { Text } = Typography;

interface Props {
  user: User | null;
  open: boolean;
  onClose: () => void;
}

const ROLE_OPTIONS = [
  { value: Role.PRODUCTOR, label: 'Productor' },
  { value: Role.AGRONOMO, label: 'Agrónomo' },
  { value: Role.MONITOR, label: 'Monitor' },
];

export function UserDrawer({ user, open, onClose }: Props) {
  const { user: authUser } = useAuth();
  const camposQuery = useCampos();
  const updateRoleMutation = useUpdateRole();
  const updateCamposMutation = useUpdateCampos();
  const updatePasswordMutation = useUpdatePassword();
  const deleteUserMutation = useDeleteUser();

  const [selectedRole, setSelectedRole] = useState<Role>(Role.MONITOR);
  const [selectedCampos, setSelectedCampos] = useState<string[]>([]);
  const [passwordForm] = Form.useForm<{ password: string }>();

  useEffect(() => {
    if (user) {
      setSelectedRole(user.role);
      setSelectedCampos(user.campos_asignados ?? []);
    }
  }, [user]);

  async function handleSaveRole() {
    if (!user) return;
    try {
      await updateRoleMutation.mutateAsync({ id: user.id, role: selectedRole });
      notification.success({ message: 'Rol actualizado' });
    } catch {
      notification.error({ message: 'Error al actualizar rol' });
    }
  }

  async function handleSaveCampos() {
    if (!user) return;
    try {
      await updateCamposMutation.mutateAsync({
        id: user.id,
        campos_ids: selectedCampos,
      });
      notification.success({ message: 'Campos actualizados' });
    } catch {
      notification.error({ message: 'Error al actualizar campos' });
    }
  }

  async function handleSavePassword(values: { password: string }) {
    if (!user) return;
    try {
      await updatePasswordMutation.mutateAsync({
        id: user.id,
        password: values.password,
      });
      notification.success({ message: 'Contraseña actualizada' });
      passwordForm.resetFields();
    } catch {
      notification.error({ message: 'Error al actualizar contraseña' });
    }
  }

  async function handleDelete() {
    if (!user) return;
    try {
      await deleteUserMutation.mutateAsync(user.id);
      notification.success({ message: 'Usuario eliminado' });
      onClose();
    } catch {
      notification.error({ message: 'Error al eliminar usuario' });
    }
  }

  const isSelf = user?.id === authUser?.sub;

  return (
    <Drawer
      title={user?.email ?? ''}
      open={open}
      onClose={onClose}
      width={380}
      destroyOnClose
    >
      {user && (
        <>
          {/* Sección ① — Rol */}
          <div>
            <Text
              strong
              style={{
                color: '#389e0d',
                fontSize: 11,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
            >
              ① Rol
            </Text>
            <div style={{ marginTop: 8 }}>
              <Select
                value={selectedRole}
                onChange={setSelectedRole}
                options={ROLE_OPTIONS}
                style={{ width: '100%', marginBottom: 8 }}
              />
              <Button
                type="primary"
                block
                loading={updateRoleMutation.isPending}
                onClick={handleSaveRole}
              >
                Guardar rol
              </Button>
            </div>
          </div>

          <Divider />

          {/* Sección ② — Campos asignados */}
          <div>
            <Text
              strong
              style={{
                color: '#1890ff',
                fontSize: 11,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
            >
              ② Campos asignados
            </Text>
            <div style={{ marginTop: 8 }}>
              {!camposQuery.isLoading && (camposQuery.data?.length ?? 0) === 0 ? (
                <Text type="secondary">No hay campos registrados</Text>
              ) : (
                <Checkbox.Group
                  value={selectedCampos}
                  onChange={(vals) => setSelectedCampos(vals as string[])}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                    marginBottom: 8,
                  }}
                  options={(camposQuery.data ?? []).map((c) => ({
                    value: c._id,
                    label: `${c.codigo_campo} — ${c.nombre}`,
                  }))}
                />
              )}
              <Button
                block
                loading={updateCamposMutation.isPending}
                onClick={handleSaveCampos}
                style={{
                  marginTop: 4,
                  background: '#1890ff',
                  borderColor: '#1890ff',
                  color: '#fff',
                }}
              >
                Guardar campos
              </Button>
            </div>
          </div>

          <Divider />

          {/* Sección ③ — Zona de riesgo */}
          <div>
            <Text
              strong
              style={{
                color: '#cf1322',
                fontSize: 11,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
            >
              ③ Zona de riesgo
            </Text>
            <Form
              form={passwordForm}
              layout="vertical"
              onFinish={handleSavePassword}
              style={{ marginTop: 8 }}
            >
              <Form.Item
                name="password"
                label="Nueva contraseña"
                rules={[
                  { required: true, message: 'Ingresa la contraseña' },
                  { min: 6, message: 'Mínimo 6 caracteres' },
                ]}
              >
                <Input.Password placeholder="••••••" />
              </Form.Item>
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
            </Form>

            {!isSelf && (
              <Popconfirm
                title="¿Eliminar este usuario?"
                description="Esta acción no se puede deshacer."
                okText="Sí, eliminar"
                cancelText="Cancelar"
                okButtonProps={{ danger: true }}
                onConfirm={handleDelete}
              >
                <Button danger block loading={deleteUserMutation.isPending}>
                  Eliminar usuario
                </Button>
              </Popconfirm>
            )}
          </div>
        </>
      )}
    </Drawer>
  );
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
cd zarza-web && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add zarza-web/src/admin/UserDrawer.tsx
git commit -m "feat(zarza-web): add UserDrawer with role/campos/danger-zone sections"
```

---

## Task 6: Frontend — UsersPage.tsx

**Files:**
- Create: `zarza-web/src/admin/UsersPage.tsx`

- [ ] **Step 1: Crear el archivo**

```typescript
import { useState } from 'react';
import { Button, Select, Space, Table, Tag, Typography } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useUsers } from './hooks/useUsers';
import { CreateUserModal } from './CreateUserModal';
import { UserDrawer } from './UserDrawer';
import type { User } from './types';
import { Role } from '../auth/types';

const { Title } = Typography;

const ROLE_FILTER_OPTIONS = [
  { value: '', label: 'Todos los roles' },
  { value: Role.PRODUCTOR, label: 'Productor' },
  { value: Role.AGRONOMO, label: 'Agrónomo' },
  { value: Role.MONITOR, label: 'Monitor' },
];

const ROLE_TAG: Record<Role, { color: string; label: string }> = {
  [Role.ADMIN]: { color: 'gold', label: 'Admin' },
  [Role.PRODUCTOR]: { color: 'green', label: 'Productor' },
  [Role.AGRONOMO]: { color: 'blue', label: 'Agrónomo' },
  [Role.MONITOR]: { color: 'orange', label: 'Monitor' },
};

const columns: ColumnsType<User> = [
  { title: 'Email', dataIndex: 'email', key: 'email' },
  {
    title: 'Rol',
    dataIndex: 'role',
    key: 'role',
    render: (role: Role) => (
      <Tag color={ROLE_TAG[role]?.color}>{ROLE_TAG[role]?.label ?? role}</Tag>
    ),
  },
  {
    title: 'Campos asignados',
    key: 'campos',
    render: (_: unknown, record: User) => {
      const count = record.campos_asignados?.length ?? 0;
      return count > 0 ? `${count} campo${count !== 1 ? 's' : ''}` : '—';
    },
  },
  {
    title: 'Alta',
    dataIndex: 'createdAt',
    key: 'createdAt',
    render: (v: string) => new Date(v).toLocaleDateString('es-MX'),
  },
];

export function UsersPage() {
  const [page, setPage] = useState(1);
  const [rol, setRol] = useState<Role | ''>('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const usersQuery = useUsers(page, rol || undefined);

  return (
    <div>
      <Space
        style={{
          width: '100%',
          justifyContent: 'space-between',
          marginBottom: 16,
        }}
      >
        <Title level={4} style={{ margin: 0 }}>
          Usuarios
        </Title>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setCreateOpen(true)}
        >
          Nuevo usuario
        </Button>
      </Space>

      <Space style={{ marginBottom: 16 }}>
        <Select
          value={rol}
          onChange={(v) => {
            setRol(v);
            setPage(1);
          }}
          options={ROLE_FILTER_OPTIONS}
          style={{ width: 200 }}
        />
      </Space>

      <Table
        rowKey="id"
        dataSource={usersQuery.data?.data ?? []}
        columns={columns}
        loading={usersQuery.isLoading}
        onRow={(record) => ({
          onClick: () => setSelectedUser(record),
          style: { cursor: 'pointer' },
        })}
        pagination={{
          current: page,
          pageSize: 20,
          total: usersQuery.data?.total ?? 0,
          onChange: setPage,
        }}
      />

      <UserDrawer
        user={selectedUser}
        open={!!selectedUser}
        onClose={() => setSelectedUser(null)}
      />

      <CreateUserModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
      />
    </div>
  );
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
cd zarza-web && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add zarza-web/src/admin/UsersPage.tsx
git commit -m "feat(zarza-web): add UsersPage with paginated table and role filter"
```

---

## Task 7: Conectar ruta y sidebar

**Files:**
- Modify: `zarza-web/src/App.tsx`
- Modify: `zarza-web/src/shared/AppShell.tsx`

- [ ] **Step 1: Agregar import y ruta en `App.tsx`**

Agrega el import al bloque de imports de páginas (junto a los demás):

```typescript
import { UsersPage } from './admin/UsersPage';
```

Agrega la ruta dentro del `<Route element={<AppShell />}>`, después de la ruta de dashboard y antes de la de campos:

```tsx
<Route element={<PrivateRoute allowedRoles={[Role.ADMIN]} />}>
  <Route path="/usuarios" element={<UsersPage />} />
</Route>
```

- [ ] **Step 2: Agregar ítem de navegación en `AppShell.tsx`**

Agrega `TeamOutlined` al import de `@ant-design/icons`:

```typescript
import {
  DashboardOutlined,
  EnvironmentOutlined,
  FileTextOutlined,
  AuditOutlined,
  LogoutOutlined,
  UserOutlined,
  TeamOutlined,
} from '@ant-design/icons';
```

Agrega el ítem en el array `NAV_ITEMS`, entre Dashboard y Campos:

```typescript
{
  key: '/usuarios',
  label: 'Usuarios',
  icon: <TeamOutlined />,
  roles: [Role.ADMIN],
},
```

- [ ] **Step 3: Verificar TypeScript**

```bash
cd zarza-web && npx tsc --noEmit
```

Resultado esperado: sin errores.

- [ ] **Step 4: Arrancar dev server y verificar manualmente**

```bash
cd zarza-web && pnpm run dev
```

Verificar:
1. Logueado como ADMIN → ítem "Usuarios" aparece en el sidebar
2. Navegar a `/usuarios` → tabla se carga
3. Clic en "Nuevo usuario" → modal se abre, se puede crear un usuario
4. Clic en fila → drawer se abre con las 3 secciones
5. Cambiar rol → notificación de éxito
6. Marcar/desmarcar campos → "Guardar campos" funciona
7. Ingresar contraseña → "Guardar contraseña" funciona
8. Botón "Eliminar usuario" aparece solo si el drawer NO es el usuario logueado
9. Logueado como PRODUCTOR/AGRONOMO/MONITOR → ítem "Usuarios" NO aparece en sidebar, ruta `/usuarios` redirige a `/403`

- [ ] **Step 5: Commit final**

```bash
git add zarza-web/src/App.tsx zarza-web/src/shared/AppShell.tsx
git commit -m "feat(zarza-web): wire /usuarios route and sidebar nav item for ADMIN"
```
