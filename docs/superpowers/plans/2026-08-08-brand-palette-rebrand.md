# Rebrand de Paleta (Emerald Ink + Champagne) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reemplazar el morado "rubus" (`#7B00D4`) por la nueva paleta de marca (Emerald Ink `#064E3B` + Champagne `#EAD6A0`) en todo lo ya shippeado de `zarza-web` (Login, Dashboard, AppShell), y consolidar el tema de antd en un solo `ConfigProvider` global.

**Architecture:** `main.tsx` pasa de un `ConfigProvider` oscuro global a uno claro con los tokens de `lightTheme.ts` como fuente única; los `ConfigProvider` locales de `LoginPage.tsx`, `DashboardPage.tsx` y `AppShell.tsx` se eliminan por redundantes. `lightTheme.ts` gana 4 tokens (`brand`, `brandDeep`, `champagne`, `terracotta`) y pierde 3 (`rubus`, `rubusLt`, `pink`). El racimo de moras de la ilustración del Login conserva su morado real (es la fruta, no la marca).

**Tech Stack:** React 18 + TypeScript + antd 5.29 (`zarza-web`, no test runner — verificación por `tsc --noEmit` + revisión manual en navegador, según convención del proyecto).

**Spec:** `docs/superpowers/specs/2026-08-08-brand-palette-rebrand-design.md`

---

### Task 1: `lightTheme.ts` — nuevos tokens de marca

**Files:**
- Modify: `zarza-web/src/shared/lightTheme.ts` (full rewrite)

- [ ] **Step 1: Reemplazar el contenido completo del archivo**

Reemplaza todo el contenido de `zarza-web/src/shared/lightTheme.ts` con:

```ts
// zarza-web/src/shared/lightTheme.ts
export const lightTheme = {
  canvas:     '#EEF0F5',
  surface:    '#FFFFFF',
  ink:        '#13102B',
  gray:       '#6B7280',
  grayLine:   '#E5E7EB',
  brand:      '#064E3B',
  brandDeep:  '#022C22',
  champagne:  '#EAD6A0',
  terracotta: '#B96B4A',
  emerald:    '#10B981',
  warn:       '#F59E0B',
  danger:     '#EF4444',
} as const;
```

Se eliminan `rubus`, `rubusLt`, `pink`. Se añaden `brand` (Emerald Ink, color primario de marca), `brandDeep` (verde casi negro, extremo oscuro de gradientes), `champagne` (acento cálido, ya ajustado tras la revisión de contraste — no es el `#F8E7C9` original) y `terracotta` (color de apoyo para datos, no es color de marca). `emerald` (semántico de éxito) se queda sin cambios y sigue siendo un token aparte de `brand`.

- [ ] **Step 2: Type-check**

Run: `cd zarza-web && npx tsc --noEmit`
Expected: FALLA — errores en `AppShell.tsx`, `LoginPage.tsx`, `DashboardPage.tsx` y `main.tsx` por referencias a `rubus`/`rubusLt`/`pink`, que ya no existen en `lightTheme.ts`. Esto es esperado en este punto; se arregla en las Tareas 2-5. Confirma que los errores son específicamente sobre esos tokens y no otra cosa.

- [ ] **Step 3: Commit**

```bash
git add zarza-web/src/shared/lightTheme.ts
git commit -m "feat(zarza-web): replace rubus/rubusLt/pink tokens with Emerald Ink brand palette"
```

---

### Task 2: `main.tsx` — consolidar el tema global en claro

**Files:**
- Modify: `zarza-web/src/main.tsx` (full rewrite)

- [ ] **Step 1: Reemplazar el contenido completo del archivo**

