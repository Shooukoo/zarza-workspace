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

// ── Design tokens ──────────────────────────────────────────────────
const T = {
  obsidian:  '#0D0221',
  obsidian2: '#160630',
  obsidian3: '#1F0A40',
  frost:     '#F5F5FA',
  frostDim:  '#C8C8D4',
  gray:      '#8A8AA0',
  grayLine:  '#2A1547',
  rubus:     '#7B00D4',
  rubusLt:   '#A030F0',
  rubusDim:  'rgba(123,0,212,0.18)',
  emerald:   '#10B981',
  emeraldDim:'rgba(16,185,129,0.15)',
  warn:      '#F59E0B',
  danger:    '#EF4444',
};

const glass = {
  background: 'rgba(255,255,255,0.04)',
  backdropFilter: 'blur(16px)',
  border: `1px solid rgba(255,255,255,0.07)`,
  borderRadius: 16,
} as const;

// ── Sub-components ─────────────────────────────────────────────────
function GlassCard({ children, style, glow }: {
  children: React.ReactNode;
  style?: React.CSSProperties;
  glow?: boolean;
}) {
  return (
    <div style={{
      ...glass,
      boxShadow: glow ? `0 0 32px ${T.rubus}22` : 'none',
      padding: 24,
      ...style,
    }}>
      {children}
    </div>
  );
}

function Sparkline({ data, color = T.rubus, height = 36 }: { data: number[]; color?: string; height?: number }) {
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
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: 'block' }}>
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

function RingProgress({ value, color = T.emerald, size = 68, strokeWidth = 6 }: {
  value: number; color?: string; size?: number; strokeWidth?: number;
}) {
  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (Math.min(value, 100) / 100) * circ;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={T.grayLine} strokeWidth={strokeWidth}/>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={color} strokeWidth={strokeWidth}
        strokeDasharray={`${dash} ${circ - dash}`}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ filter: `drop-shadow(0 0 4px ${color}88)` }}
      />
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

