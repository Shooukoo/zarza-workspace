import { useEffect, useRef, useState } from 'react';
import { Modal, notification } from 'antd';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet-draw';
import { useUpdateCampoPoligono, type Campo } from './hooks/useCampos';
import { MapLayerToggle, tileLayerFor, type MapLayer } from '../mapas-calor/MapLayerToggle';

interface Props {
  campo: Campo | null;
  open: boolean;
  onClose: () => void;
}

function DrawLayer({
  initialPoligono,
  onChange,
}: {
  initialPoligono: number[][] | null;
  onChange: (points: number[][]) => void;
}) {
  const map = useMap();
  const featureGroupRef = useRef(new L.FeatureGroup());

  useEffect(() => {
    const featureGroup = featureGroupRef.current;
    map.addLayer(featureGroup);

    if (initialPoligono && initialPoligono.length >= 3) {
      const latlngs = initialPoligono.map(([lng, lat]) => L.latLng(lat, lng));
      const polygon = L.polygon(latlngs);
      featureGroup.addLayer(polygon);
      map.fitBounds(polygon.getBounds(), { padding: [40, 40] });
    }

    const drawControl = new L.Control.Draw({
      draw: {
        polygon: { allowIntersection: false, showArea: true },
        marker: false,
        circle: false,
        circlemarker: false,
        polyline: false,
        rectangle: false,
      },
      edit: { featureGroup, remove: true },
    });
    map.addControl(drawControl);

    function emitCurrentPolygon() {
      const layers = featureGroup.getLayers() as L.Polygon[];
      if (layers.length === 0) {
        onChange([]);
        return;
      }
      const latlngs = layers[0].getLatLngs()[0] as L.LatLng[];
      onChange(latlngs.map((ll) => [ll.lng, ll.lat]));
    }

    map.on(L.Draw.Event.CREATED, (e: L.LeafletEvent) => {
      featureGroup.clearLayers();
      featureGroup.addLayer((e as unknown as { layer: L.Layer }).layer);
      emitCurrentPolygon();
    });
    map.on(L.Draw.Event.EDITED, emitCurrentPolygon);
    map.on(L.Draw.Event.DELETED, emitCurrentPolygon);

    return () => {
      map.removeControl(drawControl);
      map.removeLayer(featureGroup);
      map.off(L.Draw.Event.CREATED);
      map.off(L.Draw.Event.EDITED);
      map.off(L.Draw.Event.DELETED);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);

  return null;
}

export function EditCampoPolygonModal({ campo, open, onClose }: Props) {
  const [layer, setLayer] = useState<MapLayer>('calles');
  const [draftPoints, setDraftPoints] = useState<number[][]>(campo?.poligonoGps ?? []);
  const updateMutation = useUpdateCampoPoligono();

  useEffect(() => {
    setDraftPoints(campo?.poligonoGps ?? []);
  }, [campo]);

  async function handleSave() {
    if (!campo) return;
    if (draftPoints.length < 3) {
      notification.error({ message: 'El polígono debe tener al menos 3 puntos' });
      return;
    }
    try {
      await updateMutation.mutateAsync({ id: campo.id, poligono_gps: draftPoints });
      notification.success({ message: 'Límites del campo actualizados' });
      onClose();
    } catch {
      notification.error({ message: 'Error al guardar los límites del campo' });
    }
  }

  const tile = tileLayerFor(layer);

  return (
    <Modal
      title={campo ? `Editar límites — ${campo.nombre}` : 'Editar límites'}
      open={open}
      onCancel={onClose}
      onOk={handleSave}
      confirmLoading={updateMutation.isPending}
      width="90vw"
      style={{ top: 20 }}
      okButtonProps={{ disabled: draftPoints.length < 3 }}
    >
      <div style={{ marginBottom: 8 }}>
        <MapLayerToggle value={layer} onChange={setLayer} />
      </div>
      <div style={{ height: '70vh' }}>
        {open && (
          <MapContainer center={[19.7, -103.3]} zoom={13} style={{ height: '100%', width: '100%' }}>
            <TileLayer url={tile.url} attribution={tile.attribution} />
            <DrawLayer initialPoligono={campo?.poligonoGps ?? null} onChange={setDraftPoints} />
          </MapContainer>
        )}
      </div>
    </Modal>
  );
}
