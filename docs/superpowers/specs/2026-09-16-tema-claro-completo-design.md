# Tema claro completo (zarza-web) — Diseño

**Fecha:** 2026-09-16
**Servicio:** `zarza-web`
**Estado:** Aprobado

## Contexto

`AppShell.tsx` y el `ConfigProvider` global (`main.tsx`) ya pasaron a tema claro en specs anteriores (`2026-08-07-dashboard-light-theme-design.md`, `2026-08-08-brand-palette-rebrand-design.md`), que dejaron pendiente, como sub-proyectos propios:

1. Migrar `/usuarios`, `/campos`, `/solicitudes`, `/analisis` (label de nav "Revisión IA") al "nivel visual del Dashboard" (tarjetas KPI + tabla en card).
2. Recolorear 15 hex legacy sueltos en `UserDrawer.tsx`, `AnalisisDetailModal.tsx`, `SolicitudDetailDrawer.tsx` (paleta vieja de antd v4).

Este es el grupo 3 del orden de implementación acordado (`docs/superpowers/2026-08-31-orden-implementacion-fuera-de-alcance.md`).

**Hallazgo durante la exploración:** las 4 páginas ya heredan el tema claro global (son antd plano, sin hex ni `ConfigProvider` propios) — lo que falta no es "hacerlas claras", sino elevarlas visualmente al nivel del Dashboard, tal como el spec de rebrand ya anotaba. Se decidió además incluir `/revision-detecciones` (`ColaRevisionPage.tsx` + `RevisionDeteccionesPage.tsx`, "Revisión de Detecciones"), una feature más nueva que nunca estuvo en el alcance original pero está en el mismo estado (antd plano). De sus componentes (`DeteccionOverlay`/`Panel`/`Sidebar`) se investigó el mapa etapa→color y el resto de su hex: ya son coherentes (canvas oscuro intencional para anotar imágenes, con controles blancos encima, y chrome propio ya usando `T.surface`) — no requieren cambios, ver decisión abajo.

## Decisiones tomadas

- **Nivel de elevación:** las 5 páginas (Usuarios, Campos, Solicitudes, Análisis, Cola de Revisión) pasan a tener una fila de tarjetas KPI arriba de la tabla, y la tabla (+ sus filtros) envuelta en una card blanca con sombra — el mismo patrón visual que ya usa `DashboardPage.tsx`. No solo un recolor.
- **`RevisionDeteccionesPage.tsx`** (el editor de detecciones sobre una imagen, full-bleed) **no** recibe este tratamiento — es un workspace de anotación, no un listado, y ya es visualmente coherente. Solo `ColaRevisionPage.tsx` (el listado que lleva a ese editor) entra en el patrón de KPI + card.
- **Sin nuevos endpoints de agregación en `fruit-backend`:** todos los KPI se resuelven con datos ya disponibles (`/admin/stats`, `/campos` ya sin paginar) o con requests adicionales livianos (`limit=1`) contra endpoints existentes filtrados por estado. Mantiene el trabajo 100% en `zarza-web`, coherente con el alcance acordado para este grupo.
- **Mapa etapa→color de Revisión de Detecciones se mantiene sin cambios** — son marcas de datos con intención real (verde=verde, maduro=rojo, etc.), no colores de marca ni "legacy" a limpiar, igual criterio que el racimo de moras del login (`brand-palette-rebrand`).
- **`ModelosIAPage.tsx` y `MapasCalorPage.tsx` quedan fuera** — no estaban en el alcance acordado del grupo 3 y ya son antd plano sin hex propios.
- **Extracción de `SurfaceCard`/`chipFor()` a `src/shared/`** — hoy están definidos localmente dentro de `DashboardPage.tsx`; se extraen para que las 5 páginas nuevas los reusen en vez de duplicar el patrón 5 veces. `DashboardPage.tsx` pasa a importarlos, sin cambio visual.

## Diseño

