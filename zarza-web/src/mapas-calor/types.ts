export type MetricaMapaCalor = 'densidad' | 'merma';

export interface CampoHeatmapPoint {
  campoId: string;
  nombre: string;
  poligonoGps: [number, number][] | null; // [lng, lat]
  centroid: { lat: number; lng: number };
  analysisCount: number;
  totalElementosDetectados: number;
  avgMermaPercent: number;
}

export interface CamposHeatmapResponse {
  campos: CampoHeatmapPoint[];
  sinUbicacion: number;
}

export interface AnalisisHeatmapPoint {
  id: string;
  lat: number;
  lng: number;
  fechaAnalisis: string;
  variedad: string | null;
  porcentajeMermaGeneral: number;
  totalElementosDetectados: number;
  elementosSanos: number;
  elementosEnfermos: number;
  validacionEstado: 'pendiente' | 'validado' | 'rechazado';
}
