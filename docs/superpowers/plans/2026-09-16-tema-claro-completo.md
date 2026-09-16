# Tema Claro Completo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Elevar `UsersPage`, `CamposPage`, `SolicitudesPage`, `AnalisisPage` y `ColaRevisionPage` (`zarza-web`) al patrón visual del Dashboard (tarjetas KPI + tabla en card blanca con sombra), y recolorear los 14 hex legacy sueltos en `UserDrawer.tsx`, `AnalisisDetailModal.tsx` y `SolicitudDetailDrawer.tsx` con los tokens de `lightTheme`.

**Architecture:** `DashboardPage.tsx` ya tiene, definidos localmente, exactamente los building blocks que necesitan las otras páginas (`SurfaceCard`, `chipFor()`/`CHIP`, `KpiCardHorizontal`). Se extraen a `src/shared/` (sin cambio de valores ni de comportamiento) y las 5 páginas los importan. Los KPI de cada página se resuelven con datos ya disponibles (`/admin/stats`, el array completo de `/campos`) o con requests adicionales `limit=1` contra endpoints existentes filtrados por estado — sin tocar `fruit-backend`.

**Tech Stack:** React 18 + TypeScript + antd 5 + `@tanstack/react-query` (`zarza-web`). **Nota:** este proyecto no tiene test runner para `zarza-web` (convención existente, confirmada en `2026-08-08-brand-palette-rebrand-design.md`) — la verificación de cada tarea es `npx tsc --noEmit` en vez de una suite de tests, más una pasada manual en navegador al final.

**Spec:** `docs/superpowers/specs/2026-09-16-tema-claro-completo-design.md`

---

## File Structure

**Crear:**
- `zarza-web/src/shared/SurfaceCard.tsx` — card blanca con sombra (extraído de `DashboardPage.tsx`)
- `zarza-web/src/shared/chipColors.ts` — `chipFor()` (extraído de `DashboardPage.tsx`)
- `zarza-web/src/shared/KpiCardHorizontal.tsx` — tarjeta KPI (icono + número + label) (extraído de `DashboardPage.tsx`)
- `zarza-web/src/admin/hooks/useAdminStats.ts` — hook para `GET /admin/stats`

**Modificar:**
- `zarza-web/src/dashboard/DashboardPage.tsx` — usa los 3 módulos extraídos en vez de definirlos localmente
- `zarza-web/src/admin/UserDrawer.tsx` — recolor
- `zarza-web/src/analisis/AnalisisDetailModal.tsx` — recolor
- `zarza-web/src/solicitudes/SolicitudDetailDrawer.tsx` — recolor
- `zarza-web/src/admin/UsersPage.tsx` — KPIs + card
- `zarza-web/src/campos/CamposPage.tsx` — KPIs + card
- `zarza-web/src/solicitudes/SolicitudesPage.tsx` — KPIs + card
- `zarza-web/src/analisis/AnalisisPage.tsx` — KPIs + card
- `zarza-web/src/revision-detecciones/ColaRevisionPage.tsx` — KPI + card

**Sin cambios (confirmado en el spec):** `RevisionDeteccionesPage.tsx`, `DeteccionOverlay.tsx`, `DeteccionPanel.tsx`, `DeteccionSidebar.tsx`, `ModelosIAPage.tsx`, `MapasCalorPage.tsx`, y todo `fruit-backend`.

---

### Task 1: Extraer `SurfaceCard`, `chipFor()` y `KpiCardHorizontal` a `src/shared/`

**Files:**
- Create: `zarza-web/src/shared/chipColors.ts`
- Create: `zarza-web/src/shared/SurfaceCard.tsx`
- Create: `zarza-web/src/shared/KpiCardHorizontal.tsx`
- Modify: `zarza-web/src/dashboard/DashboardPage.tsx`

- [ ] **Step 1: Crear `src/shared/chipColors.ts`**

```ts
// zarza-web/src/shared/chipColors.ts
import { lightTheme } from './lightTheme';

// Fondo pastel + color de texto/ícono/trazo sólido por semántico, para
// chips y badges sobre superficie clara. Las marcas de datos (barras,
// dona, sparklines, ring, dots) siguen usando el color semántico
// saturado de lightTheme directamente — el pastel es solo para superficies.
const CHIP: Record<string, { bg: string; fg: string }> = {
  [lightTheme.emerald]:    { bg: '#ECFDF5', fg: '#047857' },
  [lightTheme.brand]:      { bg: '#E3F0EA', fg: '#064E3B' },
  [lightTheme.warn]:       { bg: '#FFFBEB', fg: '#B45309' },
  [lightTheme.danger]:     { bg: '#FEF2F2', fg: '#B91C1C' },
  [lightTheme.terracotta]: { bg: '#FBEEE7', fg: '#9A4A2E' },
};

export function chipFor(color: string) {
  return CHIP[color] ?? { bg: '#F3F4F6', fg: '#374151' };
}
```

- [ ] **Step 2: Crear `src/shared/SurfaceCard.tsx`**

```tsx
// zarza-web/src/shared/SurfaceCard.tsx
import React from 'react';
import { lightTheme } from './lightTheme';

const surfaceCard = {
  background: lightTheme.surface,
  borderRadius: 16,
} as const;

export function SurfaceCard({ children, style, glow }: {
  children: React.ReactNode;
  style?: React.CSSProperties;
  glow?: boolean;
}) {
  return (
    <div style={{
      ...surfaceCard,
      boxShadow: glow
        ? '0 12px 32px rgba(6,78,59,0.18)'
        : '0 12px 32px rgba(17,17,40,0.08)',
      padding: 24,
      ...style,
    }}>
      {children}
    </div>
  );
}
```

- [ ] **Step 3: Crear `src/shared/KpiCardHorizontal.tsx`**