### 1. `src/shared/SurfaceCard.tsx` (nuevo, extraído de `DashboardPage.tsx`)

Exporta el componente `SurfaceCard` (`background: T.surface`, `borderRadius: 16`, `boxShadow: '0 12px 32px rgba(17,17,40,0.08)'` o el glow variant) y la constante `surfaceCard` tal como existen hoy en `DashboardPage.tsx` (líneas ~49-72), sin cambios de valores. `DashboardPage.tsx` elimina su copia local y la importa.

### 2. `src/shared/chipColors.ts` (nuevo, extraído de `DashboardPage.tsx`)

Exporta el dict `CHIP` (pares pastel-bg/texto-sólido por token de `lightTheme`) y `chipFor()` tal como existen hoy (líneas ~31-40), sin cambios de valores ni del fallback gris (`#F3F4F6`/`#374151`). `DashboardPage.tsx` elimina su copia local y la importa.

### 3. Patrón de página (aplicado a las 5 páginas)

Estructura nueva, común a las 5:

```
<Title>Nombre de la página</Title>
<div style="display:flex; gap:12px; margin-bottom:16px;">
  {/* N × KPI card: SurfaceCard chico con chip (chipFor) + número (tabular-nums) + label */}
</div>
<SurfaceCard>
  {/* filtros existentes (Select, etc.) sin cambios */}
  {/* Table existente sin cambios de columnas */}
</SurfaceCard>
```

Sin cambios de columnas, filtros, ordenamiento ni ninguna lógica de negocio — es exclusivamente el envoltorio visual.

### 4. KPIs por página

| Página | Tarjetas KPI | Fuente de datos | Color (`chipFor`) |
|---|---|---|---|
| **Usuarios** (`UsersPage.tsx`) | Total, Productores, Agrónomos, Monitores, Admins | `GET /admin/stats` (ya existe, cacheado en Redis) — nuevo hook `useAdminStats()` en `src/admin/hooks/` | Total→gray, Productor→emerald, Agrónomo→brand, Monitor→warn, Admin→gray |
| **Campos** (`CamposPage.tsx`) | Total campos, Con límites definidos, Sin definir, Productores distintos | `useCampos()` ya trae el array completo — cálculo derivado en el componente, sin request nuevo | Total→gray, Con límites→emerald, Sin definir→warn |
| **Solicitudes** (`SolicitudesPage.tsx`) | Pendiente, En Progreso, Completado, Cancelado | 4× `useSolicitudes({ estado, limit: 1 })` (mismo hook existente, solo se lee `.total` de cada respuesta) | Pendiente→gray, En Progreso→brand, Completado→emerald, Cancelado→danger (mismo mapeo que `EstadoBadge`) |
| **Análisis** (`AnalisisPage.tsx`) | Pendientes, Validados, Rechazados | 3× `useAnalisisList(estado, 1, 1)` (mismo hook existente) | Pendiente→gray, Validado→emerald, Rechazado→danger (mismo mapeo que `ESTADO_TAG`) |
| **Cola de Revisión** (`ColaRevisionPage.tsx`) | 1 sola tarjeta: total pendientes de revisión | `useColaRevision()` ya trae `.total` — sin request nuevo | brand |

Los requests `limit=1` extra de Solicitudes/Análisis se disparan siempre (no solo en la pestaña/filtro activo), para que la fila de KPI muestre las 4/3 categorías simultáneamente sin depender de qué tab esté abierta.

**Scope por rol:** cada request de KPI usa el mismo endpoint que ya aplica scope por rol/campo en el backend (ej. Agrónomo en Solicitudes solo ve sus campos asignados) — los KPI heredan automáticamente ese scope, sin lógica nueva de permisos.

### 5. Recolor de hex legacy (3 archivos)

