# Diseño: UX del editor de polígono de campo

**Fecha:** 2026-08-19
**Feature:** Mejoras de usabilidad a `EditCampoPolygonModal` (`zarza-web/src/campos/`) — buscador de lugar, geolocalización, y feedback en vivo mientras se dibuja.

---

## Resumen

`EditCampoPolygonModal` (agregado en el feature de mapas de calor, [[2026-08-16-mapas-calor-design]]) permite dibujar/editar el polígono de un campo con `leaflet-draw`, pero hoy tiene tres problemas de usabilidad:

1. **Difícil de usar**: la barra de herramientas de `leaflet-draw` es genérica y no explica cómo dibujar (click para agregar puntos, doble click para cerrar).
2. **Difícil ubicar el campo**: el mapa arranca centrado en un punto fijo (`19.7, -103.3`) cuando no hay polígono previo; no hay forma de buscar una dirección/lugar ni de centrar en la ubicación actual del usuario.
3. **Sin feedback en vivo**: el botón "Aceptar" se deshabilita si hay menos de 3 puntos, pero no se explica por qué, ni se muestra el área aproximada del polígono para validar que corresponde al tamaño real del campo.

Este spec agrega, sobre el mapa existente, cuatro controles nuevos como chips flotantes (estilo editor de mapa — ver mockup aprobado): buscador de lugar con botón de geolocalización integrado, chip de instrucciones, y chip de estado en vivo (puntos · hectáreas · validez).

**Fuera de alcance:** confirmación al cancelar con cambios sin guardar, undo de puntos individuales, rediseño de la barra de dibujo de `leaflet-draw` (el editar/borrar nativo ya cubre corregir un polígono mal dibujado).

---

## 1. Layout de controles sobre el mapa

El mapa (`MapContainer`, hoy a `height: 70vh` dentro del modal) gana overlays posicionados en las cuatro esquinas, usando los `position`/corner de Leaflet donde sea posible para que el propio Leaflet maneje el apilado y no choquen entre sí:

| Posición | Contenido | Nota |
|---|---|---|
| Arriba-izquierda | Zoom +/− y barra de dibujo de `leaflet-draw` (sin cambios) | Nativo de Leaflet, ya vive ahí |
| Arriba-derecha | Buscador de lugar (input + ícono "📍" de geolocalización dentro del mismo campo), y debajo el toggle Calles/Satélite existente | Dos controles Leaflet apilados en la esquina `topright` |
| Abajo-izquierda | Chip de instrucciones: *"Click para agregar puntos · doble click para cerrar el polígono"* | Estático, siempre visible mientras el modal está abierto |
| Abajo-derecha | Chip de estado: `N puntos · X.X ha · ✓ válido` o `N puntos · agrega M más` si N < 3 | Se recalcula en cada cambio del polígono |

Todos los chips y el buscador se implementan con la misma técnica: un componente hijo de `MapContainer` que obtiene la instancia del mapa con `useMap()` y, en un `useEffect`, crea un `L.Control` custom (`L.Control.extend({ onAdd })`) posicionado en la esquina correspondiente (`'topright'`/`'bottomleft'`/`'bottomright'`) y agregado con `map.addControl()`. El `onAdd` devuelve un `<div>` con las clases `leaflet-control` (Leaflet ya las estiliza con fondo/sombra/borde) al que se le aplica `L.DomEvent.disableClickPropagation` para que los clicks en el chip/input no disparen el dibujo del polígono en el mapa. El contenido interno del control (texto del chip, o el input+lista del buscador) se renderiza con React vía `ReactDOM.createPortal` al `<div>` del control, para poder usar hooks/estado normales en vez de manipular el DOM a mano.

---

## 2. Buscador de lugar

- Nuevo componente `PlaceSearchControl` en `zarza-web/src/mapas-calor/` (junto a `MapLayerToggle`, ya que ambos son controles de mapa reutilizables — aunque hoy solo lo use el editor de polígono, es el mismo tipo de pieza que ya vive ahí).
- Input controlado con `debounce` (400ms) sobre **Mapbox Geocoding API** (`GET https://api.mapbox.com/geocoding/v5/mapbox.places/{query}.json?access_token=...&country=mx&limit=5`), reutilizando `VITE_MAPBOX_TOKEN` (mismo token que ya usa `tileLayerFor` para la capa satelital).
- Si `VITE_MAPBOX_TOKEN` no está configurado, el control **no se renderiza** — mismo patrón de degradación ya usado por `MapLayerToggle` (`if (!MAPBOX_TOKEN) return null`). No hay buscador roto ni mensaje de error.
- Resultados en una lista desplegable debajo del input (nombre completo del lugar). Click en un resultado → `map.flyTo([lat, lng], 15)` y cierra la lista. No modifica el polígono dibujado — solo navega el mapa.
- `country=mx` fijo (los campos del negocio están en México); no configurable desde la UI.
- Sin resultados o error de red: la lista muestra "Sin resultados" / no rompe el input; no hay reintento automático.

### Geolocalización

- Ícono "📍" dentro del mismo control de búsqueda (a la derecha del input), fuera del flujo del texto.
- Click → `navigator.geolocation.getCurrentPosition()`. Éxito → `map.flyTo([lat, lng], 16)`. Error (permiso denegado, no soportado, timeout) → `notification.error` de antd con mensaje genérico ("No se pudo obtener tu ubicación"), sin bloquear el resto del modal.

