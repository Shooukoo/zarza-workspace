import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Alert, Button, Skeleton, Space, Tooltip, Typography, message } from 'antd';
import { ArrowLeftOutlined, PlusOutlined } from '@ant-design/icons';
import { useAnalisisDetail, useAnalisisImage } from '../analisis/useAnalisis';
import { useAgregarDeteccion, useDetecciones, useMarcarRevisado } from './useDetecciones';
import { DeteccionOverlay } from './DeteccionOverlay';
import { DeteccionPanel } from './DeteccionPanel';
import { DeteccionSidebar } from './DeteccionSidebar';
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

  function handleToggleDrawMode() {
    setDrawMode((v) => !v);
    setSelectedId(null);
  }

  async function handleConfirmDraft(bbox: [number, number, number, number]) {
    try {
      await agregarMutation.mutateAsync({ etapa: draftEtapa, sano: draftSano, bbox });
      message.success('Detección agregada');
      setDrawMode(false);
    } catch {
      message.error('Error al agregar la detección');
      throw new Error('add-failed');
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
        <Space align="center" size={12}>
          <Button
            type="text"
            shape="circle"
            icon={<ArrowLeftOutlined style={{ fontSize: 18 }} />}
            onClick={() => navigate(-1)}
            aria-label="Volver"
            style={{ width: 44, height: 44 }}
          />
          <Typography.Title level={4} style={{ margin: 0 }}>
            Revisión de detecciones
          </Typography.Title>
        </Space>
        <Space>
          <Tooltip title={drawMode ? 'Esc para cancelar' : 'Atajo: N'}>
            <Button
              type={drawMode ? 'primary' : 'default'}
              icon={<PlusOutlined />}
              onClick={handleToggleDrawMode}
            >
              {drawMode ? 'Cancelar dibujo' : 'Agregar detección'}
            </Button>
          </Tooltip>
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
              imageWidth={imageQuery.data.width}
              imageHeight={imageQuery.data.height}
              detecciones={detecciones}
              selectedId={selectedId}
              onSelect={setSelectedId}
              drawMode={drawMode}
              onToggleDrawMode={handleToggleDrawMode}
              draftEtapa={draftEtapa}
              onDraftEtapaChange={setDraftEtapa}
              draftSano={draftSano}
              onDraftSanoChange={setDraftSano}
              onConfirmDraft={handleConfirmDraft}
              confirmLoading={agregarMutation.isPending}
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
