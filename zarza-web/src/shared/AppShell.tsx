import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Button, Typography, Space, notification, Avatar, Tag } from 'antd';
import {
  DashboardOutlined,
  EnvironmentOutlined,
  FileTextOutlined,
  AuditOutlined,
  LogoutOutlined,
  UserOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { useAuth } from '../auth/useAuth';
import { Role } from '../auth/types';
import { useWebSocket } from './useWebSocket';

const { Sider, Header, Content } = Layout;
const { Text } = Typography;

const ROLE_TAG: Record<Role, { color: string; label: string }> = {
  [Role.ADMIN]: { color: 'gold', label: 'Admin' },
  [Role.PRODUCTOR]: { color: 'green', label: 'Productor' },
  [Role.AGRONOMO]: { color: 'blue', label: 'Agrónomo' },
  [Role.MONITOR]: { color: 'orange', label: 'Monitor' },
};

const NAV_ITEMS = [
  {
    key: '/dashboard',
    label: 'Dashboard',
    icon: <DashboardOutlined />,
    roles: [Role.ADMIN, Role.PRODUCTOR],
  },
  {
    key: '/usuarios',
    label: 'Usuarios',
    icon: <TeamOutlined />,
    roles: [Role.ADMIN],
  },
  {
    key: '/campos',
    label: 'Campos / Huertas',
    icon: <EnvironmentOutlined />,
    roles: [Role.ADMIN, Role.PRODUCTOR, Role.AGRONOMO],
  },
  {
    key: '/solicitudes',
    label: 'Solicitudes',
    icon: <FileTextOutlined />,
    roles: [Role.ADMIN, Role.AGRONOMO, Role.MONITOR],
  },
  {
    key: '/analisis',
    label: 'Revisión IA',
    icon: <AuditOutlined />,
    roles: [Role.ADMIN, Role.AGRONOMO, Role.PRODUCTOR],
  },
];

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
  ).map(({ key, label, icon }) => ({ key, label, icon }));

  async function handleLogout() {
    try {
      await logout();
      navigate('/login', { replace: true });
    } catch {
      notification.error({ message: 'Error al cerrar sesión' });
    }
  }

  const roleInfo = user ? ROLE_TAG[user.role] : null;
  const initials = user?.email?.slice(0, 2).toUpperCase() ?? '?';

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        style={{ boxShadow: '2px 0 8px rgba(0,0,0,0.15)' }}
      >
        <div
          style={{
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            padding: '0 16px',
            gap: 8,
          }}
        >
          <span style={{ fontSize: 22 }}>🌿</span>
          {!collapsed && (
            <div>
              <div style={{ color: '#fff', fontWeight: 700, fontSize: 16, lineHeight: 1.2 }}>
                Zarza AI
              </div>
              <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11 }}>
                Agricultura de precisión
              </div>
            </div>
          )}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={visibleItems}
          onClick={({ key }) => navigate(key)}
          style={{ marginTop: 8 }}
        />
      </Sider>

      <Layout>
        <Header
          style={{
            background: '#fff',
            padding: '0 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: 12,
            boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
            zIndex: 1,
          }}
        >
          <Space size={12} align="center">
            <Avatar
              size={32}
              style={{ backgroundColor: '#389e0d', cursor: 'default', flexShrink: 0 }}
              icon={<UserOutlined />}
            >
              {initials}
            </Avatar>
            <div style={{ lineHeight: 1.3 }}>
              <Text style={{ fontSize: 13, display: 'block' }}>{user?.email}</Text>
              {roleInfo && (
                <Tag color={roleInfo.color} style={{ marginTop: 2, lineHeight: '16px', fontSize: 11 }}>
                  {roleInfo.label}
                </Tag>
              )}
            </div>
            <Button
              type="text"
              icon={<LogoutOutlined />}
              onClick={handleLogout}
              style={{ color: '#888' }}
            >
              Salir
            </Button>
          </Space>
        </Header>

        <Content style={{ margin: 24 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
