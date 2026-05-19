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
