import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { notification } from 'antd';
import { useMap } from 'react-leaflet';
import { useMapControl } from './useMapControl';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined;

interface MapboxFeature {
  id: string;
  place_name: string;
  center: [number, number];
}

const CONTROL_STYLE: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  background: '#fff',
  padding: '4px 6px',
  borderRadius: 4,
  boxShadow: '0 1px 5px rgba(0,0,0,0.4)',
};

const INPUT_WRAPPER_STYLE: CSSProperties = {
  position: 'relative',
};

const INPUT_STYLE: CSSProperties = {
  border: '1px solid #d9d9d9',
  borderRadius: 4,
  padding: '4px 8px',
  fontSize: 13,
  width: 220,
  outline: 'none',
};

const DROPDOWN_STYLE: CSSProperties = {
  position: 'absolute',
  top: '100%',
  left: 0,
  right: 0,
  marginTop: 2,
  background: '#fff',
  borderRadius: 4,
  boxShadow: '0 1px 5px rgba(0,0,0,0.4)',
  maxHeight: 200,
  overflowY: 'auto',
  zIndex: 1000,
};

const DROPDOWN_ITEM_STYLE: CSSProperties = {
  padding: '6px 10px',
  fontSize: 13,
  cursor: 'pointer',
  borderBottom: '1px solid #f0f0f0',
};

const GEO_BUTTON_STYLE: CSSProperties = {
  border: 'none',
  background: 'transparent',
  cursor: 'pointer',
  fontSize: 16,
  lineHeight: 1,
  padding: '4px 6px',
};

export function PlaceSearchControl() {
  const map = useMap();
  const container = useMapControl('topright');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<MapboxFeature[]>([]);
  const [showResults, setShowResults] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!MAPBOX_TOKEN) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const trimmed = query.trim();
    if (trimmed.length === 0) {
      setResults([]);
      return;
    }

    debounceRef.current = setTimeout(() => {
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(trimmed)}.json?access_token=${MAPBOX_TOKEN}&country=mx&limit=5`;
      fetch(url)
        .then((res) => {
          if (!res.ok) throw new Error('geocoding failed');
          return res.json() as Promise<{ features: MapboxFeature[] }>;
        })
        .then((data) => setResults(data.features ?? []))
        .catch(() => setResults([]));
    }, 400);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  function handleSelectResult(feature: MapboxFeature) {
    const [lng, lat] = feature.center;
    map.flyTo([lat, lng], 15);
    setQuery(feature.place_name);
    setShowResults(false);
  }

  function handleGeolocate() {
    if (!navigator.geolocation) {
      notification.error({ message: 'No se pudo obtener tu ubicación' });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        map.flyTo([position.coords.latitude, position.coords.longitude], 16);
      },
      () => {
        notification.error({ message: 'No se pudo obtener tu ubicación' });
      },
    );
  }

  if (!container) return null;

  return createPortal(
    <div style={CONTROL_STYLE}>
      {MAPBOX_TOKEN && (
        <div style={INPUT_WRAPPER_STYLE}>
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setShowResults(true);
            }}
            onFocus={() => setShowResults(true)}
            placeholder="Buscar lugar…"
            style={INPUT_STYLE}
          />
          {showResults && query.trim().length > 0 && (
            <div style={DROPDOWN_STYLE}>
              {results.length === 0 ? (
                <div style={DROPDOWN_ITEM_STYLE}>Sin resultados</div>
              ) : (
                results.map((feature) => (
                  <div
                    key={feature.id}
                    style={DROPDOWN_ITEM_STYLE}
                    onClick={() => handleSelectResult(feature)}
                  >
                    {feature.place_name}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}
      <button type="button" onClick={handleGeolocate} style={GEO_BUTTON_STYLE} title="Usar mi ubicación">
        📍
      </button>
    </div>,
    container,
  );
}
