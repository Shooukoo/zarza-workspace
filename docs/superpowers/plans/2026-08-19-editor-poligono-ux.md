# Editor de Polígono UX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Agregar buscador de lugar (Mapbox Geocoding), geolocalización, y dos chips de feedback en vivo (instrucciones · estado del polígono) como overlays flotantes sobre el mapa de `EditCampoPolygonModal`, sin tocar el flujo de guardado existente.

**Architecture:** Todo el trabajo es frontend, dentro de `zarza-web`. Se introduce un hook reutilizable (`useMapControl`) que encapsula la técnica "`useMap()` + `L.Control` custom + `ReactDOM.createPortal`" descrita en el spec, y se usa cuatro veces: buscador+geolocalización (arriba-derecha), toggle de capa existente reubicado (arriba-derecha, debajo del buscador), chip de instrucciones (abajo-izquierda) y chip de estado (abajo-derecha). No hay cambios de backend ni de contrato de API.

**Tech Stack:** React 18 + `react-leaflet` v4 + `leaflet-draw` (ya instalados) + antd, sobre el módulo `zarza-web/src/campos/` y `zarza-web/src/mapas-calor/`.

**Spec:** `docs/superpowers/specs/2026-08-19-editor-poligono-ux-design.md`

---

## Nota metodológica (leer antes de empezar)

`zarza-web` no tiene test runner de componentes configurado (no Vitest/RTL) — confirmado en `package.json` (solo `dev`/`build`) y ya documentado como convención aceptada en el plan de mapas de calor (`docs/superpowers/plans/2026-08-16-mapas-calor.md`, sección "Prerrequisitos"). El spec (§7) confirma que la verificación es manual.

Por lo tanto, en vez del ciclo clásico "test rojo → implementación → test verde", cada tarea usa:
1. **Chequeo de tipos**: `cd zarza-web && npm run build` (`tsc -b && vite build`) — debe terminar sin errores.
2. **Verificación manual en navegador**: `npm run dev` (puerto 5173) y pasos concretos descritos en cada tarea.

No hay archivos `*.spec.ts`/`*.test.tsx` en este plan porque no habría runner para ejecutarlos.

## Prerrequisitos

**0. Estado sucio de `main`.** Al momento de escribir este plan, `git status` muestra cambios sin commitear en `zarza-web/src/campos/EditCampoPolygonModal.tsx` (un fix chico: `mapRef` + `afterOpenChange` para `invalidateSize()`) y en `zarza-web/src/dashboard/DashboardPage.tsx` (no relacionado con este feature). Este plan **asume que el fix de `mapRef`/`invalidateSize` ya está aplicado** en el archivo (todo el código base de las tareas de abajo lo incluye). Antes de crear el worktree del punto 1:
   - Decidir con el usuario si ese fix se commitea a `main` primero (recomendado, es un cambio chico e independiente) o se descarta.
   - `DashboardPage.tsx` es un cambio no relacionado — no tocarlo en este feature; si sigue sin commitear, dejarlo intacto (no se pierde al crear el worktree, `git worktree add` parte del último commit de `main`, no del working tree sucio).

**1. Worktree.** Este feature es trabajo nuevo sobre un módulo existente — sigue la política de ramas del usuario: no trabajar directo sobre `main` en el directorio actual.
   ```bash
   git status
   git branch
   git worktree add ../zarza-workspace-editor-poligono-ux -b feature/editor-poligono-ux
   cd ../zarza-workspace-editor-poligono-ux
   ```
   Todas las tareas de abajo se ejecutan desde ese worktree.

**2. Variable de entorno para probar el buscador.** El buscador de lugar solo se renderiza con `VITE_MAPBOX_TOKEN` configurado (mismo patrón que el toggle de capa satelital). Para probar el golden path completo, definir esa variable en `zarza-web/.env` (no versionado) con un token de Mapbox válido antes de la Tarea 5. Las Tareas 1-4 no requieren el token para verificar que el resto del modal sigue funcionando.

## File Map

