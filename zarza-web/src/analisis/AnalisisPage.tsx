import { useState } from 'react';
import { Button, Space, Table, Tabs, Tag, Typography, notification } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useAnalisisList, useValidateAnalisis } from './useAnalisis';
import { AnalisisDetailModal } from './AnalisisDetailModal';
import { useAuth } from '../auth/useAuth';
import { Role } from '../auth/types';
import type { Analysis, EstadoValidacion, ValidateAnalisisPayload } from './types';

const { Title } = Typography;

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
      title: 'Campo ID',
      dataIndex: 'campo_id',
      key: 'campo_id',
      ellipsis: true,
      render: (v: string | undefined) => v ?? '—',
    },
    {
      title: 'Fecha',
      dataIndex: 'fecha_analisis',
      key: 'fecha_analisis',
      render: (v: string | undefined) =>
        v ? new Date(v).toLocaleDateString('es-MX') : '—',
    },
    {
      title: 'Etapa predominante',
      key: 'etapa',
      render: (_: unknown, record: Analysis) => {
        if (!record.cronograma_fenologico?.length) return '—';
        const top = [...record.cronograma_fenologico].sort(
          (a, b) => b.cantidad - a.cantidad,
        )[0];
        return top.etapa;
      },
    },
    {
      title: 'Total detectados',
      key: 'total',
      render: (_: unknown, record: Analysis) =>
        record.metricas_salud?.total_elementos_detectados ?? '—',
    },
    {
      title: 'Validación',
      key: 'validacion',
      render: (_: unknown, record: Analysis) => {
        const est = record.validacion_experto?.estado ?? 'pendiente';
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
                (validateMutation.variables as { id: string; payload: ValidateAnalisisPayload } | undefined)?.id === record._id
              }
              onClick={async () => {
                try {
                  await validateMutation.mutateAsync({
                    id: record._id,
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
              onClick={() => setSelectedId(record._id)}
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
        rowKey="_id"
        dataSource={query.data?.data ?? []}
        columns={columns}
        loading={query.isLoading}
        onRow={(record) => ({ onClick: () => setSelectedId(record._id) })}
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
  return (
    <div>
      <Title level={4} style={{ marginBottom: 16 }}>
        Revisión de Análisis
      </Title>
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
    </div>
  );
}
