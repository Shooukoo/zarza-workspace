import { useState } from 'react';
import {
  Drawer,
  Descriptions,
  Table,
  Typography,
  Divider,
  Skeleton,
  Tag,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { Solicitud } from './hooks/useSolicitudes';
import { EstadoBadge } from './EstadoBadge';
import { AnalisisDetailModal } from '../analisis/AnalisisDetailModal';
import { useAnalisisByCampo } from '../analisis/useAnalisis';
import { useAuth } from '../auth/useAuth';
import { Role } from '../auth/types';
import type { Analysis } from '../analisis/types';

const { Text } = Typography;

interface Props {
  solicitud: Solicitud | null;
  open: boolean;
  onClose: () => void;
}

const VALIDACION_COLOR: Record<string, string> = {
  pendiente: 'orange',
  validado: 'green',
  rechazado: 'red',
};

const VALIDACION_LABEL: Record<string, string> = {
  pendiente: 'Pendiente',
  validado: 'Validado',
  rechazado: 'Rechazado',
};

const analisisColumns: ColumnsType<Analysis> = [
  {
    title: 'Fecha',
    dataIndex: 'fechaAnalisis',
    key: 'fechaAnalisis',
    render: (v: string | undefined) =>
      v ? new Date(v).toLocaleDateString('es-MX') : '—',
  },
  {
    title: 'Etapas detectadas',
    key: 'etapas',
    render: (_: unknown, record: Analysis) => record.fenologiaEtapas?.length ?? 0,
  },
  {
    title: 'Merma %',
    key: 'merma',
    render: (_: unknown, record: Analysis) =>
      record.porcentajeMermaGeneral != null
        ? `${record.porcentajeMermaGeneral.toFixed(1)}%`
        : '—',
  },
  {
    title: 'Validación',
    key: 'validacionEstado',
    render: (_: unknown, record: Analysis) => {
      const estado = record.validacionEstado ?? 'pendiente';
      return (
        <Tag color={VALIDACION_COLOR[estado] ?? 'default'}>
          {VALIDACION_LABEL[estado] ?? estado}
        </Tag>
      );
    },
  },
];

export function SolicitudDetailDrawer({ solicitud, open, onClose }: Props) {
  const { user } = useAuth();
  const [selectedAnalysisId, setSelectedAnalysisId] = useState<string | null>(null);

  const canSeeAnalyses = user?.role === Role.ADMIN || user?.role === Role.AGRONOMO;
  const campoId = solicitud?.campo?.id ?? null;

  const analisisQuery = useAnalisisByCampo(campoId, open && canSeeAnalyses);

  return (
    <>
      <Drawer
        title="Detalle de la Solicitud"
        open={open}
        onClose={onClose}
        width={600}
        destroyOnClose
      >
        {solicitud && (
          <>
            <Text
              strong
              style={{
                fontSize: 11,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                color: '#52c41a',
              }}
            >
              Datos de la solicitud
            </Text>

            <Descriptions
              column={1}
              size="small"
              bordered
              style={{ marginTop: 8 }}
            >
              <Descriptions.Item label="Campo">
                {solicitud.campo?.nombre ?? '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Asignado a">
                {solicitud.asignadoA?.email ?? '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Estado">
                <EstadoBadge estado={solicitud.estado} />
              </Descriptions.Item>
              <Descriptions.Item label="Mensaje">
                {solicitud.mensaje}
              </Descriptions.Item>
              <Descriptions.Item label="Fecha límite">
                {solicitud.fechaLimite
                  ? new Date(solicitud.fechaLimite).toLocaleDateString('es-MX')
                  : '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Creada">
                {new Date(solicitud.createdAt).toLocaleDateString('es-MX')}
              </Descriptions.Item>
            </Descriptions>

            {canSeeAnalyses && (
              <>
                <Divider />
                <Text
                  strong
                  style={{
                    fontSize: 11,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    color: '#1890ff',
                  }}
                >
                  Análisis del campo
                </Text>

                {analisisQuery.isLoading ? (
                  <Skeleton active paragraph={{ rows: 4 }} style={{ marginTop: 12 }} />
                ) : (
                  <Table<Analysis>
                    rowKey="id"
                    style={{ marginTop: 12 }}
                    dataSource={analisisQuery.data?.data ?? []}
                    columns={analisisColumns}
                    size="small"
                    pagination={false}
                    locale={{ emptyText: 'Sin análisis registrados' }}
                    onRow={(record) => ({
                      onClick: () => setSelectedAnalysisId(record.id),
                      style: { cursor: 'pointer' },
                    })}
                  />
                )}
              </>
            )}
          </>
        )}
      </Drawer>

      <AnalisisDetailModal
        analysisId={selectedAnalysisId}
        open={!!selectedAnalysisId}
        onClose={() => setSelectedAnalysisId(null)}
      />
    </>
  );
}
