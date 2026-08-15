import { useEffect, useRef, useState } from 'react';
import type { MouseEvent, PointerEvent, ReactNode, WheelEvent } from 'react';
import { Button, Tooltip } from 'antd';
import {
  ZoomInOutlined,
  ZoomOutOutlined,
  ExpandOutlined,
  CompressOutlined,
  QuestionCircleOutlined,
} from '@ant-design/icons';
import type { Deteccion } from './types';

interface Props {
  imageUrl: string;
  detecciones: Deteccion[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  drawMode: boolean;
  onDrawComplete: (bbox: [number, number, number, number]) => void;
  children?: ReactNode;
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

const MIN_SCALE = 1;
const MAX_SCALE = 8;
const WHEEL_ZOOM_FACTOR = 1.15;
const BUTTON_ZOOM_FACTOR = 1.25;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function DeteccionOverlay({
  imageUrl,
  detecciones,
  selectedId,
  onSelect,
  drawMode,
  onDrawComplete,
  children,
}: Props) {
  const [naturalSize, setNaturalSize] = useState<{ w: number; h: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const viewerRef = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState<[number, number, number, number] | null>(null);
  const startRef = useRef<{ x: number; y: number } | null>(null);

  const [scale, setScale] = useState(1);
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const panRef = useRef<{ x: number; y: number; tx: number; ty: number } | null>(null);

  function applyZoom(factor: number, originX: number, originY: number) {
    const vw = viewerRef.current?.clientWidth ?? 0;
    const vh = viewerRef.current?.clientHeight ?? 0;
    const newScale = clamp(scale * factor, MIN_SCALE, MAX_SCALE);
    const ratio = newScale / scale;
    setScale(newScale);
    setTx(clamp(originX - (originX - tx) * ratio, vw * (1 - newScale), 0));
    setTy(clamp(originY - (originY - ty) * ratio, vh * (1 - newScale), 0));
  }

  function zoomFromCenter(factor: number) {
    const vw = viewerRef.current?.clientWidth ?? 0;
    const vh = viewerRef.current?.clientHeight ?? 0;
    applyZoom(factor, vw / 2, vh / 2);
  }

  function resetZoom() {
    setScale(1);
    setTx(0);
    setTy(0);
  }

  function toggleFullscreen() {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      viewerRef.current?.requestFullscreen();
    }
  }

  useEffect(() => {
    function onFullscreenChange() {
      setIsFullscreen(document.fullscreenElement === viewerRef.current);
    }
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || target?.isContentEditable) return;
      if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        zoomFromCenter(BUTTON_ZOOM_FACTOR);
      } else if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        zoomFromCenter(1 / BUTTON_ZOOM_FACTOR);
      } else if (e.key === '0') {
        e.preventDefault();
        resetZoom();
      } else if (e.key.toLowerCase() === 'f') {
        e.preventDefault();
        toggleFullscreen();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleWheel(e: WheelEvent<HTMLDivElement>) {
    e.preventDefault();
    const rect = viewerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    applyZoom(e.deltaY < 0 ? WHEEL_ZOOM_FACTOR : 1 / WHEEL_ZOOM_FACTOR, mx, my);
  }

  function handlePanDown(e: PointerEvent<HTMLDivElement>) {
    if (e.button !== 2) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    panRef.current = { x: e.clientX, y: e.clientY, tx, ty };
    setIsPanning(true);
  }

  function handlePanMove(e: PointerEvent<HTMLDivElement>) {
    if (!panRef.current) return;
    const dx = e.clientX - panRef.current.x;
    const dy = e.clientY - panRef.current.y;
    const vw = viewerRef.current?.clientWidth ?? 0;
    const vh = viewerRef.current?.clientHeight ?? 0;
    setTx(clamp(panRef.current.tx + dx, vw * (1 - scale), 0));
    setTy(clamp(panRef.current.ty + dy, vh * (1 - scale), 0));
  }

  function handlePanUp(e: PointerEvent<HTMLDivElement>) {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    panRef.current = null;
    setIsPanning(false);
  }

  function handleContextMenu(e: MouseEvent<HTMLDivElement>) {
    e.preventDefault();
  }

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
    if (!drawMode || e.button !== 0) return;
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
      onDrawComplete([Math.round(x1), Math.round(y1), Math.round(x2), Math.round(y2)]);
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

  const zoomPercent = Math.round(scale * 100);

  return (
    <div
      ref={viewerRef}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        background: '#15151a',
        borderRadius: isFullscreen ? 0 : 12,
        overflow: 'hidden',
      }}
    >
      <div
        onWheel={handleWheel}
        onPointerDown={handlePanDown}
        onPointerMove={handlePanMove}
        onPointerUp={handlePanUp}
        onPointerCancel={handlePanUp}
        onContextMenu={handleContextMenu}
        style={{
          position: 'absolute',
          inset: 0,
          cursor: isPanning ? 'grabbing' : drawMode ? 'crosshair' : scale > MIN_SCALE ? 'grab' : 'default',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            transform: `translate(${tx}px, ${ty}px) scale(${scale})`,
            transformOrigin: '0 0',
          }}
        >
          <img
            src={imageUrl}
            alt="Análisis"
            draggable={false}
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
                    onClick={() => {
                      if (drawMode) return;
                      onSelect(d.id);
                    }}
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
      </div>

      <div
        style={{
          position: 'absolute',
          left: 16,
          top: 16,
          zIndex: 5,
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          background: 'rgba(20,20,24,0.72)',
          backdropFilter: 'blur(6px)',
          borderRadius: 8,
          padding: 4,
          boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
        }}
      >
        <Tooltip title="Alejar (-)">
          <Button
            type="text"
            icon={<ZoomOutOutlined style={{ color: '#fff' }} />}
            onClick={() => zoomFromCenter(1 / BUTTON_ZOOM_FACTOR)}
            disabled={scale <= MIN_SCALE}
          />
        </Tooltip>
        <Tooltip title="Ajustar a pantalla (0)">
          <button
            type="button"
            onClick={resetZoom}
            style={{
              minWidth: 48,
              padding: '4px 8px',
              fontSize: 12,
              color: '#fff',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            {zoomPercent}%
          </button>
        </Tooltip>
        <Tooltip title="Acercar (+)">
          <Button
            type="text"
            icon={<ZoomInOutlined style={{ color: '#fff' }} />}
            onClick={() => zoomFromCenter(BUTTON_ZOOM_FACTOR)}
            disabled={scale >= MAX_SCALE}
          />
        </Tooltip>
        <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.2)', margin: '0 2px' }} />
        <Tooltip title={isFullscreen ? 'Salir de pantalla completa (F)' : 'Pantalla completa (F)'}>
          <Button
            type="text"
            icon={
              isFullscreen ? (
                <CompressOutlined style={{ color: '#fff' }} />
              ) : (
                <ExpandOutlined style={{ color: '#fff' }} />
              )
            }
            onClick={toggleFullscreen}
          />
        </Tooltip>
        <Tooltip
          title={
            <div>
              <div>Rueda del mouse: zoom</div>
              <div>Click derecho + arrastrar: mover imagen</div>
              <div>Click izquierdo: seleccionar/dibujar detección</div>
              <div>0: ajustar a pantalla</div>
              <div>F: pantalla completa</div>
            </div>
          }
        >
          <Button type="text" icon={<QuestionCircleOutlined style={{ color: '#fff' }} />} />
        </Tooltip>
      </div>

      {children}
    </div>
  );
}
