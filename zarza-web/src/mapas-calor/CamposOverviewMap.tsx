import { useEffect } from 'react';
import { MapContainer, TileLayer, Polygon, CircleMarker, Tooltip, useMap } from 'react-leaflet';
import type { CampoHeatmapPoint, MetricaMapaCalor } from './types';
import { tileLayerFor, type MapLayer } from './MapLayerToggle';
import { campoMetricValue, computeRange, colorForValue } from './metricColor';

interface Props {
  campos: CampoHeatmapPoint[];
  metrica: MetricaMapaCalor;
  layer: MapLayer;
  onSelectCampo: (campoId: string) => void;
}

function FitToCampos({ campos }: { campos: CampoHeatmapPoint[] }) {
  const map = useMap();
  useEffect(() => {
    if (campos.length === 0) return;
    const bounds = campos.map((c): [number, number] => [c.centroid.lat, c.centroid.lng]);
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
  }, [campos, map]);
  return null;
}

export function CamposOverviewMap({ campos, metrica, layer, onSelectCampo }: Props) {
  const tile = tileLayerFor(layer);
  const values = campos.map((c) => campoMetricValue(metrica, c));
  const { min, max } = computeRange(values);

  return (
    <MapContainer center={[19.7, -103.3]} zoom={10} style={{ height: '100%', width: '100%' }}>
      <TileLayer url={tile.url} attribution={tile.attribution} />
      <FitToCampos campos={campos} />
      {campos.map((campo) => {
        const value = campoMetricValue(metrica, campo);
        const color = colorForValue(value, min, max);
        const label = `${campo.nombre} — ${value.toFixed(1)}`;

        if (campo.poligonoGps) {
          return (
            <Polygon
              key={campo.campoId}
              positions={campo.poligonoGps.map(([lng, lat]): [number, number] => [lat, lng])}
              pathOptions={{ color, fillColor: color, fillOpacity: 0.45, weight: 2 }}
              eventHandlers={{ click: () => onSelectCampo(campo.campoId) }}
            >
              <Tooltip>{label}</Tooltip>
            </Polygon>
          );
        }

        return (
          <CircleMarker
            key={campo.campoId}
            center={[campo.centroid.lat, campo.centroid.lng]}
            radius={14}
            pathOptions={{ color, fillColor: color, fillOpacity: 0.7, weight: 2 }}
            eventHandlers={{ click: () => onSelectCampo(campo.campoId) }}
          >
            <Tooltip>{label}</Tooltip>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
