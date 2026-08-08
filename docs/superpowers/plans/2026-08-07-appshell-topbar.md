# AppShell Top Bar + Dashboard Welcome Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `zarza-web`'s dark sidebar with a role-grouped, transparent top bar (matching the light theme already shipped in `LoginPage.tsx`/`DashboardPage.tsx`), and give `DashboardPage.tsx` a real "Hola, {nombre}" greeting backed by the user's actual first name.

**Architecture:** `AppShell.tsx` moves from a `sidebar + main` flex row to a `top bar + main` flex column; the shared canvas background switches from dark to `lightTheme.canvas`. The top bar is a new `TopBar` sub-component defined inside `AppShell.tsx` (single consumer, no need for its own file) with three role-filtered nav groups (Visión general / Campo / Administración) right-aligned next to an avatar+dropdown, and a scroll-driven background toggle (no `position: sticky` needed — the bar lives outside `main`'s scrolling box, so it's already always visible). The greeting needs a real first name, which requires a small `fruit-backend` fix: `GET /auth/me` currently returns the raw JWT payload (`{sub, email, role}`, no name) instead of a full profile — a new `AuthService.getProfile()` method fixes that, reusing the existing `findUserById` + `_toProfile` pattern already used by `refresh()`. The frontend's `AuthContext.tsx` also gets a shared `id → sub` mapper so both `login()` and the `/auth/me` hydration path normalize the backend's `id`-keyed response into `AuthUser`'s `sub`-keyed shape consistently — today only `login()` does this explicitly; `/auth/me` currently "works" only by accident because it returns the JWT payload's `sub` field verbatim, which stops being true once it returns a full profile.

**Tech Stack:** NestJS 11 + Fastify (`fruit-backend`, Jest for tests), React 18 + TypeScript + antd 5.29 (`zarza-web`, no test runner — verification is `tsc` + manual browser checks per existing project convention).

**Spec:** `docs/superpowers/specs/2026-08-07-appshell-topbar-design.md`

---

### Task 1: Backend — `AuthService.getProfile()`

**Files:**
- Modify: `fruit-backend/src/auth/application/auth.service.ts`
- Modify: `fruit-backend/src/auth/application/auth.service.spec.ts`

- [ ] **Step 1: Extend the `makeUser()` test helper to respect `firstName`/`lastName` overrides**

`fruit-backend/src/auth/application/auth.service.spec.ts` currently hardcodes `null, null` for these fields regardless of what's passed in `overrides`, so a new test can't construct a user with a name. Replace:

```ts
function makeUser(overrides: Partial<User> = {}): User {
  return new User(
    overrides.id ?? 'user-1',
    overrides.email ?? 'test@example.com',
    'hashed-pw',
    (overrides.role as Role) ?? Role.PRODUCTOR,
    null,
    null,
  );
}
```

with:

```ts
function makeUser(overrides: Partial<User> = {}): User {
  return new User(
    overrides.id ?? 'user-1',
    overrides.email ?? 'test@example.com',
    'hashed-pw',
    (overrides.role as Role) ?? Role.PRODUCTOR,
    overrides.firstName ?? null,
    overrides.lastName ?? null,
  );
}
```

- [ ] **Step 2: Write the failing tests for `getProfile()`**

Add this `describe` block at the end of the outer `describe('AuthService', ...)` block, right after the closing `});` of `describe('logout()', ...)`:

```ts
  describe('getProfile()', () => {
    it('devuelve el perfil completo (incluye firstName/lastName) para un userId existente', async () => {
      const user = makeUser({ firstName: 'Ana', lastName: 'Pérez' });
      mockUserRepo.findUserById.mockResolvedValue(user);

      const result = await service.getProfile('user-1');

      expect(result).toEqual({
        id: 'user-1',
        email: 'test@example.com',
        role: Role.PRODUCTOR,
        firstName: 'Ana',
        lastName: 'Pérez',
      });
      expect(mockUserRepo.findUserById).toHaveBeenCalledWith('user-1');
    });

    it('lanza 401 si el userId no corresponde a ningún usuario', async () => {
      mockUserRepo.findUserById.mockResolvedValue(null);

      await expect(service.getProfile('missing-id')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `cd fruit-backend && pnpm exec jest src/auth/application/auth.service.spec.ts`
Expected: FAIL — `TypeError: service.getProfile is not a function` (2 failing tests in the new `getProfile()` block, all prior tests still pass).

- [ ] **Step 4: Implement `getProfile()`**

In `fruit-backend/src/auth/application/auth.service.ts`, add this public method to the `AuthService` class, right after `logout()` and before the `private _generateRefreshToken()` method:

```ts
  async getProfile(userId: string): Promise<UserProfile> {
    const user = await this.userRepository.findUserById(userId);
    if (!user) throw new UnauthorizedException('Usuario no encontrado');
    return this._toProfile(user);
  }
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `cd fruit-backend && pnpm exec jest src/auth/application/auth.service.spec.ts`
Expected: PASS — all tests in the file green, including the 2 new `getProfile()` tests.

