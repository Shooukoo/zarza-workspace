import { useEffect, useState } from 'react';
import L from 'leaflet';
import { useMap } from 'react-leaflet';

export function useMapControl(position: L.ControlPosition, zIndex?: number): HTMLDivElement | null {
  const map = useMap();
  const [container, setContainer] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    const control = new L.Control({ position });
    control.onAdd = () => {
      const div = L.DomUtil.create('div', 'leaflet-control');
      if (zIndex !== undefined) div.style.zIndex = String(zIndex);
      L.DomEvent.disableClickPropagation(div);
      setContainer(div);
      return div;
    };
    map.addControl(control);

    return () => {
      map.removeControl(control);
      setContainer(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, position, zIndex]);

  return container;
}
