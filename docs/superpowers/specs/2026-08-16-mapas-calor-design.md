# Diseño: Mapas de Calor

**Fecha:** 2026-08-16
**Feature:** Visualización geográfica de análisis de zarzamora por campo, editor de polígonos de campo, y soporte de impresión/capa satelital.

---

## Resumen

Cada análisis capturado por `zarza_ai` puede traer coordenadas GPS (`Analysis.ubicacionLat`/`ubicacionLng`, opcionales — dependen de si el dispositivo tuvo señal al momento de la foto), y cada `Campo` puede tener un polígono de límites (`Campo.poligonoGps`, hoy sin ninguna forma de cargarlo desde la UI). Ningún componente de mapa existe hoy en `zarza-web`.

Este spec agrega una nueva página **Mapas de Calor** que visualiza dónde se concentran los análisis, coloreados por una métrica seleccionable (densidad de detecciones o merma/enfermedad), con dos niveles de zoom (todos los campos → un campo en detalle), y un **editor de polígono** en `CamposPage` para que los límites reales de un campo se puedan cargar y aprovechar en esa vista general. Incluye toggle de capa satelital e impresión del mapa.

**Fuera de alcance:** clustering en la vista general (ya es 1 marcador/polígono por campo), exportar como imagen PNG descargable (solo impresión vía navegador), edición geométrica avanzada del polígono (recortar, unir múltiples polígonos por campo), soporte offline en `zarza_ai` para este feature.

---

## 1. Backend — Módulo `mapas-calor`

Nuevo módulo en `fruit-backend/src/mapas-calor/`, siguiendo el patrón por-feature del resto del servicio (`controller` + `service`, sin capas adicionales — no hay lógica de dominio compleja que justifique Clean Architecture aquí, a diferencia de `auth/`).

### `GET /api/v1/mapas-calor/campos?from=&to=`

Vista general. `from`/`to` son fechas ISO opcionales (filtran por `Analysis.fechaAnalisis`); sin ellas, se usa todo el histórico.

**Scoping** (idéntico a `CamposController.findAll`):
- `ADMIN` → todos los campos.
- `PRODUCTOR` → solo campos con `productorId === user.sub`.
- `AGRONOMO` → solo campos en `user.camposAsignados`.

**Respuesta:**

```ts
{
  campos: Array<{
    campoId: string;
    nombre: string;
    poligonoGps: [number, number][] | null; // null si tiene <3 puntos
    centroid: { lat: number; lng: number };  // promedio de lat/lng de sus análisis geolocalizados
    analysisCount: number;
    totalElementosDetectados: number;
    avgMermaPercent: number;
  }>;
  sinUbicacion: number; // análisis del scope/rango sin lat/lng
}
```

Solo se incluyen campos con **al menos 1 análisis geolocalizado** en el rango (sin eso no hay `centroid` que calcular, y nada que dibujar). Un campo con `poligonoGps` cargado pero cero análisis geolocalizados en el rango no aparece — es información de `CamposPage`, no de este mapa.

### `GET /api/v1/mapas-calor/campos/:campoId/analisis?from=&to=`

Vista de campo. Verifica acceso al campo con el mismo chequeo que `CamposController.findById` (404 si el usuario no tiene acceso, no 403 — mismo criterio ya usado ahí para no filtrar existencia).

**Respuesta:**

```ts
Array<{
  id: string;
  lat: number;
  lng: number;
  fechaAnalisis: string;
  variedad: string | null;
  porcentajeMermaGeneral: number;
  totalElementosDetectados: number;
  elementosSanos: number;
  elementosEnfermos: number;
  validacionEstado: EstadoValidacion;
}>
```

Solo análisis con `ubicacionLat`/`ubicacionLng` no nulos. Orden: `fechaAnalisis` descendente.

### Notas de implementación

- Sin caché (el filtro de fecha variable da poca tasa de acierto a un cache por combinación de parámetros). Se agrega índice `@@index([campoId, fechaAnalisis])` a `Analysis` en `packages/database/prisma/schema.prisma` para las queries por rango.
- `centroid` se calcula con un `AVG()` en la misma query de agregación (Prisma `groupBy` o raw query, como ya se hace en `admin-dashboard.service.ts` para queries que necesitan `JOIN`/agregación no soportada por el query builder).

---

## 2. Backend — Edición de polígono (`campos`)

Hoy `CamposController` no tiene ningún endpoint de actualización (`create`, `findAll`, `findById`, `delete`, sin `PATCH`/`PUT`). Se agrega:

### `PATCH /api/v1/campos/:id/poligono`