- [ ] **Step 6: Commit**

```bash
git add fruit-backend/src/auth/application/auth.service.ts fruit-backend/src/auth/application/auth.service.spec.ts
git commit -m "feat(fruit-backend): add AuthService.getProfile() to fetch full user profile"
```

---

### Task 2: Backend — wire `GET /auth/me` to `getProfile()`

**Files:**
- Modify: `fruit-backend/src/auth/infrastructure/http/auth.controller.ts:119-123`

- [ ] **Step 1: Replace the `me()` handler**

`GET /auth/me` currently returns `req.user` directly — the raw JWT payload (`{sub, email, role}`), with no name data. Replace:

```ts
  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@Req() req: any) {
    return req.user;
  }
```

with:

```ts
  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@Req() req: any) {
    return this.authService.getProfile(req.user.sub);
  }
```

No other line in the file changes. Note the response shape changes from `{sub, email, role}` to `{id, email, role, firstName, lastName}` (the `UserProfile` shape from `_toProfile`) — this is intentional and handled on the frontend in Task 4.

- [ ] **Step 2: Type-check the backend**

Run: `cd fruit-backend && pnpm exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add fruit-backend/src/auth/infrastructure/http/auth.controller.ts
git commit -m "fix(fruit-backend): GET /auth/me returns full profile (name) instead of raw JWT payload"
```

---

### Task 3: Frontend — extend `AuthUser` with name fields + `displayName()` helper

**Files:**
- Modify: `zarza-web/src/auth/types.ts`

- [ ] **Step 1: Replace the file contents**

Replace the entire contents of `zarza-web/src/auth/types.ts` with:

```ts
export enum Role {
  ADMIN = 'ADMIN',
  PRODUCTOR = 'PRODUCTOR',
  AGRONOMO = 'AGRONOMO',
  MONITOR = 'MONITOR',
}

export interface AuthUser {
  sub: string;
  email: string;
  role: Role;
  firstName: string | null;
  lastName: string | null;
}

export function displayName(user: AuthUser): string {
  const first = user.firstName?.trim();
  if (first) return first;
  return user.email.split('@')[0];
}
```

- [ ] **Step 2: Type-check**

Run: `cd zarza-web && npx tsc --noEmit`
Expected: errors in `AuthContext.tsx` (object literals missing `firstName`/`lastName` on `AuthUser`) — this is expected at this point, fixed in Task 4. Confirm the errors are specifically about the two `AuthUser` literals in `AuthContext.tsx` and nothing else, to make sure this step's own change is otherwise correct.

- [ ] **Step 3: Commit**

```bash
git add zarza-web/src/auth/types.ts
git commit -m "feat(zarza-web): add firstName/lastName to AuthUser and a displayName() helper"
```

---

### Task 4: Frontend — `AuthContext.tsx` propagates the real name, fixes `/auth/me` id→sub mapping

**Files:**
- Modify: `zarza-web/src/auth/AuthContext.tsx` (full rewrite)

- [ ] **Step 1: Replace the full file contents**

`login()` already receives `firstName`/`lastName` from the backend but discards them. Separately, the session-hydration effect (`GET /auth/me`) typed its response directly as `AuthUser` and relied on the backend happening to return a `sub` field — true only because the old `/auth/me` returned the raw JWT payload. After Task 2, `/auth/me` returns `{id, email, role, firstName, lastName}` (`id`, not `sub`), so hydration needs the same `id → sub` normalization `login()` already does. Both paths are unified through one shared mapper:

