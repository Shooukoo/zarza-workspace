# Rebrand de paleta: Emerald Ink + Champagne — Design Spec

**Fecha:** 2026-08-08
**Estado:** Aprobado, pendiente de plan de implementación

## Contexto

Tras mergear el PR #16 (top bar por roles + tema claro en Login/Dashboard/AppShell), quedaban 4 páginas de `zarza-web` (`/usuarios`, `/campos`, `/solicitudes`, `/analisis`) sin migrar al tema claro, con títulos ilegibles por chocar contra el canvas claro. Al planear esa migración se decidió llevarlas al nivel visual del Dashboard (tarjetas KPI + tabla en tarjeta), y al revisar el detalle de esas KPIs surgió una pregunta sobre recolorear 15 valores hex sueltos en tres drawers/modales legacy (`UserDrawer.tsx`, `AnalisisDetailModal.tsx`, `SolicitudDetailDrawer.tsx`) que usan la paleta vieja de antd v4.

Esa pregunta escaló a una decisión mayor: reemplazar el morado "rubus" (`#7B00D4`) — el color de marca usado en todo lo ya shippeado (Login, Dashboard, AppShell) — por dos colores nuevos: **Emerald Ink** (`#064E3B`) y **Champagne** (`#F8E7C9`, ajustado durante el diseño). Esto es un rebrand de color de toda la app, no solo un ajuste de las 4 páginas pendientes, así que se decidió partir el trabajo en sub-proyectos con specs propios:

1. **Este documento** — definir y aplicar la nueva paleta sobre lo ya shippeado (Login, Dashboard, AppShell).
2. (Después) Migrar las 4 páginas pendientes al tema claro, ya con la paleta definitiva.
3. (Después) Recolorear los 3 drawers/modales legacy.

## Decisión de arquitectura: consolidar el tema en `main.tsx`

Hoy `main.tsx` define un `ConfigProvider` global en **oscuro** (`theme.darkAlgorithm` + tokens completos: `colorBgContainer: '#160630'`, overrides de `Table`/`Modal`/`Drawer`/`Select`/`Input`), mientras que `LoginPage.tsx`, `DashboardPage.tsx` y `AppShell.tsx` lo contrarrestan cada uno anidando su propio `ConfigProvider` claro local. Es el único lugar del código que referencia `theme.darkAlgorithm` o la paleta de tokens oscura; nada en la app depende hoy de ese oscuro.

**Cambio:** `main.tsx` pasa a `theme.defaultAlgorithm` con los tokens de `lightTheme.ts` como fuente única (`colorPrimary`, `borderRadius: 12`, `fontFamily`). Se eliminan los overrides oscuros de `Table`/`Modal`/`Drawer`/`Select`/`Input` — con el algoritmo claro por defecto, antd resuelve esos fondos correctamente sin forzarlos. Los `ConfigProvider` locales de `LoginPage.tsx`, `DashboardPage.tsx` y `AppShell.tsx` se eliminan por completo: ya no hacen falta porque el global coincide. Se pasa de 4 `ConfigProvider` compitiendo a 1 solo, sin cambio visual en esas tres páginas más allá del recolor descrito abajo.

## Tokens de color (`lightTheme.ts`)

**Nuevos:**

| Token | Valor | Rol |
|---|---|---|
| `brand` | `#064E3B` (Emerald Ink) | Color primario de marca: botones, CTA, subrayado de nav activo, avatar, foco de accesibilidad. Reemplaza a `rubus`. |
| `champagne` | `#EAD6A0` | Acento cálido. **No es el valor original pedido** (`#F8E7C9`) — se oscureció tras detectar en la revisión visual que el tono original casi no se distinguía del blanco puro en tarjetas/chips/botones (luminancia demasiado cercana a `#FFFFFF`). El valor original sí funciona sobre el canvas gris-azulado (`#EEF0F5`), pero no sobre superficies blancas — y Champagne se usa en ambas, así que se ajustó el valor una sola vez en vez de mantener dos variantes. |
| `brandDeep` | `#022C22` | Verde casi negro. Extremo oscuro de gradientes de 3 paradas (reemplaza a los hex sueltos `#4B0396` y `#3D006A`). |
| `terracotta` | `#B96B4A` | Color de apoyo exclusivo para datos — no es color de marca. Usado como 7ª categoría del gráfico de fenología y como color del estado "Monitoreada" en el mapa de parcelas (ver más abajo). |

**Sin token nuevo:** el extremo claro de los gradientes de marca reutiliza el `emerald` semántico ya existente (`#10B981`) en vez de crear un `brandLight` — evita un token redundante para un verde que ya existe.

**Sin cambios** (conviven aparte de la marca, decisión explícita): `emerald` (`#10B981`, semántico de éxito/saludable — **no** se fusiona con `brand` pese a que ambos son verdes, para no acoplar la señal de "saludable" a futuros cambios de marca), `warn`, `danger`, `gray`, `grayLine`, `canvas`, `surface`, `ink`.

**Eliminados:** `rubus`, `rubusLt`, `pink` — verificado que no tienen ningún uso fuera de los tres archivos de este spec; quedan sin ninguna referencia tras este cambio.

### Por qué el gráfico de 7 categorías necesita `terracotta`