**Nuevo:**
- `zarza-web/src/mapas-calor/useMapControl.ts` — hook compartido que crea un `L.Control` posicionado y expone su `<div>` para portal (Tarea 1).
- `zarza-web/src/mapas-calor/PlaceSearchControl.tsx` — buscador de lugar (Mapbox Geocoding) + botón de geolocalización (Tarea 3).

**Modificar:**
- `zarza-web/src/campos/EditCampoPolygonModal.tsx` — chips de instrucciones/estado en `DrawLayer` (Tarea 2), montaje de `PlaceSearchControl` (Tarea 3), reubicación de `MapLayerToggle` como control de mapa (Tarea 4).

**Sin cambios** (confirmado contra el spec §5):
- `zarza-web/src/mapas-calor/MapLayerToggle.tsx` — el componente en sí no cambia de comportamiento, solo cambia *dónde* se monta (dentro de un `L.Control` en vez de un `<div>` sobre el mapa).
- `zarza-web/.env.example` — `VITE_MAPBOX_TOKEN` ya documentado desde el feature de mapas de calor.

---

### Task 1: Hook compartido `useMapControl`

**Files:**
- Create: `zarza-web/src/mapas-calor/useMapControl.ts`

Este hook implementa la técnica descrita en el spec §1: crea un `L.Control` custom en la esquina indicada, le aplica `L.DomEvent.disableClickPropagation` (para que clicks en el contenido no disparen el dibujo del polígono en el mapa), y devuelve el `<div>` del control para que el componente que lo use lo llene vía `ReactDOM.createPortal`. Se comparte entre los 4 usos (buscador, toggle de capa, chip de instrucciones, chip de estado) para no repetir el `useEffect` de `addControl`/`removeControl` cuatro veces.

- [ ] **Step 1: Crear el hook**

```ts
import { useEffect, useState } from 'react';
import L from 'leaflet';
import { useMap } from 'react-leaflet';

export function useMapControl(position: L.ControlPosition): HTMLDivElement | null {
  const map = useMap();
  const [container, setContainer] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    const control = new L.Control({ position });
    control.onAdd = () => {
      const div = L.DomUtil.create('div', 'leaflet-control');
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
  }, [map, position]);

  return container;
}
```

- [ ] **Step 2: Verificar que compila**

Run: `cd zarza-web && npm run build`
Expected: termina sin errores (el archivo no tiene todavía ningún consumidor, pero debe tipar correctamente por sí solo).

- [ ] **Step 3: Commit**

```bash
git add zarza-web/src/mapas-calor/useMapControl.ts
git commit -m "feat: agregar hook useMapControl para controles Leaflet con portal de React"
```

---

### Task 2: Chip de instrucciones + chip de estado en vivo

**Files:**
- Modify: `zarza-web/src/campos/EditCampoPolygonModal.tsx`

Implementa el spec §3 (chip de instrucciones, estático) y §4 (chip de estado: puntos · hectáreas · validez). Ambos chips viven en `DrawLayer`, calculando el área con `L.GeometryUtil.geodesicArea` (ya viene con `leaflet-draw`, sin dependencia nueva — confirmado: `import 'leaflet-draw'` ya está en este archivo y augmenta `L` globalmente con `L.GeometryUtil`). El chip de estado se inicializa con el conteo/área del polígono precargado (edge case del spec §6: "el chip de estado refleja el conteo/área del polígono precargado apenas se monta `DrawLayer`, no solo tras la primera edición").

- [ ] **Step 1: Agregar imports nuevos**

Reemplazar el bloque de imports (líneas 1-7 del archivo actual):

```ts
import { useEffect, useRef, useState } from 'react';
```

por:

```ts
import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { createPortal } from 'react-dom';
```

(el resto de imports —`Modal`, `notification`, `MapContainer`, `TileLayer`, `useMap`, `L`, `'leaflet-draw'`, `useUpdateCampoPoligono`, `Campo`, `MapLayerToggle`, `tileLayerFor`, `MapLayer`— quedan igual por ahora) y agregar, después del import de `MapLayerToggle`:

```ts
import { useMapControl } from '../mapas-calor/useMapControl';
```