---

## 3. Chip de instrucciones

- Texto estático, sin lógica condicional: *"Click para agregar puntos · doble click para cerrar el polígono"*.
- Mismo componente/estilo base que el chip de estado (para no crear dos sistemas de "chip flotante" distintos).

---

## 4. Chip de estado en vivo (puntos · área · validez)

- Vive en `DrawLayer` (el componente que ya escucha `L.Draw.Event.CREATED/EDITED/DELETED` y mantiene `draftPoints` vía `onChange`), como estado derivado de `draftPoints` — no requiere nueva suscripción a eventos de Leaflet.
- **Puntos**: `draftPoints.length`.
- **Área**: `L.GeometryUtil.geodesicArea(latlngs) / 10000` (m² → hectáreas), función que ya viene incluida en `leaflet-draw` (no es una dependencia nueva — se usa internamente en su tooltip de área durante el dibujo, aquí se invoca directamente para mostrarla siempre, no solo mientras se dibuja). Formateada a 1 decimal, mismo `Intl.NumberFormat('es-MX', ...)` que ya usa el resto de `zarza-web` (ver `formatDecimal` en `DashboardPage.tsx` como referencia de convención, aunque no se reutiliza directamente por vivir en otro módulo).
- **Validez**: `draftPoints.length >= 3`.
  - `< 3` puntos (incluye 0): `"{N} puntos · agrega {3 - N} más"` (o `"0 puntos · dibuja el polígono"` cuando N=0).
  - `>= 3` puntos: `"{N} puntos · {área} ha · ✓ válido"`.
- Este chip **reemplaza** la necesidad de que el usuario adivine por qué "Aceptar" está deshabilitado — el botón se mantiene deshabilitado con la misma condición (`draftPoints.length < 3`) que ya existe en el modal, el chip solo hace visible la razón.

---

## 5. Cambios en archivos existentes

| Archivo | Cambio |
|---|---|
| `EditCampoPolygonModal.tsx` | Renderiza `PlaceSearchControl` dentro de `MapContainer`; el layout de controles (zoom/draw arriba-izq, búsqueda+capa arriba-der) queda a cargo de las clases nativas de Leaflet, sin tocar el `MapContainer` en sí más que agregar el nuevo control como hijo. |
| `DrawLayer` (mismo archivo) | Agrega chip de instrucciones y chip de estado como controles Leaflet (técnica de la sección 1: `useMap()` + `L.Control` + portal), calcula área con `L.GeometryUtil.geodesicArea` en cada `emitCurrentPolygon`. |
| `mapas-calor/MapLayerToggle.tsx` | Sin cambios de comportamiento; se mueve a compartir carpeta con el nuevo `PlaceSearchControl` (ya viven juntos). |
| Nuevo: `mapas-calor/PlaceSearchControl.tsx` | Componente descrito en la sección 2. |
| `.env.example` (`zarza-web`) | Sin cambios — `VITE_MAPBOX_TOKEN` ya está documentado ahí desde el feature de mapas de calor. |

No hay cambios de backend ni de contrato de API — todo el trabajo es frontend, sobre un modal que ya existe.

---

## 6. Manejo de errores / edge cases

| Caso | Comportamiento |
|---|---|
| `VITE_MAPBOX_TOKEN` no configurado | El buscador de lugar no se renderiza (igual que el toggle de satélite hoy). El botón de geolocalización tampoco depende del token — sigue disponible aunque no haya buscador. |
| Geocoding sin resultados | Lista desplegable muestra "Sin resultados". |
| Geocoding con error de red/rate limit | Lista muestra "Sin resultados" (mismo estado visual, sin distinguir causa — no se justifica manejo de error dedicado para un control secundario de navegación). |
| Geolocalización denegada/no soportada/timeout | `notification.error` de antd, no bloquea el resto del flujo. |
| Polígono con 0 puntos | Chip de estado: "0 puntos · dibuja el polígono"; botón "Aceptar" deshabilitado (comportamiento ya existente). |
| Editar un polígono existente (precargado) | El chip de estado refleja el conteo/área del polígono precargado apenas se monta `DrawLayer`, no solo tras la primera edición. |

---

## 7. Testing

- No hay suite de componentes (Vitest/RTL) configurada en `zarza-web` — se mantiene esa convención (misma nota que el spec de mapas de calor).
- Validación manual del golden path: abrir editor de un campo sin polígono → buscar un lugar → confirmar que el mapa navega ahí → dibujar 2 puntos (chip dice "agrega 1 más", Aceptar deshabilitado) → agregar 1 más y cerrar (chip muestra área y "✓ válido", Aceptar habilitado) → guardar → reabrir el mismo campo y confirmar que el polígono y el chip de estado cargan correctamente desde el inicio → probar geolocalización (permitir y denegar el permiso del navegador) → probar sin `VITE_MAPBOX_TOKEN` configurado (buscador ausente, resto del modal funcional).

---

## 8. Fuera de alcance (explícito)

- Confirmación al cancelar el modal con cambios sin guardar.
- Undo de puntos individuales durante el dibujo (la herramienta nativa "editar"/"borrar" de `leaflet-draw` ya permite corregir un polígono mal dibujado).
- Rediseño visual de la barra de herramientas de `leaflet-draw` en sí (los íconos nativos se mantienen).
- Guardar/recordar la última posición del mapa entre sesiones.
- Geocoding fuera de México o configurable por el usuario.
