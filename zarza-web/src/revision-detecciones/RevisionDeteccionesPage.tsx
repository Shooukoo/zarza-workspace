import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Alert, Button, Select, Skeleton, Space, Switch, Typography, message } from 'antd';
import { useAnalisisDetail, useAnalisisImage } from '../analisis/useAnalisis';
import { useAgregarDeteccion, useDetecciones, useMarcarRevisado } from './useDetecciones';
import { DeteccionOverlay } from './DeteccionOverlay';
import { DeteccionPanel } from './DeteccionPanel';
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

  if (detailQuery.isError) {
    return <Alert type="error" message="No tienes acceso a este análisis." showIcon />;
  }

  return (
    <div>
      <Space style={{ marginBottom: 16, justifyContent: 'space-between', width: '100%' }}>
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

      {imageQuery.isLoading && <Skeleton.Image style={{ width: '100%', height: 400 }} active />}
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
        />
      )}
      {deteccionesQuery.isError && (
        <Alert
          type="error"
          message="No se pudieron cargar las detecciones."
          showIcon
          style={{ marginTop: 16 }}
        />
      )}

      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', marginTop: 16, paddingBottom: 8 }}>
        {detecciones.map((d) => (
          <div
            key={d.id}
            onClick={() => setSelectedId(d.id)}
            style={{
              minWidth: 140,
              padding: 8,
              borderRadius: 6,
              cursor: 'pointer',
              border: selectedId === d.id ? '2px solid #1677ff' : '1px solid #d9d9d9',
              opacity: d.eliminada ? 0.5 : 1,
            }}
          >
            <div>
              {d.etapa} · {d.sano ? 'sano' : 'enfermo'}
            </div>
            <div style={{ fontSize: 12, color: '#888' }}>
              {d.origen === 'MODELO'
                ? `confianza ${((d.confidence ?? 0) * 100).toFixed(0)}%`
                : 'agregado manualmente'}
            </div>
          </div>
        ))}
      </div>

      {selected && (
        <DeteccionPanel
          deteccion={selected}
          analysisId={analysisId}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  );
}
