/**
 * Mapea el { etapa, sano } ya resuelto por resolveDetectionState() de vuelta
 * a un nombre de clase de CLASS_MAP (fruit-inference/fruit-training), para
 * poder exportar el dataset de entrenamiento en formato YOLO.
 */
const ETAPA_A_CLASE: Record<string, string> = {
  boton: 'boton',
  flor: 'flor',
  verde: 'verde',
  naranja: 'naranja',
  marron: 'marron',
  maduro: 'maduro',
  deteccion_gen: 'zarzamora',
};

export function resolveClaseParaEntrenamiento(etapa: string, sano: boolean): string {
  if (!sano) {
    return 'enfermo';
  }
  const clase = ETAPA_A_CLASE[etapa];
  if (!clase) {
    throw new Error(`No se pudo mapear la etapa "${etapa}" a una clase de entrenamiento`);
  }
  return clase;
}
