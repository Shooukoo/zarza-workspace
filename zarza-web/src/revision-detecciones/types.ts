export const ETAPAS_CONOCIDAS = [
  'boton',
  'flor',
  'verde',
  'naranja',
  'marron',
  'maduro',
  'deteccion_gen',
] as const;

export type EtapaConocida = (typeof ETAPAS_CONOCIDAS)[number];

export type OrigenDeteccion = 'MODELO' | 'HUMANO';

export interface Deteccion {
  id: string;
  origen: OrigenDeteccion;
  confidence: number | null;
  etapa: string;
  sano: boolean;
  bbox: [number, number, number, number];
  eliminada: boolean;
}

export interface CreateDeteccionPayload {
  etapa: EtapaConocida;
  sano: boolean;
  bbox: [number, number, number, number];
}

export interface DeteccionFeedbackPayload {
  accion: 'EDITAR' | 'ELIMINAR';
  etapaCorregida?: EtapaConocida;
  saludCorregida?: boolean;
  bbox?: [number, number, number, number];
  observaciones?: string;
}
