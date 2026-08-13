import { resolveDetectionState } from './detection-state.util';

describe('resolveDetectionState', () => {
  it('usa el valor original cuando la detección no tiene feedback', () => {
    const result = resolveDetectionState({
      id: 'det-1',
      origen: 'MODELO',
      confidence: 0.9,
      etapaDetectada: 'naranja',
      saludDetectada: 'SANO',
      bboxX1: 1,
      bboxY1: 2,
      bboxX2: 3,
      bboxY2: 4,
      feedback: [],
    } as any);

    expect(result).toEqual({
      id: 'det-1',
      origen: 'MODELO',
      confidence: 0.9,
      etapa: 'naranja',
      sano: true,
      bbox: [1, 2, 3, 4],
      eliminada: false,
    });
  });

  it('usa el feedback más reciente cuando existe', () => {
    const result = resolveDetectionState({
      id: 'det-1',
      origen: 'MODELO',
      confidence: 0.9,
      etapaDetectada: 'naranja',
      saludDetectada: 'SANO',
      bboxX1: 1,
      bboxY1: 2,
      bboxX2: 3,
      bboxY2: 4,
      feedback: [
        {
          accion: 'EDITAR',
          etapaCorregida: 'maduro',
          saludCorregida: 'ENFERMO',
          bboxX1: null,
          bboxY1: null,
          bboxX2: null,
          bboxY2: null,
        },
      ],
    } as any);

    expect(result).toEqual(
      expect.objectContaining({ etapa: 'maduro', sano: false, bbox: [1, 2, 3, 4] }),
    );
  });

  it('marca eliminada=true cuando el último feedback es ELIMINAR', () => {
    const result = resolveDetectionState({
      id: 'det-1',
      origen: 'MODELO',
      confidence: 0.9,
      etapaDetectada: 'naranja',
      saludDetectada: 'SANO',
      bboxX1: 1,
      bboxY1: 2,
      bboxX2: 3,
      bboxY2: 4,
      feedback: [
        {
          accion: 'ELIMINAR',
          etapaCorregida: null,
          saludCorregida: null,
          bboxX1: null,
          bboxY1: null,
          bboxX2: null,
          bboxY2: null,
        },
      ],
    } as any);

    expect(result.eliminada).toBe(true);
  });

  it('usa el bbox corregido del feedback cuando las 4 coordenadas están presentes', () => {
    const result = resolveDetectionState({
      id: 'det-1',
      origen: 'MODELO',
      confidence: 0.9,
      etapaDetectada: 'naranja',
      saludDetectada: 'SANO',
      bboxX1: 1,
      bboxY1: 2,
      bboxX2: 3,
      bboxY2: 4,
      feedback: [
        {
          accion: 'EDITAR',
          etapaCorregida: null,
          saludCorregida: null,
          bboxX1: 10,
          bboxY1: 20,
          bboxX2: 30,
          bboxY2: 40,
        },
      ],
    } as any);

    expect(result.bbox).toEqual([10, 20, 30, 40]);
  });

  it('vuelve al bbox original si el feedback trae solo algunas coordenadas', () => {
    const result = resolveDetectionState({
      id: 'det-1',
      origen: 'MODELO',
      confidence: 0.9,
      etapaDetectada: 'naranja',
      saludDetectada: 'SANO',
      bboxX1: 1,
      bboxY1: 2,
      bboxX2: 3,
      bboxY2: 4,
      feedback: [
        {
          accion: 'EDITAR',
          etapaCorregida: null,
          saludCorregida: null,
          bboxX1: 10,
          bboxY1: null,
          bboxX2: null,
          bboxY2: null,
        },
      ],
    } as any);

    expect(result.bbox).toEqual([1, 2, 3, 4]);
  });
});
