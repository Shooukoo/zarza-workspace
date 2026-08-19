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
  const bboxCorregido: [number, number, number, number] | null =
    latest?.bboxX1 != null &&
    latest?.bboxY1 != null &&
    latest?.bboxX2 != null &&
    latest?.bboxY2 != null
      ? [latest.bboxX1, latest.bboxY1, latest.bboxX2, latest.bboxY2]
      : null;
  return {
    id: detection.id,
    origen: detection.origen,
    confidence: detection.confidence,
    etapa: latest?.etapaCorregida ?? detection.etapaDetectada,
    sano: (latest?.saludCorregida ?? detection.saludDetectada) === 'SANO',
    bbox:
      bboxCorregido ??
      [detection.bboxX1, detection.bboxY1, detection.bboxX2, detection.bboxY2],
    eliminada: latest?.accion === 'ELIMINAR',
  };
}
