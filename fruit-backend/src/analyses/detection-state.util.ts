import { Prisma } from '@rubus/database';

export interface ResolvedDetectionState {
  id: string;
  origen: string;
  confidence: number | null;
  etapa: string;
  sano: boolean;
  bbox: [number, number, number, number];
  eliminada: boolean;
}

export function resolveDetectionState(
  detection: Prisma.DetectionGetPayload<{ include: { feedback: true } }>,
): ResolvedDetectionState {
  const latest = detection.feedback[0];
  return {
    id: detection.id,
    origen: detection.origen,
    confidence: detection.confidence,
    etapa: latest?.etapaCorregida ?? detection.etapaDetectada,
    sano: (latest?.saludCorregida ?? detection.saludDetectada) === 'SANO',
    bbox:
      latest?.bboxX1 != null
        ? [latest.bboxX1, latest.bboxY1!, latest.bboxX2!, latest.bboxY2!]
        : [detection.bboxX1, detection.bboxY1, detection.bboxX2, detection.bboxY2],
    eliminada: latest?.accion === 'ELIMINAR',
  };
}