- [ ] **Step 2: Agregar estilos y helpers compartidos, antes de `function DrawLayer`**

```tsx
const CHIP_STYLE: CSSProperties = {
  background: '#fff',
  padding: '4px 10px',
  borderRadius: 4,
  boxShadow: '0 1px 5px rgba(0,0,0,0.4)',
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
```

- [ ] **Step 3: Inicializar el estado del chip en `DrawLayer` a partir del polígono precargado**

Dentro de `function DrawLayer(...)`, justo después de `const featureGroupRef = useRef(new L.FeatureGroup());`, agregar:

```tsx
  const [status, setStatus] = useState(() => {
    const count = initialPoligono?.length ?? 0;
    if (count < 3) return { count, areaHa: 0 };
    const latlngs = initialPoligono!.map(([lng, lat]) => L.latLng(lat, lng));
    return { count, areaHa: computeAreaHa(latlngs) };
  });
```

- [ ] **Step 4: Actualizar el estado en cada `emitCurrentPolygon`**

Reemplazar la función `emitCurrentPolygon` completa:

```tsx
    function emitCurrentPolygon() {
      const layers = featureGroup.getLayers() as L.Polygon[];
      if (layers.length === 0) {
        onChange([]);
        return;
      }
      const latlngs = layers[0].getLatLngs()[0] as L.LatLng[];
      onChange(latlngs.map((ll) => [ll.lng, ll.lat]));
    }
```

por:

```tsx
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
```

- [ ] **Step 5: Renderizar los chips en vez de `return null`**

Al final de `DrawLayer`, reemplazar:

```tsx
  return null;
}
```

por:

```tsx
  return (
    <>
      <InstructionsChip />
      <StatusChip pointCount={status.count} areaHa={status.areaHa} />
    </>
  );
}
```

- [ ] **Step 6: Verificar que compila**

Run: `cd zarza-web && npm run build`
Expected: sin errores de tipos.

- [ ] **Step 7: Verificación manual**

```bash
npm run dev
```

En el navegador, abrir el dashboard, ir a Campos, "Editar límites" de un campo **sin** polígono:
- Confirmar que aparece el chip abajo-izquierda con el texto de instrucciones.
- Confirmar que el chip abajo-derecha dice "0 puntos · dibuja el polígono".
- Dibujar 2 puntos → el chip cambia a "2 puntos · agrega 1 más" y el botón "Aceptar" del modal sigue deshabilitado.
- Agregar el 3er punto y cerrar el polígono (doble click) → el chip muestra "3 puntos · X.X ha · ✓ válido" y "Aceptar" se habilita.

Luego abrir "Editar límites" de un campo **con** polígono ya guardado:
- Confirmar que el chip de estado muestra el conteo/área correctos **apenas se abre el modal**, sin necesidad de tocar el polígono primero.

- [ ] **Step 8: Commit**

```bash
git add zarza-web/src/campos/EditCampoPolygonModal.tsx
git commit -m "feat: chips de instrucciones y estado en vivo en el editor de polígono"
```

---

### Task 3: Buscador de lugar + geolocalización

**Files:**
- Create: `zarza-web/src/mapas-calor/PlaceSearchControl.tsx`
- Modify: `zarza-web/src/campos/EditCampoPolygonModal.tsx`

Implementa el spec §2. Resuelve una tensión del spec: §2 dice que el ícono de geolocalización vive "dentro del mismo control de búsqueda", pero §6 dice explícitamente que la geolocalización "tampoco depende del token — sigue disponible aunque no haya buscador". La implementación de abajo resuelve esto así: el control (el `<div>` flotante) siempre se monta; el `<input>` de búsqueda + su dropdown se renderizan condicionalmente solo si `VITE_MAPBOX_TOKEN` existe, pero el botón "📍" se renderiza siempre dentro del mismo control, sin condición de token.

- [ ] **Step 1: Crear `PlaceSearchControl.tsx`**

```tsx
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
```

- [ ] **Step 2: Montar `PlaceSearchControl` en el modal**

En `EditCampoPolygonModal.tsx`, agregar el import junto a los otros de `mapas-calor`:

