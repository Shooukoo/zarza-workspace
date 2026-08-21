import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Alert, Button, DatePicker, Divider, Empty, Segmented, Space, Spin, Typography } from 'antd';
import { ArrowLeftOutlined, PrinterOutlined } from '@ant-design/icons';
import type { Dayjs } from 'dayjs';
import { useCamposHeatmap, useAnalisisHeatmap } from './hooks/useMapasCalor';
import { CamposOverviewMap } from './CamposOverviewMap';
import { CampoDetailMap } from './CampoDetailMap';
import { MapLayerToggle, type MapLayer } from './MapLayerToggle';
import type { MetricaMapaCalor } from './types';

const { Title } = Typography;
const { RangePicker } = DatePicker;

export function MapasCalorPage() {
  const [metrica, setMetrica] = useState<MetricaMapaCalor>('merma');
  const [layer, setLayer] = useState<MapLayer>('calles');
  const [range, setRange] = useState<[Dayjs, Dayjs] | null>(null);
  const [campoId, setCampoId] = useState<string | null>(null);

  const dateParams = useMemo(
    () => ({
      from: range?.[0]?.format('YYYY-MM-DD'),
      to: range?.[1]?.format('YYYY-MM-DD'),
    }),
    [range],
  );

  const camposQuery = useCamposHeatmap(dateParams);
  const analisisQuery = useAnalisisHeatmap(campoId, dateParams);

  const campoSeleccionado =
    camposQuery.data?.campos.find((c) => c.campoId === campoId) ?? null;

  useEffect(() => {
    if (!campoId || !camposQuery.data) return;
    const exists = camposQuery.data.campos.some((c) => c.campoId === campoId);
    if (!exists) setCampoId(null);
  }, [campoId, camposQuery.data]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <style>{`
        @media print {
          .app-topbar { display: none !important; }
          .mapas-calor-controls { display: none !important; }
          .mapas-calor-map {
            position: fixed !important;
            inset: 0 !important;
            width: 100vw !important;
            height: 100vh !important;
            z-index: 9999;
          }
        }
      `}</style>

      <div className="mapas-calor-controls" style={{ marginBottom: 16 }}>
        <Space
          align="center"
          style={{ width: '100%', justifyContent: 'space-between', flexWrap: 'wrap', rowGap: 8 }}
        >
          <Space align="center">
            {campoId && (
              <Button icon={<ArrowLeftOutlined />} onClick={() => setCampoId(null)}>
                Todos los campos
              </Button>
            )}
            <Title level={4} style={{ margin: 0 }}>
              {campoSeleccionado ? campoSeleccionado.nombre : 'Mapas de Calor'}
            </Title>
          </Space>
          <Space align="end" size={20} wrap style={{ rowGap: 16 }}>
            <Field label="Métrica">
              <Segmented
                aria-label="Métrica del mapa de calor"
                value={metrica}
                onChange={(v) => setMetrica(v as MetricaMapaCalor)}
                options={[
                  { label: 'Merma / enfermedad', value: 'merma' },
                  { label: 'Densidad de detecciones', value: 'densidad' },
                ]}
              />
            </Field>
            <Field label="Rango de fechas">
              <RangePicker
                aria-label="Rango de fechas"
                value={range}
                onChange={(v) => setRange(v as [Dayjs, Dayjs] | null)}
                placeholder={['Fecha inicial…', 'Fecha final…']}
              />
            </Field>
            <Field label="Capa">
              <MapLayerToggle value={layer} onChange={setLayer} />
            </Field>
            <Divider type="vertical" style={{ height: 32, margin: 0 }} />
            <Button icon={<PrinterOutlined />} onClick={() => window.print()}>
              Imprimir
            </Button>
          </Space>
        </Space>
        {!!camposQuery.data?.sinUbicacion && (
          <Alert
            style={{ marginTop: 12 }}
            type="info"
            showIcon
            message={`${camposQuery.data.sinUbicacion} análisis en este período no tienen ubicación GPS y no se muestran.`}
          />
        )}
        {camposQuery.isError && (
          <Alert
            style={{ marginTop: 12 }}
            type="error"
            showIcon
            message="No se pudo cargar el mapa de calor."
          />
        )}
      </div>

      <div className="mapas-calor-map" style={{ flex: 1, minHeight: 0 }}>
        {campoId ? (
          analisisQuery.isLoading || camposQuery.isLoading ? (
            <SpinCenter />
          ) : analisisQuery.isError ? (
            <ErrorCenter message="No se pudo cargar el análisis de este campo." />
          ) : campoSeleccionado && analisisQuery.data ? (
            analisisQuery.data.length > 0 ? (
              <CampoDetailMap
                analisis={analisisQuery.data}
                metrica={metrica}
                layer={layer}
                center={campoSeleccionado.centroid}
              />
            ) : (
              <Empty description="Este campo no tiene análisis geolocalizados en el rango seleccionado" />
            )
          ) : null
        ) : camposQuery.isLoading ? (
          <SpinCenter />
        ) : camposQuery.isError ? (
          <ErrorCenter message="No se pudo cargar el mapa de calor." />
        ) : camposQuery.data && camposQuery.data.campos.length > 0 ? (
          <CamposOverviewMap
            campos={camposQuery.data.campos}
            metrica={metrica}
            layer={layer}
            onSelectCampo={setCampoId}
          />
        ) : (
          <Empty description="No hay campos con análisis geolocalizados en el rango seleccionado" />
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Space direction="vertical" size={4}>
      <span style={{ fontSize: 12, color: 'rgba(0, 0, 0, 0.45)', lineHeight: 1 }}>{label}</span>
      {children}
    </Space>
  );
}

function SpinCenter() {
  return (
    <div
      role="status"
      aria-label="Cargando…"
      style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
    >
      <Spin size="large" />
    </div>
  );
}

function ErrorCenter({ message }: { message: string }) {
  return (
    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Alert type="error" showIcon message={message} />
    </div>
  );
}