```tsx
// zarza-web/src/shared/KpiCardHorizontal.tsx
import React from 'react';
import { Spin } from 'antd';
import { lightTheme } from './lightTheme';
import { SurfaceCard } from './SurfaceCard';
import { chipFor } from './chipColors';

const T = lightTheme;

// Tarjeta KPI horizontal: ícono a la izquierda, número + label a la derecha.
export function KpiCardHorizontal({ icon, value, label, color, loading }: {
  icon: React.ReactNode;
  value: number | string;
  label: string;
  color: string;
  loading?: boolean;
}) {
  const chip = chipFor(color);
  return (
    <SurfaceCard style={{ cursor: 'default', display: 'flex', alignItems: 'center' }}>
      {loading ? (
        <div role="status" aria-label="Cargando…" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 56, width: '100%' }}>
          <Spin/>
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%' }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10, flexShrink: 0,
            background: chip.bg,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: chip.fg,
          }}>
            {icon}
          </div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 700, color: T.ink, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
            <div style={{ fontSize: 12, color: T.gray, marginTop: 3 }}>{label}</div>
          </div>
        </div>
      )}
    </SurfaceCard>
  );
}
```

- [ ] **Step 4: Modificar `DashboardPage.tsx` para usar los módulos extraídos**

Agregar a los imports existentes (después del import de `lightTheme`):

```ts
import { SurfaceCard } from '../shared/SurfaceCard';
import { chipFor } from '../shared/chipColors';
import { KpiCardHorizontal } from '../shared/KpiCardHorizontal';
```

Eliminar el bloque del `CHIP`/`chipFor` local (busca este texto exacto y bórralo):

```ts
// Fondo pastel + color de texto/ícono/trazo sólido por semántico, para
// chips y badges sobre superficie clara. Las marcas de datos (barras,
// dona, sparklines, ring, dots) siguen usando el color semántico
// saturado de T directamente — el pastel es solo para superficies.
const CHIP: Record<string, { bg: string; fg: string }> = {
  [T.emerald]:    { bg: '#ECFDF5', fg: '#047857' },
  [T.brand]:      { bg: '#E3F0EA', fg: '#064E3B' },
  [T.warn]:       { bg: '#FFFBEB', fg: '#B45309' },
  [T.danger]:     { bg: '#FEF2F2', fg: '#B91C1C' },
  [T.terracotta]: { bg: '#FBEEE7', fg: '#9A4A2E' },
};
function chipFor(color: string) {
  return CHIP[color] ?? { bg: '#F3F4F6', fg: '#374151' };
}

```

(deja `formatDecimal` intacto — no es parte de esta extracción)

Eliminar el bloque de `surfaceCard`/`SurfaceCard` local:

```ts
const surfaceCard = {
  background: T.surface,
  borderRadius: 16,
} as const;

// ── Sub-components ─────────────────────────────────────────────────
function SurfaceCard({ children, style, glow }: {
  children: React.ReactNode;
  style?: React.CSSProperties;
  glow?: boolean;
}) {
  return (
    <div style={{
      ...surfaceCard,
      boxShadow: glow
        ? '0 12px 32px rgba(6,78,59,0.18)'
        : '0 12px 32px rgba(17,17,40,0.08)',
      padding: 24,
      ...style,
    }}>
      {children}
    </div>
  );
}

```

(deja el comentario `// ── Sub-components ──...` y `GradientBar` — reescribe el comentario justo antes de `GradientBar` si quedó huérfano)

Eliminar el bloque de `KpiCardHorizontal` local (queda justo después de `GradientBar`):

```ts
// Tarjeta KPI horizontal: ícono a la izquierda, número + label a la derecha.
// Sin sparkline — el layout compacto no deja espacio legible para uno.
function KpiCardHorizontal({ icon, value, label, color, loading }: {
  icon: React.ReactNode;
  value: number | string;
  label: string;
  color: string;
  loading?: boolean;
}) {
  const chip = chipFor(color);
  return (
    <SurfaceCard style={{ cursor: 'default', display: 'flex', alignItems: 'center' }}>
      {loading ? (
        <div role="status" aria-label="Cargando…" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 56, width: '100%' }}>
          <Spin/>
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%' }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10, flexShrink: 0,
            background: chip.bg,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: chip.fg,
          }}>
            {icon}
          </div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 700, color: T.ink, lineHeight: 1 }}>{value}</div>
            <div style={{ fontSize: 12, color: T.gray, marginTop: 3 }}>{label}</div>
          </div>
        </div>
      )}
    </SurfaceCard>
  );
}

```

El resto de `DashboardPage.tsx` (`GradientBar`, `SpotlightCard`, el resto del componente, el JSX que usa `<SurfaceCard>`, `<KpiCardHorizontal>` y `chipFor(...)`) queda **sin cambios** — ahora resuelve esos identificadores vía import en vez de definición local.

- [ ] **Step 5: Verificar tipos**

