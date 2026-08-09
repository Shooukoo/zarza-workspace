import React from 'react';
import { Spin } from 'antd';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import {
  useYieldForecast,
  useHealthMetrics,
  usePhenologyDistribution,
} from './hooks/useDashboard';
import { lightTheme } from '../shared/lightTheme';
import { useAuth } from '../auth/useAuth';
import { displayName } from '../auth/types';

// ── Design tokens ──────────────────────────────────────────────────
const T = lightTheme;

// Fondo pastel + color de texto/ícono/trazo sólido por semántico, para
// chips y badges sobre superficie clara. Las marcas de datos (barras,
// dona, sparklines, ring, dots) siguen usando el color semántico
// saturado de T directamente — el pastel es solo para superficies.
const CHIP: Record<string, { bg: string; fg: string }> = {
  [T.emerald]:    { bg: '#ECFDF5', fg: '#047857' },
  [T.brand]:      { bg: '#E3F0EA', fg: '#064E3B' },
  [T.warn]:       { bg: '#FFFBEB', fg: '#B45309' },
  [T.danger]:     { bg: '#FEF2F2', fg: '#B91C1C' },
  [T.terracotta]: { bg: '#FBEEE7', fg: '#9A4A2E' },
};
function chipFor(color: string) {
  return CHIP[color] ?? { bg: '#F3F4F6', fg: '#374151' };
}

function formatPercent(value: number) {
  return new Intl.NumberFormat('es-MX', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value);
}

const srOnly: React.CSSProperties = {
  position: 'absolute', width: 1, height: 1, padding: 0, margin: -1,
  overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap', border: 0,
};

const surfaceCard = {
  background: T.surface,
  borderRadius: 16,
} as const;

const PARCELAS = [
  { x: 30, y: 20, w: 80, h: 50, label: 'P1', color: T.emerald, status: 'Saludable' },
  { x: 130, y: 15, w: 90, h: 55, label: 'P2', color: T.emerald, status: 'Saludable' },
  { x: 30, y: 85, w: 70, h: 40, label: 'P3', color: T.warn, status: 'Alerta' },
  { x: 240, y: 30, w: 65, h: 70, label: 'P4', color: T.terracotta, status: 'Monitoreada' },
] as const;

// ── Sub-components ─────────────────────────────────────────────────
function SurfaceCard({ children, style, glow }: {
  children: React.ReactNode;
  style?: React.CSSProperties;
  glow?: boolean;
}) {
  return (
    <div style={{
      ...surfaceCard,
      boxShadow: glow
        ? '0 12px 32px rgba(6,78,59,0.18)'
        : '0 12px 32px rgba(17,17,40,0.08)',
      padding: 24,
      ...style,
    }}>
      {children}
    </div>
  );
}

function Sparkline({ data, color = T.brand, height = 36 }: { data: number[]; color?: string; height?: number }) {
  const w = 100;
  const h = height;
  const max = Math.max(...data), min = Math.min(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / range) * (h - 4) - 2;
    return `${x},${y}`;
  }).join(' ');
  const areaD = `M0,${h} L${pts.split(' ').join(' L')} L${w},${h} Z`;
  const id = `sg${color.replace('#', '')}`;
  return (
    <svg aria-hidden="true" width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: 'block' }}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3"/>
          <stop offset="100%" stopColor={color} stopOpacity="0"/>
        </linearGradient>
      </defs>
      <path d={areaD} fill={`url(#${id})`}/>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

