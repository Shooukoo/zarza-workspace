# Dashboard claro estilo login (zarza-web) — Diseño

**Fecha:** 2026-08-07
**Servicio:** `zarza-web`
**Estado:** Aprobado

## Problema

`LoginPage.tsx` usa un tema claro (canvas #EEF0F5, cards blancas, sombras
suaves, radios grandes, gradiente rubus→rubusLt, Lexend). `DashboardPage.tsx`
y `AppShell.tsx` usan un tema oscuro "obsidian" con glassmorphism
(`backdrop-filter: blur`, bordes rgba tenues), pensado para flotar sobre fondo
oscuro. El resultado visual del panel es inconsistente con la pantalla de
login, y de paso `DashboardPage.tsx` tiene varios huecos de accesibilidad
(SVGs decorativos sin `aria-hidden`, números sin `tabular-nums`, `.toFixed`
en vez de `Intl.NumberFormat`) y `AppShell.tsx` navega con `<button
onClick={navigate}>` en vez de `<Link>`.

## Decisiones tomadas

- **Alcance visual:** SOLO `DashboardPage.tsx` pasa a tema claro. `AppShell.tsx`
  (sidebar) y el resto de páginas del panel (Usuarios/Campos/Solicitudes/
  Análisis) **quedan en tema oscuro**. Es una decisión explícita del usuario,
  asumiendo la inconsistencia resultante (sidebar oscuro enmarcando contenido
  claro) — no es un defecto a corregir en este trabajo.
- **Figma de referencia** (`Dashboards Layout Ideas` community file): revisado,
  descartado como referencia visual — son wireframes genéricos de grid sin
  estilo, y el patrón de layout que más se parece ("Operational dashboards":
  fila de KPIs + panel grande + dos paneles medianos) ya es el que tiene
  `DashboardPage.tsx`. No aporta nada más allá de la estructura que ya existe.
- **Paleta:** se reutilizan tal cual los tokens de superficie/texto del login
  (no una variante propia para el dashboard).
- **Tooltips de recharts:** claros a juego con el resto del dashboard (no se
  mantiene el tooltip oscuro como acento).
- **Badges/chips de categoría:** pastel sólido (fondo pastel opaco + texto/
  icono en el color semántico completo), no tintes alpha recalculados.
- **Mapa de parcelas:** card blanca con grid gris claro y rects pastel, mismo
  tratamiento que el resto de badges — no se mantiene como panel oscuro.
- **`GlassCard`:** se reemplaza por card sólida (sin `backdrop-filter`, fondo
  blanco, `box-shadow` suave) — el efecto glass desaparece del dashboard.
- **`ConfigProvider` de antd:** el dashboard se envuelve en uno con
  `colorPrimary: rubus`, igual que el login, para que `<Spin/>` use el morado
  de marca.
- **Estructura de tokens:** se extrae `src/shared/lightTheme.ts` con la
  paleta clara compartida, importado por `LoginPage.tsx` y `DashboardPage.tsx`.
  `AppShell.tsx` y los tokens oscuros no se tocan (se descartó extraer un
  módulo de tema completo con light+dark porque amplía el alcance a archivos
  que el usuario decidió no tocar).
- **Fixes de accesibilidad incluidos** en este mismo trabajo (decisión
  explícita del usuario, no solo el rediseño visual):
  - `aria-hidden="true"` en SVGs decorativos.
  - `font-variant-numeric: tabular-nums` en valores numéricos.
  - `Intl.NumberFormat` en vez de `.toFixed(1)`.
  - `AppShell.tsx`: nav items de `<button onClick={navigate}>` a `<Link>`
    con `aria-current="page"`.
- **Fuera de alcance:** el ícono del ojo de `Input.Password` en el login (sin
  `aria-label`, componente interno de antd) — hallazgo detectado pero no
  incluido en el alcance aprobado por el usuario.

## Diseño

### 1. `src/shared/lightTheme.ts` (nuevo)

```ts
export const lightTheme = {
  canvas:    '#EEF0F5',
  surface:   '#FFFFFF',
  ink:       '#13102B',
  gray:      '#6B7280',
  grayLine:  '#E5E7EB',
  rubus:     '#7B00D4',
  rubusLt:   '#A030F0',
  pink:      '#E85DB0',
  emerald:   '#10B981',
  warn:      '#F59E0B',
  danger:    '#EF4444',
};
```

`LoginPage.tsx` reemplaza su objeto `T` local por un import de `lightTheme`
(mismos valores, sin cambio visual). `DashboardPage.tsx` importa `lightTheme`
como base y define **localmente** los pares chip pastel-bg/texto-sólido por
color semántico (son específicos de este archivo):

| Semántico | Chip bg | Texto/icono/trazo |
|---|---|---|
| emerald (sano) | `#ECFDF5` | `#047857` |
| rubus (detectados/monitoreada) | `#F3E8FF` | `#7B00D4` |
| warn (merma/alerta) | `#FFFBEB` | `#B45309` |
| danger (enfermos) | `#FEF2F2` | `#B91C1C` |
| gray (neutro) | `#F3F4F6` | `#374151` |