`main.tsx` hoy define un `ConfigProvider` global en `theme.darkAlgorithm` con overrides de componente (`Table`/`Modal`/`Drawer`/`Select`/`Input`/`DatePicker`) pensados para el tema oscuro — incluido un `rowHoverBg: 'rgba(123,0,212,0.08)'` que es el mismo morado rubus escrito en RGB crudo (un grep de texto por "rubus" no lo habría encontrado). Ese bloque completo se elimina: con `theme.defaultAlgorithm` y los tokens base ya en claro, antd resuelve los fondos de esos componentes correctamente sin forzarlos — es el mismo patrón mínimo que ya probaron suficiente los `ConfigProvider` locales de Login/Dashboard/AppShell (que nunca necesitaron overrides de componente).

Reemplaza todo el contenido de `zarza-web/src/main.tsx` con:

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConfigProvider, theme } from 'antd';
import esES from 'antd/locale/es_ES';
import { AuthProvider } from './auth/AuthContext';
import { App } from './App';
import { lightTheme } from './shared/lightTheme';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* Los flags v7_startTransition y v7_relativeSplatPath eran opt-ins de v6:
        en react-router v7 son el comportamiento por defecto y la prop ya no existe. */}
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <ConfigProvider
          locale={esES}
          theme={{
            algorithm: theme.defaultAlgorithm,
            token: {
              colorPrimary: lightTheme.brand,
              colorBgContainer: lightTheme.surface,
              colorBorder: lightTheme.grayLine,
              colorText: lightTheme.ink,
              colorSuccess: lightTheme.emerald,
              colorWarning: lightTheme.warn,
              colorError: lightTheme.danger,
              borderRadius: 12,
              fontFamily: "'Lexend', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            },
          }}
        >
          <AuthProvider>
            <App />
          </AuthProvider>
        </ConfigProvider>
      </QueryClientProvider>
    </BrowserRouter>
  </StrictMode>,
);
```

- [ ] **Step 2: Type-check**

Run: `cd zarza-web && npx tsc --noEmit`
Expected: sigue fallando en `AppShell.tsx`, `LoginPage.tsx`, `DashboardPage.tsx` (mismos errores de la Tarea 1, no relacionados con este archivo). Confirma que `main.tsx` ya no aparece en la lista de errores.

- [ ] **Step 3: Commit**

```bash
git add zarza-web/src/main.tsx
git commit -m "refactor(zarza-web): consolidate global antd theme in main.tsx as light Emerald Ink palette"
```

---

### Task 3: `AppShell.tsx` — recolor y quitar el ConfigProvider local

**Files:**
- Modify: `zarza-web/src/shared/AppShell.tsx` (full rewrite)

- [ ] **Step 1: Reemplazar el contenido completo del archivo**

Cambios: `T.rubus` → `T.brand` en el subrayado de nav activo y en el avatar; se elimina el `ConfigProvider` local (ya redundante tras la Tarea 2) y con él el import de `ConfigProvider`/`theme` de antd, que quedarían sin uso.

Reemplaza todo el contenido de `zarza-web/src/shared/AppShell.tsx` con:

```tsx
import { useState } from 'react';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { notification, Avatar, Dropdown } from 'antd';
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
  const [menuOpen, setMenuOpen] = useState(false);
  const initials = user?.email?.slice(0, 2).toUpperCase() ?? '?';

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 20,
      padding: '16px 32px', flexShrink: 0,
      background: scrolled ? T.surface : 'transparent',
      boxShadow: scrolled ? '0 2px 12px rgba(17,17,40,0.06)' : 'none',
      transition: 'background 180ms ease, box-shadow 180ms ease',
    }}>
      {NAV_GROUPS
        .map((group) => (user ? group.filter((item) => item.roles.includes(user.role)) : []))
        .filter((visible) => visible.length > 0)
        .map((visible, gi) => (
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
                      borderBottom: active ? `2px solid ${T.brand}` : '2px solid transparent',
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
        ))}

      <Divider height={24} />

      <Dropdown
        trigger={['click']}
        open={menuOpen}
        onOpenChange={setMenuOpen}
        popupRender={() => (
          <div
            role="menu"
            style={{
              width: 200, background: T.surface, borderRadius: 12,
              boxShadow: '0 12px 32px rgba(17,17,40,0.14)',
              border: `1px solid ${T.grayLine}`, overflow: 'hidden',
            }}
          >
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
          </div>
        )}
      >
        <button
          type="button"
          aria-haspopup="true"
          aria-expanded={menuOpen}
          style={{
            padding: 6, cursor: 'pointer', lineHeight: 0,
            background: 'none', border: 'none',
          }}
        >
          <Avatar size={32} style={{ background: T.brand, color: '#fff', fontSize: 12, fontWeight: 700 }}>
            {initials}
          </Avatar>
        </button>
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
      <TopBar
        user={user}
        activePath={location.pathname}
        scrolled={scrolled}
        onLogout={handleLogout}
      />

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
Expected: `AppShell.tsx` ya no aparece en los errores. Siguen los de `LoginPage.tsx` y `DashboardPage.tsx` (Tareas 4 y 5).

