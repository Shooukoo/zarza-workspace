# Rediseño de KPIs del Dashboard (zarza-web) — Plan de Implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reestructurar `DashboardPage.tsx` para que las métricas de salud se presenten como 3 tarjetas KPI horizontales + 1 tarjeta "spotlight" de Salud Global, mover Merma Promedio a la fila de gráficas, eliminar el panel redundante "Resumen de Salud" y dar ancho completo al Mapa de Parcelas.

**Architecture:** Cambio contenido en un único archivo, `zarza-web/src/dashboard/DashboardPage.tsx`. Se agregan dos sub-componentes nuevos (`KpiCardHorizontal`, `SpotlightCard`), se elimina el ahora-no-usado `RingProgress`, se reordena la data (`kpiCards` pasa de 4 a 3 elementos, nace `mermaCard` como objeto independiente) y se ajustan 3 grids CSS (fila KPI, fila de gráficas, fila inferior). No hay cambios de backend, de hooks (`useDashboard.ts`), ni de `AppShell.tsx`.

**Tech Stack:** React 18 + TypeScript + Vite, antd (`Spin`), recharts (sin cambios en esta parte), estilos inline con los tokens de `src/shared/lightTheme.ts`.

**Spec:** `docs/superpowers/specs/2026-08-09-dashboard-kpis-redesign-design.md`

---

## Notas antes de empezar

- **No hay test runner en `zarza-web`** (`package.json` solo tiene `dev`/`build`/`preview`, sin Jest/Vitest). La verificación de cada tarea es `npm run build` (`tsc -b && vite build`, con `noUnusedLocals`/`noUnusedParameters` activos en `tsconfig`) más una revisión visual manual al final (Tarea 5). Esto sigue el mismo patrón de verificación que el spec previo de este mismo componente (`2026-08-07-dashboard-light-theme-design.md`).
- Todos los comandos de build se corren como `(cd zarza-web && npm run build)` para no cambiar el directorio de trabajo persistente.
- Los rangos de línea indicados en "Files" son orientativos (el archivo antes de empezar la Tarea 1); cambian ligeramente entre tareas porque cada tarea edita el archivo. Los bloques `old_string`/`new_string` de cada paso son el contrato real — deben calzar exacto con el contenido del archivo en el momento de aplicarlos.

## File Structure

- **Modify:** `zarza-web/src/dashboard/DashboardPage.tsx` — único archivo tocado en todo el plan.
  - Se elimina: función `RingProgress` (queda sin uso tras simplificar el encabezado).
  - Se agregan: `KpiCardHorizontal` (tarjeta KPI horizontal ícono-izquierda), `SpotlightCard` (tarjeta sólida de Salud Global).
  - Se modifica: encabezado (quita badge de anillo), `kpiCards` (4→3 elementos + nuevo `mermaCard`), `healthSparkData` (nueva constante), fila de KPIs (grid + render), fila de gráficas (grid + nueva tarjeta), fila inferior (quita panel, mapa a ancho completo).

---

### Task 1: Simplificar encabezado y eliminar `RingProgress`

**Files:**
- Modify: `zarza-web/src/dashboard/DashboardPage.tsx:109-129` (elimina `RingProgress`)
- Modify: `zarza-web/src/dashboard/DashboardPage.tsx:216-239` (simplifica encabezado)

Quitamos el badge "Salud global %" con anillo de progreso del encabezado (ahora vive solo en la tarjeta spotlight que se agrega en la Tarea 3). Como `RingProgress` queda sin ningún uso en el archivo, hay que borrarlo también — si no, `tsc -b` falla por `noUnusedLocals`.

**Corrección post-implementación:** al quitar el badge del encabezado, `const healthPct = ...` (definida junto a `phenoColors`, antes del `return`) también se queda sin ningún uso hasta la Tarea 3 — por la misma razón (`noUnusedLocals`), también hay que eliminarla en esta tarea. La Tarea 3 la vuelve a introducir (junto con `healthSparkData`) cuando la vuelve a necesitar. Este paso adicional (no estaba en la redacción original del plan) queda documentado como Step 1b abajo.

