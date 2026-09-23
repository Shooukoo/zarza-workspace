export interface DamageClassProbability {
  clase: string;
  confianza: number;
}

/** Respuesta de fruit-inference POST /classify-damage, devuelta tal cual al cliente. */
export interface DamageClassificationResult {
  clase: string;
  confianza: number;
  probabilidades: DamageClassProbability[];
}
