import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Alert, Button, Select, Skeleton, Space, Switch, Typography, message } from 'antd';
import { useAnalisisDetail, useAnalisisImage } from '../analisis/useAnalisis';
import { useAgregarDeteccion, useDetecciones, useMarcarRevisado } from './useDetecciones';
import { DeteccionOverlay } from './DeteccionOverlay';
import { DeteccionPanel } from './DeteccionPanel';
import { DeteccionSidebar } from './DeteccionSidebar';
import { ETAPAS_CONOCIDAS } from './types';
import type { EtapaConocida } from './types';

export function RevisionDeteccionesPage() {
  const { id } = useParams<{ id: string }>();
  const analysisId = id ?? null;
  const navigate = useNavigate();

  const imageQuery = useAnalisisImage(analysisId, !!analysisId);
  // Solo para forzar el chequeo de scope (assertInScope) de /analyses/:id antes
  // de mostrar la pantalla; el detalle en sí no se usa aquí.
  const detailQuery = useAnalisisDetail(analysisId);
  const deteccionesQuery = useDetecciones(analysisId);
  const agregarMutation = useAgregarDeteccion(analysisId ?? '');
  const revisadoMutation = useMarcarRevisado(analysisId ?? '');

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [drawMode, setDrawMode] = useState(false);
  const [draftEtapa, setDraftEtapa] = useState<EtapaConocida>('verde');
  const [draftSano, setDraftSano] = useState(true);

  const detecciones = deteccionesQuery.data ?? [];
  const selected = detecciones.find((d) => d.id === selectedId) ?? null;

  async function handleDrawComplete(bbox: [number, number, number, number]) {
    try {
      await agregarMutation.mutateAsync({ etapa: draftEtapa, sano: draftSano, bbox });
      message.success('Detección agregada');
      setDrawMode(false);
    } catch {
      message.error('Error al agregar la detección');
    }
  }

  async function handleMarcarRevisado() {
    try {
      await revisadoMutation.mutateAsync();
      message.success('Análisis marcado como revisado');
      navigate('/revision-detecciones');
    } catch {
      message.error('Error al marcar como revisado');
    }
  }

  if (!analysisId) return null;

  if (detailQuery.isLoading) {
    return <Skeleton active paragraph={{ rows: 8 }} />;
  }

  if (detailQuery.isError) {
    return (
      <Alert
        type="error"
        message="No se pudo cargar el análisis. Verifica que tengas acceso o intenta de nuevo."
        showIcon
      />
    );
  }

  return (
    <div
      style={{
        margin: '-28px -32px',
        width: 'calc(100% + 64px)',
        height: 'calc(100% + 56px)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Space
        style={{
          justifyContent: 'space-between',
          width: '100%',
          padding: '14px 32px',
          flexShrink: 0,
        }}
      >
        <Typography.Title level={4} style={{ margin: 0 }}>
          Revisión de detecciones
        </Typography.Title>
        <Space>
          <Select
            value={draftEtapa}
            onChange={setDraftEtapa}
            options={ETAPAS_CONOCIDAS.map((e) => ({ value: e, label: e }))}
            style={{ width: 140 }}
            disabled={!drawMode}
          />
          <Switch
            checked={draftSano}
            onChange={setDraftSano}
            checkedChildren="Sano"
            unCheckedChildren="Enfermo"
            disabled={!drawMode}
          />
          <Button type={drawMode ? 'primary' : 'default'} onClick={() => setDrawMode((v) => !v)}>
            {drawMode ? 'Cancelar dibujo' : '+ Agregar detección'}
          </Button>
          <Button type="primary" onClick={handleMarcarRevisado} loading={revisadoMutation.isPending}>
            Marcar como revisado
          </Button>
        </Space>
      </Space>

      {deteccionesQuery.isError && (
        <Alert
          type="error"
          message="No se pudieron cargar las detecciones."
          showIcon
          style={{ margin: '0 32px 12px' }}
        />
      )}

      <div style={{ flex: 1, minHeight: 0, padding: '0 32px 24px', display: 'flex', gap: 16 }}>
        <div style={{ flex: 1, minWidth: 0, position: 'relative' }}>
          {imageQuery.isLoading && <Skeleton.Image style={{ width: '100%', height: '100%' }} active />}
          {imageQuery.isError && (
            <Alert type="error" message="No se pudo cargar la imagen del análisis." showIcon />
          )}
          {imageQuery.data?.url && (
            <DeteccionOverlay
              imageUrl={imageQuery.data.url}
              detecciones={detecciones}
              selectedId={selectedId}
              onSelect={setSelectedId}
              drawMode={drawMode}
              onDrawComplete={handleDrawComplete}
            >
              {selected && (
                <DeteccionPanel
                  deteccion={selected}
                  analysisId={analysisId}
                  onClose={() => setSelectedId(null)}
                />
              )}
            </DeteccionOverlay>
          )}
        </div>

        {detecciones.length > 0 && (
          <DeteccionSidebar detecciones={detecciones} selectedId={selectedId} onSelect={setSelectedId} />
        )}
      </div>
    </div>
  );
}
