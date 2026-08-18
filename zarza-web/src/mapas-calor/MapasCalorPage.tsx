import { useMemo, useState } from 'react';
import { Alert, Button, DatePicker, Empty, Segmented, Space, Typography } from 'antd';
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
          <Space wrap>
            <Segmented
              value={metrica}
              onChange={(v) => setMetrica(v as MetricaMapaCalor)}
              options={[
                { label: 'Merma / enfermedad', value: 'merma' },
                { label: 'Densidad de detecciones', value: 'densidad' },
              ]}
            />
            <RangePicker value={range} onChange={(v) => setRange(v as [Dayjs, Dayjs] | null)} />
            <MapLayerToggle value={layer} onChange={setLayer} />
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
      </div>

      <div className="mapas-calor-map" style={{ flex: 1, minHeight: 0 }}>
        {campoId ? (
          campoSeleccionado && analisisQuery.data ? (
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