- [ ] **Step 1: Eliminar la función `RingProgress`**

En `zarza-web/src/dashboard/DashboardPage.tsx`, buscar:

```tsx
function RingProgress({ value, color = T.emerald, size = 68, strokeWidth = 6 }: {
  value: number; color?: string; size?: number; strokeWidth?: number;
}) {
  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (Math.min(value, 100) / 100) * circ;
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={T.grayLine} strokeWidth={strokeWidth}/>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={color} strokeWidth={strokeWidth}
        strokeDasharray={`${dash} ${circ - dash}`}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </svg>
  );
}

// Custom bar shape with gradient
```

Reemplazar por (queda solo el comentario, la función desaparece):

```tsx
// Custom bar shape with gradient
```

- [ ] **Step 2: Simplificar el bloque del encabezado**

Buscar:

```tsx
        {/* ── Page header ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: T.ink, margin: 0, marginBottom: 4 }}>
              Hola, {user ? displayName(user) : ''} 👋
            </h1>
            <p style={{ fontSize: 13, color: T.gray, margin: 0 }}>
              Vista general de la salud del cultivo · <span style={{ color: T.emerald }}>● En línea</span>
            </p>
          </div>
          {!healthQuery.isLoading && h && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 12,
              background: chipFor(T.emerald).bg,
              borderRadius: 12, padding: '8px 16px',
            }}>
              <RingProgress value={healthPct} color={T.emerald} size={40} strokeWidth={4}/>
              <div>
                <div style={{ fontSize: 11, color: T.gray }}>Salud global</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: T.ink }}>{healthPct}%</div>
              </div>
            </div>
          )}
        </div>
```

Reemplazar por:

```tsx
        {/* ── Page header ── */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: T.ink, margin: 0, marginBottom: 4 }}>
            Hola, {user ? displayName(user) : ''} 👋
          </h1>
          <p style={{ fontSize: 13, color: T.gray, margin: 0 }}>
            Vista general de la salud del cultivo · <span style={{ color: T.emerald }}>● En línea</span>
          </p>
        </div>
```

- [ ] **Step 2b: Eliminar `const healthPct = ...` (queda sin uso)**

Buscar:

```tsx
  const phenoColors = [T.brand, T.emerald, T.champagne, T.warn, T.danger, T.gray, T.terracotta];

  const healthPct = h && h.totalDetected > 0
    ? Math.round((h.totalHealthyCount / h.totalDetected) * 100)
    : 0;

  return (
```

Reemplazar por:

```tsx
  const phenoColors = [T.brand, T.emerald, T.champagne, T.warn, T.danger, T.gray, T.terracotta];

  return (
```

- [ ] **Step 3: Verificar que compila**

Run: `(cd zarza-web && npm run build)`
Expected: build exitoso (sin errores de `tsc`), termina con el resumen de Vite (`✓ built in ...`). Si aparece `TS6133: 'RingProgress' is declared but its value is never read` o `TS6133: 'healthPct' is declared but its value is never read`, revisar que los Steps 1/2/2b se aplicaron completos.

- [ ] **Step 4: Commit**

```bash
git add zarza-web/src/dashboard/DashboardPage.tsx
git commit -m "refactor(zarza-web): simplificar encabezado del dashboard, quitar badge de anillo duplicado"
```

---

### Task 2: Agregar `KpiCardHorizontal` y `SpotlightCard`

**Files:**
- Modify: `zarza-web/src/dashboard/DashboardPage.tsx` (justo después de `GradientBar`, antes de `// ── Main component ──`)

Estos dos sub-componentes son la base visual de la nueva fila de KPIs (Tarea 3). No se conectan a datos reales todavía en esta tarea — solo se definen.

- [ ] **Step 1: Insertar los nuevos componentes**

Buscar:

```tsx
  return (
    <rect x={x} y={y} width={width} height={height} rx={4}
      fill="url(#barGradient)"/>
  );
}

// ── Main component ─────────────────────────────────────────────────
```

Reemplazar por:

