import { useState } from 'react';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { notification } from 'antd';
import {
  DashboardOutlined,
  EnvironmentOutlined,
  FileTextOutlined,
  AuditOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { useAuth } from '../auth/useAuth';
import { Role } from '../auth/types';
import { useWebSocket } from './useWebSocket';

// ── Design tokens ──────────────────────────────────────────────────
const T = {
  obsidian:  '#0D0221',
  obsidian2: '#160630',
  obsidian3: '#1F0A40',
  frost:     '#F5F5FA',
  frostDim:  '#C8C8D4',
  gray:      '#8A8AA0',
  grayLine:  '#2A1547',
  rubus:     '#7B00D4',
  rubusLt:   '#A030F0',
  rubusDim:  'rgba(123,0,212,0.18)',
  emerald:   '#10B981',
};

const NAV_ITEMS = [
  { key: '/dashboard',   label: 'Dashboard',       icon: <DashboardOutlined />, roles: [Role.ADMIN, Role.PRODUCTOR] },
  { key: '/usuarios',    label: 'Usuarios',         icon: <TeamOutlined />,      roles: [Role.ADMIN] },
  { key: '/campos',      label: 'Campos / Huertas', icon: <EnvironmentOutlined />, roles: [Role.ADMIN, Role.PRODUCTOR, Role.AGRONOMO] },
  { key: '/solicitudes', label: 'Solicitudes',      icon: <FileTextOutlined />,  roles: [Role.ADMIN, Role.AGRONOMO, Role.MONITOR] },
  { key: '/analisis',    label: 'Revisión IA',      icon: <AuditOutlined />,     roles: [Role.ADMIN, Role.AGRONOMO, Role.PRODUCTOR] },
];

const ROLE_LABEL: Record<Role, string> = {
  [Role.ADMIN]:     'Administrador',
  [Role.PRODUCTOR]: 'Productor',
  [Role.AGRONOMO]:  'Agrónomo',
  [Role.MONITOR]:   'Monitor',
};


export function AppShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

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

  const visibleItems = NAV_ITEMS.filter(
    (item) => user && item.roles.includes(user.role),
  );

  async function handleLogout() {
    try {
      await logout();
      navigate('/login', { replace: true });
    } catch {
      notification.error({ message: 'Error al cerrar sesión' });
    }
  }

  const initials = user?.email?.slice(0, 2).toUpperCase() ?? '?';
  const sidebarW = collapsed ? 64 : 220;

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: T.obsidian, fontFamily: "'Lexend', sans-serif" }}>
      {/* ── Sidebar ── */}
      <aside style={{
        width: sidebarW, flexShrink: 0, display: 'flex', flexDirection: 'column',
        background: T.obsidian2, borderRight: `1px solid ${T.grayLine}`,
        padding: '24px 0', transition: 'width 0.2s ease', overflow: 'hidden',
      }}>
        {/* Logo */}
        <div style={{
          padding: collapsed ? '0 14px 24px' : '0 20px 24px',
          borderBottom: `1px solid ${T.grayLine}`,
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <img src="/logo-rubus.png" alt="RubusAI" style={{
            width: 36, height: 36, borderRadius: 10, flexShrink: 0,
            objectFit: 'cover', cursor: 'pointer',
            boxShadow: `0 4px 16px ${T.rubus}44`,
          }} onClick={() => setCollapsed(c => !c)} />
          {!collapsed && (
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: T.frost, whiteSpace: 'nowrap' }}>
                RubusAI
              </div>
              <div style={{ fontSize: 10, color: T.gray, letterSpacing: '0.06em' }}>ADMIN PANEL</div>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav style={{ padding: collapsed ? '16px 8px' : '16px 10px', flex: 1 }}>
          {visibleItems.map(item => {
            const active = location.pathname === item.key;
            return (
              <Link
                key={item.key}
                to={item.key}
                title={collapsed ? item.label : undefined}
                aria-current={active ? 'page' : undefined}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center',
                  gap: collapsed ? 0 : 10, justifyContent: collapsed ? 'center' : 'flex-start',
                  padding: collapsed ? '10px' : '10px 12px',
                  borderRadius: 10, border: 'none', cursor: 'pointer',
                  marginBottom: 2,
                  background: active ? T.rubusDim : 'transparent',
                  color: active ? T.frost : T.gray,
                  fontFamily: "'Lexend', sans-serif",
                  fontSize: 13, fontWeight: active ? 600 : 400,
                  transition: 'all 0.15s ease',
                  position: 'relative',
                  textDecoration: 'none',
                }}>
                {active && !collapsed && (
                  <div style={{
                    position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)',
                    width: 3, height: 20, background: T.rubus, borderRadius: '0 4px 4px 0',
                  }}/>
                )}
                <span style={{ color: active ? T.rubusLt : T.gray, display: 'flex' }}>
                  {item.icon}
                </span>
                {!collapsed && item.label}
              </Link>
            );
          })}
        </nav>

        {/* User */}
        <div style={{
          padding: collapsed ? '16px 12px' : '16px 20px',
          borderTop: `1px solid ${T.grayLine}`,
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <div style={{
            width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
            background: `linear-gradient(135deg, #3D006A, ${T.rubus})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13, fontWeight: 700, color: '#fff',
          }}>{initials}</div>
          {!collapsed && (
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: T.frost, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.email ?? '—'}
              </div>
              <div style={{ fontSize: 10, color: T.gray }}>
                {user ? ROLE_LABEL[user.role] : ''}
              </div>
            </div>
          )}
          {!collapsed && (
            <button
              onClick={handleLogout}
              title="Cerrar sesión"
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: T.gray, fontSize: 16, padding: 4, flexShrink: 0,
                display: 'flex', alignItems: 'center',
              }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>
              </svg>
            </button>
          )}
        </div>
      </aside>

      {/* ── Main ── */}
      <main style={{ flex: 1, overflow: 'auto', background: T.obsidian, padding: '28px 32px' }}>
        <Outlet />
      </main>
    </div>
  );
}