```tsx
import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import { apiClient } from '../api/client';
import { AuthUser, Role } from './types';

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

type BackendUserProfile = {
  id: string;
  email: string;
  role: Role;
  firstName: string | null;
  lastName: string | null;
};

function toAuthUser(u: BackendUserProfile): AuthUser {
  return {
    sub: u.id,
    email: u.email,
    role: u.role,
    firstName: u.firstName,
    lastName: u.lastName,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Hydrate session from existing cookie on mount
  useEffect(() => {
    apiClient
      .get<BackendUserProfile>('/auth/me')
      .then((res) => setUser(toAuthUser(res.data)))
      .catch(() => setUser(null))
      .finally(() => setIsLoading(false));
  }, []);

  async function login(email: string, password: string): Promise<AuthUser> {
    // Backend devuelve { user: { id, email, role, firstName, lastName } }
    const res = await apiClient.post<{ user: BackendUserProfile }>(
      '/auth/login',
      { email, password },
    );
    const authUser = toAuthUser(res.data.user);
    setUser(authUser);
    return authUser;
  }

  async function logout() {
    await apiClient.post('/auth/logout');
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuthContext must be used inside AuthProvider');
  return ctx;
}
```

- [ ] **Step 2: Type-check**

Run: `cd zarza-web && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add zarza-web/src/auth/AuthContext.tsx
git commit -m "fix(zarza-web): propagate real user name and normalize id->sub for /auth/me too"
```

---

### Task 5: Frontend — `AppShell.tsx` rewrite (sidebar → top bar)

**Files:**
- Modify: `zarza-web/src/shared/AppShell.tsx` (full rewrite)

This is the core task. It replaces the entire `sidebar + main` layout with `top bar + main`, removes the logo/collapse feature, and adds the role-grouped, scroll-aware top bar with an avatar dropdown.

- [ ] **Step 1: Replace the full file contents**