**Body:** `{ poligono_gps: [number, number][] }` — pares `[lat, lng]` (convención nativa de Leaflet, evita conversiones en el frontend). Mínimo 3 puntos. DTO valida rango de cada coordenada (`lat` ∈ [-90, 90], `lng` ∈ [-180, 180]) y longitud mínima; responde 400 si no cumple.

**Roles:** `ADMIN` (cualquier campo) o `PRODUCTOR` dueño del campo (`campo.productorId === user.sub`, verificado en el controller antes de delegar al service — 403 si no es dueño). `AGRONOMO` no tiene acceso a este endpoint (`@Roles(Role.ADMIN, Role.PRODUCTOR)`).

`CamposService` gana un método `updatePoligono(id, poligonoGps)` análogo a `delete()` (usa `updateMany` con `where: { id }` para poder distinguir 404 de éxito sin un `findUnique` previo, igual que el patrón de `delete`).

---

## 3. Frontend — Página Mapas de Calor

**Ruta:** `/mapas-calor`, roles `ADMIN`/`PRODUCTOR`/`AGRONOMO` (mismo patrón `PrivateRoute` que el resto). Nuevo item en el nav de `AppShell.tsx`.

**Carpeta:** `zarza-web/src/mapas-calor/` — `MapasCalorPage.tsx`, `hooks/useMapasCalor.ts`, `CampoDetailMap.tsx`, `AnalisisPopup.tsx`, y componentes compartidos con el editor de polígono (`shared/MapLayerToggle.tsx`).

**Dependencias nuevas** (`zarza-web/package.json`): `leaflet`, `react-leaflet` (v4, compatible con React 18), `react-leaflet-cluster`, `leaflet-draw` + tipos. CSS de Leaflet importado una vez en `main.tsx`.

**Variable de entorno nueva:** `VITE_MAPBOX_TOKEN` (opcional). `zarza-web` hoy no tiene `.env` — se documenta en un `.env.example` nuevo para ese paquete.

### Controles compartidos (barra superior, visibles en ambas vistas)

- Selector de métrica: *Densidad de detecciones* (color por `totalElementosDetectados`) / *Merma-enfermedad* (color por `avgMermaPercent` o `porcentajeMermaGeneral` según la vista). Escala de color relativa al mínimo/máximo del set de datos actual (verde → amarillo → rojo), no umbrales absolutos fijos — evita mapas "todo rojo" o "todo verde" cuando los valores reales del dataset son mucho más bajos/altos que un umbral hardcodeado.
- `RangePicker` de fechas (antd), opcional.
- Toggle de capa: *Calles* (OpenStreetMap, siempre disponible, sin key) / *Satélite* (Mapbox Raster Tiles API vía `TileLayer` de Leaflet — **no** Mapbox GL JS, para no mezclar dos motores de mapa; cae en el bucket de 750k tiles/mes gratis de Mapbox). El toggle de satélite se **oculta** si `VITE_MAPBOX_TOKEN` no está configurado, en vez de mostrar un mapa roto.
- Botón "Imprimir": `window.print()` + CSS `@media print` que oculta sidebar/nav/controles y expande el mapa a la hoja.
- Breadcrumb "← Todos los campos", visible solo en vista de campo.

### Vista general (`GET /mapas-calor/campos`)

- Por campo: si `poligonoGps` no es `null`, se dibuja un `<Polygon>` de `react-leaflet` relleno con el color de la métrica activa (choropleth). Si es `null`, un `<CircleMarker>` en `centroid`. Ambos con el mismo color de escala y ambos clickeables.
- Click → drill-in: cambia a vista de campo, `map.fitBounds()` a ese campo.
- Tooltip on-hover: nombre del campo + valor agregado de la métrica activa.
- Si `sinUbicacion > 0`, aviso no bloqueante ("N análisis en este período no tienen ubicación GPS y no se muestran").
- Si el usuario no tiene ningún campo con análisis geolocalizados en el rango (incluye el caso AGRONOMO sin campos asignados), estado vacío con el mensaje correspondiente en vez de un mapa en blanco.

### Vista de campo (`GET /mapas-calor/campos/:id/analisis`)