| Archivo | Hex actual | → Nuevo |
|---|---|---|
| `UserDrawer.tsx` (líneas 149, 166) | `#722ed1` | `T.brand` |
| `UserDrawer.tsx` (línea 180) | `#389e0d` | `T.emerald` |
| `UserDrawer.tsx` (líneas 213, 246, 247) | `#1890ff` | `T.brand` |
| `UserDrawer.tsx` (línea 248) | `#fff` | sin cambio |
| `UserDrawer.tsx` (líneas 263, 312, 313) | `#cf1322` | `T.danger` |
| `AnalisisDetailModal.tsx` (líneas 122, 147) | `#f0f0f0` (bg placeholder) | `#F3F4F6` (mismo fallback gris de `chipFor()`) |
| `AnalisisDetailModal.tsx` (línea 207) | `#f0f0f0` (border-top) | `T.grayLine` |
| `SolicitudDetailDrawer.tsx` (línea 101) | `#52c41a` | `T.emerald` |
| `SolicitudDetailDrawer.tsx` (línea 144) | `#1890ff` | `T.brand` |

Los tres archivos pasan a importar `lightTheme` (`const T = lightTheme`) si no lo hacen ya.

**Sin cambios** (investigado, no es "legacy"): `DeteccionOverlay.tsx`, `DeteccionPanel.tsx`, `DeteccionSidebar.tsx` — el mapa `ETAPA_COLOR` (7 valores) se mantiene, y el resto de su hex (`#15151a` canvas oscuro, `#fff`/`#ffffff` controles sobre el canvas, `#1677ff` reusado como acento de selección) es autoconsistente con ese canvas oscuro intencional.

### 6. Accesibilidad

- `font-variant-numeric: tabular-nums` en los números de las tarjetas KPI nuevas (mismo patrón que `dashboard-light-theme`).
- Iconos/dots decorativos de las tarjetas KPI: `aria-hidden="true"`.
- No aplica `Intl.NumberFormat` — son conteos enteros sin decimales.

### 7. Verificación

- `cd zarza-web && npx tsc --noEmit`.
- `grep -rn "#722ed1\|#389e0d\|#1890ff\|#cf1322" src/admin/UserDrawer.tsx src/analisis/AnalisisDetailModal.tsx src/solicitudes/SolicitudDetailDrawer.tsx` y `grep -n "#f0f0f0" src/analisis/AnalisisDetailModal.tsx` → ambos deben devolver vacío.
- `npm run build` (`tsc -b && vite build`) sin errores.
- Pase visual en navegador por rol:
  - **ADMIN**: ve las 5 páginas, KPIs con números correctos (comparar contra el conteo real de filas/páginas de la tabla).
  - **PRODUCTOR/AGRONOMO/MONITOR**: ven su subconjunto scoped de páginas y de datos; los KPIs reflejan ese subconjunto (no el total global) — ej. un Agrónomo en Campos ve KPIs solo de sus campos asignados.
  - Confirmar que `UserDrawer`/`AnalisisDetailModal`/`SolicitudDetailDrawer` siguen abriendo/cerrando y sus acciones (validar, rechazar, eliminar, cambiar estado) funcionan igual tras el recolor.
  - Confirmar que `RevisionDeteccionesPage.tsx` (el editor) no cambió visualmente.

## Fuera de alcance

- Cualquier cambio de columnas, filtros, ordenamiento o lógica de negocio en las 5 páginas — solo tratamiento visual.
- `ModelosIAPage.tsx` y `MapasCalorPage.tsx` — no estaban en el alcance acordado del grupo 3; ya son antd plano sin hex propios.
- Nuevos endpoints de agregación en `fruit-backend` (ej. un "stats" para Solicitudes/Análisis análogo a `/admin/stats`) — descartado a favor de requests livianos `limit=1` contra endpoints existentes, para mantener el trabajo 100% en `zarza-web`.
- Recolorear el mapa `ETAPA_COLOR` de Revisión de Detecciones — decisión explícita de mantenerlo (representa maduración real del fruto, no color de marca).
- `RevisionDeteccionesPage.tsx` — es un workspace de anotación de imagen, no un listado; no recibe el patrón de KPI + card.