```tsx
  return (
    <rect x={x} y={y} width={width} height={height} rx={4}
      fill="url(#barGradient)"/>
  );
}

// Tarjeta KPI horizontal: ícono a la izquierda, número + label a la derecha.
// Sin sparkline — el layout compacto no deja espacio legible para uno.
function KpiCardHorizontal({ icon, value, label, color, loading }: {
  icon: React.ReactNode;
  value: number | string;
  label: string;
  color: string;
  loading?: boolean;
}) {
  const chip = chipFor(color);
  return (
    <SurfaceCard style={{ cursor: 'default' }}>
      {loading ? (
        <div role="status" aria-label="Cargando…" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 56 }}>
          <Spin/>
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10, flexShrink: 0,
            background: chip.bg,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: chip.fg,
          }}>
            {icon}
          </div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 700, color: T.ink, lineHeight: 1 }}>{value}</div>
            <div style={{ fontSize: 12, color: T.gray, marginTop: 3 }}>{label}</div>
          </div>
        </div>
      )}
    </SurfaceCard>
  );
}

// Tarjeta "spotlight": bloque sólido T.brand, resalta la métrica más
// relevante (Salud Global %) en vez de una alerta.
function SpotlightCard({ value, label, sparkData, loading }: {
  value: number;
  label: string;
  sparkData: number[];
  loading?: boolean;
}) {
  return (
    <div style={{
      background: T.brand, borderRadius: 16, padding: 24,
      boxShadow: '0 12px 32px rgba(6,78,59,0.28)',
      display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
    }}>
      {loading ? (
        <div role="status" aria-label="Cargando…" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 100 }}>
          <Spin/>
        </div>
      ) : (
        <>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#FFFFFF', lineHeight: 1 }}>
              {value}<span style={{ fontSize: 14, fontWeight: 400, marginLeft: 2 }}>%</span>
            </div>
            <div style={{ fontSize: 12, color: T.champagne, marginTop: 4 }}>{label}</div>
          </div>
          <Sparkline data={sparkData} color="#FFFFFF" height={36}/>
        </>
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────
```

- [ ] **Step 2: Verificar que compila**

Run: `(cd zarza-web && npm run build)`
Expected: build exitoso. `KpiCardHorizontal` y `SpotlightCard` todavía no se usan en el JSX del `return`, así que **no** deben marcarse como no-usados — son funciones top-level exportadas dentro del módulo (no `const` local), así que `noUnusedLocals` no las marca como error mientras el archivo las declare a nivel de módulo. Si el build falla con `TS6133` en alguno de los dos nombres, es que quedaron como declaración local en vez de función de módulo — revisar la indentación/posición del `Step 1`.

- [ ] **Step 3: Commit**

```bash
git add zarza-web/src/dashboard/DashboardPage.tsx
git commit -m "feat(zarza-web): agregar componentes KpiCardHorizontal y SpotlightCard"
```

---

### Task 3: Restructurar la fila de KPIs (3 tarjetas + spotlight) y agregar Merma Promedio a la fila de gráficas

**Files:**
- Modify: `zarza-web/src/dashboard/DashboardPage.tsx` (definición de `kpiCards`, `healthPct`/`healthSparkData`, render de la fila de KPIs, grid de la fila de gráficas, nueva tarjeta de Merma)

Reduce `kpiCards` de 4 a 3 elementos (Sanos, Detectados, Enfermos — sin `unit` ni `sparkData`, ya que `KpiCardHorizontal` no los usa), separa Merma Promedio en su propia constante `mermaCard`, agrega `healthSparkData` para el spotlight, cambia el render de la fila de KPIs para usar los nuevos componentes, y en el mismo paso agrega la tarjeta de Merma Promedio a la fila de gráficas. **Nota:** `mermaCard` se define y se usa dentro de esta misma tarea (Steps 1 y 5) — si quedara definida sin usar entre pasos, `tsc -b` fallaría por `noUnusedLocals` (es una variable local, no una función de módulo); por eso no se separa en dos tareas con un build/commit intermedio entre la definición y el uso.