- Un `<CircleMarker>` clickeable por análisis, coloreado por su propio valor de la métrica activa. Agrupados con `react-leaflet-cluster` cuando están muy próximos entre sí (mismas plantas fotografiadas varias veces); click en un cluster hace zoom, no abre popup.
- Click en un marcador individual → popup (`AnalisisPopup`) con: fecha, variedad, % merma, elementos sanos/enfermos, estado de validación (revisado/pendiente), y botón **"Ver detecciones"**:
  - `ADMIN`/`AGRONOMO` → navega a `/analisis/:id/revision-detecciones` (ruta existente).
  - `PRODUCTOR` → navega a `/analisis?id=:id`. Requiere agregar soporte de query param a `AnalisisPage.tsx`: al montar, si hay `?id=`, hace `setSelectedId` con ese valor para abrir `AnalisisDetailModal` automáticamente (hoy `selectedId` solo se setea por click en una fila de la tabla).

---

## 4. Frontend — Editor de polígono en `CamposPage`

- Nueva columna de acciones "Editar límites" (ícono de mapa) en la tabla de `CamposPage.tsx`. Visible cuando `user.role === ADMIN`, o (`user.role === PRODUCTOR` **y** `campo.productorId === user.id`) — mismo criterio de ownership que valida el backend. `AGRONOMO` no ve el botón (puede ver el polígono en el mapa de calor, no editarlo).
- Abre `EditCampoPolygonModal`: mapa Leaflet a pantalla casi completa con `leaflet-draw` en modo polígono único. Si el campo ya tiene `poligonoGps`, se precarga en modo edición (arrastrar vértices existentes); si no, arranca vacío para dibujar desde cero.
- Usa el mismo `MapLayerToggle` (calles/satélite) que la página de mapas de calor.
- Validación cliente antes de habilitar "Guardar": mínimo 3 vértices (la misma que valida el backend, para dar feedback inmediato sin esperar el 400).
- Al guardar: `PATCH /campos/:id/poligono`, invalida el cache de `useCampos` (React Query) para que la tabla y el mapa de calor reflejen el cambio.

---

## 5. Manejo de errores / edge cases

| Caso | Comportamiento |
|---|---|
| Campo sin análisis geolocalizados en el rango | No aparece en la vista general (nada que dibujar). No afecta su listado en `CamposPage`. |
| Campo sin `poligonoGps` y sin análisis geolocalizados | Sin `centroid` posible → excluido de la vista general. |
| `AGRONOMO` sin campos asignados | Vista general vacía con mensaje, igual que el estado ya existente en `CamposPage`. |
| Token de Mapbox ausente | Toggle de satélite deshabilitado con tooltip explicativo; el mapa sigue funcionando con OSM. |
| Token de Mapbox inválido/expirado en runtime | Leaflet muestra tiles vacíos en esa capa; no requiere manejo especial de errores en código (no rompe el resto del mapa). |
| Polígono inválido al guardar (<3 puntos, autointersección) | Bloqueado en el cliente por `leaflet-draw` antes de habilitar "Guardar"; el backend igual valida y responde 400 como segunda barrera. |
| `PRODUCTOR` intenta editar polígono de un campo ajeno vía llamada directa a la API | 403 — ya cubierto por el chequeo de ownership del nuevo endpoint. |
| `PRODUCTOR` accede a `/analisis?id=X` de un análisis ajeno por URL directa | Ya cubierto por el scoping existente de `AnalysesService.findById` (`UserScope` filtra por `productorId`/`camposAsignados`) — devuelve 404, no requiere cambios. |

---

## 6. Testing

**Backend:**
- `MapasCalorService`: agregación por campo (conteos, promedio de merma, cálculo de `centroid`), scoping por rol (ADMIN/PRODUCTOR/AGRONOMO), exclusión de análisis sin GPS, cálculo de `sinUbicacion`.
- `PATCH /campos/:id/poligono`: ownership (ADMIN, PRODUCTOR dueño, PRODUCTOR no-dueño → 403, AGRONOMO → 403), validación de mínimo de puntos y rangos de coordenadas.

**Frontend:**
- No hay suite de componentes (Vitest/RTL) configurada hoy en `zarza-web`; se mantiene esa convención y no se introduce la primera acá. Validación manual del golden path: vista general → drill-in → click en análisis → popup → redirección (para los 3 roles) → toggle satélite → imprimir → dibujar y guardar un polígono nuevo → editar uno existente.

---

## 7. Fuera de alcance (explícito)

- Clustering en la vista general (ya es 1 marcador/polígono por campo, no hace falta).
- Exportar el mapa como imagen PNG descargable (solo impresión vía navegador en v1).
- Edición geométrica avanzada de polígonos (multi-polígono por campo, recorte, unión).
- Soporte offline en `zarza_ai` para cargar coordenadas de campo o ver el mapa de calor.
- Caché de las queries de `mapas-calor` (se puede agregar después si el volumen de datos lo justifica).