```tsx
import { useState } from 'react';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { notification, ConfigProvider, theme, Avatar, Dropdown } from 'antd';
import { useAuth } from '../auth/useAuth';
import { Role, AuthUser } from '../auth/types';
import { useWebSocket } from './useWebSocket';
import { lightTheme } from './lightTheme';

// ── Design tokens ──────────────────────────────────────────────────
const T = lightTheme;

interface NavItem {
  key: string;
  label: string;
  roles: Role[];
}

const GROUP_VISION: NavItem[] = [
  { key: '/dashboard', label: 'Dashboard', roles: [Role.ADMIN, Role.PRODUCTOR] },
];

const GROUP_CAMPO: NavItem[] = [
  { key: '/campos', label: 'Campos / Huertas', roles: [Role.ADMIN, Role.PRODUCTOR, Role.AGRONOMO] },
  { key: '/solicitudes', label: 'Solicitudes', roles: [Role.ADMIN, Role.AGRONOMO, Role.MONITOR] },
  { key: '/analisis', label: 'Revisión IA', roles: [Role.ADMIN, Role.AGRONOMO, Role.PRODUCTOR] },
];

const GROUP_ADMIN: NavItem[] = [
  { key: '/usuarios', label: 'Usuarios', roles: [Role.ADMIN] },
];

const NAV_GROUPS: NavItem[][] = [GROUP_VISION, GROUP_CAMPO, GROUP_ADMIN];

const ROLE_LABEL: Record<Role, string> = {
  [Role.ADMIN]:     'Administrador',
  [Role.PRODUCTOR]: 'Productor',
  [Role.AGRONOMO]:  'Agrónomo',
  [Role.MONITOR]:   'Monitor',
};

function Divider({ height = 20 }: { height?: number }) {
  return <div style={{ width: 1, height, background: T.grayLine, flexShrink: 0 }} />;
}

function TopBar({ user, activePath, scrolled, onLogout }: {
  user: AuthUser | null;
  activePath: string;
  scrolled: boolean;
  onLogout: () => void;
}) {
  const initials = user?.email?.slice(0, 2).toUpperCase() ?? '?';

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 20,
      padding: '16px 32px', flexShrink: 0,
      background: scrolled ? T.surface : 'transparent',
      boxShadow: scrolled ? '0 2px 12px rgba(17,17,40,0.06)' : 'none',
      transition: 'background 180ms ease, box-shadow 180ms ease',
    }}>
      {NAV_GROUPS.map((group, gi) => {
        const visible = user ? group.filter((item) => item.roles.includes(user.role)) : [];
        if (visible.length === 0) return null;
        return (
          <div key={gi} style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            {gi > 0 && <Divider />}
            <div style={{ display: 'flex', gap: 16 }}>
              {visible.map((item) => {
                const active = activePath === item.key;
                return (
                  <Link
                    key={item.key}
                    to={item.key}
                    aria-current={active ? 'page' : undefined}
                    style={{
                      fontSize: 13,
                      color: active ? T.ink : T.gray,
                      fontWeight: active ? 600 : 400,
                      borderBottom: active ? `2px solid ${T.rubus}` : '2px solid transparent',
                      paddingBottom: 4,
                      textDecoration: 'none',
                    }}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })}

      <Divider height={24} />

      <Dropdown
        trigger={['click']}
        popupRender={() => (
          <div style={{
            width: 200, background: T.surface, borderRadius: 12,
            boxShadow: '0 12px 32px rgba(17,17,40,0.14)',
            border: `1px solid ${T.grayLine}`, overflow: 'hidden',
          }}>
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
            <div
              role="menuitem"
              onClick={onLogout}
              style={{ padding: '10px 14px', fontSize: 13, color: T.danger, cursor: 'pointer' }}
            >
              Cerrar sesión
            </div>
          </div>
        )}
      >
        <div style={{ padding: 6, cursor: 'pointer', lineHeight: 0 }}>
          <Avatar size={32} style={{ background: T.rubus, color: '#fff', fontSize: 12, fontWeight: 700 }}>
            {initials}
          </Avatar>
        </div>
      </Dropdown>
    </div>
  );
}

export function AppShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);

  useWebSocket((event, data) => {
    if (event === 'analysis_validated' && user?.role === Role.PRODUCTOR) {
      const d = data as { action: string; validatedBy?: string };
      if (d.action === 'validado') {
        notification.success({
          message: 'Análisis validado',
          description: `El agrónomo ${d.validatedBy ?? 'desconocido'} validó el análisis.`,
        });
      } else {
        notification.warning({
          message: 'Análisis rechazado',
          description: `El agrónomo ${d.validatedBy ?? 'desconocido'} rechazó el análisis.`,
        });
      }
    }
  });

  async function handleLogout() {
    try {
      await logout();
      navigate('/login', { replace: true });
    } catch {
      notification.error({ message: 'Error al cerrar sesión' });
    }
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden',
      background: T.canvas, fontFamily: "'Lexend', sans-serif",
    }}>
      <ConfigProvider
        theme={{
          algorithm: theme.defaultAlgorithm,
          token: {
            colorPrimary: T.rubus,
            colorBgContainer: T.surface,
            colorBorder: T.grayLine,
            colorText: T.ink,
            borderRadius: 12,
            fontFamily: "'Lexend', sans-serif",
          },
        }}
      >
        <TopBar
          user={user}
          activePath={location.pathname}
          scrolled={scrolled}
          onLogout={handleLogout}
        />
      </ConfigProvider>

      <main
        onScroll={(e) => setScrolled(e.currentTarget.scrollTop > 0)}
        style={{ flex: 1, overflow: 'auto', padding: '28px 32px', background: T.canvas }}
      >
        <Outlet />
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `cd zarza-web && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Visual + role check**

