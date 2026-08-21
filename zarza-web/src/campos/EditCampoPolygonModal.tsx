import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { Modal, notification } from 'antd';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet-draw';
import { useUpdateCampoPoligono, type Campo } from './hooks/useCampos';
import { MapLayerToggle, tileLayerFor, type MapLayer } from '../mapas-calor/MapLayerToggle';
import { PlaceSearchControl } from '../mapas-calor/PlaceSearchControl';
import { useMapControl } from '../mapas-calor/useMapControl';
import { lightTheme } from '../shared/lightTheme';

interface Props {
  campo: Campo | null;
  open: boolean;
  onClose: () => void;
}

const CHIP_STYLE: CSSProperties = {
  background: lightTheme.surface,
  color: lightTheme.ink,
  padding: '6px 12px',
  borderRadius: 8,
  border: `1px solid ${lightTheme.grayLine}`,
  boxShadow: '0 2px 8px rgba(19, 16, 43, 0.12)',
  fontSize: 13,
  whiteSpace: 'nowrap',
};

const AREA_FORMATTER = new Intl.NumberFormat('es-MX', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

function statusChipText(pointCount: number, areaHa: number): string {
  if (pointCount === 0) return '0 puntos · dibuja el polígono';
  if (pointCount < 3) return `${pointCount} puntos · agrega ${3 - pointCount} más`;
  return `${pointCount} puntos · ${AREA_FORMATTER.format(areaHa)} ha · ✓ válido`;
}

function computeAreaHa(latlngs: L.LatLng[]): number {
  return L.GeometryUtil.geodesicArea(latlngs) / 10000;
}

function InstructionsChip() {
  const container = useMapControl('bottomleft');
  if (!container) return null;
  return createPortal(
    <div style={CHIP_STYLE}>Click para agregar puntos · doble click para cerrar el polígono</div>,
    container,
  );
}

function StatusChip({ pointCount, areaHa }: { pointCount: number; areaHa: number }) {
  const container = useMapControl('bottomright');
  if (!container) return null;
  return createPortal(<div style={CHIP_STYLE}>{statusChipText(pointCount, areaHa)}</div>, container);
}

function MapLayerToggleControl({
  layer,
  onChange,
}: {
  layer: MapLayer;
  onChange: (layer: MapLayer) => void;
}) {
  const container = useMapControl('topright');
  if (!container) return null;
  return createPortal(<MapLayerToggle value={layer} onChange={onChange} />, container);
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
  const [status, setStatus] = useState(() => {
    const count = initialPoligono?.length ?? 0;
    if (count < 3) return { count, areaHa: 0 };
    const latlngs = initialPoligono!.map(([lng, lat]) => L.latLng(lat, lng));
    return { count, areaHa: computeAreaHa(latlngs) };
  });

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
        // showArea:false — el tooltip nativo de área de leaflet-draw llama a
        // L.GeometryUtil.readableArea, que en esta versión (1.0.4) tiene un bug real
        // (usa `type` sin declararlo con var/let/const dentro de la función). Bajo
        // módulos ES (siempre en modo estricto, como los que genera Vite) esa asignación
        // a una variable no declarada lanza "ReferenceError: type is not defined" en
        // cuanto hay área que mostrar (a partir del 3er punto). Esa excepción interrumpe
        // _endPoint() de leaflet-draw a mitad de camino y nunca llega a _enableNewMarkers(),
        // dejando el dibujo trabado para siempre después del punto que la disparó. El chip
        // de estado (StatusChip) ya muestra puntos/área/validez, así que el tooltip nativo
        // es redundante — se desactiva en vez de parchear la librería.
        polygon: { allowIntersection: false, showArea: false },
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
        setStatus({ count: 0, areaHa: 0 });
        return;
      }
      const latlngs = layers[0].getLatLngs()[0] as L.LatLng[];
      onChange(latlngs.map((ll) => [ll.lng, ll.lat]));
      setStatus({
        count: latlngs.length,
        areaHa: latlngs.length >= 3 ? computeAreaHa(latlngs) : 0,
      });
    }

    map.on(L.Draw.Event.CREATED, (e: L.LeafletEvent) => {
      featureGroup.clearLayers();
      featureGroup.addLayer((e as unknown as { layer: L.Layer }).layer);
      emitCurrentPolygon();
    });
    map.on(L.Draw.Event.EDITED, emitCurrentPolygon);
    map.on(L.Draw.Event.DELETED, emitCurrentPolygon);
    map.on(L.Draw.Event.DRAWVERTEX, (e: L.LeafletEvent) => {
      // Leaflet's map.fire() no aísla errores entre listeners (llama a cada uno
      // sin try/catch): si esto lanza, aborta el resto de _vertexChanged/_endPoint
      // en leaflet-draw, incluido el paso que reactiva la colocación de vértices,
      // dejando el dibujo "trabado" después del punto que causó el error.
      try {
        const { layers } = e as unknown as L.DrawEvents.DrawVertex;
        const latlngs = layers.getLayers().map((marker) => (marker as L.Marker).getLatLng());
        setStatus({
          count: latlngs.length,
          areaHa: latlngs.length >= 3 ? computeAreaHa(latlngs) : 0,
        });
      } catch (err) {
        console.error('Error actualizando el chip de estado en DRAWVERTEX', err);
      }
    });

    return () => {
      map.removeControl(drawControl);
      map.removeLayer(featureGroup);
      map.off(L.Draw.Event.CREATED);
      map.off(L.Draw.Event.EDITED);
      map.off(L.Draw.Event.DELETED);
      map.off(L.Draw.Event.DRAWVERTEX);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);

  return (
    <>
      <InstructionsChip />
      <StatusChip pointCount={status.count} areaHa={status.areaHa} />
    </>
  );
}

export function EditCampoPolygonModal({ campo, open, onClose }: Props) {
  const [layer, setLayer] = useState<MapLayer>('calles');
  const [draftPoints, setDraftPoints] = useState<number[][]>(campo?.poligonoGps ?? []);
  const updateMutation = useUpdateCampoPoligono();
  const mapRef = useRef<L.Map | null>(null);

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
      afterOpenChange={(visible) => {
        if (visible) mapRef.current?.invalidateSize();
      }}
    >
      <div style={{ height: '70vh' }}>
        {open && (
          <MapContainer ref={mapRef} center={[19.7, -103.3]} zoom={13} style={{ height: '100%', width: '100%' }}>
            <TileLayer url={tile.url} attribution={tile.attribution} />
            <PlaceSearchControl />
            <MapLayerToggleControl layer={layer} onChange={setLayer} />
            <DrawLayer initialPoligono={campo?.poligonoGps ?? null} onChange={setDraftPoints} />
          </MapContainer>
        )}
      </div>
    </Modal>
  );
}
