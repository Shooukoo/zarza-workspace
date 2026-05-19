import { useState } from 'react';
import {
  Button,
  Select,
  Space,
  Table,
  Typography,
} from 'antd';
import { PlusOutlined } from '@ant-design/icons';
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

const { Title } = Typography;

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
