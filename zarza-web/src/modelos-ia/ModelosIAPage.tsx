import { useState } from 'react';
import { Button, Descriptions, Table, Tabs, Tag, Tooltip, Typography, notification } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  useIniciarEntrenamiento,
  usePromoverVersion,
  useTrainingStatus,
} from './useTrainingStatus';
import type { ModelVersionHistoryItem, TrainingJobHistoryItem } from './types';

const { Title, Text } = Typography;

const JOB_STATUS_TAG: Record<string, { color: string; label: string }> = {
  PENDING: { color: 'default', label: 'Pendiente' },
  RUNNING: { color: 'processing', label: 'Corriendo' },
  COMPLETED: { color: 'success', label: 'Completado' },
  FAILED: { color: 'error', label: 'Fallido' },
};

const VERSION_STATUS_TAG: Record<string, { color: string; label: string }> = {
  ENTRENADO: { color: 'default', label: 'Entrenado' },
  LISTO_PARA_PROMOVER: { color: 'gold', label: 'Listo para promover' },
  DESCARTADO: { color: 'default', label: 'Descartado' },
  PROMOVIDO: { color: 'green', label: 'Promovido' },
  REEMPLAZADO: { color: 'default', label: 'Reemplazado' },
};

function EstadoActualTab() {
  const { data, isLoading } = useTrainingStatus();
  const iniciar = useIniciarEntrenamiento();

  if (isLoading || !data) return <Text>Cargando...</Text>;

  const { activeModel, countNuevosAnalisisRevisados, umbralMinimo, activeJob } = data;
  const disabledReason = activeJob
    ? 'Ya hay un entrenamiento en curso'
    : countNuevosAnalisisRevisados < umbralMinimo
      ? `Se necesitan ${umbralMinimo} análisis revisados nuevos (hay ${countNuevosAnalisisRevisados})`
      : null;

  async function handleIniciar() {
    try {
      await iniciar.mutateAsync();
      notification.success({ message: 'Entrenamiento iniciado' });
    } catch (err) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'No se pudo iniciar el entrenamiento';
      notification.error({ message });
    }
  }

  return (
    <div>
      <Descriptions column={1} bordered size="small" style={{ maxWidth: 480 }}>
        <Descriptions.Item label="Modelo activo">
          {activeModel ? `Versión ${activeModel.version}` : 'Ninguno (usando best.pt original)'}
        </Descriptions.Item>
        <Descriptions.Item label="mAP@0.5">
          {activeModel?.mAP != null ? activeModel.mAP.toFixed(4) : '—'}
        </Descriptions.Item>
        <Descriptions.Item label="Promovido">
          {activeModel?.promovidoAt
            ? new Date(activeModel.promovidoAt).toLocaleString('es-MX')
            : '—'}
        </Descriptions.Item>
        <Descriptions.Item label="Análisis revisados nuevos">
          {countNuevosAnalisisRevisados} / {umbralMinimo}
        </Descriptions.Item>
      </Descriptions>

      <div style={{ marginTop: 16 }}>
        <Tooltip title={disabledReason ?? ''}>
          <Button
            type="primary"
            disabled={!!disabledReason}
            loading={iniciar.isPending}
            onClick={handleIniciar}
          >
            Iniciar nuevo entrenamiento
          </Button>
        </Tooltip>
      </div>
    </div>
  );
}

function HistorialVersionesTab() {
  const { data, isLoading } = useTrainingStatus();
  const promover = usePromoverVersion();

  const columns: ColumnsType<ModelVersionHistoryItem> = [
    { title: 'Versión', dataIndex: 'version', key: 'version' },
    {
      title: 'mAP vs base',
      key: 'map',
      render: (_: unknown, record: ModelVersionHistoryItem) =>
        `${record.mAP?.toFixed(4) ?? '—'} vs ${record.mAPBase?.toFixed(4) ?? '—'}`,
    },
    {
      title: 'Estado',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const tag = VERSION_STATUS_TAG[status] ?? VERSION_STATUS_TAG['ENTRENADO'];
        return <Tag color={tag.color}>{tag.label}</Tag>;
      },
    },
    {
      title: 'Fecha',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (v: string) => new Date(v).toLocaleDateString('es-MX'),
    },
    {
      title: 'Acción',
      key: 'accion',
      render: (_: unknown, record: ModelVersionHistoryItem) =>
        record.status === 'LISTO_PARA_PROMOVER' || record.status === 'REEMPLAZADO' ? (
          <Button
            size="small"
            type="primary"
            loading={promover.isPending && promover.variables === record.trainingJobId}
            onClick={async () => {
              try {
                await promover.mutateAsync(record.trainingJobId);
                notification.success({ message: `Versión ${record.version} promovida` });
              } catch {
                notification.error({ message: 'No se pudo promover la versión' });
              }
            }}
          >
            Promover
          </Button>
        ) : null,
    },
  ];

  return (
    <Table
      rowKey="id"
      loading={isLoading}
      dataSource={data?.historialVersiones ?? []}
      columns={columns}
      pagination={false}
    />
  );
}

function JobsEntrenamientoTab() {
  const { data, isLoading } = useTrainingStatus();

  const columns: ColumnsType<TrainingJobHistoryItem> = [
    {
      title: 'Inicio',
      dataIndex: 'iniciadoAt',
      key: 'iniciadoAt',
      render: (v: string) => new Date(v).toLocaleString('es-MX'),
    },
    {
      title: 'Estado',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const tag = JOB_STATUS_TAG[status] ?? JOB_STATUS_TAG['PENDING'];
        return <Tag color={tag.color}>{tag.label}</Tag>;
      },
    },
    {
      title: 'Duración',
      key: 'duracion',
      render: (_: unknown, record: TrainingJobHistoryItem) => {
        if (!record.finalizadoAt) return '—';
        const ms =
          new Date(record.finalizadoAt).getTime() - new Date(record.iniciadoAt).getTime();
        return `${Math.round(ms / 60000)} min`;
      },
    },
    {
      title: 'Tamaño dataset',
      dataIndex: 'datasetSize',
      key: 'datasetSize',
      render: (v: number | null) => v ?? '—',
    },
    {
      title: 'Error',
      dataIndex: 'errorMessage',
      key: 'errorMessage',
      render: (v: string | null) => v ?? '—',
    },
  ];

  return (
    <Table
      rowKey="id"
      loading={isLoading}
      dataSource={data?.historialJobs ?? []}
      columns={columns}
      pagination={false}
    />
  );
}

export function ModelosIAPage() {
  const [tab, setTab] = useState('estado');

  return (
    <div>
      <Title level={3}>Modelos IA</Title>
      <Tabs
        activeKey={tab}
        onChange={setTab}
        items={[
          { key: 'estado', label: 'Estado actual', children: <EstadoActualTab /> },
          { key: 'historial', label: 'Historial de versiones', children: <HistorialVersionesTab /> },
          { key: 'jobs', label: 'Jobs de entrenamiento', children: <JobsEntrenamientoTab /> },
        ]}
      />
    </div>
  );
}