```ts
import { PlaceSearchControl } from '../mapas-calor/PlaceSearchControl';
```

Y dentro del `<MapContainer>`, agregar `<PlaceSearchControl />` como hijo, justo después de `<TileLayer ... />`:

```tsx
          <MapContainer ref={mapRef} center={[19.7, -103.3]} zoom={13} style={{ height: '100%', width: '100%' }}>
            <TileLayer url={tile.url} attribution={tile.attribution} />
            <PlaceSearchControl />
            <DrawLayer initialPoligono={campo?.poligonoGps ?? null} onChange={setDraftPoints} />
          </MapContainer>
```

- [ ] **Step 3: Verificar que compila**

Run: `cd zarza-web && npm run build`
Expected: sin errores de tipos.

- [ ] **Step 4: Verificación manual — sin token**

Con `zarza-web/.env` sin `VITE_MAPBOX_TOKEN` (o sin el archivo), correr `npm run dev` y abrir el editor de polígono:
- Confirmar que el `<input>` de búsqueda **no** aparece.
- Confirmar que el botón "📍" **sí** aparece arriba-derecha, y al hacer click intenta geolocalizar (aceptar/denegar el permiso del navegador y confirmar el `flyTo` o el `notification.error`, respectivamente).

- [ ] **Step 5: Verificación manual — con token**

Definir `VITE_MAPBOX_TOKEN=<tu-token>` en `zarza-web/.env`, reiniciar `npm run dev`, abrir el editor:
- Escribir un lugar (p.ej. "Guadalajara") → esperar ~400ms → confirmar que aparece la lista de resultados.
- Click en un resultado → confirmar que el mapa navega ahí (`flyTo` zoom 15) y la lista se cierra.
- Escribir algo sin resultados (p.ej. "asdkjaskdjaskd") → confirmar que la lista muestra "Sin resultados".

- [ ] **Step 6: Commit**

```bash
git add zarza-web/src/mapas-calor/PlaceSearchControl.tsx zarza-web/src/campos/EditCampoPolygonModal.tsx
git commit -m "feat: buscador de lugar con geolocalización en el editor de polígono"
```

---

### Task 4: Reubicar el toggle de capa como control de mapa

**Files:**
- Modify: `zarza-web/src/campos/EditCampoPolygonModal.tsx`

Implementa el layout del spec §1: el toggle Calles/Satélite (`MapLayerToggle`, sin cambios de comportamiento) pasa de vivir en un `<div>` sobre el modal a vivir apilado debajo del buscador, en la esquina `topright` del mapa. El orden de montaje importa: `PlaceSearchControl` debe agregarse al mapa antes que este nuevo control para que Leaflet lo apile arriba (confirmado en Task 3, `PlaceSearchControl` ya es el primer hijo del `MapContainer` después de `TileLayer`).

- [ ] **Step 1: Agregar el componente `MapLayerToggleControl`**

En `EditCampoPolygonModal.tsx`, después de `StatusChip` (agregado en la Tarea 2) y antes de `function DrawLayer`, agregar:

```tsx
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
```

- [ ] **Step 2: Quitar el `<div>` externo y montar el control dentro del mapa**

Reemplazar:

```tsx
      <div style={{ marginBottom: 8 }}>
        <MapLayerToggle value={layer} onChange={setLayer} />
      </div>
      <div style={{ height: '70vh' }}>
        {open && (
          <MapContainer ref={mapRef} center={[19.7, -103.3]} zoom={13} style={{ height: '100%', width: '100%' }}>
            <TileLayer url={tile.url} attribution={tile.attribution} />
            <PlaceSearchControl />
            <DrawLayer initialPoligono={campo?.poligonoGps ?? null} onChange={setDraftPoints} />
          </MapContainer>
        )}
      </div>
```

por:

```tsx
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
```

- [ ] **Step 3: Verificar que compila**

Run: `cd zarza-web && npm run build`
Expected: sin errores de tipos. (`noUnusedLocals` fallaría si `MapLayerToggle` quedó importado pero sin uso — no es el caso, ahora se usa dentro de `MapLayerToggleControl`.)