Las **marcas de datos** (barras, dona, sparklines, ring, dots del resumen de
salud) usan el color semántico saturado de `lightTheme` (no el pastel) — el
pastel es solo para superficies/badges, las marcas necesitan el color pleno
para ser legibles.

### 2. `DashboardPage.tsx` — componentes

- **`GlassCard`**: quita `backdrop-filter` y el fondo rgba; pasa a
  `background: surface`, `box-shadow: 0 12px 32px rgba(17,17,40,0.08)`,
  mantiene `border-radius: 16px`.
- **Badges KPI, resumen de salud, leyenda del mapa**: fondo del chip pastel
  correspondiente + icono/texto en el color sólido de la tabla anterior.
- **Mapa de parcelas**: fondo `surface`/`canvas`, `<pattern>` de grid con
  stroke `grayLine` muy tenue, rects de parcela con fill pastel + stroke/texto
  sólido del color de estado.
- **`RingProgress`**: track en `grayLine`, arco en el color semántico pleno
  (sin cambios de lógica, solo de paleta).
- **`<ConfigProvider>`**: envuelve el `return` del componente con
  `algorithm: theme.defaultAlgorithm`, `token: { colorPrimary: rubus }`.

### 3. Gráficas (recharts)

- `Tooltip.contentStyle`: `background: surface`, `border: 1px solid grayLine`,
  `color: ink`, `boxShadow: '0 8px 24px rgba(17,17,40,0.10)'` (recharts
  acepta estilos arbitrarios en `contentStyle`, incluido `boxShadow`).
- `XAxis`/`YAxis` `tick.fill`: `gray`; `axisLine.stroke`: `grayLine`.
- `Bar` `cursor.fill` (hover): `rgba(17,17,40,0.04)` (antes
  `rgba(255,255,255,0.04)`, invertido para fondo claro).
- `Legend.wrapperStyle` color: `gray`.
- Gradiente de barras (`barGradient`) y gradientes de la dona (`phenoColors`)
  se mantienen con los mismos stops de color (rubusLt→rubus→#3D006A y la
  lista `phenoColors`), ya que son marcas de datos, no superficies.

### 4. Accesibilidad

- `aria-hidden="true"` en los `<svg>` de: iconos KPI (4), `RingProgress`,
  `Sparkline`.
- **Mapa de parcelas**: el `<svg>` recibe `aria-hidden="true"`, pero como
  P1–P4 con su estado es información real (no solo decorativa) que hoy solo
  existe dentro del SVG, se agrega una lista oculta visualmente
  (`position: absolute; width: 1px; height: 1px; overflow: hidden;
  clip: rect(0,0,0,0)` — patrón `sr-only` estándar, sin clase Tailwind
  disponible en este proyecto) enumerando "P1: Saludable", "P2: Saludable",
  "P3: Alerta", "P4: Monitoreada", para que un lector de pantalla tenga la
  misma información que un usuario vidente.
- `font-variant-numeric: tabular-nums` en los `<span>`/`<div>` que muestran
  valores numéricos de KPIs y filas del resumen de salud.
- El % de merma promedio (dos apariciones: KPI card y resumen de salud) usa
  `new Intl.NumberFormat('es-MX', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(value)`
  en vez de `value.toFixed(1)`.
- Los 4 `<Spin/>` (KPI loading, yield chart, phenology chart, health summary)
  se envuelven en `<div role="status" aria-label="Cargando…">`.

### 5. `AppShell.tsx` — navegación

- Los ítems de `NAV_ITEMS` se renderizan como `<Link to={item.key}>` (de
  `react-router-dom`) en vez de `<button onClick={() => navigate(item.key)}>`,
  conservando el mismo estilo inline actual (aplicado a `Link` en vez de
  `button`) y agregando `aria-current={active ? 'page' : undefined}`.
- El resto de `AppShell.tsx` (paleta, sidebar, botón de logout, toggle de
  colapso) no cambia — sigue en tema oscuro y sigue usando `<button>` donde
  corresponde (son acciones, no navegación).

### 6. Verificación

- `npm run dev` en `zarza-web`, login con un usuario ADMIN o PRODUCTOR
  (roles con acceso a `/dashboard`), revisar visualmente: contraste de los
  chips pastel sobre blanco, legibilidad de tooltips/ejes en las gráficas,
  que la navegación marque el ítem activo (`aria-current`) y funcione con
  click central/Cmd-click, y que el mapa de parcelas exponga el mismo dato
  a un lector de pantalla (inspección del DOM/`sr-only`, no requiere lector
  de pantalla real para verificar que el texto está presente).
- `npm run build` (`tsc -b && vite build`) para confirmar que no hay errores
  de tipos tras el cambio de imports.

## Fuera de alcance

- Tema claro para `AppShell.tsx` o cualquier otra página del panel
  (Usuarios/Campos/Solicitudes/Análisis) — deciden quedarse oscuras.
- `aria-label` en el ícono de `Input.Password` del login.
- Cualquier cambio de estructura de grid/layout del dashboard inspirado en el
  archivo de Figma revisado — se descartó como referencia.