Run: `cd zarza-web && npm run dev`, open the app, and log in as each of the 4 roles in turn (create temporary test users via `fruit-backend/scripts/seed-admin.js <email> <password>` if you don't have credentials handy for a role — remember to delete them from the `users` table afterward).

Expected per role:
- **ADMIN:** sees all 3 groups — Dashboard · (Campos/Huertas, Solicitudes, Revisión IA) · Usuarios.
- **PRODUCTOR:** sees Dashboard · (Campos/Huertas, Revisión IA) — no Solicitudes (not in its roles), no Usuarios group at all (empty group renders nothing, not even its divider).
- **AGRONOMO:** no Dashboard/Visión general group at all · (Campos/Huertas, Solicitudes, Revisión IA) — no Usuarios group.
- **MONITOR:** no Dashboard group · (Solicitudes only, since Campos/Huertas and Revisión IA aren't in its roles) — no Usuarios group.

Also confirm: no logo/RubusAI text anywhere in the panel, top bar is transparent at the top of any page, gains white background + shadow when scrolling a page with enough content to scroll (e.g. a long Usuarios/Campos list), clicking the avatar opens the dropdown (email + role, then "Cerrar sesión"), clicking outside or pressing `Escape` closes it, and "Cerrar sesión" logs out correctly.

- [ ] **Step 4: Commit**

```bash
git add zarza-web/src/shared/AppShell.tsx
git commit -m "feat(zarza-web): replace sidebar with role-grouped top bar"
```

---

### Task 6: Frontend — Dashboard welcome greeting

**Files:**
- Modify: `zarza-web/src/dashboard/DashboardPage.tsx:1-20` (imports), `:139-144` (component body), `:228-230` (header)

- [ ] **Step 1: Add the imports**

Change:

```tsx
import {
  useYieldForecast,
  useHealthMetrics,
  usePhenologyDistribution,
} from './hooks/useDashboard';
import { lightTheme } from '../shared/lightTheme';
```

to:

```tsx
import {
  useYieldForecast,
  useHealthMetrics,
  usePhenologyDistribution,
} from './hooks/useDashboard';
import { lightTheme } from '../shared/lightTheme';
import { useAuth } from '../auth/useAuth';
import { displayName } from '../auth/types';
```

- [ ] **Step 2: Read the authenticated user**

Change:

```tsx
export function DashboardPage() {
  const yieldQuery = useYieldForecast();
  const healthQuery = useHealthMetrics();
  const phenologyQuery = usePhenologyDistribution();

  const h = healthQuery.data;
```

to:

```tsx
export function DashboardPage() {
  const { user } = useAuth();
  const yieldQuery = useYieldForecast();
  const healthQuery = useHealthMetrics();
  const phenologyQuery = usePhenologyDistribution();

  const h = healthQuery.data;
```

- [ ] **Step 3: Replace the header text**

Change:

```tsx
            <h1 style={{ fontSize: 22, fontWeight: 700, color: T.ink, margin: 0, marginBottom: 4 }}>
              Dashboard
            </h1>
```

to:

```tsx
            <h1 style={{ fontSize: 22, fontWeight: 700, color: T.ink, margin: 0, marginBottom: 4 }}>
              Hola, {user ? displayName(user) : ''} 👋
            </h1>
```

No other line in the file changes.

- [ ] **Step 4: Type-check**

Run: `cd zarza-web && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Visual check**

Run: `cd zarza-web && npm run dev`, log in as a user with a `firstName` set, open `/dashboard`, confirm the header reads "Hola, {firstName} 👋". Log in as a user with no `firstName` set (or check via `psql`: `SELECT email, first_name FROM users;`) and confirm it falls back to the part of the email before `@`.

- [ ] **Step 6: Commit**

```bash
git add zarza-web/src/dashboard/DashboardPage.tsx
git commit -m "feat(zarza-web): greet the logged-in user by name on the Dashboard"
```

---

### Task 7: Full verification

**Files:** none (verification only)

- [ ] **Step 1: Backend build + full auth test suite**

Run: `cd fruit-backend && pnpm exec tsc --noEmit && pnpm exec jest src/auth`
Expected: no type errors, all auth tests pass (including the 2 new `getProfile()` tests from Task 1).

- [ ] **Step 2: Rebuild and restart the backend container**

The running `fruit-backend` Docker container is a built image (no source volume mount, no watch mode) — code changes need a rebuild to actually take effect for the manual browser check below.

Run: `docker compose up --build -d fruit-backend`
Expected: image rebuilds, container reports healthy (`docker compose ps` shows `fruit-backend` as `Up ... (healthy)`).

- [ ] **Step 3: Frontend production build**

Run: `cd zarza-web && npm run build`
Expected: `tsc -b && vite build` completes with no type errors and no build errors.

- [ ] **Step 4: End-to-end manual pass**

With the stack running (`docker compose ps` shows all services healthy) and `cd zarza-web && npm run dev`:

1. Log in as an ADMIN user. Confirm the top bar shows all 3 groups per Task 5 Step 3's table, the greeting on `/dashboard` shows a real name (or email prefix), and refreshing the page (F5) keeps showing the same name — this specifically exercises the `GET /auth/me` fix from Task 2 (before that fix, a refresh would have reverted to no-name / broken `user.sub`).
2. On `/campos`, log in as a PRODUCTOR and create a new campo. Confirm it succeeds — this exercises `CreateCampoModal.tsx`'s `user!.sub` usage, which depends on the `id → sub` mapping fixed in Task 4 for the `/auth/me` hydration path (test this via a page refresh right before creating the campo, not immediately after login, to make sure the hydration path — not just the login path — produces a correct `sub`).
3. Confirm no console errors in the browser DevTools across the pages visited.

Expected: all checks pass with no regressions.

No commit — this task only verifies work already committed in Tasks 1–6.
