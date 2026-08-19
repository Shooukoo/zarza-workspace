import type { AnalisisHeatmapPoint, CampoHeatmapPoint, MetricaMapaCalor } from './types';

export function campoMetricValue(
  metrica: MetricaMapaCalor,
  campo: Pick<CampoHeatmapPoint, 'totalElementosDetectados' | 'avgMermaPercent'>,
): number {
  return metrica === 'densidad' ? campo.totalElementosDetectados : campo.avgMermaPercent;
}

export function analisisMetricValue(
  metrica: MetricaMapaCalor,
  analisis: Pick<AnalisisHeatmapPoint, 'totalElementosDetectados' | 'porcentajeMermaGeneral'>,
): number {
  return metrica === 'densidad'
    ? analisis.totalElementosDetectados
    : analisis.porcentajeMermaGeneral;
}

export function computeRange(values: number[]): { min: number; max: number } {
  if (values.length === 0) return { min: 0, max: 1 };
  return { min: Math.min(...values), max: Math.max(...values) };
}

const STOPS: [number, [number, number, number]][] = [
  [0, [34, 139, 34]],
  [0.5, [230, 180, 40]],
  [1, [220, 50, 40]],
];

export function colorForValue(value: number, min: number, max: number): string {
  const t = max <= min ? 0 : Math.min(1, Math.max(0, (value - min) / (max - min)));
  return interpolate(t);
}

function interpolate(t: number): string {
  for (let i = 0; i < STOPS.length - 1; i++) {
    const [t0, c0] = STOPS[i];
    const [t1, c1] = STOPS[i + 1];
    if (t >= t0 && t <= t1) {
      const lt = (t - t0) / (t1 - t0);
      const r = Math.round(c0[0] + (c1[0] - c0[0]) * lt);
      const g = Math.round(c0[1] + (c1[1] - c0[1]) * lt);
      const b = Math.round(c0[2] + (c1[2] - c0[2]) * lt);
      return `rgb(${r}, ${g}, ${b})`;
    }
  }
  const last = STOPS[STOPS.length - 1][1];
  return `rgb(${last[0]}, ${last[1]}, ${last[2]})`;
}