// ── Main component ─────────────────────────────────────────────────
export function DashboardPage() {
  const yieldQuery = useYieldForecast();
  const healthQuery = useHealthMetrics();
  const phenologyQuery = usePhenologyDistribution();

  const h = healthQuery.data;

  const kpiCards = [
    {
      label: 'Elementos Sanos',
      value: h?.totalHealthyCount ?? 0,
      unit: '',
      color: T.emerald,
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
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
      color: T.rubus,
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
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
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
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
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
        </svg>
      ),
      sparkData: [5, 8, 6, 10, 7, 9, h?.totalSickCount ?? 9],
      loading: healthQuery.isLoading,
    },
  ];

  const phenoColors = [T.rubus, T.rubusLt, '#4A1D8A', T.emerald, T.warn, T.danger, T.gray];

  const healthPct = h && h.totalDetected > 0
    ? Math.round((h.totalHealthyCount / h.totalDetected) * 100)
    : 0;

  return (
    <div style={{ padding: '28px 32px', fontFamily: "'Lexend', sans-serif", color: T.frost, minHeight: '100vh' }}>
      {/* ── Page header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: T.frost, margin: 0, marginBottom: 4 }}>
            Dashboard
          </h1>
          <p style={{ fontSize: 13, color: T.gray, margin: 0 }}>
            Vista general de la salud del cultivo · <span style={{ color: T.emerald }}>● En línea</span>
          </p>
        </div>
        {!healthQuery.isLoading && h && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12,
            background: T.emeraldDim, border: `1px solid ${T.emerald}33`,
            borderRadius: 12, padding: '8px 16px',
          }}>
            <RingProgress value={healthPct} color={T.emerald} size={40} strokeWidth={4}/>
            <div>
              <div style={{ fontSize: 11, color: T.gray }}>Salud global</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: T.frost }}>{healthPct}%</div>
            </div>
          </div>
        )}
      </div>

      {/* ── KPI Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        {kpiCards.map((c, i) => (
          <GlassCard key={i} style={{ cursor: 'default' }}>
            {c.loading ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 100 }}>
                <Spin/>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: c.color + '18', border: `1px solid ${c.color}33`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: c.color,
                  }}>
                    {c.icon}
                  </div>
                </div>
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 28, fontWeight: 700, color: T.frost, lineHeight: 1 }}>
                    {typeof c.value === 'number' && c.unit === '%'
                      ? c.value.toFixed(1)
                      : c.value}
                    <span style={{ fontSize: 14, fontWeight: 400, color: T.gray, marginLeft: 2 }}>{c.unit}</span>
                  </div>
                  <div style={{ fontSize: 12, color: T.gray, marginTop: 4 }}>{c.label}</div>
                </div>
                <Sparkline data={c.sparkData} color={c.color} height={36}/>
              </>
            )}
          </GlassCard>
        ))}
      </div>

      {/* ── Charts row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 24 }}>
        {/* Yield bar chart */}
        <GlassCard>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 600, color: T.frost }}>Proyección de Cosecha</div>
              <div style={{ fontSize: 12, color: T.gray, marginTop: 2 }}>Días → gramos estimados de fruta sana</div>
            </div>
          </div>
          {yieldQuery.isLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}><Spin/></div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={yieldQuery.data ?? []} margin={{ top: 4, right: 4, bottom: 4, left: 0 }}>
                {/* SVG gradient definition — plain SVG is valid inside Recharts */}
                <defs>
                  <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={T.rubusLt} stopOpacity={1}/>
                    <stop offset="60%" stopColor={T.rubus} stopOpacity={1}/>
                    <stop offset="100%" stopColor="#3D006A" stopOpacity={1}/>
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
                  contentStyle={{ background: T.obsidian3, border: `1px solid ${T.grayLine}`, borderRadius: 10, fontFamily: 'Lexend', fontSize: 12 }}
                  labelStyle={{ color: T.frostDim }}
                  itemStyle={{ color: T.rubusLt }}
                  formatter={(v) => [`${v as number} g`, 'Peso estimado']}
                  labelFormatter={(l) => `${l} días`}
                />
                <Bar dataKey="estimatedWeightGrams" shape={(props: unknown) => <GradientBar {...(props as Record<string, unknown>)}/>}/>
              </BarChart>
            </ResponsiveContainer>
          )}
        </GlassCard>

        {/* Phenology donut */}
        <GlassCard>
          <div style={{ fontSize: 15, fontWeight: 600, color: T.frost, marginBottom: 4 }}>Distribución Fenológica</div>
          <div style={{ fontSize: 12, color: T.gray, marginBottom: 16 }}>Por etapa de madurez</div>
          {phenologyQuery.isLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}><Spin/></div>
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
                  contentStyle={{ background: T.obsidian3, border: `1px solid ${T.grayLine}`, borderRadius: 10, fontFamily: 'Lexend', fontSize: 12 }}
                  itemStyle={{ color: T.frostDim }}
                  formatter={(v) => [v as number, 'Elementos']}
                />
                <Legend
                  wrapperStyle={{ fontSize: 11, fontFamily: 'Lexend', color: T.gray }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </GlassCard>
      </div>

      {/* ── Bottom row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Health summary */}
        <GlassCard>
          <div style={{ fontSize: 15, fontWeight: 600, color: T.frost, marginBottom: 16 }}>Resumen de Salud</div>
          {healthQuery.isLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 100 }}><Spin/></div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                { label: 'Total detectados', value: h?.totalDetected ?? 0, color: T.rubus },
                { label: 'Elementos sanos', value: h?.totalHealthyCount ?? 0, color: T.emerald },
                { label: 'Elementos enfermos', value: h?.totalSickCount ?? 0, color: T.danger },
                { label: 'Merma promedio', value: `${(h?.avgLossPercent ?? 0).toFixed(1)}%`, color: T.warn },
              ].map((row, i) => (
                <div key={i} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '10px 14px', borderRadius: 10,
                  background: T.obsidian3, border: `1px solid ${T.grayLine}`,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: row.color, boxShadow: `0 0 6px ${row.color}` }}/>
                    <span style={{ fontSize: 13, color: T.frostDim }}>{row.label}</span>
                  </div>
                  <span style={{ fontSize: 15, fontWeight: 700, color: row.color }}>{row.value}</span>
                </div>
              ))}
            </div>
          )}
        </GlassCard>

        {/* Field map placeholder */}
        <GlassCard>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: T.frost }}>Mapa de Parcelas</div>
            <span style={{
              display: 'inline-flex', alignItems: 'center',
              padding: '2px 10px', borderRadius: 100,
              background: T.rubus + '22', border: `1px solid ${T.rubus}44`,
              color: T.rubus, fontSize: 11, fontWeight: 600,
            }}>4 activas</span>
          </div>
          <div style={{
            height: 140, borderRadius: 10, overflow: 'hidden', position: 'relative',
            background: T.obsidian3, border: `1px solid ${T.grayLine}`,
          }}>
            <svg width="100%" height="100%" viewBox="0 0 320 140" style={{ position: 'absolute', inset: 0 }}>
              <defs>
                <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                  <path d="M 20 0 L 0 0 0 20" fill="none" stroke={T.grayLine} strokeWidth="0.5"/>
                </pattern>
              </defs>
              <rect width="320" height="140" fill="url(#grid)"/>
              {([
                { x: 30, y: 20, w: 80, h: 50, label: 'P1', color: T.emerald },
                { x: 130, y: 15, w: 90, h: 55, label: 'P2', color: T.emerald },
                { x: 30, y: 85, w: 70, h: 40, label: 'P3', color: T.warn },
                { x: 240, y: 30, w: 65, h: 70, label: 'P4', color: T.rubus },
              ] as const).map((p, i) => (
                <g key={i}>
                  <rect x={p.x} y={p.y} width={p.w} height={p.h} rx={4}
                    fill={p.color + '22'} stroke={p.color} strokeWidth="1.5"/>
                  <text x={p.x + p.w / 2} y={p.y + p.h / 2 + 4} textAnchor="middle"
                    fill={p.color} fontSize="11" fontFamily="Lexend" fontWeight="600">{p.label}</text>
                </g>
              ))}
            </svg>
          </div>
          <div style={{ display: 'flex', gap: 16, marginTop: 12 }}>
            {([
              { c: T.emerald, l: 'Saludable' },
              { c: T.warn, l: 'Alerta' },
              { c: T.rubus, l: 'Monitoreada' },
            ] as const).map((s, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: T.gray }}>
                <div style={{ width: 8, height: 8, background: s.c, borderRadius: 2 }}/>
                {s.l}
              </div>
            ))}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