La paleta de marca (`brand` + `champagne`, 2 colores) no alcanza para las 7 categorías del gráfico de "Distribución Fenológica" con buena distinguibilidad. La paleta final para ese gráfico es:

```
[T.brand, T.emerald, T.champagne, T.warn, T.danger, T.gray, T.terracotta]
```

Reutiliza los 4 semánticos existentes sin cambios y usa solo 2 colores "verdes" (`brand` oscuro y `emerald` semántico brillante, en extremos opuestos de luminosidad para que se distingan) en vez de 3 tonos de la misma familia como ocurría antes con el morado (`rubus`/`rubusLt`/`#4A1D8A`).

## Aplicación por archivo

### `LoginPage.tsx`

- Logo, botón de submit y su `boxShadow`: gradiente `linear-gradient(135deg, ${T.emerald}, ${T.brand})` (antes `rubusLt → rubus`); shadow `${T.brand}33`.
- Outline de foco (accesibilidad): `T.rubus` → `T.brand`.
- Ícono decorativo (línea 277): stroke `T.rubus` → `T.brand`.
- Panel decorativo (ilustración del teléfono):
  - Fondo del panel: gradiente de 3 paradas `${T.emerald} 0% → ${T.brand} 55% → ${T.brandDeep} 100%` (antes `rubusLt → rubus → #4B0396`).
  - Pantalla del teléfono (`zw-screen`): gradiente `${T.brandDeep} → ${T.champagne}` (antes `#3D006A → pink`).
  - Borde punteado del recuadro de detección: `#E9D8FF` → `T.champagne`.
  - Marco del teléfono (`#160630`, el bisel): ajuste menor a `#0A241C` (casi negro con tinte verde) para coherencia total con el resto del panel ya recoloreado. Es un detalle cosmético de bajo riesgo, no una decisión de marca.
  - **Racimo de moras** (`zw-berry-hl`, gradiente `#5B2A86 → #1F0A40`) y **hojas** (`#34D399`/`#10B981`): **sin cambios**. Las moras representan la fruta real (zarzamora), que es morada/casi negra en la vida real — no es un color de marca, es una representación visual del producto. Recolorearlas a verde sería inexacto. Las hojas ya son verdes y no necesitaban cambio.

### `DashboardPage.tsx`

- Chip de la KPI "Total detectados" (patrón `chipFor()`): la entrada `[T.rubus]: { bg: '#F3E8FF', fg: '#7B00D4' }` cambia a `[T.brand]: { bg: '#E3F0EA', fg: '#064E3B' }` — mismo patrón de tinte pastel + color sólido que ya usan los demás chips semánticos.
- Color de "Total Detectados" en la tarjeta KPI (prop `color`) y color por defecto de `Sparkline`: `T.rubus` → `T.brand`.
- Punto de color de "Total detectados" en la lista "Resumen de Salud" (sección aparte de la tarjeta KPI, mismo dato repetido en otro lugar de la página): `T.rubus` → `T.brand`.
- Gradiente del gráfico de barras (Proyección de Cosecha): `${T.emerald} 0% → ${T.brand} 60% → ${T.brandDeep} 100%` (antes `rubusLt → rubus → #3D006A`).
- Paleta de 7 colores del gráfico de fenología: ver sección anterior.
- Mapa de Parcelas, estado **"Monitoreada"** (color de parcela `P4` y su entrada en la leyenda, junto a "Saludable"=verde y "Alerta"=ámbar): `T.rubus` → `T.terracotta`. Es un color de estado que hoy usa el morado de marca; al retirar el morado necesita un color propio que no se confunda con "saludable" (verde) ni "alerta" (ámbar) — se reutiliza `terracotta` en vez de introducir un color nuevo solo para este caso.

### `AppShell.tsx`

- Subrayado del ítem de navegación activo: `T.rubus` → `T.brand`.
- Fondo del avatar: `T.rubus` → `T.brand`.

### Todos los archivos

- Se elimina el `ConfigProvider` local (con su `colorPrimary: T.rubus`) de los tres archivos, per la decisión de arquitectura.

## Verificación

Sin test runner en `zarza-web` (convención existente del proyecto) — verificación por `tsc` + revisión manual en navegador:

1. `cd zarza-web && npx tsc --noEmit` — sin errores.
2. `grep -rn "rubus\|T\.pink" src/` — debe devolver vacío, confirma que no queda ninguna referencia a los tokens retirados.
3. Pase visual en `/login`, `/dashboard` y el top bar de `AppShell`: botones, avatar, subrayado de nav, chips de KPI, gráfico de barras, gráfico de fenología (7 categorías distinguibles), mapa de parcelas (estado "Monitoreada"), y el panel decorativo del Login — confirmando que el racimo de moras conserva su color morado/casi negro real.
4. `npm run build` — sin errores.

## Fuera de alcance de este spec

- Migrar `/usuarios`, `/campos`, `/solicitudes`, `/analisis` al tema claro (sub-proyecto 2, spec propio pendiente).
- Recolorear los 15 valores hex legacy en `UserDrawer.tsx`, `AnalisisDetailModal.tsx`, `SolicitudDetailDrawer.tsx` (sub-proyecto 3, spec propio pendiente).
