import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Button, Table, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useColaRevision } from './useDetecciones';
import type { Analysis } from '../analisis/types';

export function ColaRevisionPage() {
  const [page, setPage] = useState(1);
  const query = useColaRevision(page);
  const navigate = useNavigate();

  const columns: ColumnsType<Analysis> = [
    {
      title: 'Campo',
      key: 'campo',
      render: (_: unknown, record: Analysis) =>
        record.campo ? `${record.campo.codigoCampo} — ${record.campo.nombre}` : record.campoId ?? '—',
    },
    {
      title: 'Fecha',
      dataIndex: 'fechaAnalisis',
      render: (v: string | undefined) =>
        v ? new Date(v).toLocaleDateString('es-MX') : '—',
    },
    {
      title: 'Total detectados',
      dataIndex: 'totalElementosDetectados',
      render: (v: number | undefined) => v ?? '—',
    },
    {
      title: '',
      key: 'actions',
      render: (_: unknown, record: Analysis) => (
        <Button size="small" onClick={() => navigate(`/analisis/${record.id}/revision-detecciones`)}>
          Revisar
        </Button>
      ),
    },
  ];

  return (
    <div>
      <Typography.Title level={4} style={{ marginBottom: 16 }}>
        Cola de revisión de detecciones
      </Typography.Title>
      {query.isError && (
        <Alert
          type="error"
          message="No se pudo cargar la cola de revisión."
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}
      <Table
        rowKey="id"
        dataSource={query.data?.data ?? []}
        columns={columns}
        loading={query.isLoading}
        pagination={{
          current: page,
          pageSize: 20,
          total: query.data?.total ?? 0,
          onChange: setPage,
        }}
      />
    </div>
  );
}
