import { useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import type { AnalisisHeatmapPoint, MetricaMapaCalor } from './types';
import { tileLayerFor, type MapLayer } from './MapLayerToggle';
import { analisisMetricValue, computeRange, colorForValue } from './metricColor';
import { AnalisisPopup } from './AnalisisPopup';

interface Props {
  analisis: AnalisisHeatmapPoint[];
  metrica: MetricaMapaCalor;
  layer: MapLayer;
  center: { lat: number; lng: number };
}

function FitToPoints({ points }: { points: AnalisisHeatmapPoint[] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    const bounds = points.map((p): [number, number] => [p.lat, p.lng]);
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 17 });
  }, [points, map]);
  return null;
}

export function CampoDetailMap({ analisis, metrica, layer, center }: Props) {
  const tile = tileLayerFor(layer);
  const values = analisis.map((a) => analisisMetricValue(metrica, a));
  const { min, max } = computeRange(values);

  return (
    <MapContainer
      center={[center.lat, center.lng]}
      zoom={16}
      style={{ height: '100%', width: '100%' }}
    >
      <TileLayer url={tile.url} attribution={tile.attribution} />
      <FitToPoints points={analisis} />
      <MarkerClusterGroup chunkedLoading>
        {analisis.map((a) => {
          const color = colorForValue(analisisMetricValue(metrica, a), min, max);
          return (
            <CircleMarker
              key={a.id}
              center={[a.lat, a.lng]}
              radius={9}
              pathOptions={{ color, fillColor: color, fillOpacity: 0.8, weight: 2 }}
            >
              <Popup>
                <AnalisisPopup analisis={a} />
              </Popup>
            </CircleMarker>
          );
        })}
      </MarkerClusterGroup>
    </MapContainer>
  );
}
