import { Segmented } from 'antd';

export type MapLayer = 'calles' | 'satelite';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined;

interface Props {
  value: MapLayer;
  onChange: (layer: MapLayer) => void;
}

export function MapLayerToggle({ value, onChange }: Props) {
  if (!MAPBOX_TOKEN) return null;
  return (
    <Segmented
      value={value}
      onChange={(v) => onChange(v as MapLayer)}
      options={[
        { label: 'Calles', value: 'calles' },
        { label: 'Satélite', value: 'satelite' },
      ]}
    />
  );
}

export function tileLayerFor(layer: MapLayer): { url: string; attribution: string } {
  if (layer === 'satelite' && MAPBOX_TOKEN) {
    return {
      url: `https://api.mapbox.com/styles/v1/mapbox/satellite-v9/tiles/{z}/{x}/{y}?access_token=${MAPBOX_TOKEN}`,
      attribution:
        '&copy; <a href="https://www.mapbox.com/about/maps/">Mapbox</a>',
    };
  }
  return {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  };
}