- [ ] **Step 3: Commit**

```bash
git add zarza-web/src/shared/AppShell.tsx
git commit -m "feat(zarza-web): recolor AppShell to brand green, drop redundant local ConfigProvider"
```

---

### Task 4: `LoginPage.tsx` — recolor y quitar el ConfigProvider local

**Files:**
- Modify: `zarza-web/src/auth/LoginPage.tsx` (full rewrite)

- [ ] **Step 1: Reemplazar el contenido completo del archivo**

Cambios: gradientes de logo/botón/panel decorativo pasan de morado a verde de marca; el foco de accesibilidad y el ícono decorativo usan `T.brand`; la pantalla del teléfono y el borde del recuadro de detección usan `T.brandDeep`/`T.champagne`; el marco del teléfono (bisel, antes `#160630`) pasa a `#0A241C` (casi negro con tinte verde, ajuste cosmético menor para coherencia). El racimo de moras (`zw-berry-hl`) y las hojas **no cambian** — representan la fruta real, no la marca. Se elimina el `ConfigProvider` local (ya redundante tras la Tarea 2) y el import de `ConfigProvider`/`theme`, que quedarían sin uso.

Reemplaza todo el contenido de `zarza-web/src/auth/LoginPage.tsx` con:

```tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Input, Button, notification } from 'antd';
import { useAuth } from './useAuth';
import { defaultRouteForRole } from './defaultRoute';
import { lightTheme as T } from '../shared/lightTheme';

interface LoginFormValues {
  email: string;
  password: string;
}

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  async function onFinish(values: LoginFormValues) {
    setLoading(true);
    try {
      const loggedUser = await login(values.email, values.password);
      navigate(defaultRouteForRole(loggedUser.role), { replace: true });
    } catch {
      notification.error({
        message: 'Credenciales incorrectas',
        description: 'Verifica tu email y contraseña e inténtalo de nuevo.',
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="zw-login-page"
      style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: T.canvas, fontFamily: "'Lexend', sans-serif", padding: '40px 24px',
      }}
    >
      <style>{`
        .zw-login-card { width: 100%; max-width: 1180px; min-height: 640px; display: flex; }
        .zw-login-form-col { flex: 1 1 480px; padding: 56px 64px; }
        .zw-login-art-col { flex: 1 1 520px; margin: 16px; }
        @media (max-width: 960px) {
          .zw-login-art-col { display: none; }
          .zw-login-form-col { flex: 1 1 100%; }
        }
        @media (max-width: 560px) {
          .zw-login-page { padding: 0 !important; }
          .zw-login-card { border-radius: 0 !important; min-height: 100vh; }
          .zw-login-form-col { padding: 40px 24px; }
        }
        .zw-cloud {
          position: absolute; border-radius: 50%; filter: blur(2px);
          background: rgba(255,255,255,0.35); pointer-events: none;
        }
        .zw-float { animation: zw-bob 6s ease-in-out infinite; }
        @keyframes zw-bob {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        @media (prefers-reduced-motion: reduce) {
          .zw-float { animation: none; }
        }
        .zw-login-submit {
          transition: transform 0.12s ease, filter 0.12s ease;
          touch-action: manipulation;
        }
        .zw-login-submit:hover { filter: brightness(1.08); }
        .zw-login-submit:active { transform: scale(0.98); }
        .zw-login-submit:focus-visible {
          outline: 2px solid ${T.brand};
          outline-offset: 3px;
        }
      `}</style>

      <div
        className="zw-login-card"
        style={{
          background: '#FFFFFF', borderRadius: 32,
          boxShadow: '0 24px 70px rgba(17,17,40,0.14)', overflow: 'hidden',
        }}
      >
        {/* ── Left: form ── */}
        <div className="zw-login-form-col" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ width: '100%', maxWidth: 360 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 48 }}>
              <span aria-hidden="true" style={{
                width: 16, height: 16, borderRadius: 5,
                background: `linear-gradient(135deg, ${T.emerald}, ${T.brand})`,
                display: 'inline-block',
              }} />
              <span style={{ fontSize: 15, fontWeight: 700, color: T.ink }}>RubusAI</span>
            </div>

            <h1 style={{
              fontSize: 38, lineHeight: 1.15, fontWeight: 700, color: T.ink,
              textWrap: 'balance', margin: '0 0 12px',
            }}>
              Hola,<br />Bienvenido de Vuelta
            </h1>
            <p style={{ fontSize: 14, color: T.gray, margin: '0 0 32px' }}>
              Ingresa tus credenciales para acceder a tu panel
            </p>

            <Form layout="vertical" onFinish={onFinish} scrollToFirstError>
              <Form.Item
                label={<span style={{ color: T.ink, fontSize: 13, fontWeight: 500 }}>Email</span>}
                name="email"
                rules={[
                  { required: true, message: 'Ingresa tu email' },
                  { type: 'email', message: 'Email inválido' },
                ]}
              >
                <Input
                  id="email"
                  name="email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  spellCheck={false}
                  autoFocus
                  placeholder="admin@rubus.mx"
                  size="large"
                  style={{ border: `1px solid ${T.grayLine}`, borderRadius: 12 }}
                />
              </Form.Item>
              <Form.Item
                label={<span style={{ color: T.ink, fontSize: 13, fontWeight: 500 }}>Contraseña</span>}
                name="password"
                rules={[{ required: true, message: 'Ingresa tu contraseña' }]}
              >
                <Input.Password
                  id="password"
                  name="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  size="large"
                  style={{ border: `1px solid ${T.grayLine}`, borderRadius: 12 }}
                />
              </Form.Item>
              <Form.Item style={{ marginBottom: 0, marginTop: 20 }}>
                <Button
                  className="zw-login-submit"
                  type="primary"
                  htmlType="submit"
                  loading={loading}
                  size="large"
                  style={{
                    background: `linear-gradient(135deg, ${T.emerald}, ${T.brand})`,
                    border: 'none', borderRadius: 12, height: 48, minWidth: 160,
                    fontSize: 15, fontWeight: 600, fontFamily: "'Lexend', sans-serif",
                    boxShadow: `0 8px 24px ${T.brand}33`,
                  }}
                >
                  {loading ? 'Iniciando sesión…' : 'Iniciar Sesión'}
                </Button>
              </Form.Item>
            </Form>

            <div style={{ marginTop: 56 }}>
              <span style={{ fontSize: 11, color: '#9CA3AF' }}>
                Plataforma de inteligencia agrícola · <span style={{ color: T.emerald, fontWeight: 600 }}>v2.0</span>
              </span>
            </div>
          </div>
        </div>

        {/* ── Right: illustration ── */}
        <div
          className="zw-login-art-col"
          style={{
            position: 'relative', borderRadius: 24, overflow: 'hidden',
            background: `linear-gradient(155deg, ${T.emerald} 0%, ${T.brand} 55%, ${T.brandDeep} 100%)`,
          }}
        >
          <div aria-hidden="true" className="zw-cloud" style={{ width: 160, height: 160, top: -50, left: -40 }} />
          <div aria-hidden="true" className="zw-cloud" style={{ width: 100, height: 100, top: 40, left: 90, opacity: 0.5 }} />
          <div aria-hidden="true" className="zw-cloud" style={{ width: 200, height: 200, bottom: -70, right: -60 }} />
          <div aria-hidden="true" className="zw-cloud" style={{ width: 90, height: 90, bottom: 60, right: 120, opacity: 0.4 }} />

          <svg
            aria-hidden="true"
            viewBox="0 0 400 500"
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
          >
            <defs>
              <linearGradient id="zw-screen" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor={T.brandDeep} />
                <stop offset="100%" stopColor={T.champagne} />
              </linearGradient>
              <radialGradient id="zw-berry-hl" cx="35%" cy="30%" r="70%">
                <stop offset="0%" stopColor="#5B2A86" />
                <stop offset="100%" stopColor="#1F0A40" />
              </radialGradient>
            </defs>

            {/* Phone frame */}
            <g className="zw-float">
              <rect x="100" y="70" width="200" height="370" rx="34" fill="#0A241C" stroke="rgba(255,255,255,0.25)" strokeWidth="2" />
              <rect x="112" y="88" width="176" height="334" rx="22" fill="url(#zw-screen)" />
              <rect x="178" y="80" width="44" height="8" rx="4" fill="rgba(255,255,255,0.35)" />

              {/* Leaves */}
              <path d="M175 250 Q150 220 165 190 Q195 205 190 240 Z" fill="#34D399" opacity="0.9" />
              <path d="M225 245 Q255 220 245 188 Q212 200 215 235 Z" fill="#10B981" opacity="0.9" />

              {/* Blackberry cluster */}
              {[
                [200, 210], [188, 222], [212, 222], [180, 236], [200, 236], [220, 236],
                [190, 250], [210, 250], [200, 262],
              ].map(([cx, cy], i) => (
                <circle key={i} cx={cx} cy={cy} r="9" fill="url(#zw-berry-hl)" stroke="rgba(255,255,255,0.15)" />
              ))}

              {/* Detection box */}
              <rect x="165" y="196" width="72" height="80" rx="6" fill="none" stroke={T.champagne} strokeWidth="1.5" strokeDasharray="4 4" />
              <path d="M165 206v-10a4 4 0 014-4h10" fill="none" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" />
              <path d="M237 266v10a4 4 0 01-4 4h-10" fill="none" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" />

              {/* Result chip */}
              <rect x="150" y="298" width="100" height="26" rx="13" fill="#FFFFFF" />
              <text x="200" y="315" textAnchor="middle" fontSize="11" fontWeight="700" fill={T.ink} fontFamily="'Lexend', sans-serif">
                Etapa 5 · 97%
              </text>

              {/* Progress bar */}
              <rect x="150" y="340" width="100" height="6" rx="3" fill="rgba(255,255,255,0.25)" />
              <rect x="150" y="340" width="70" height="6" rx="3" fill="#FFFFFF" />
            </g>
          </svg>

          <div
            aria-hidden="true"
            className="zw-float"
            style={{
              position: 'absolute', top: '18%', left: '10%',
              width: 52, height: 52, borderRadius: '50%', background: '#FFFFFF',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 10px 24px rgba(0,0,0,0.18)',
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={T.emerald} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </div>

          <div
            aria-hidden="true"
            className="zw-float"
            style={{
              position: 'absolute', bottom: '14%', right: '12%', animationDelay: '1.5s',
              width: 48, height: 48, borderRadius: 14, background: '#FFFFFF',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 10px 24px rgba(0,0,0,0.18)',
            }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={T.brand} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2l2.4 6.2L21 10l-6.2 2.4L12 19l-2.4-6.6L3 10l6.6-1.8z" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `cd zarza-web && npx tsc --noEmit`
Expected: `LoginPage.tsx` ya no aparece en los errores. Solo quedan los de `DashboardPage.tsx` (Tarea 5).

- [ ] **Step 3: Commit**

```bash
git add zarza-web/src/auth/LoginPage.tsx
git commit -m "feat(zarza-web): recolor LoginPage to brand green, keep blackberry cluster's real color"
```

---

### Task 5: `DashboardPage.tsx` — recolor y quitar el ConfigProvider local

**Files:**
- Modify: `zarza-web/src/dashboard/DashboardPage.tsx:2` (import)
- Modify: `zarza-web/src/dashboard/DashboardPage.tsx:31-39` (mapa CHIP)
- Modify: `zarza-web/src/dashboard/DashboardPage.tsx:62` (parcela P4)
- Modify: `zarza-web/src/dashboard/DashboardPage.tsx:75` (glow shadow)
- Modify: `zarza-web/src/dashboard/DashboardPage.tsx:85` (Sparkline default)
- Modify: `zarza-web/src/dashboard/DashboardPage.tsx:167` (KPI Total Detectados)
- Modify: `zarza-web/src/dashboard/DashboardPage.tsx:204` (phenoColors)
- Modify: `zarza-web/src/dashboard/DashboardPage.tsx:210-223,473` (ConfigProvider)
- Modify: `zarza-web/src/dashboard/DashboardPage.tsx:309-312` (gradiente de barras)
- Modify: `zarza-web/src/dashboard/DashboardPage.tsx:395` (Resumen de Salud)
- Modify: `zarza-web/src/dashboard/DashboardPage.tsx:423-424` (badge "4 activas")
- Modify: `zarza-web/src/dashboard/DashboardPage.tsx:462` (leyenda "Monitoreada")

Este archivo se edita con cambios puntuales (no full-rewrite) porque es grande (476 líneas) y la mayor parte del árbol de JSX no cambia — un rewrite completo sería más riesgoso de transcribir sin errores que ediciones quirúrgicas.

- [ ] **Step 1: Import — quitar `ConfigProvider`/`theme`, ya no se usan tras el Step 8**

Cambia:

```tsx
import { Spin, ConfigProvider, theme } from 'antd';
```

a:

```tsx
import { Spin } from 'antd';
```

- [ ] **Step 2: Mapa `CHIP` — reemplazar la entrada de `rubus` y añadir `terracotta`**

Cambia:

```tsx
const CHIP: Record<string, { bg: string; fg: string }> = {
  [T.emerald]: { bg: '#ECFDF5', fg: '#047857' },
  [T.rubus]:   { bg: '#F3E8FF', fg: '#7B00D4' },
  [T.warn]:    { bg: '#FFFBEB', fg: '#B45309' },
  [T.danger]:  { bg: '#FEF2F2', fg: '#B91C1C' },
};
```

a:

```tsx
const CHIP: Record<string, { bg: string; fg: string }> = {
  [T.emerald]:    { bg: '#ECFDF5', fg: '#047857' },
  [T.brand]:      { bg: '#E3F0EA', fg: '#064E3B' },
  [T.warn]:       { bg: '#FFFBEB', fg: '#B45309' },
  [T.danger]:     { bg: '#FEF2F2', fg: '#B91C1C' },
  [T.terracotta]: { bg: '#FBEEE7', fg: '#9A4A2E' },
};
```

`[T.terracotta]` es una entrada nueva que no estaba en el spec original — hace falta porque `chipFor()` cae a un gris genérico (`{ bg: '#F3F4F6', fg: '#374151' }`, línea 38, sin cambios) para cualquier color sin entrada propia en `CHIP`. Sin esta entrada, la parcela "Monitoreada" (Step 3) y su punto en la leyenda (Step 12) se verían grises en vez de terracota, rompiendo la distinción de estado. El par bg/fg sigue el mismo patrón que los demás: fondo pastel muy claro + versión más oscura/saturada del color base como texto.

- [ ] **Step 3: Parcela P4 ("Monitoreada") — de `T.rubus` a `T.terracotta`**

Cambia:

```tsx
  { x: 240, y: 30, w: 65, h: 70, label: 'P4', color: T.rubus, status: 'Monitoreada' },
```

a:

```tsx
  { x: 240, y: 30, w: 65, h: 70, label: 'P4', color: T.terracotta, status: 'Monitoreada' },
```

- [ ] **Step 4: Sombra `glow` de `SurfaceCard` — RGB crudo de rubus a RGB de brand**

`rgba(123,0,212,0.18)` es el mismo `#7B00D4` (rubus) escrito como RGB — no lo detecta un grep por el texto "rubus". El prop `glow` no se usa hoy en ningún `<SurfaceCard>` de este archivo, pero se corrige para que no reaparezca el morado si se activa en el futuro.

Cambia:

```tsx
      boxShadow: glow
        ? '0 12px 32px rgba(123,0,212,0.18)'
        : '0 12px 32px rgba(17,17,40,0.08)',
```

a:

```tsx
      boxShadow: glow
        ? '0 12px 32px rgba(6,78,59,0.18)'
        : '0 12px 32px rgba(17,17,40,0.08)',
```

- [ ] **Step 5: Color por defecto de `Sparkline` — `T.rubus` a `T.brand`**

Cambia:

```tsx
function Sparkline({ data, color = T.rubus, height = 36 }: { data: number[]; color?: string; height?: number }) {
```

a:

```tsx
function Sparkline({ data, color = T.brand, height = 36 }: { data: number[]; color?: string; height?: number }) {
```

- [ ] **Step 6: KPI "Total Detectados" — `T.rubus` a `T.brand`**

Cambia:

```tsx
    {
      label: 'Total Detectados',
      value: h?.totalDetected ?? 0,
      unit: '',
      color: T.rubus,
```

a:

```tsx
    {
      label: 'Total Detectados',
      value: h?.totalDetected ?? 0,
      unit: '',
      color: T.brand,
```

- [ ] **Step 7: Paleta de 7 colores del gráfico de fenología**

Cambia:

```tsx
  const phenoColors = [T.rubus, T.rubusLt, '#4A1D8A', T.emerald, T.warn, T.danger, T.gray];
```

a:

```tsx
  const phenoColors = [T.brand, T.emerald, T.champagne, T.warn, T.danger, T.gray, T.terracotta];
```

- [ ] **Step 8: Quitar el `ConfigProvider` local**

El bloque `<ConfigProvider theme={{...}}>` que envuelve todo el render (líneas 210-223 de apertura, línea 473 de cierre) se elimina — ya es redundante tras la Tarea 2. Para minimizar el riesgo de reindentar a mano las ~260 líneas que quedan entre esas etiquetas, esta edición solo borra las líneas de apertura y cierre del `ConfigProvider`, dejando el contenido interior con 2 espacios de indentación de más (cosmético, no funcional — no hay lint/format configurado en `zarza-web` que lo marque).

Cambia (apertura):

```tsx
  return (
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
      <div style={{
```

a:

```tsx
  return (
      <div style={{
```

Cambia (cierre, al final del archivo):

```tsx
        </div>
      </div>
    </ConfigProvider>
  );
}
```

a:

```tsx
        </div>
      </div>
  );
}
```

- [ ] **Step 9: Gradiente del gráfico de barras (Proyección de Cosecha)**

Cambia:

```tsx
                    <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={T.rubusLt} stopOpacity={1}/>
                      <stop offset="60%" stopColor={T.rubus} stopOpacity={1}/>
                      <stop offset="100%" stopColor="#3D006A" stopOpacity={1}/>
                    </linearGradient>
```

a:

```tsx
                    <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={T.emerald} stopOpacity={1}/>
                      <stop offset="60%" stopColor={T.brand} stopOpacity={1}/>
                      <stop offset="100%" stopColor={T.brandDeep} stopOpacity={1}/>
                    </linearGradient>
```

- [ ] **Step 10: Fila "Total detectados" en Resumen de Salud**

Cambia:

```tsx
                  { label: 'Total detectados', value: h?.totalDetected ?? 0, color: T.rubus },
```

a:

```tsx
                  { label: 'Total detectados', value: h?.totalDetected ?? 0, color: T.brand },
```

- [ ] **Step 11: Badge "4 activas" del Mapa de Parcelas**

Cambia:

```tsx
                background: chipFor(T.rubus).bg,
                color: chipFor(T.rubus).fg, fontSize: 11, fontWeight: 600,
```

a:

```tsx
                background: chipFor(T.brand).bg,
                color: chipFor(T.brand).fg, fontSize: 11, fontWeight: 600,
```

Este badge es un contador genérico ("4 activas"), no un indicador de estado — usa `T.brand` como acento de marca, a diferencia de la parcela P4 y su leyenda (Steps 3 y 12) que sí son el estado "Monitoreada" y usan `T.terracotta`.

- [ ] **Step 12: Leyenda del Mapa de Parcelas — "Monitoreada" a `T.terracotta`**

Cambia:

```tsx
                { c: T.emerald, l: 'Saludable' },
                { c: T.warn, l: 'Alerta' },
                { c: T.rubus, l: 'Monitoreada' },
```

a:

```tsx
                { c: T.emerald, l: 'Saludable' },
                { c: T.warn, l: 'Alerta' },
                { c: T.terracotta, l: 'Monitoreada' },
```

- [ ] **Step 13: Type-check**

Run: `cd zarza-web && npx tsc --noEmit`
Expected: PASA sin errores — es el mismo comando que en las Tareas 1-4, ahora debe quedar completamente limpio.

- [ ] **Step 14: Commit**

```bash
git add zarza-web/src/dashboard/DashboardPage.tsx
git commit -m "feat(zarza-web): recolor DashboardPage to brand green, add terracotta for chart + map status"
```

---

### Task 6: Verificación completa

**Files:** ninguno (solo verificación)

- [ ] **Step 1: Confirmar que no queda ninguna referencia a los tokens retirados**

Run: `cd zarza-web && grep -rn "rubus\|T\.pink" src/`
Expected: sin resultados (exit code 1 de grep, o salida vacía). Si aparece algo, es un residuo que se saltó alguna de las Tareas 1-5.

- [ ] **Step 2: Build de producción**

Run: `cd zarza-web && npm run build`
Expected: `tsc -b && vite build` completa sin errores de tipo ni de build.

- [ ] **Step 3: Pase visual manual**

Run: `cd zarza-web && npm run dev`, abrir la app y revisar:

1. `/login`: logo, botón "Iniciar Sesión" y su sombra en gradiente verde (no morado); el panel decorativo de la derecha en gradiente verde con la pantalla del teléfono verde→champagne; el borde punteado del recuadro de detección en champagne; el racimo de moras **sigue morado/casi negro** (es la fruta, no cambia); el ícono de estrella (esquina inferior derecha del panel) en verde de marca.
2. `/dashboard`: la tarjeta KPI "Total Detectados" con su chip en tono menta claro y texto verde oscuro (no lavanda); el gráfico de barras "Proyección de Cosecha" con degradado verde; el donut "Distribución Fenológica" con 7 colores distinguibles (2 verdes en extremos opuestos de luminosidad, champagne, ámbar, rojo, gris, terracota); en "Mapa de Parcelas", la parcela P4 y la entrada "Monitoreada" de la leyenda en terracota (no morado), y el badge "4 activas" en verde de marca.
3. Top bar (cualquier página autenticada): el subrayado del ítem de navegación activo y el avatar en verde de marca.
4. Sin errores en la consola del navegador en ninguna de las páginas visitadas.

Expected: todo lo anterior se ve como se describe, sin ningún morado salvo el racimo de moras del Login.

No hay commit en esta tarea — solo verifica el trabajo ya commiteado en las Tareas 1-5.
