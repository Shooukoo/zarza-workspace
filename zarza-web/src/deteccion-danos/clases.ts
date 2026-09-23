import { lightTheme } from '../shared/lightTheme';

export interface InfoClase {
  etiqueta: string;
  /** Color preset de antd <Tag>. */
  tagColor: 'success' | 'warning' | 'error' | 'default';
  /** Color de la barra <Progress>. */
  barColor: string;
}

const SANO = { tagColor: 'success', barColor: lightTheme.emerald } as const;
const DANO = { tagColor: 'warning', barColor: lightTheme.warn } as const;
const ENFERMEDAD = { tagColor: 'error', barColor: lightTheme.danger } as const;

const CLASES: Record<string, InfoClase> = {
  sano: { etiqueta: 'Sano', ...SANO },
  dano: { etiqueta: 'Daño', ...DANO },
  antracnosis: { etiqueta: 'Antracnosis', ...ENFERMEDAD },
  botrytis: { etiqueta: 'Botrytis', ...ENFERMEDAD },
  fusarium: { etiqueta: 'Fusarium', ...ENFERMEDAD },
  mildeo: { etiqueta: 'Mildiú', ...ENFERMEDAD },
  roya: { etiqueta: 'Roya', ...ENFERMEDAD },
  verticillium: { etiqueta: 'Verticilosis', ...ENFERMEDAD },
};

/** Una clase desconocida (p.ej. si se cambia el modelo) se muestra cruda y en gris. */
export function infoClase(clase: string): InfoClase {
  return CLASES[clase] ?? { etiqueta: clase, tagColor: 'default', barColor: lightTheme.gray };
}

export function formatearConfianza(confianza: number): string {
  return `${(confianza * 100).toFixed(1)}%`;
}
