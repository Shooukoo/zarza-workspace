// zarza-web/src/shared/PasswordStrengthMeter.tsx
import { lightTheme } from './lightTheme';
import type { PasswordEvaluation } from './passwordPolicy';

const T = lightTheme;

const SCORE_COLOR: Record<number, string> = {
  0: T.danger,
  1: T.danger,
  2: T.warn,
  3: T.emerald,
  4: T.emerald,
};

const SCORE_LABEL: Record<number, string> = {
  0: 'Muy débil',
  1: 'Débil',
  2: 'Aceptable',
  3: 'Buena',
  4: 'Excelente',
};

const CRITERIA: { key: keyof PasswordEvaluation; label: string }[] = [
  { key: 'hasMinLength', label: 'Al menos 10 caracteres' },
  { key: 'hasUpper', label: 'Una mayúscula' },
  { key: 'hasLower', label: 'Una minúscula' },
  { key: 'hasNumber', label: 'Un número' },
  { key: 'hasSymbol', label: 'Un símbolo' },
];

interface Props {
  evaluation: PasswordEvaluation;
}

export function PasswordStrengthMeter({ evaluation }: Props) {
  return (
    <div style={{ marginTop: 4, marginBottom: 12 }}>
      <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            style={{
              height: 4,
              flex: 1,
              borderRadius: 2,
              background:
                i <= evaluation.score ? SCORE_COLOR[evaluation.score] : T.grayLine,
            }}
          />
        ))}
      </div>
      <div
        style={{ fontSize: 11, color: SCORE_COLOR[evaluation.score], marginBottom: 6 }}
      >
        {SCORE_LABEL[evaluation.score]}
        {!evaluation.meetsScore && ' — podría ser fácil de adivinar'}
      </div>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: 11 }}>
        {CRITERIA.map((c) => {
          const met = Boolean(evaluation[c.key]);
          return (
            <li key={c.key} style={{ color: met ? T.emerald : T.gray, marginBottom: 2 }}>
              {met ? '✓' : '✗'} {c.label}
            </li>
          );
        })}
        <li style={{ color: evaluation.typesCount >= 3 ? T.emerald : T.gray }}>
          {evaluation.typesCount >= 3 ? '✓' : '✗'} Al menos 3 de los 4 anteriores
        </li>
      </ul>
    </div>
  );
}
