import { useRef, useState } from 'react';
import type { PointerEvent } from 'react';
import type { Deteccion } from './types';

interface Props {
  imageUrl: string;
  detecciones: Deteccion[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  drawMode: boolean;
  onDrawComplete: (bbox: [number, number, number, number]) => void;
}

const ETAPA_COLOR: Record<string, string> = {
  boton: '#8c8c8c',
  flor: '#eb2f96',
  verde: '#52c41a',
  naranja: '#fa8c16',
  marron: '#8c5a2b',
  maduro: '#cf1322',
  deteccion_gen: '#1677ff',
};

export function DeteccionOverlay({
  imageUrl,
  detecciones,
  selectedId,
  onSelect,
  drawMode,
  onDrawComplete,
}: Props) {
  const [naturalSize, setNaturalSize] = useState<{ w: number; h: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [draft, setDraft] = useState<[number, number, number, number] | null>(null);
  const startRef = useRef<{ x: number; y: number } | null>(null);

  function toViewBoxPoint(clientX: number, clientY: number) {
    const svg = svgRef.current;
    if (!svg) return null;
    const point = svg.createSVGPoint();
    point.x = clientX;
    point.y = clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return null;
    const transformed = point.matrixTransform(ctm.inverse());
    return { x: transformed.x, y: transformed.y };
  }

  function handlePointerDown(e: PointerEvent<SVGSVGElement>) {
    if (!drawMode) return;
    const p = toViewBoxPoint(e.clientX, e.clientY);
    if (!p) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    startRef.current = p;
    setDraft([p.x, p.y, p.x, p.y]);
  }

  function handlePointerMove(e: PointerEvent<SVGSVGElement>) {
    if (!drawMode || !startRef.current) return;
    const p = toViewBoxPoint(e.clientX, e.clientY);
    if (!p) return;
    const start = startRef.current;
    setDraft([
      Math.min(start.x, p.x),
      Math.min(start.y, p.y),
      Math.max(start.x, p.x),
      Math.max(start.y, p.y),
    ]);
  }

  function handlePointerUp(e: PointerEvent<SVGSVGElement>) {
    if (!drawMode || !draft) return;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    const [x1, y1, x2, y2] = draft;
    if (x2 - x1 > 4 && y2 - y1 > 4) {
      onDrawComplete([
        Math.round(x1),
        Math.round(y1),
        Math.round(x2),
        Math.round(y2),
      ]);
    }
    startRef.current = null;
    setDraft(null);
  }

  function handlePointerCancel(e: PointerEvent<SVGSVGElement>) {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    startRef.current = null;
    setDraft(null);
  }

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        aspectRatio: naturalSize ? `${naturalSize.w} / ${naturalSize.h}` : undefined,
        background: '#f0f0f0',
        borderRadius: 8,
        overflow: 'hidden',
      }}
    >
      <img
        src={imageUrl}
        alt="Análisis"
        style={{ width: '100%', height: '100%', display: 'block', objectFit: 'contain' }}
        onLoad={(e) =>
          setNaturalSize({
            w: e.currentTarget.naturalWidth,
            h: e.currentTarget.naturalHeight,
          })
        }
      />
      {naturalSize && (
        <svg
          ref={svgRef}
          viewBox={`0 0 ${naturalSize.w} ${naturalSize.h}`}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            cursor: drawMode ? 'crosshair' : 'default',
          }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
        >
          {detecciones.map((d) => {
            const [x1, y1, x2, y2] = d.bbox;
            const color = ETAPA_COLOR[d.etapa] ?? '#1677ff';
            return (
              <rect
                key={d.id}
                x={x1}
                y={y1}
                width={x2 - x1}
                height={y2 - y1}
                stroke={selectedId === d.id ? '#1677ff' : color}
                strokeWidth={selectedId === d.id ? 4 : 2}
                strokeDasharray={d.eliminada ? '6 4' : undefined}
                fill={!d.sano ? 'rgba(207,19,34,0.18)' : 'transparent'}
                opacity={d.eliminada ? 0.35 : 1}
                vectorEffect="non-scaling-stroke"
                onClick={() => !drawMode && onSelect(d.id)}
                style={{ cursor: drawMode ? 'crosshair' : 'pointer' }}
              />
            );
          })}
          {draft && (
            <rect
              x={draft[0]}
              y={draft[1]}
              width={draft[2] - draft[0]}
              height={draft[3] - draft[1]}
              stroke="#1677ff"
              strokeWidth={2}
              strokeDasharray="4 2"
              fill="rgba(22,119,255,0.1)"
              vectorEffect="non-scaling-stroke"
            />
          )}
        </svg>
      )}
    </div>
  );
}