// Custom bar shape with gradient
function GradientBar(props: React.SVGProps<SVGRectElement> & { x?: number; y?: number; width?: number; height?: number }) {
  const { x = 0, y = 0, width = 0, height = 0 } = props;
  if (!height || height <= 0) return null;
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
export function DashboardPage() {
  const { user } = useAuth();
  const yieldQuery = useYieldForecast();
  const healthQuery = useHealthMetrics();
  const phenologyQuery = usePhenologyDistribution();

  const h = healthQuery.data;

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

  const phenoColors = [T.brand, T.emerald, T.champagne, T.warn, T.danger, T.gray, T.terracotta];

  const healthPct = h && h.totalDetected > 0
    ? Math.round((h.totalHealthyCount / h.totalDetected) * 100)
    : 0;

  const healthSparkData = [85, 88, 84, 90, 87, 91, healthPct];

  return (
      <div style={{
        fontFamily: "'Lexend', sans-serif", color: T.ink,
        background: T.canvas, minHeight: '100%', fontVariantNumeric: 'tabular-nums',
      }}>
        {/* ── Page header ── */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: T.ink, margin: 0, marginBottom: 4 }}>
            Hola, {user ? displayName(user) : ''} 👋
          </h1>
          <p style={{ fontSize: 13, color: T.gray, margin: 0 }}>
            Vista general de la salud del cultivo · <span style={{ color: T.emerald }}>● En línea</span>
          </p>
        </div>

        {/* ── KPI Cards ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr) 1.3fr', gap: 16, marginBottom: 24 }}>
          {kpiCards.map((c, i) => (
            <KpiCardHorizontal key={i} icon={c.icon} value={c.value} label={c.label} color={c.color} loading={c.loading}/>
          ))}
          <SpotlightCard value={healthPct} label="Salud global" sparkData={healthSparkData} loading={healthQuery.isLoading}/>
        </div>

        {/* ── Charts row ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 16, marginBottom: 24 }}>
          {/* Yield bar chart */}
          <SurfaceCard>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 600, color: T.ink }}>Proyección de Cosecha</div>
                <div style={{ fontSize: 12, color: T.gray, marginTop: 2 }}>Días → gramos estimados de fruta sana</div>
              </div>
            </div>
            {yieldQuery.isLoading ? (
              <div role="status" aria-label="Cargando…" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}><Spin/></div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={yieldQuery.data ?? []} margin={{ top: 4, right: 4, bottom: 4, left: 0 }}>
                  {/* SVG gradient definition — plain SVG is valid inside Recharts */}
                  <defs>
                    <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={T.emerald} stopOpacity={1}/>
                      <stop offset="60%" stopColor={T.brand} stopOpacity={1}/>
                      <stop offset="100%" stopColor={T.brandDeep} stopOpacity={1}/>
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="daysToHarvest"
                    tick={{ fill: T.gray, fontSize: 11, fontFamily: 'Lexend' }}
                    axisLine={{ stroke: T.grayLine }}
                    tickLine={false}
                    label={{ value: 'Días', position: 'insideBottom', offset: -2, fill: T.gray, fontSize: 11 }}
                  />
                  <YAxis
                    tick={{ fill: T.gray, fontSize: 11, fontFamily: 'Lexend' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    cursor={{ fill: 'rgba(17,17,40,0.04)' }}
                    contentStyle={{ background: T.surface, border: `1px solid ${T.grayLine}`, borderRadius: 10, fontFamily: 'Lexend', fontSize: 12, boxShadow: '0 8px 24px rgba(17,17,40,0.10)' }}
                    labelStyle={{ color: T.gray }}
                    itemStyle={{ color: T.ink }}
                    formatter={(v) => [`${v as number} g`, 'Peso estimado']}
                    labelFormatter={(l) => `${l} días`}
                  />
                  <Bar dataKey="estimatedWeightGrams" shape={(props: unknown) => <GradientBar {...(props as Record<string, unknown>)}/>}/>
                </BarChart>
              </ResponsiveContainer>
            )}
          </SurfaceCard>

          {/* Phenology donut */}
          <SurfaceCard>
            <div style={{ fontSize: 15, fontWeight: 600, color: T.ink, marginBottom: 4 }}>Distribución Fenológica</div>
            <div style={{ fontSize: 12, color: T.gray, marginBottom: 16 }}>Por etapa de madurez</div>
            {phenologyQuery.isLoading ? (
              <div role="status" aria-label="Cargando…" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}><Spin/></div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <defs>
                    {phenoColors.map((c, i) => (
                      <linearGradient key={i} id={`pc${i}`} x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor={c} stopOpacity="0.9"/>
                        <stop offset="100%" stopColor={c} stopOpacity="0.6"/>
                      </linearGradient>
                    ))}
                  </defs>
                  <Pie
                    data={phenologyQuery.data ?? []}
                    dataKey="count"
                    nameKey="stage"
                    innerRadius="45%"
                    outerRadius="70%"
                    paddingAngle={3}
                    strokeWidth={0}
                  >
                    {(phenologyQuery.data ?? []).map((_, i) => (
                      <Cell key={i} fill={`url(#pc${i % phenoColors.length})`}/>
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: T.surface, border: `1px solid ${T.grayLine}`, borderRadius: 10, fontFamily: 'Lexend', fontSize: 12, boxShadow: '0 8px 24px rgba(17,17,40,0.10)' }}
                    itemStyle={{ color: T.ink }}
                    formatter={(v) => [v as number, 'Elementos']}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: 11, fontFamily: 'Lexend', color: T.gray }}
                  />
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
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16 }}>
          {/* Field map placeholder */}
          <SurfaceCard>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: T.ink }}>Mapa de Parcelas</div>
              <span style={{
                display: 'inline-flex', alignItems: 'center',
                padding: '2px 10px', borderRadius: 100,
                background: chipFor(T.brand).bg,
                color: chipFor(T.brand).fg, fontSize: 11, fontWeight: 600,
              }}>4 activas</span>
            </div>
            <div style={{ position: 'relative' }}>
              <div style={{
                height: 140, borderRadius: 10, overflow: 'hidden', position: 'relative',
                background: T.canvas, border: `1px solid ${T.grayLine}`,
              }}>
                <svg aria-hidden="true" width="100%" height="100%" viewBox="0 0 320 140" style={{ position: 'absolute', inset: 0 }}>
                  <defs>
                    <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                      <path d="M 20 0 L 0 0 0 20" fill="none" stroke={T.grayLine} strokeWidth="0.5"/>
                    </pattern>
                  </defs>
                  <rect width="320" height="140" fill="url(#grid)"/>
                  {PARCELAS.map((p, i) => {
                    const chip = chipFor(p.color);
                    return (
                      <g key={i}>
                        <rect x={p.x} y={p.y} width={p.w} height={p.h} rx={4}
                          fill={chip.bg} stroke={chip.fg} strokeWidth="1.5"/>
                        <text x={p.x + p.w / 2} y={p.y + p.h / 2 + 4} textAnchor="middle"
                          fill={chip.fg} fontSize="11" fontFamily="Lexend" fontWeight="600">{p.label}</text>
                      </g>
                    );
                  })}
                </svg>
              </div>
              <ul style={srOnly}>
                {PARCELAS.map((p, i) => (
                  <li key={i}>{p.label}: {p.status}</li>
                ))}
              </ul>
            </div>
            <div style={{ display: 'flex', gap: 16, marginTop: 12 }}>
              {([
                { c: T.emerald, l: 'Saludable' },
                { c: T.warn, l: 'Alerta' },
                { c: T.terracotta, l: 'Monitoreada' },
              ] as const).map((s, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: T.gray }}>
                  <div style={{ width: 8, height: 8, background: chipFor(s.c).fg, borderRadius: 2 }}/>
                  {s.l}
                </div>
              ))}
            </div>
          </SurfaceCard>
        </div>
      </div>
  );
}