- [ ] **Step 1: Reemplazar el array `kpiCards`**

Buscar:

```tsx
  const kpiCards = [
    {
      label: 'Elementos Sanos',
      value: h?.totalHealthyCount ?? 0,
      unit: '',
      color: T.emerald,
      icon: (
        <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <path d="M12 2C6 2 2 9 2 14c0 3.3 2.7 6 6 6 2.2 0 4.2-1.2 5.3-3A6 6 0 0021 11c0-5-4-9-9-9z"/>
        </svg>
      ),
      sparkData: [30, 45, 52, 48, 60, 72, h?.totalHealthyCount ?? 70],
      loading: healthQuery.isLoading,
    },
    {
      label: 'Total Detectados',
      value: h?.totalDetected ?? 0,
      unit: '',
      color: T.brand,
      icon: (
        <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
        </svg>
      ),
      sparkData: [50, 60, 65, 70, 68, 80, h?.totalDetected ?? 80],
      loading: healthQuery.isLoading,
    },
    {
      label: 'Merma Promedio',
      value: h?.avgLossPercent ?? 0,
      unit: '%',
      color: T.warn,
      icon: (
        <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01"/>
        </svg>
      ),
      sparkData: [8, 6, 9, 7, 5, 7, Math.round((h?.avgLossPercent ?? 7) * 10) / 10],
      loading: healthQuery.isLoading,
    },
    {
      label: 'Elementos Enfermos',
      value: h?.totalSickCount ?? 0,
      unit: '',
      color: T.danger,
      icon: (
        <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
        </svg>
      ),
      sparkData: [5, 8, 6, 10, 7, 9, h?.totalSickCount ?? 9],
      loading: healthQuery.isLoading,
    },
  ];
```

Reemplazar por:

```tsx
  const kpiCards = [
    {
      label: 'Elementos Sanos',
      value: h?.totalHealthyCount ?? 0,
      color: T.emerald,
      icon: (
        <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <path d="M12 2C6 2 2 9 2 14c0 3.3 2.7 6 6 6 2.2 0 4.2-1.2 5.3-3A6 6 0 0021 11c0-5-4-9-9-9z"/>
        </svg>
      ),
      loading: healthQuery.isLoading,
    },
    {
      label: 'Total Detectados',
      value: h?.totalDetected ?? 0,
      color: T.brand,
      icon: (
        <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
        </svg>
      ),
      loading: healthQuery.isLoading,
    },
    {
      label: 'Elementos Enfermos',
      value: h?.totalSickCount ?? 0,
      color: T.danger,
      icon: (
        <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
        </svg>
      ),
      loading: healthQuery.isLoading,
    },
  ];

  const mermaCard = {
    label: 'Merma Promedio',
    value: h?.avgLossPercent ?? 0,
    unit: '%',
    color: T.warn,
    icon: (
      <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01"/>
      </svg>
    ),
    sparkData: [8, 6, 9, 7, 5, 7, Math.round((h?.avgLossPercent ?? 7) * 10) / 10],
    loading: healthQuery.isLoading,
  };
```

- [ ] **Step 2: Reintroducir `healthPct` y agregar `healthSparkData`**

**Nota:** la Tarea 1 eliminó `const healthPct = ...` porque en ese punto se había quedado sin ningún uso (`noUnusedLocals`). Esta tarea la vuelve a agregar, ahora junto con `healthSparkData`, para que ambas queden usadas de inmediato (por `SpotlightCard` en el Step 3 de abajo) — sin volver a dejar una variable declarada-pero-sin-uso entre pasos.

Buscar:

```tsx
  const phenoColors = [T.brand, T.emerald, T.champagne, T.warn, T.danger, T.gray, T.terracotta];

  return (
```

Reemplazar por:

```tsx
  const phenoColors = [T.brand, T.emerald, T.champagne, T.warn, T.danger, T.gray, T.terracotta];

  const healthPct = h && h.totalDetected > 0
    ? Math.round((h.totalHealthyCount / h.totalDetected) * 100)
    : 0;

  const healthSparkData = [85, 88, 84, 90, 87, 91, healthPct];

  return (
```

