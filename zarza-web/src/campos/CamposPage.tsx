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
import { PlusOutlined, DeleteOutlined, EnvironmentOutlined } from '@ant-design/icons';
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

const { Title } = Typography;

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

      <Table
        rowKey="id"
        dataSource={camposQuery.data ?? []}
        columns={columns}
        loading={camposQuery.isLoading}
        size="middle"
        scroll={{ x: 'max-content' }}
        pagination={{ pageSize: 20, showTotal: (total) => `${total} campos` }}
      />

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
