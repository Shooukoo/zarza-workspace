import { ETAPAS_CONOCIDAS } from './types';
import type { Deteccion } from './types';
import { lightTheme } from '../shared/lightTheme';

const T = lightTheme;

const ETAPA_COLOR: Record<string, string> = {
  boton: '#8c8c8c',
  flor: '#eb2f96',
  verde: '#52c41a',
  naranja: '#fa8c16',
  marron: '#8c5a2b',
  maduro: '#cf1322',
  deteccion_gen: '#1677ff',
};

const ETAPA_LABEL: Record<string, string> = {
  boton: 'Botón',
  flor: 'Flor',
  verde: 'Verde',
  naranja: 'Naranja',
  marron: 'Marrón',
  maduro: 'Maduro',
  deteccion_gen: 'General',
};

interface Props {
  detecciones: Deteccion[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function DeteccionSidebar({ detecciones, selectedId, onSelect }: Props) {
  const conocidas = new Set<string>(ETAPAS_CONOCIDAS);
  const groups: { etapa: string; items: Deteccion[] }[] = ETAPAS_CONOCIDAS.map((etapa) => ({
    etapa,
    items: detecciones.filter((d) => d.etapa === etapa),
  })).filter((g) => g.items.length > 0);

  const otras = detecciones.filter((d) => !conocidas.has(d.etapa));
  if (otras.length > 0) groups.push({ etapa: 'otras', items: otras });

  return (
    <div
      style={{
        width: 300,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        background: T.surface,
        borderRadius: 12,
        border: `1px solid ${T.grayLine}`,
        boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: '12px 14px',
          borderBottom: `1px solid ${T.grayLine}`,
          fontSize: 13,
          fontWeight: 600,
          color: T.ink,
          flexShrink: 0,
        }}
      >
        Detecciones ({detecciones.length})
      </div>
      <style>{`
        .deteccion-sidebar-list::-webkit-scrollbar {
          display: none;
        }
      `}</style>
      <div
        className="deteccion-sidebar-list"
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          padding: 10,
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        {groups.map(({ etapa, items }) => (
          <div key={etapa} style={{ marginBottom: 14 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '0 4px 6px',
                fontSize: 11,
                fontWeight: 600,
                color: T.gray,
                textTransform: 'uppercase',
                letterSpacing: 0.4,
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: ETAPA_COLOR[etapa] ?? '#1677ff',
                  flexShrink: 0,
                }}
              />
              {ETAPA_LABEL[etapa] ?? etapa} · {items.length}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {items.map((d) => (
                <div
                  key={d.id}
                  onClick={() => onSelect(d.id)}
                  style={{
                    padding: '8px 10px',
                    borderRadius: 8,
                    cursor: 'pointer',
                    background: selectedId === d.id ? 'rgba(6,78,59,0.08)' : T.canvas,
                    border: selectedId === d.id ? `1px solid ${T.brand}` : '1px solid transparent',
                    opacity: d.eliminada ? 0.5 : 1,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: T.ink }}>
                    {d.sano ? 'Sano' : 'Enfermo'}
                    {d.eliminada && <span style={{ fontSize: 11, color: T.danger }}>· eliminada</span>}
                  </div>
                  <div style={{ fontSize: 11, color: T.gray, marginTop: 2 }}>
                    {d.origen === 'MODELO'
                      ? `confianza ${((d.confidence ?? 0) * 100).toFixed(0)}%`
                      : 'agregado manualmente'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