- [ ] **Step 3: Reemplazar el render de la fila de KPIs**

Buscar:

```tsx
        {/* ── KPI Cards ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
          {kpiCards.map((c, i) => {
            const chip = chipFor(c.color);
            return (
              <SurfaceCard key={i} style={{ cursor: 'default' }}>
                {c.loading ? (
                  <div role="status" aria-label="Cargando…" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 100 }}>
                    <Spin/>
                  </div>
                ) : (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: 10,
                        background: chip.bg,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: chip.fg,
                      }}>
                        {c.icon}
                      </div>
                    </div>
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 28, fontWeight: 700, color: T.ink, lineHeight: 1 }}>
                        {typeof c.value === 'number' && c.unit === '%'
                          ? formatPercent(c.value)
                          : c.value}
                        <span style={{ fontSize: 14, fontWeight: 400, color: T.gray, marginLeft: 2 }}>{c.unit}</span>
                      </div>
                      <div style={{ fontSize: 12, color: T.gray, marginTop: 4 }}>{c.label}</div>
                    </div>
                    <Sparkline data={c.sparkData} color={c.color} height={36}/>
                  </>
                )}
              </SurfaceCard>
            );
          })}
        </div>
```

Reemplazar por:

```tsx
        {/* ── KPI Cards ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr) 1.3fr', gap: 16, marginBottom: 24 }}>
          {kpiCards.map((c, i) => (
            <KpiCardHorizontal key={i} icon={c.icon} value={c.value} label={c.label} color={c.color} loading={c.loading}/>
          ))}
          <SpotlightCard value={healthPct} label="Salud global" sparkData={healthSparkData} loading={healthQuery.isLoading}/>
        </div>
```

- [ ] **Step 4: Cambiar el grid de la fila de gráficas a 3 columnas**

Buscar:

```tsx
        {/* ── Charts row ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 24 }}>
          {/* Yield bar chart */}
```

Reemplazar por:

```tsx
        {/* ── Charts row ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 16, marginBottom: 24 }}>
          {/* Yield bar chart */}
```

- [ ] **Step 5: Agregar la tarjeta de Merma Promedio después del donut**

Buscar (cierre de la tarjeta de la dona de Distribución Fenológica y cierre de la fila):

```tsx
                </PieChart>
              </ResponsiveContainer>
            )}
          </SurfaceCard>
        </div>

        {/* ── Bottom row ── */}
```

Reemplazar por:

```tsx
                </PieChart>
              </ResponsiveContainer>
            )}
          </SurfaceCard>

          {/* Merma promedio */}
          <SurfaceCard style={{ cursor: 'default' }}>
            {mermaCard.loading ? (
              <div role="status" aria-label="Cargando…" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 100 }}>
                <Spin/>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: chipFor(mermaCard.color).bg,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: chipFor(mermaCard.color).fg,
                  }}>
                    {mermaCard.icon}
                  </div>
                </div>
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 28, fontWeight: 700, color: T.ink, lineHeight: 1 }}>
                    {formatPercent(mermaCard.value)}
                    <span style={{ fontSize: 14, fontWeight: 400, color: T.gray, marginLeft: 2 }}>{mermaCard.unit}</span>
                  </div>
                  <div style={{ fontSize: 12, color: T.gray, marginTop: 4 }}>{mermaCard.label}</div>
                </div>
                <Sparkline data={mermaCard.sparkData} color={mermaCard.color} height={36}/>
              </>
            )}
          </SurfaceCard>
        </div>

        {/* ── Bottom row ── */}
```

- [ ] **Step 6: Verificar que compila**

Run: `(cd zarza-web && npm run build)`
Expected: build exitoso, sin `TS6133` (`mermaCard` y `healthSparkData` ya están en uso).

- [ ] **Step 7: Commit**

```bash
git add zarza-web/src/dashboard/DashboardPage.tsx
git commit -m "refactor(zarza-web): fila de KPIs a 3 tarjetas + spotlight, Merma Promedio pasa a la fila de gráficas"
```

