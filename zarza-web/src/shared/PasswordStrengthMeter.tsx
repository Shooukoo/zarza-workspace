// zarza-web/src/shared/PasswordStrengthMeter.tsx
import { CheckCircleFilled, CloseCircleFilled } from '@ant-design/icons';
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

function RequirementIcon({ met }: { met: boolean }) {
  return (
    <span key={String(met)} className="zw-pwmeter-icon" style={{ fontSize: 15 }}>
      {met ? (
        <CheckCircleFilled style={{ color: T.emerald }} />
      ) : (
        <CloseCircleFilled style={{ color: T.gray }} />
      )}
    </span>
  );
}

export function PasswordStrengthMeter({ evaluation }: Props) {
  return (
    <div style={{ marginTop: 8, marginBottom: 12 }}>
      <style>{`
        .zw-pwmeter-bar-fill { transition: transform 260ms ease, background-color 200ms ease; }
        .zw-pwmeter-icon { display: inline-flex; animation: zw-pwmeter-pop 220ms ease; }
        @keyframes zw-pwmeter-pop {
          from { transform: scale(0.5); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .zw-pwmeter-label { transition: color 200ms ease; }
        @media (prefers-reduced-motion: reduce) {
          .zw-pwmeter-bar-fill { transition: background-color 200ms ease; }
          .zw-pwmeter-icon { animation: none; }
        }
      `}</style>

      <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            style={{
              position: 'relative',
              height: 6,
              flex: 1,
              borderRadius: 3,
              background: T.grayLine,
              overflow: 'hidden',
            }}
          >
            <div
              className="zw-pwmeter-bar-fill"
              style={{
                position: 'absolute',
                inset: 0,
                borderRadius: 3,
                background: SCORE_COLOR[evaluation.score],
                transform: i <= evaluation.score ? 'scaleX(1)' : 'scaleX(0)',
                transformOrigin: 'left',
              }}
            />
          </div>
        ))}
      </div>
      <div
        className="zw-pwmeter-label"
        style={{ fontSize: 12, color: SCORE_COLOR[evaluation.score], marginBottom: 10 }}
      >
        {SCORE_LABEL[evaluation.score]}
        {!evaluation.meetsScore && ' — podría ser fácil de adivinar'}
      </div>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: 12.5 }}>
        {CRITERIA.map((c) => {
          const met = Boolean(evaluation[c.key]);
          return (
            <li
              key={c.key}
              style={{
                color: T.ink,
                marginBottom: 8,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <RequirementIcon met={met} />
              {c.label}
            </li>
          );
        })}
        <li style={{ color: T.ink, display: 'flex', alignItems: 'center', gap: 8 }}>
          <RequirementIcon met={evaluation.typesCount >= 3} />
          Al menos 3 de los 4 anteriores
        </li>
      </ul>
    </div>
  );
}