Run: `cd zarza-web && npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 6: Commit**

```bash
git add zarza-web/src/shared/chipColors.ts zarza-web/src/shared/SurfaceCard.tsx zarza-web/src/shared/KpiCardHorizontal.tsx zarza-web/src/dashboard/DashboardPage.tsx
git commit -m "refactor(zarza-web): extraer SurfaceCard/chipFor/KpiCardHorizontal a shared"
```

---

### Task 2: Recolorear `UserDrawer.tsx`

**Files:**
- Modify: `zarza-web/src/admin/UserDrawer.tsx`

- [ ] **Step 1: Agregar import de `lightTheme`**

Agregar después de `import { evaluatePassword, generatePassword } from '../shared/passwordPolicy';`:

```ts
import { lightTheme } from '../shared/lightTheme';
```

Y después de `const { Text } = Typography;`, agregar:

```ts
const T = lightTheme;
```

- [ ] **Step 2: Recolorear sección ① Nombre (líneas 149, 166)**

Reemplazar:

```tsx
            <Text strong style={{ color: '#722ed1', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
```

por:

```tsx
            <Text strong style={{ color: T.brand, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
```

Reemplazar:

```tsx
                style={{ background: '#722ed1', borderColor: '#722ed1' }}
```

por:

```tsx
                style={{ background: T.brand, borderColor: T.brand }}
```

- [ ] **Step 3: Recolorear sección ② Rol (línea 180)**

Reemplazar:

```tsx
                color: '#389e0d',
```

por:

```tsx
                color: T.emerald,
```

- [ ] **Step 4: Recolorear sección ③ Campos asignados (líneas 213, 246-248)**

Reemplazar:

```tsx
                color: '#1890ff',
```

por:

```tsx
                color: T.brand,
```

Reemplazar:

```tsx
                style={{
                  marginTop: 4,
                  background: '#1890ff',
                  borderColor: '#1890ff',
                  color: '#fff',
                }}
```

por:

```tsx
                style={{
                  marginTop: 4,
                  background: T.brand,
                  borderColor: T.brand,
                  color: '#fff',
                }}
```

- [ ] **Step 5: Recolorear sección ④ Zona de riesgo (líneas 263, 312-313)**

Reemplazar:

```tsx
                color: '#cf1322',
```

por:

```tsx
                color: T.danger,
```

Reemplazar:

```tsx
                style={{
                  marginBottom: 8,
                  borderColor: '#cf1322',
                  color: '#cf1322',
                }}
```

por:

```tsx
                style={{
                  marginBottom: 8,
                  borderColor: T.danger,
                  color: T.danger,
                }}
```

- [ ] **Step 6: Verificar que no queden hex legacy**

Run: `cd zarza-web && grep -n "#722ed1\|#389e0d\|#1890ff\|#cf1322" src/admin/UserDrawer.tsx`
Expected: sin resultados (vacío).

Run: `npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 7: Commit**

```bash
git add zarza-web/src/admin/UserDrawer.tsx
git commit -m "fix(zarza-web): recolorear UserDrawer con tokens de lightTheme"
```

---

### Task 3: Recolorear `AnalisisDetailModal.tsx`

**Files:**
- Modify: `zarza-web/src/analisis/AnalisisDetailModal.tsx`

- [ ] **Step 1: Agregar import de `lightTheme`**

Agregar después de `import { Role } from '../auth/types';`:

```ts
import { lightTheme } from '../shared/lightTheme';
```

Y después de `const { Text } = Typography;`, agregar:

```ts
const T = lightTheme;
```

- [ ] **Step 2: Recolorear placeholders "sin imagen" (líneas 122, 147)**

Hay dos bloques idénticos de placeholder ("Vista de imagen no disponible" y el estado sin imagen cargada). En ambos, reemplazar:

```tsx
                    background: '#f0f0f0',
```

por:

```tsx
                    background: '#F3F4F6',
```

(mismo valor que el fallback gris de `chipFor()` en `src/shared/chipColors.ts` — no es un token de `lightTheme`, se mantiene como literal para no introducir un token nuevo solo para este caso, igual que hace `DashboardPage.tsx`)

- [ ] **Step 3: Recolorear el divisor (línea 207)**

Reemplazar:

```tsx
            <div style={{ marginTop: 24, borderTop: '1px solid #f0f0f0', paddingTop: 16 }}>
```

por:

```tsx
            <div style={{ marginTop: 24, borderTop: `1px solid ${T.grayLine}`, paddingTop: 16 }}>
```

- [ ] **Step 4: Verificar que no queden hex legacy**

Run: `cd zarza-web && grep -n "#f0f0f0" src/analisis/AnalisisDetailModal.tsx`
Expected: sin resultados (vacío).

Run: `npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 5: Commit**

```bash
git add zarza-web/src/analisis/AnalisisDetailModal.tsx
git commit -m "fix(zarza-web): recolorear AnalisisDetailModal con tokens de lightTheme"
```

---

### Task 4: Recolorear `SolicitudDetailDrawer.tsx`

**Files:**
- Modify: `zarza-web/src/solicitudes/SolicitudDetailDrawer.tsx`

- [ ] **Step 1: Agregar import de `lightTheme`**

Agregar después de `import type { Analysis } from '../analisis/types';`:

```ts
import { lightTheme } from '../shared/lightTheme';
```

Agregar una constante `const T = lightTheme;` junto a las demás constantes de módulo del archivo (antes del componente exportado).

- [ ] **Step 2: Recolorear "Datos de la solicitud" (línea 101)**

Reemplazar:

```tsx
                color: '#52c41a',
```

por:

```tsx
                color: T.emerald,
```

- [ ] **Step 3: Recolorear "Análisis del campo" (línea 144)**

Reemplazar:

```tsx
                    color: '#1890ff',
```

por:

```tsx
                    color: T.brand,
```

- [ ] **Step 4: Verificar que no queden hex legacy**

Run: `cd zarza-web && grep -n "#52c41a\|#1890ff" src/solicitudes/SolicitudDetailDrawer.tsx`
Expected: sin resultados (vacío).

Run: `npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 5: Commit**

```bash
git add zarza-web/src/solicitudes/SolicitudDetailDrawer.tsx
git commit -m "fix(zarza-web): recolorear SolicitudDetailDrawer con tokens de lightTheme"
```

---

### Task 5: KPIs + card en `UsersPage.tsx`

**Files:**
- Create: `zarza-web/src/admin/hooks/useAdminStats.ts`
- Modify: `zarza-web/src/admin/UsersPage.tsx`

- [ ] **Step 1: Crear el hook `useAdminStats`**

```ts
// zarza-web/src/admin/hooks/useAdminStats.ts
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../api/client';
import type { Role } from '../../auth/types';

export interface AdminStats {
  totalUsers: number;
  usersByRole: Record<Role, number>;
}

export function useAdminStats() {
  return useQuery<AdminStats>({
    queryKey: ['admin', 'stats'],
    queryFn: () =>
      apiClient.get<AdminStats>('/admin/stats').then((r) => r.data),
  });
}
```

- [ ] **Step 2: Reescribir `UsersPage.tsx` completo**

```tsx
// zarza-web/src/admin/UsersPage.tsx
import { useState } from 'react';
import { Button, Select, Space, Table, Tag, Typography } from 'antd';
import {
  PlusOutlined,
  TeamOutlined,
  UserOutlined,
  SafetyCertificateOutlined,
  EyeOutlined,
  CrownOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useUsers } from './hooks/useUsers';
import { useAdminStats } from './hooks/useAdminStats';
import { CreateUserModal } from './CreateUserModal';
import { UserDrawer } from './UserDrawer';
import type { User } from './types';
import { Role } from '../auth/types';
import { ROLE_TAG } from '../shared/roleTag';
import { lightTheme } from '../shared/lightTheme';
import { SurfaceCard } from '../shared/SurfaceCard';
import { KpiCardHorizontal } from '../shared/KpiCardHorizontal';

const { Title } = Typography;
const T = lightTheme;

const ROLE_FILTER_OPTIONS = [
  { value: '', label: 'Todos los roles' },
  { value: Role.PRODUCTOR, label: 'Productor' },
  { value: Role.AGRONOMO, label: 'Agrónomo' },
  { value: Role.MONITOR, label: 'Monitor' },
];

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
  const statsQuery = useAdminStats();
  const byRole = statsQuery.data?.usersByRole;

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

      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <KpiCardHorizontal
          icon={<TeamOutlined aria-hidden="true" style={{ fontSize: 18 }} />}
          value={statsQuery.data?.totalUsers ?? 0}
          label="Total usuarios"
          color={T.gray}
          loading={statsQuery.isLoading}
        />
        <KpiCardHorizontal
          icon={<UserOutlined aria-hidden="true" style={{ fontSize: 18 }} />}
          value={byRole?.[Role.PRODUCTOR] ?? 0}
          label="Productores"
          color={T.emerald}
          loading={statsQuery.isLoading}
        />
        <KpiCardHorizontal
          icon={<SafetyCertificateOutlined aria-hidden="true" style={{ fontSize: 18 }} />}
          value={byRole?.[Role.AGRONOMO] ?? 0}
          label="Agrónomos"
          color={T.brand}
          loading={statsQuery.isLoading}
        />
        <KpiCardHorizontal
          icon={<EyeOutlined aria-hidden="true" style={{ fontSize: 18 }} />}
          value={byRole?.[Role.MONITOR] ?? 0}
          label="Monitores"
          color={T.warn}
          loading={statsQuery.isLoading}
        />
        <KpiCardHorizontal
          icon={<CrownOutlined aria-hidden="true" style={{ fontSize: 18 }} />}
          value={byRole?.[Role.ADMIN] ?? 0}
          label="Admins"
          color={T.gray}
          loading={statsQuery.isLoading}
        />
      </div>

      <SurfaceCard>
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
          size="middle"
          scroll={{ x: 'max-content' }}
          onRow={(record) => ({
            onClick: () => setSelectedUser(record),
            style: { cursor: 'pointer' },
          })}
          pagination={{
            current: page,
            pageSize: 20,
            total: usersQuery.data?.total ?? 0,
            onChange: setPage,
            showTotal: (total) => `${total} usuarios`,
          }}
        />
      </SurfaceCard>

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

- [ ] **Step 3: Verificar tipos**

Run: `cd zarza-web && npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 4: Commit**

```bash
git add zarza-web/src/admin/hooks/useAdminStats.ts zarza-web/src/admin/UsersPage.tsx
git commit -m "feat(zarza-web): agregar KPIs y card a UsersPage"
```

---

### Task 6: KPIs + card en `CamposPage.tsx`

**Files:**
- Modify: `zarza-web/src/campos/CamposPage.tsx`

- [ ] **Step 1: Reescribir `CamposPage.tsx` completo**

```tsx
// zarza-web/src/campos/CamposPage.tsx
import { useState } from 'react';
import {
  Button,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  notification,
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  EnvironmentOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import {
  useCampos,
  useDeleteCampo,
  useAgronomosList,
  useAssignAgronomoToCampo,
  type Campo,
} from './hooks/useCampos';
import { CreateCampoModal } from './CreateCampoModal';
import { EditCampoPolygonModal } from './EditCampoPolygonModal';
import { useAuth } from '../auth/useAuth';
import { Role } from '../auth/types';
import { lightTheme } from '../shared/lightTheme';
import { SurfaceCard } from '../shared/SurfaceCard';
import { KpiCardHorizontal } from '../shared/KpiCardHorizontal';

const { Title } = Typography;
const T = lightTheme;

export function CamposPage() {
  const { user } = useAuth();
  const camposQuery = useCampos();
  const deleteMutation = useDeleteCampo();
  const agronoms = useAgronomosList(user?.role === Role.ADMIN);
  const assignMutation = useAssignAgronomoToCampo();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCampo, setEditingCampo] = useState<Campo | null>(null);

  const canCreate = user?.role === Role.ADMIN || user?.role === Role.PRODUCTOR;
  const canDelete = user?.role === Role.ADMIN;

  function canEditPoligono(campo: Campo): boolean {
    if (user?.role === Role.ADMIN) return true;
    return user?.role === Role.PRODUCTOR && campo.productorId === user.sub;
  }

  async function handleDelete(id: string) {
    try {
      await deleteMutation.mutateAsync(id);
      notification.success({ message: 'Campo eliminado' });
    } catch {
      notification.error({ message: 'Error al eliminar campo' });
    }
  }

  const campos = camposQuery.data ?? [];
  const conLimites = campos.filter((c) => (c.poligonoGps?.length ?? 0) >= 3).length;
  const sinDefinir = campos.length - conLimites;
  const productoresDistintos = new Set(campos.map((c) => c.productorId)).size;

  const columns: ColumnsType<Campo> = [
    { title: 'Código', dataIndex: 'codigoCampo', key: 'codigoCampo' },
    { title: 'Nombre', dataIndex: 'nombre', key: 'nombre' },
    {
      title: 'Productor',
      key: 'productor',
      ellipsis: true,
      render: (_: unknown, record: Campo) => record.productor?.email ?? record.productorId,
    },
    {
      title: 'Alta',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (v: string) => new Date(v).toLocaleDateString('es-MX'),
    },
    {
      title: 'Límites',
      key: 'poligono',
      render: (_: unknown, record: Campo) =>
        canEditPoligono(record) ? (
          <Button
            size="small"
            icon={<EnvironmentOutlined />}
            onClick={() => setEditingCampo(record)}
          >
            Editar límites
          </Button>
        ) : (record.poligonoGps?.length ?? 0) >= 3 ? (
          <Tag color="green">Definidos</Tag>
        ) : (
          <Tag>Sin definir</Tag>
        ),
    },
    ...(canDelete
      ? [
          {
            title: 'Agrónomo',
            key: 'agronomo',
            render: (_: unknown, record: Campo) => {
              const assigned = agronoms.data?.find((a) =>
                a.campos_asignados.includes(record.id),
              );
              return (
                <Select
                  size="small"
                  style={{ minWidth: 160 }}
                  value={assigned?.id ?? null}
                  loading={
                    agronoms.isLoading ||
                    (assignMutation.isPending &&
                      assignMutation.variables?.campoId === record.id)
                  }
                  allowClear
                  placeholder="Sin asignar"
                  onChange={async (val: string | null) => {
                    try {
                      await assignMutation.mutateAsync({
                        campoId: record.id,
                        newAgronomoId: val ?? null,
                        agronoms: agronoms.data ?? [],
                      });
                    } catch {
                      notification.error({ message: 'Error al asignar agrónomo' });
                    }
                  }}
                  options={(agronoms.data ?? []).map((a) => ({
                    value: a.id,
                    label: a.email,
                  }))}
                  onClick={(e) => e.stopPropagation()}
                />
              );
            },
          } as ColumnsType<Campo>[number],
          {
            title: 'Acciones',
            key: 'actions',
            render: (_: unknown, record: Campo) => (
              <Popconfirm
                title="¿Eliminar este campo?"
                onConfirm={() => handleDelete(record.id)}
                okText="Sí"
                cancelText="No"
              >
                <Button
                  danger
                  size="small"
                  icon={<DeleteOutlined />}
                  loading={
                    deleteMutation.isPending &&
                    deleteMutation.variables === record.id
                  }
                />
              </Popconfirm>
            ),
          } as ColumnsType<Campo>[number],
        ]
      : []),
  ];

  return (
    <div>
      <Space
        style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }}
      >
        <Title level={4} style={{ margin: 0 }}>
          Campos / Huertas
        </Title>
        {canCreate && (
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setModalOpen(true)}
          >
            Nuevo Campo
          </Button>
        )}
      </Space>

      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <KpiCardHorizontal
          icon={<EnvironmentOutlined aria-hidden="true" style={{ fontSize: 18 }} />}
          value={campos.length}
          label="Total campos"
          color={T.gray}
          loading={camposQuery.isLoading}
        />
        <KpiCardHorizontal
          icon={<CheckCircleOutlined aria-hidden="true" style={{ fontSize: 18 }} />}
          value={conLimites}
          label="Con límites definidos"
          color={T.emerald}
          loading={camposQuery.isLoading}
        />
        <KpiCardHorizontal
          icon={<ExclamationCircleOutlined aria-hidden="true" style={{ fontSize: 18 }} />}
          value={sinDefinir}
          label="Sin definir"
          color={T.warn}
          loading={camposQuery.isLoading}
        />
        <KpiCardHorizontal
          icon={<TeamOutlined aria-hidden="true" style={{ fontSize: 18 }} />}
          value={productoresDistintos}
          label="Productores"
          color={T.brand}
          loading={camposQuery.isLoading}
        />
      </div>

      <SurfaceCard>
        <Table
          rowKey="id"
          dataSource={campos}
          columns={columns}
          loading={camposQuery.isLoading}
          size="middle"
          scroll={{ x: 'max-content' }}
          pagination={{ pageSize: 20, showTotal: (total) => `${total} campos` }}
        />
      </SurfaceCard>

      <CreateCampoModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
      />

      <EditCampoPolygonModal
        campo={editingCampo}
        open={!!editingCampo}
        onClose={() => setEditingCampo(null)}
      />
    </div>
  );
}
```

- [ ] **Step 2: Verificar tipos**

Run: `cd zarza-web && npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add zarza-web/src/campos/CamposPage.tsx
git commit -m "feat(zarza-web): agregar KPIs y card a CamposPage"
```

---

### Task 7: KPIs + card en `SolicitudesPage.tsx`

**Files:**
- Modify: `zarza-web/src/solicitudes/SolicitudesPage.tsx`

- [ ] **Step 1: Reescribir `SolicitudesPage.tsx` completo**

```tsx
// zarza-web/src/solicitudes/SolicitudesPage.tsx
import { useState } from 'react';
import {
  Button,
  Select,
  Space,
  Table,
  Typography,
} from 'antd';
import {
  PlusOutlined,
  ClockCircleOutlined,
  SyncOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import {
  useSolicitudes,
  useCamposOptions,
  type Solicitud,
  type EstadoSolicitud,
} from './hooks/useSolicitudes';
import { EstadoBadge } from './EstadoBadge';
import { UpdateEstadoDropdown } from './UpdateEstadoDropdown';
import { CreateSolicitudModal } from './CreateSolicitudModal';
import { SolicitudDetailDrawer } from './SolicitudDetailDrawer';
import { useAuth } from '../auth/useAuth';
import { Role } from '../auth/types';
import { lightTheme } from '../shared/lightTheme';
import { SurfaceCard } from '../shared/SurfaceCard';
import { KpiCardHorizontal } from '../shared/KpiCardHorizontal';

const { Title } = Typography;
const T = lightTheme;

const ESTADO_FILTER_OPTIONS = [
  { value: '', label: 'Todos los estados' },
  { value: 'PENDIENTE', label: 'Pendiente' },
  { value: 'EN_PROGRESO', label: 'En Progreso' },
  { value: 'COMPLETADO', label: 'Completado' },
  { value: 'CANCELADO', label: 'Cancelado' },
];

export function SolicitudesPage() {
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const [estado, setEstado] = useState<EstadoSolicitud | ''>('');
  const [campoId, setCampoId] = useState<string>('');
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedSolicitud, setSelectedSolicitud] = useState<Solicitud | null>(null);

  const solicitudesQuery = useSolicitudes({
    page,
    limit: 20,
    estado: estado || undefined,
    campo_id: campoId || undefined,
  });
  const camposQuery = useCamposOptions();

  const pendienteQuery = useSolicitudes({ estado: 'PENDIENTE', limit: 1 });
  const enProgresoQuery = useSolicitudes({ estado: 'EN_PROGRESO', limit: 1 });
  const completadoQuery = useSolicitudes({ estado: 'COMPLETADO', limit: 1 });
  const canceladoQuery = useSolicitudes({ estado: 'CANCELADO', limit: 1 });

  const canCreate = user?.role === Role.ADMIN || user?.role === Role.AGRONOMO;
  const canChangeEstado =
    user?.role === Role.ADMIN ||
    user?.role === Role.AGRONOMO ||
    user?.role === Role.MONITOR;

  const columns: ColumnsType<Solicitud> = [
    {
      title: 'Campo',
      key: 'campo',
      ellipsis: true,
      render: (_: unknown, record: Solicitud) => record.campo?.nombre ?? '—',
    },
    {
      title: 'Asignado a',
      key: 'asignadoA',
      ellipsis: true,
      render: (_: unknown, record: Solicitud) => record.asignadoA?.email ?? '—',
    },
    { title: 'Mensaje', dataIndex: 'mensaje', key: 'mensaje', ellipsis: true },
    {
      title: 'Fecha límite',
      dataIndex: 'fechaLimite',
      key: 'fechaLimite',
      render: (v: string | null) =>
        v ? new Date(v).toLocaleDateString('es-MX') : '—',
    },
    {
      title: 'Estado',
      dataIndex: 'estado',
      key: 'estado',
      render: (estado: EstadoSolicitud, record) =>
        canChangeEstado ? (
          <UpdateEstadoDropdown
            solicitudId={record.id}
            currentEstado={estado}
          />
        ) : (
          <EstadoBadge estado={estado} />
        ),
    },
    {
      title: 'Creada',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (v: string) => new Date(v).toLocaleDateString('es-MX'),
    },
  ];

  return (
    <div>
      <Space
        style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }}
      >
        <Title level={4} style={{ margin: 0 }}>
          Solicitudes de Muestreo
        </Title>
        {canCreate && (
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setModalOpen(true)}
          >
            Nueva Solicitud
          </Button>
        )}
      </Space>

      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <KpiCardHorizontal
          icon={<ClockCircleOutlined aria-hidden="true" style={{ fontSize: 18 }} />}
          value={pendienteQuery.data?.total ?? 0}
          label="Pendiente"
          color={T.gray}
          loading={pendienteQuery.isLoading}
        />
        <KpiCardHorizontal
          icon={<SyncOutlined aria-hidden="true" style={{ fontSize: 18 }} />}
          value={enProgresoQuery.data?.total ?? 0}
          label="En Progreso"
          color={T.brand}
          loading={enProgresoQuery.isLoading}
        />
        <KpiCardHorizontal
          icon={<CheckCircleOutlined aria-hidden="true" style={{ fontSize: 18 }} />}
          value={completadoQuery.data?.total ?? 0}
          label="Completado"
          color={T.emerald}
          loading={completadoQuery.isLoading}
        />
        <KpiCardHorizontal
          icon={<CloseCircleOutlined aria-hidden="true" style={{ fontSize: 18 }} />}
          value={canceladoQuery.data?.total ?? 0}
          label="Cancelado"
          color={T.danger}
          loading={canceladoQuery.isLoading}
        />
      </div>

      <SurfaceCard>
        <Space style={{ marginBottom: 16 }} wrap>
          <Select
            value={estado}
            onChange={(v) => { setEstado(v); setPage(1); }}
            options={ESTADO_FILTER_OPTIONS}
            style={{ width: 200 }}
            placeholder="Filtrar por estado"
          />
          <Select
            value={campoId}
            onChange={(v) => { setCampoId(v); setPage(1); }}
            loading={camposQuery.isLoading}
            allowClear
            style={{ width: 240 }}
            placeholder="Filtrar por campo"
            options={[
              { value: '', label: 'Todos los campos' },
              ...(camposQuery.data ?? []).map((c) => ({
                value: c.id,
                label: `${c.codigoCampo} — ${c.nombre}`,
              })),
            ]}
          />
        </Space>

        <Table
          rowKey="id"
          dataSource={solicitudesQuery.data?.data ?? []}
          columns={columns}
          loading={solicitudesQuery.isLoading}
          size="middle"
          scroll={{ x: 'max-content' }}
          onRow={(record) => ({
            onClick: () => setSelectedSolicitud(record),
            style: { cursor: 'pointer' },
          })}
          pagination={{
            current: page,
            pageSize: 20,
            total: solicitudesQuery.data?.total ?? 0,
            onChange: setPage,
            showTotal: (total) => `${total} solicitudes`,
          }}
        />
      </SurfaceCard>

      {canCreate && (
        <CreateSolicitudModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
        />
      )}

      <SolicitudDetailDrawer
        solicitud={selectedSolicitud}
        open={!!selectedSolicitud}
        onClose={() => setSelectedSolicitud(null)}
      />
    </div>
  );
}
```

- [ ] **Step 2: Verificar tipos**

Run: `cd zarza-web && npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add zarza-web/src/solicitudes/SolicitudesPage.tsx
git commit -m "feat(zarza-web): agregar KPIs y card a SolicitudesPage"
```

---

### Task 8: KPIs + card en `AnalisisPage.tsx`

**Files:**
- Modify: `zarza-web/src/analisis/AnalisisPage.tsx`

- [ ] **Step 1: Reescribir `AnalisisPage.tsx` completo**

`AnalisisTab` (el componente interno que renderiza cada tab) queda igual — los KPI y el `SurfaceCard` se agregan solo en el componente `AnalisisPage` exportado, con 3 queries nuevas independientes de qué tab esté activa.

```tsx
// zarza-web/src/analisis/AnalisisPage.tsx
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button, Space, Table, Tabs, Tag, Typography, notification } from 'antd';
import {
  ClockCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useAnalisisList, useValidateAnalisis } from './useAnalisis';
import { AnalisisDetailModal } from './AnalisisDetailModal';
import { useAuth } from '../auth/useAuth';
import { Role } from '../auth/types';
import type { Analysis, EstadoValidacion, ValidateAnalisisPayload } from './types';
import { lightTheme } from '../shared/lightTheme';
import { SurfaceCard } from '../shared/SurfaceCard';
import { KpiCardHorizontal } from '../shared/KpiCardHorizontal';

const { Title } = Typography;
const T = lightTheme;

const ESTADO_TAG: Record<string, { color: string; label: string }> = {
  validado: { color: 'green', label: 'Validado' },
  rechazado: { color: 'red', label: 'Rechazado' },
  pendiente: { color: 'default', label: 'Pendiente' },
};

function AnalisisTab({ estado }: { estado: EstadoValidacion }) {
  const { user } = useAuth();
  const canValidate = user?.role === Role.AGRONOMO || user?.role === Role.ADMIN;
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const query = useAnalisisList(estado, page);
  const validateMutation = useValidateAnalisis();

  const columns: ColumnsType<Analysis> = [
    {
      title: 'Campo',
      key: 'campo',
      ellipsis: true,
      render: (_: unknown, record: Analysis) =>
        record.campo
          ? `${record.campo.codigoCampo} — ${record.campo.nombre}`
          : record.campoId ?? '—',
    },
    {
      title: 'Fecha',
      dataIndex: 'fechaAnalisis',
      key: 'fechaAnalisis',
      render: (v: string | undefined) =>
        v ? new Date(v).toLocaleDateString('es-MX') : '—',
    },
    {
      title: 'Etapa predominante',
      key: 'etapa',
      render: (_: unknown, record: Analysis) => {
        if (!record.fenologiaEtapas?.length) return '—';
        const top = [...record.fenologiaEtapas].sort((a, b) => b.cantidad - a.cantidad)[0];
        return top.etapa;
      },
    },
    {
      title: 'Total detectados',
      dataIndex: 'totalElementosDetectados',
      key: 'totalElementosDetectados',
      render: (v: number | undefined) => v ?? '—',
    },
    {
      title: 'Validación',
      key: 'validacion',
      render: (_: unknown, record: Analysis) => {
        const est = record.validacionEstado ?? 'pendiente';
        const tag = ESTADO_TAG[est] ?? ESTADO_TAG['pendiente'];
        if (est !== 'pendiente' || !canValidate) {
          return <Tag color={tag.color}>{tag.label}</Tag>;
        }
        return (
          <Space size={4} onClick={(e) => e.stopPropagation()}>
            <Tag color="default">Pendiente</Tag>
            <Button
              size="small"
              type="primary"
              loading={
                validateMutation.isPending &&
                (validateMutation.variables as { id: string; payload: ValidateAnalisisPayload } | undefined)?.id === record.id
              }
              onClick={async () => {
                try {
                  await validateMutation.mutateAsync({
                    id: record.id,
                    payload: { action: 'validado' },
                  });
                } catch {
                  notification.error({ message: 'Error al validar análisis' });
                }
              }}
            >
              Validar
            </Button>
            <Button
              size="small"
              danger
              onClick={() => setSelectedId(record.id)}
            >
              Rechazar
            </Button>
          </Space>
        );
      },
    },
  ];

  return (
    <>
      <Table
        rowKey="id"
        dataSource={query.data?.data ?? []}
        columns={columns}
        loading={query.isLoading}
        onRow={(record) => ({ onClick: () => setSelectedId(record.id) })}
        style={{ cursor: 'pointer' }}
        pagination={{
          current: page,
          pageSize: 20,
          total: query.data?.total ?? 0,
          onChange: setPage,
        }}
      />
      <AnalisisDetailModal
        analysisId={selectedId}
        open={!!selectedId}
        onClose={() => setSelectedId(null)}
      />
    </>
  );
}

export function AnalisisPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const deepLinkId = searchParams.get('id');

  const pendientesQuery = useAnalisisList('pendiente', 1, 1);
  const validadosQuery = useAnalisisList('validado', 1, 1);
  const rechazadosQuery = useAnalisisList('rechazado', 1, 1);

  function closeDeepLink() {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete('id');
        return next;
      },
      { replace: true },
    );
  }

  return (
    <div>
      <Title level={4} style={{ marginBottom: 16 }}>
        Revisión de Análisis
      </Title>

      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <KpiCardHorizontal
          icon={<ClockCircleOutlined aria-hidden="true" style={{ fontSize: 18 }} />}
          value={pendientesQuery.data?.total ?? 0}
          label="Pendientes"
          color={T.gray}
          loading={pendientesQuery.isLoading}
        />
        <KpiCardHorizontal
          icon={<CheckCircleOutlined aria-hidden="true" style={{ fontSize: 18 }} />}
          value={validadosQuery.data?.total ?? 0}
          label="Validados"
          color={T.emerald}
          loading={validadosQuery.isLoading}
        />
        <KpiCardHorizontal
          icon={<CloseCircleOutlined aria-hidden="true" style={{ fontSize: 18 }} />}
          value={rechazadosQuery.data?.total ?? 0}
          label="Rechazados"
          color={T.danger}
          loading={rechazadosQuery.isLoading}
        />
      </div>

      <SurfaceCard>
        <Tabs
          defaultActiveKey="pendientes"
          items={[
            {
              key: 'pendientes',
              label: 'Pendientes',
              children: <AnalisisTab estado="pendiente" />,
            },
            {
              key: 'validados',
              label: 'Validados',
              children: <AnalisisTab estado="validado" />,
            },
            {
              key: 'rechazados',
              label: 'Rechazados',
              children: <AnalisisTab estado="rechazado" />,
            },
          ]}
        />
      </SurfaceCard>

      <AnalisisDetailModal
        analysisId={deepLinkId}
        open={!!deepLinkId}
        onClose={closeDeepLink}
      />
    </div>
  );
}
```

- [ ] **Step 2: Verificar tipos**

Run: `cd zarza-web && npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add zarza-web/src/analisis/AnalisisPage.tsx
git commit -m "feat(zarza-web): agregar KPIs y card a AnalisisPage"
```

---

### Task 9: KPI + card en `ColaRevisionPage.tsx`

**Files:**
- Modify: `zarza-web/src/revision-detecciones/ColaRevisionPage.tsx`

- [ ] **Step 1: Reescribir `ColaRevisionPage.tsx` completo**

```tsx
// zarza-web/src/revision-detecciones/ColaRevisionPage.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Button, Table, Typography } from 'antd';
import { FileSearchOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useColaRevision } from './useDetecciones';
import type { Analysis } from '../analisis/types';
import { lightTheme } from '../shared/lightTheme';
import { SurfaceCard } from '../shared/SurfaceCard';
import { KpiCardHorizontal } from '../shared/KpiCardHorizontal';

const T = lightTheme;

export function ColaRevisionPage() {
  const [page, setPage] = useState(1);
  const query = useColaRevision(page);
  const navigate = useNavigate();

  const columns: ColumnsType<Analysis> = [
    {
      title: 'Campo',
      key: 'campo',
      render: (_: unknown, record: Analysis) =>
        record.campo ? `${record.campo.codigoCampo} — ${record.campo.nombre}` : record.campoId ?? '—',
    },
    {
      title: 'Fecha',
      dataIndex: 'fechaAnalisis',
      render: (v: string | undefined) =>
        v ? new Date(v).toLocaleDateString('es-MX') : '—',
    },
    {
      title: 'Total detectados',
      dataIndex: 'totalElementosDetectados',
      render: (v: number | undefined) => v ?? '—',
    },
    {
      title: '',
      key: 'actions',
      render: (_: unknown, record: Analysis) => (
        <Button size="small" onClick={() => navigate(`/analisis/${record.id}/revision-detecciones`)}>
          Revisar
        </Button>
      ),
    },
  ];

  return (
    <div>
      <Typography.Title level={4} style={{ marginBottom: 16 }}>
        Cola de revisión de detecciones
      </Typography.Title>

      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <KpiCardHorizontal
          icon={<FileSearchOutlined aria-hidden="true" style={{ fontSize: 18 }} />}
          value={query.data?.total ?? 0}
          label="Pendientes de revisión"
          color={T.brand}
          loading={query.isLoading}
        />
      </div>

      {query.isError && (
        <Alert
          type="error"
          message="No se pudo cargar la cola de revisión."
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}
      <SurfaceCard>
        <Table
          rowKey="id"
          dataSource={query.data?.data ?? []}
          columns={columns}
          loading={query.isLoading}
          pagination={{
            current: page,
            pageSize: 20,
            total: query.data?.total ?? 0,
            onChange: setPage,
          }}
        />
      </SurfaceCard>
    </div>
  );
}
```

- [ ] **Step 2: Verificar tipos**

Run: `cd zarza-web && npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add zarza-web/src/revision-detecciones/ColaRevisionPage.tsx
git commit -m "feat(zarza-web): agregar KPI y card a ColaRevisionPage"
```

---

### Task 10: Verificación de build completo

**Files:** ninguno (solo verificación)

- [ ] **Step 1: Confirmar que no queda ningún hex legacy en los 3 archivos**

Run:
```bash
cd zarza-web && grep -rn "#722ed1\|#389e0d\|#1890ff\|#cf1322" src/admin/UserDrawer.tsx src/solicitudes/SolicitudDetailDrawer.tsx
grep -n "#f0f0f0" src/analisis/AnalisisDetailModal.tsx
grep -n "#52c41a" src/solicitudes/SolicitudDetailDrawer.tsx
```
Expected: sin resultados (vacío) en las tres.

- [ ] **Step 2: Build completo**

Run: `cd zarza-web && npm run build`
Expected: termina sin errores (`tsc -b && vite build`).

- [ ] **Step 3: Commit (si el build generó cambios de lockfile o similar; normalmente no hay nada que commitear en este paso)**

No aplica si `git status` no muestra cambios nuevos.

---

### Task 11: Verificación manual en navegador (por rol)

**Files:** ninguno (verificación manual, no de código)

- [ ] **Step 1: Levantar el stack**

Run: `docker compose up postgres rabbitmq redis -d` (desde la raíz del monorepo) y luego, en `zarza-web`, `npm run dev`. Asegurarse de que `fruit-backend` esté corriendo (Docker o `pnpm run start:dev`) para que `/admin/stats`, `/campos`, `/solicitudes`, `/analyses` respondan con datos reales.

- [ ] **Step 2: Pase como ADMIN**

Iniciar sesión como un usuario `ADMIN`. Visitar `/usuarios`, `/campos`, `/solicitudes`, `/analisis`, `/revision-detecciones`. Para cada una:
- Las tarjetas KPI muestran números (no quedan en 0 permanentemente ni en loading infinito).
- Los números de las tarjetas KPI de rol/estado suman el `Total usuarios` (Usuarios) — comparar mentalmente contra la cantidad de filas visibles en la tabla paginada.
- La tabla y sus filtros quedan dentro de una card blanca con sombra, visualmente igual al patrón del Dashboard.
- Abrir `UserDrawer` (click en una fila de Usuarios), `AnalisisDetailModal` (click en Análisis) y `SolicitudDetailDrawer` (click en Solicitudes): confirmar que abren, que el texto coloreado (labels de sección, botones) se ve en los nuevos tonos (morado `#064E3B` en vez del viejo `#722ed1`, etc.) y que las acciones (guardar nombre/rol/campos/contraseña, eliminar usuario, validar/rechazar análisis, cambiar estado de solicitud) siguen funcionando.

- [ ] **Step 3: Pase como PRODUCTOR, AGRONOMO, MONITOR**

Repetir con un usuario de cada rol (ver tabla de rutas protegidas por rol en `zarza-web/README.md` o `App.tsx`). Confirmar:
- Cada uno ve solo las páginas de su `GROUP_*` en `AppShell.tsx`.
- Los KPI reflejan el subconjunto scoped por rol (ej. un Agrónomo en Solicitudes ve KPIs coherentes con las solicitudes que su cuenta puede listar, no el total global de todos los productores).

- [ ] **Step 4: Confirmar que `RevisionDeteccionesPage` no cambió**

Desde `/revision-detecciones`, click en "Revisar" sobre un análisis pendiente. Confirmar que el editor de detecciones (imagen + overlay + sidebar) se ve exactamente igual que antes de este trabajo — canvas oscuro, colores de etapa sin cambios.

- [ ] **Step 5: Confirmar accesibilidad básica**

Inspeccionar el DOM de una tarjeta KPI en loading: debe tener `role="status"` y `aria-label="Cargando…"`. Inspeccionar un ícono de tarjeta KPI: debe tener `aria-hidden="true"`.

---

## Notas para quien ejecute este plan

- Cada página modificada se reescribe completa (Write) en vez de diffs parciales — son archivos de 100-220 líneas y así se evita ambigüedad de merge. Antes de escribir, `Read` el archivo actual para confirmar que nadie lo tocó desde que se escribió este plan.
- Si el proyecto está en worktree separado (recomendado por las convenciones globales del usuario para features nuevas), asegurarse de que `fruit-inference/best.pt` y los `.env` de cada servicio existan en ese checkout antes del Task 11 — ver `docs/superpowers/plans/2026-08-12-pipeline-reentrenamiento.md` para los gotchas ya conocidos de ese setup si aplica.