---

### Task 4: Quitar el panel "Resumen de Salud" y dar ancho completo al mapa

**Files:**
- Modify: `zarza-web/src/dashboard/DashboardPage.tsx` (fila inferior)

- [ ] **Step 1: Eliminar el panel "Resumen de Salud" y ajustar el grid**

Buscar:

```tsx
        {/* ── Bottom row ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {/* Health summary */}
          <SurfaceCard>
            <div style={{ fontSize: 15, fontWeight: 600, color: T.ink, marginBottom: 16 }}>Resumen de Salud</div>
            {healthQuery.isLoading ? (
              <div role="status" aria-label="Cargando…" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 100 }}><Spin/></div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  { label: 'Total detectados', value: h?.totalDetected ?? 0, color: T.brand },
                  { label: 'Elementos sanos', value: h?.totalHealthyCount ?? 0, color: T.emerald },
                  { label: 'Elementos enfermos', value: h?.totalSickCount ?? 0, color: T.danger },
                  { label: 'Merma promedio', value: `${formatPercent(h?.avgLossPercent ?? 0)}%`, color: T.warn },
                ].map((row, i) => (
                  <div key={i} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '10px 14px', borderRadius: 10,
                    background: T.canvas, border: `1px solid ${T.grayLine}`,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: row.color }}/>
                      <span style={{ fontSize: 13, color: T.gray }}>{row.label}</span>
                    </div>
                    <span style={{ fontSize: 15, fontWeight: 700, color: row.color }}>{row.value}</span>
                  </div>
                ))}
              </div>
            )}
          </SurfaceCard>

          {/* Field map placeholder */}
          <SurfaceCard>
```

Reemplazar por:

```tsx
        {/* ── Bottom row ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16 }}>
          {/* Field map placeholder */}
          <SurfaceCard>
```

- [ ] **Step 2: Verificar que compila**

Run: `(cd zarza-web && npm run build)`
Expected: build exitoso.

- [ ] **Step 3: Commit**

```bash
git add zarza-web/src/dashboard/DashboardPage.tsx
git commit -m "refactor(zarza-web): quitar panel Resumen de Salud redundante, mapa de parcelas a ancho completo"
```

---

### Task 5: Verificación visual manual

**Files:** ninguno (solo verificación)

- [ ] **Step 1: Levantar el frontend**

Run: `(cd zarza-web && npm run dev)`
Expected: Vite sirve en `http://localhost:5173`.

(El backend real no es necesario para ver el layout si `apiClient` falla — los `useQuery` quedan en estado de error/loading y las tarjetas muestran `Spin`, lo cual también sirve para verificar los estados de carga. Si se quiere ver con datos reales, levantar el stack con `docker compose up postgres rabbitmq redis` + `fruit-backend` en modo dev, y loguearse con un usuario `ADMIN` o `PRODUCTOR`.)

- [ ] **Step 2: Revisar en el navegador**

Abrir `http://localhost:5173/dashboard` (tras login). Confirmar:
- El encabezado ya no tiene el badge de anillo — solo saludo + "En línea".
- La fila de KPIs muestra 3 tarjetas horizontales (Sanos, Detectados, Enfermos) + 1 tarjeta sólida verde bosque (Salud Global %) con sparkline blanco.
- La fila de gráficas tiene 3 columnas: Cosecha (barra), Etapas (dona), Merma Promedio (stat con sparkline).
- La fila inferior tiene solo el Mapa de Parcelas, a ancho completo — no aparece "Resumen de Salud".
- Los estados de carga (`Spin`) se ven correctamente en las 5 tarjetas de datos mientras cargan.
- No hay errores en la consola del navegador.

- [ ] **Step 3: Build de producción final**

Run: `(cd zarza-web && npm run build)`
Expected: build exitoso, sin warnings de TypeScript.

- [ ] **Step 4: Detener el dev server**

Cerrar el proceso de `npm run dev` (Ctrl+C).

No hay commit en esta tarea — es solo verificación de las Tareas 1–4 ya commiteadas.
