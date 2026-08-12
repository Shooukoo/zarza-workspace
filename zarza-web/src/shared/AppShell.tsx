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
  { key: '/revision-detecciones', label: 'Revisión de Detecciones', roles: [Role.ADMIN, Role.AGRONOMO] },
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
