import { useState } from 'react';
import { Table, Tabs, Typography, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useAnalisisList } from './useAnalisis';
import { AnalisisDetailModal } from './AnalisisDetailModal';
import type { Analysis } from './types';

const { Title } = Typography;

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
    title: 'Estado',
    key: 'estado',
    render: (_: unknown, record: Analysis) =>
      record.validacion_experto?.fue_corregido ? (
        <Tag color="green">Validado</Tag>
      ) : (
        <Tag color="orange">Pendiente</Tag>
      ),
  },
];

function AnalisisTab({ validado }: { validado: boolean | 'all' }) {
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const query = useAnalisisList(validado, page);

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
            children: <AnalisisTab validado={false} />,
          },
          {
            key: 'validados',
            label: 'Validados',
            children: <AnalisisTab validado={true} />,
          },
        ]}
      />
    </div>
  );
}
