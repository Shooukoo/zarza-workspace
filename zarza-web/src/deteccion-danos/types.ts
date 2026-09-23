export interface DamageClassProbability {
  clase: string;
  confianza: number;
}

export interface DamageClassificationResult {
  clase: string;
  confianza: number;
  probabilidades: DamageClassProbability[];
}