- [ ] **Step 4: Verificación manual**

`npm run dev`, abrir el editor de polígono:
- Confirmar que el toggle "Calles"/"Satélite" aparece arriba-derecha, apilado **debajo** del buscador (o del botón de geolocalización solo, si no hay token).
- Cambiar a "Satélite" y confirmar que la capa del mapa cambia correctamente (mismo comportamiento que antes, solo cambió la posición visual).
- Confirmar que ya no queda ningún toggle duplicado arriba del mapa (fuera del `MapContainer`).

- [ ] **Step 5: Commit**

```bash
git add zarza-web/src/campos/EditCampoPolygonModal.tsx
git commit -m "refactor: mover el toggle de capa a un control de mapa junto al buscador"
```

---

### Task 5: Verificación end-to-end del golden path

**Files:** ninguno (solo verificación; si aparece algún bug, corregirlo en el archivo correspondiente y commitear el fix por separado).

Recorre el golden path completo del spec §7 más los edge cases de §6, para confirmar que las cuatro tareas anteriores funcionan integradas.

- [ ] **Step 1: Golden path (spec §7)**

Con `VITE_MAPBOX_TOKEN` configurado y `npm run dev` corriendo:

1. Abrir el editor de un campo **sin** polígono.
2. Buscar un lugar en el buscador → confirmar que el mapa navega ahí.
3. Dibujar 2 puntos → el chip de estado dice "2 puntos · agrega 1 más", "Aceptar" deshabilitado.
4. Agregar 1 punto más y cerrar el polígono → el chip muestra área y "✓ válido", "Aceptar" habilitado.
5. Guardar (click "Aceptar") → confirmar notificación de éxito y que el modal se cierra.
6. Reabrir el mismo campo → confirmar que el polígono y el chip de estado cargan correctamente desde el inicio (sin tocar nada).
7. Probar geolocalización: permitir el permiso del navegador (confirma `flyTo`) y denegarlo en otra prueba (confirma `notification.error`, sin romper el resto del modal).
8. Quitar `VITE_MAPBOX_TOKEN` del `.env`, reiniciar `npm run dev`, y confirmar que el buscador está ausente pero el resto del modal (dibujo, chips, toggle de capa nativo de Leaflet arriba-izquierda, geolocalización) sigue funcional.

- [ ] **Step 2: Edge cases (spec §6)**

Confirmar explícitamente cada fila de la tabla de edge cases del spec:

| Caso | Verificación |
|---|---|
| Sin `VITE_MAPBOX_TOKEN` | Buscador ausente; botón de geolocalización presente e independiente del token. |
| Geocoding sin resultados | Lista muestra "Sin resultados". |
| Geocoding con error de red | Simular (p.ej. cortar la red un momento mientras se escribe) → lista muestra "Sin resultados", sin crash. |
| Geolocalización denegada/no soportada/timeout | `notification.error` visible, modal sigue usable. |
| Polígono con 0 puntos | Chip: "0 puntos · dibuja el polígono"; "Aceptar" deshabilitado. |
| Editar un polígono precargado | Chip de estado correcto apenas se abre el modal. |

- [ ] **Step 3: Si se encontró algún bug, corregirlo y commitear**

```bash
git add <archivos-corregidos>
git commit -m "fix: <descripción del bug encontrado en la verificación end-to-end>"
```

Si no se encontró ningún bug, no hay commit para este paso.

---

## Resumen de commits esperados

1. `feat: agregar hook useMapControl para controles Leaflet con portal de React`
2. `feat: chips de instrucciones y estado en vivo en el editor de polígono`
3. `feat: buscador de lugar con geolocalización en el editor de polígono`
4. `refactor: mover el toggle de capa a un control de mapa junto al buscador`
5. (opcional) `fix: ...` si la verificación end-to-end encuentra algo

Al terminar, abrir PR de `feature/editor-poligono-ux` contra `main` (fuera de este plan — pedir confirmación al usuario antes de hacer push/PR, según la política de acciones riesgosas).
