# Rediseño de KPIs del dashboard (zarza-web) — Diseño

**Fecha:** 2026-08-09
**Servicio:** `zarza-web`
**Estado:** Aprobado

## Problema

`DashboardPage.tsx` (ya en tema claro Emerald Ink + Champagne, ver
[`2026-08-07-dashboard-light-theme-design.md`](./2026-08-07-dashboard-light-theme-design.md))
muestra sus 4 métricas de salud (Elementos Sanos, Total Detectados, Merma
Promedio, Elementos Enfermos) como 4 tarjetas verticales idénticas en una
fila, sin jerarquía visual entre ellas. El encabezado repite además la
"Salud global %" en un badge con anillo de progreso, separado de las
tarjetas. La fila inferior tiene un panel "Resumen de Salud" que ya repite
los mismos 4 números en forma de lista.

Se usó como referencia visual el dashboard de H-care (patrón de tarjetas KPI
horizontales con ícono a la izquierda + una tarjeta "spotlight" de color
sólido para la métrica más relevante), explorado y ajustado mediante 3 rondas
de mockups con el companion visual del skill de brainstorming.

## Decisiones tomadas

- **Alcance:** solo el contenido de `DashboardPage.tsx`. `AppShell.tsx` (nav
  horizontal, sin sidebar) no se toca — se descartó migrar a un layout con
  sidebar como el de H-care.
- **Tarjeta spotlight:** la métrica destacada en bloque sólido es **Salud
  Global %** (positiva, no una alerta), no "Elementos Enfermos" — refuerza
  una lectura optimista al entrar al dashboard, igual que el patrón de H-care
  (que destaca un total, no un problema). Esto además permite quitar el badge
  de anillo redundante del encabezado.
- **Reparto de las 4 métricas + spotlight:** se descartó una fila de 5
  columnas angostas. En su lugar, 3 tarjetas KPI horizontales (Sanos,
  Detectados, Enfermos) + spotlight (Salud Global) arriba, y **Merma
  Promedio** baja a la fila de gráficas como una tarjeta de stat independiente
  — las columnas quedan más anchas y legibles.
- **"Merma por etapa" descartado:** un mockup exploratorio proponía un
  desglose de merma por etapa fenológica (mini-barras). Se verificó contra
  `fruit-backend/src/admin/admin-dashboard.service.ts` que el endpoint
  `GET /admin/dashboard/health` solo expone `avgLossPercent` como promedio
  global agregado — no hay desglose por etapa, campo ni fecha. No se agrega
  ningún endpoint nuevo (fuera del alcance acordado); Merma Promedio se
  muestra como tarjeta de stat simple (número + sparkline), igual que las
  tarjetas KPI existentes.
- **Panel "Resumen de Salud" eliminado:** sus 4 valores quedan cubiertos por
  el spotlight + las 3 tarjetas KPI + la tarjeta de Merma Promedio, así que
  el panel de lista queda redundante. Se elimina.
- **Mapa de Parcelas a ancho completo:** al quitar "Resumen de Salud", el
  mapa pasa a ocupar toda la fila inferior (antes 1fr junto al resumen).
- **Encabezado simplificado:** se quita el badge de anillo "Salud global %"
  (ahora vive solo en la tarjeta spotlight). El encabezado queda con saludo +
  estado "En línea".
- **Sin tokens de color nuevos:** todo usa `lightTheme.ts` y el mapa `CHIP`
  ya existentes en `DashboardPage.tsx`. La tarjeta spotlight usa
  `T.brand` (`#064E3B`) de fondo sólido, texto blanco, label en `T.champagne`
  (`#EAD6A0`) — combinación ya presente en la paleta, sin agregar variantes.
- **Sin tests nuevos:** `DashboardPage.tsx` no tiene tests hoy y no se agregan
  en este trabajo; verificación manual en navegador.

## Diseño

### 1. Encabezado

Se quita el bloque `RingProgress` + "Salud global %" del lado derecho del
header (líneas ~226-238 actuales). Queda solo el saludo (`Hola, {nombre}`) y
la línea de estado ("Vista general de la salud del cultivo · ● En línea").

### 2. Fila de KPIs — nueva estructura (`grid-template-columns: repeat(3, 1fr) 1.3fr`)

**3 tarjetas KPI horizontales** (ícono a la izquierda en badge redondeado,
número + label a la derecha, en vez del layout vertical actual
ícono-arriba/número-abajo). Sin `Sparkline` — el layout horizontal compacto
(ícono + número + label en una sola fila) no deja espacio legible para una
gráfica debajo; el sparkline se conserva solo en la tarjeta de Merma
Promedio (fila de gráficas) y en el spotlight:

