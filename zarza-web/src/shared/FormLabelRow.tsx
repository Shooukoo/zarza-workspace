// zarza-web/src/shared/FormLabelRow.tsx
import { lightTheme } from './lightTheme';

const T = lightTheme;

interface Props {
  htmlFor: string;
  label: string;
  required?: boolean;
  action?: { label: string; onClick: () => void };
}

export function FormLabelRow({ htmlFor, label, required, action }: Props) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        marginBottom: 8,
      }}
    >
      <label htmlFor={htmlFor} style={{ fontSize: 14, color: T.ink }}>
        {required && <span style={{ color: T.danger, marginRight: 4 }}>*</span>}
        {label}
      </label>
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            color: T.brand,
            fontSize: 12,
            fontWeight: 400,
            cursor: 'pointer',
          }}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
