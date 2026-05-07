import { useState } from 'react';
import {
  Button,
  Popconfirm,
  Select,
  Space,
  Table,
  Typography,
  notification,
} from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import {
  useCampos,
  useDeleteCampo,
  useAgronmosList,
  useAssignAgronomoToCampo,
  type Campo,
} from './hooks/useCampos';
import { CreateCampoModal } from './CreateCampoModal';
import { useAuth } from '../auth/useAuth';
import { Role } from '../auth/types';

const { Title } = Typography;

export function CamposPage() {
  const { user } = useAuth();
  const camposQuery = useCampos();
  const deleteMutation = useDeleteCampo();
  const agronoms = useAgronmosList();
  const assignMutation = useAssignAgronomoToCampo();
  const [modalOpen, setModalOpen] = useState(false);

  const canCreate = user?.role === Role.ADMIN || user?.role === Role.PRODUCTOR;
  const canDelete = user?.role === Role.ADMIN;

  async function handleDelete(id: string) {
    try {
      await deleteMutation.mutateAsync(id);
      notification.success({ message: 'Campo eliminado' });
    } catch {
      notification.error({ message: 'Error al eliminar campo' });
    }
  }

  const columns: ColumnsType<Campo> = [
    { title: 'Código', dataIndex: 'codigo_campo', key: 'codigo_campo' },
    { title: 'Nombre', dataIndex: 'nombre', key: 'nombre' },
    {
      title: 'Productor ID',
      dataIndex: 'productor_id',
      key: 'productor_id',
      ellipsis: true,
    },
    {
      title: 'Alta',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (v: string) => new Date(v).toLocaleDateString('es-MX'),
    },
    ...(canDelete
      ? [
          {
            title: 'Agrónomo',
            key: 'agronomo',
            render: (_: unknown, record: Campo) => {
              const assigned = agronoms.data?.find((a) =>
                a.campos_asignados.includes(record._id),
              );
              return (
                <Select
                  size="small"
                  style={{ minWidth: 160 }}
                  value={assigned?.id ?? null}
                  loading={agronoms.isLoading || assignMutation.isPending}
                  allowClear
                  placeholder="Sin asignar"
                  onChange={(val: string | null) => {
                    assignMutation.mutate({
                      campoId: record._id,
                      newAgronomoId: val ?? null,
                      agronoms: agronoms.data ?? [],
                    });
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
                onConfirm={() => handleDelete(record._id)}
                okText="Sí"
                cancelText="No"
              >
                <Button
                  danger
                  size="small"
                  icon={<DeleteOutlined />}
                  loading={
                    deleteMutation.isPending &&
                    deleteMutation.variables === record._id
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

      <Table
        rowKey="_id"
        dataSource={camposQuery.data ?? []}
        columns={columns}
        loading={camposQuery.isLoading}
        pagination={{ pageSize: 20 }}
      />

      <CreateCampoModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </div>
  );
}