| Tarjeta | Dato | Chip (bg / fg) |
|---|---|---|
| Elementos Sanos | `h.totalHealthyCount` | `chipFor(T.emerald)` |
| Total Detectados | `h.totalDetected` | `chipFor(T.brand)` |
| Elementos Enfermos | `h.totalSickCount` | `chipFor(T.danger)` |

Cada una conserva su ícono SVG actual (`aria-hidden="true"`) y estado de
carga (`Spin` dentro de `role="status"`).

**1 tarjeta spotlight** — nuevo sub-componente (p. ej. `SpotlightCard`):

- Fondo sólido `T.brand`, `border-radius: 16px` (mismo radio que
  `SurfaceCard`), texto principal blanco, label en `T.champagne`.
- Contenido: `healthPct` (mismo cálculo que hoy:
  `Math.round((h.totalHealthyCount / h.totalDetected) * 100)`), label "Salud
  global", y `Sparkline` con `color="#FFFFFF"` sobre el fondo verde (el
  componente `Sparkline` ya acepta `color` por prop, sin cambios).
- Reemplaza el bloque de anillo de progreso que hoy vive en el encabezado —
  mismo dato (`healthPct`), una sola ubicación.

### 3. Fila de gráficas — pasa de 2 a 3 columnas (`grid-template-columns: 2fr 1fr 1fr`)

- **Proyección de Cosecha** (bar chart) y **Distribución Fenológica** (donut)
  — sin cambios de lógica ni de datos, solo se ajusta el ancho relativo por
  la tercera columna nueva.
- **Merma Promedio** (nueva tercera tarjeta): mismo lenguaje visual que las
  tarjetas KPI (`chipFor(T.warn)`, número grande `formatPercent(h.avgLossPercent)`
  + `%`, label "Merma Promedio", `Sparkline` con el `sparkData` que ya existe
  hoy en la tarjeta KPI de Merma — se reutiliza tal cual, solo cambia de
  posición en el layout).

### 4. Fila inferior

- Se elimina el bloque completo del panel "Resumen de Salud" (el `.map` de
  4 filas con dot de color + label + valor).
- **Mapa de Parcelas** pasa a ser el único elemento de la fila, con
  `width: 100%` — mismo contenido interno (SVG de grid + rects de parcela +
  leyenda + lista `sr-only`), sin cambios de lógica, solo de contenedor
  (deja de estar en un grid de 2 columnas y pasa a ocupar todo el ancho;
  puede crecer en alto para aprovechar el espacio, p. ej. `height: 200`
  en vez de `140` dentro del SVG).

### 5. Accesibilidad y formato

- Se mantienen los patrones ya vigentes: `aria-hidden="true"` en SVGs
  decorativos, `font-variant-numeric: tabular-nums`, `Intl.NumberFormat`
  para porcentajes, `role="status" aria-label="Cargando…"` en cada `Spin`.
- Contraste texto blanco sobre `T.brand` (`#064E3B`): ratio ≈ 11.8:1, cumple
  holgadamente WCAG AA/AAA para texto normal y grande.
- El texto `T.champagne` (`#EAD6A0`) sobre `T.brand` se usa solo para el
  label secundario (texto más pequeño, no crítico) — ratio ≈ 7.9:1, también
  cumple AA.

### 6. Verificación

- `npm run dev` en `zarza-web`, login con usuario ADMIN o PRODUCTOR, revisar
  visualmente: la tarjeta spotlight no duplica el dato del encabezado (ya
  removido), las 3 tarjetas KPI horizontales son legibles, la tarjeta de
  Merma Promedio en la fila de gráficas muestra el mismo valor que antes
  mostraba en la fila de KPIs, y el mapa de parcelas se ve bien a ancho
  completo. Probar también estado de carga (recargar con red lenta/DevTools
  throttling) para confirmar que los `Spin` siguen funcionando en las nuevas
  posiciones.
- `npm run build` (`tsc -b && vite build`) para confirmar que no hay errores
  de tipos tras la reestructuración de componentes.

## Fuera de alcance

- Sidebar global estilo H-care en `AppShell.tsx` — se descartó explícitamente,
  solo se rediseña `DashboardPage.tsx`.
- Endpoint nuevo de "merma por etapa" en `fruit-backend` — no existe hoy y no
  se agrega; Merma Promedio se muestra solo como agregado global.
- Cualquier cambio a `useDashboard.ts` (los 3 hooks/endpoints se consumen
  igual que hoy, sin nuevos campos).
- Tests automatizados para `DashboardPage.tsx` (no existen hoy, no se agregan
  en este trabajo).
