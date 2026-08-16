import { useEffect, useRef, useState } from 'react';
import type { MouseEvent, PointerEvent, ReactNode, WheelEvent } from 'react';
import { Button, Select, Switch, Tooltip } from 'antd';
import {
  CheckOutlined,
  CloseOutlined,
  ExpandOutlined,
  CompressOutlined,
  QuestionCircleOutlined,
  ZoomInOutlined,
  ZoomOutOutlined,
} from '@ant-design/icons';
import type { Deteccion, EtapaConocida } from './types';
import { ETAPAS_CONOCIDAS } from './types';
import { lightTheme } from '../shared/lightTheme';

const T = lightTheme;

interface Props {
  imageUrl: string;
  imageWidth: number;
  imageHeight: number;
  detecciones: Deteccion[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  drawMode: boolean;
  onToggleDrawMode: () => void;
  draftEtapa: EtapaConocida;
  onDraftEtapaChange: (etapa: EtapaConocida) => void;
  draftSano: boolean;
  onDraftSanoChange: (sano: boolean) => void;
  onConfirmDraft: (bbox: [number, number, number, number]) => Promise<void>;
  confirmLoading?: boolean;
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
const MIN_BOX_SIZE = 4;

type DrawPhase = 'idle' | 'drawing' | 'reviewing';
type HandleMode = 'move' | 'nw' | 'ne' | 'se' | 'sw';

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function DeteccionOverlay({
  imageUrl,
  imageWidth,
  imageHeight,
  detecciones,
  selectedId,
  onSelect,
  drawMode,
  onToggleDrawMode,
  draftEtapa,
  onDraftEtapaChange,
  draftSano,
  onDraftSanoChange,
  onConfirmDraft,
  confirmLoading,
  children,
}: Props) {
  // El overlay usa las dimensiones originales que devuelve el backend (no las
  // del archivo realmente servido, que puede ser una variante redimensionada)
  // para que el viewBox del SVG siga coincidiendo con las coordenadas de las
  // detecciones, sin esperar a que la imagen termine de descargar.
  const naturalSize = { w: imageWidth, h: imageHeight };
  const svgRef = useRef<SVGSVGElement>(null);
  const viewerRef = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<DrawPhase>('idle');
  const [draft, setDraft] = useState<[number, number, number, number] | null>(null);
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const dragRef = useRef<{
    mode: HandleMode;
    startPoint: { x: number; y: number };
    startBbox: [number, number, number, number];
  } | null>(null);

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

  function resetDraft() {
    setPhase('idle');
    setDraft(null);
    startRef.current = null;
    dragRef.current = null;
  }

  // Si el modo dibujo se apaga desde afuera (botón, o tras confirmar), limpia
  // cualquier trazo pendiente para no dejar un recuadro fantasma.
  useEffect(() => {
    if (!drawMode) resetDraft();
  }, [drawMode]);

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
      } else if (e.key === 'Escape') {
        if (phase !== 'idle') {
          e.preventDefault();
          resetDraft();
        } else if (drawMode) {
          e.preventDefault();
          onToggleDrawMode();
        }
      } else if (e.key.toLowerCase() === 'n' && phase === 'idle') {
        e.preventDefault();
        onToggleDrawMode();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scale, tx, ty, phase, drawMode]);

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
    if (!drawMode || e.button !== 0 || phase !== 'idle') return;
    const p = toViewBoxPoint(e.clientX, e.clientY);
    if (!p) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    startRef.current = p;
    setPhase('drawing');
    setDraft([p.x, p.y, p.x, p.y]);
  }

  function handlePointerMove(e: PointerEvent<SVGSVGElement>) {
    if (phase !== 'drawing' || !startRef.current) return;
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
    if (phase !== 'drawing') return;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    startRef.current = null;
    const box = draft;
    if (box && box[2] - box[0] > MIN_BOX_SIZE && box[3] - box[1] > MIN_BOX_SIZE) {
      setPhase('reviewing');
    } else {
      setPhase('idle');
      setDraft(null);
    }
  }

  function handlePointerCancel(e: PointerEvent<SVGSVGElement>) {
    if (phase !== 'drawing') return;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    setPhase('idle');
    setDraft(null);
    startRef.current = null;
  }

  function beginHandleDrag(e: PointerEvent<SVGElement>, mode: HandleMode) {
    if (!draft || phase !== 'reviewing') return;
    const p = toViewBoxPoint(e.clientX, e.clientY);
    if (!p) return;
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { mode, startPoint: p, startBbox: draft };
  }

  function handleDragMove(e: PointerEvent<SVGElement>) {
    const drag = dragRef.current;
    if (!drag) return;
    const p = toViewBoxPoint(e.clientX, e.clientY);
    if (!p) return;
    e.stopPropagation();
    const dx = p.x - drag.startPoint.x;
    const dy = p.y - drag.startPoint.y;
    const [sx1, sy1, sx2, sy2] = drag.startBbox;
    const maxW = naturalSize?.w ?? Infinity;
    const maxH = naturalSize?.h ?? Infinity;

    if (drag.mode === 'move') {
      const w = sx2 - sx1;
      const h = sy2 - sy1;
      const nx1 = clamp(sx1 + dx, 0, Math.max(0, maxW - w));
      const ny1 = clamp(sy1 + dy, 0, Math.max(0, maxH - h));
      setDraft([nx1, ny1, nx1 + w, ny1 + h]);
      return;
    }

    let [x1, y1, x2, y2] = [sx1, sy1, sx2, sy2];
    if (drag.mode === 'nw') {
      x1 = clamp(sx1 + dx, 0, x2 - MIN_BOX_SIZE);
      y1 = clamp(sy1 + dy, 0, y2 - MIN_BOX_SIZE);
    } else if (drag.mode === 'ne') {
      x2 = clamp(sx2 + dx, x1 + MIN_BOX_SIZE, maxW);
      y1 = clamp(sy1 + dy, 0, y2 - MIN_BOX_SIZE);
    } else if (drag.mode === 'se') {
      x2 = clamp(sx2 + dx, x1 + MIN_BOX_SIZE, maxW);
      y2 = clamp(sy2 + dy, y1 + MIN_BOX_SIZE, maxH);
    } else if (drag.mode === 'sw') {
      x1 = clamp(sx1 + dx, 0, x2 - MIN_BOX_SIZE);
      y2 = clamp(sy2 + dy, y1 + MIN_BOX_SIZE, maxH);
    }
    setDraft([x1, y1, x2, y2]);
  }

  function endHandleDrag(e: PointerEvent<SVGElement>) {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    dragRef.current = null;
  }

  async function handleConfirmDraft() {
    if (!draft) return;
    const [x1, y1, x2, y2] = draft;
    try {
      await onConfirmDraft([Math.round(x1), Math.round(y1), Math.round(x2), Math.round(y2)]);
      resetDraft();
    } catch {
      // se mantiene en revisión para que el usuario no pierda el recuadro dibujado
    }
  }

  const zoomPercent = Math.round(scale * 100);
  const reviewing = phase === 'reviewing' && draft;

  // Tamaño de los manejadores de resize en unidades del viewBox, para que se
  // vean del mismo tamaño en pantalla sin importar el nivel de zoom actual.
  const svgRect = reviewing ? svgRef.current?.getBoundingClientRect() : undefined;
  const unitsPerPx = svgRect && naturalSize && svgRect.width > 0 ? naturalSize.w / svgRect.width : 1;
  const handleR = 6 * unitsPerPx;

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
          cursor: isPanning
            ? 'grabbing'
            : drawMode && phase !== 'reviewing'
              ? 'crosshair'
              : scale > MIN_SCALE
                ? 'grab'
                : 'default',
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
          />
          {naturalSize.w > 0 && naturalSize.h > 0 && (
            <svg
              ref={svgRef}
              viewBox={`0 0 ${naturalSize.w} ${naturalSize.h}`}
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                cursor: drawMode && phase !== 'reviewing' ? 'crosshair' : 'default',
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
              {draft && phase === 'drawing' && (
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
              {reviewing && draft && (
                <g>
                  <rect
                    x={draft[0]}
                    y={draft[1]}
                    width={draft[2] - draft[0]}
                    height={draft[3] - draft[1]}
                    stroke={ETAPA_COLOR[draftEtapa] ?? '#1677ff'}
                    strokeWidth={2}
                    fill={
                      draftSano ? 'rgba(22,119,255,0.08)' : 'rgba(207,19,34,0.18)'
                    }
                    vectorEffect="non-scaling-stroke"
                    style={{ cursor: 'move' }}
                    onPointerDown={(e) => beginHandleDrag(e, 'move')}
                    onPointerMove={handleDragMove}
                    onPointerUp={endHandleDrag}
                    onPointerCancel={endHandleDrag}
                  />
                  {(
                    [
                      { mode: 'nw', cx: draft[0], cy: draft[1], cursor: 'nwse-resize' },
                      { mode: 'ne', cx: draft[2], cy: draft[1], cursor: 'nesw-resize' },
                      { mode: 'se', cx: draft[2], cy: draft[3], cursor: 'nwse-resize' },
                      { mode: 'sw', cx: draft[0], cy: draft[3], cursor: 'nesw-resize' },
                    ] as const
                  ).map((h) => (
                    <circle
                      key={h.mode}
                      cx={h.cx}
                      cy={h.cy}
                      r={handleR}
                      fill="#ffffff"
                      stroke="#1677ff"
                      strokeWidth={2}
                      vectorEffect="non-scaling-stroke"
                      style={{ cursor: h.cursor }}
                      onPointerDown={(e) => beginHandleDrag(e, h.mode)}
                      onPointerMove={handleDragMove}
                      onPointerUp={endHandleDrag}
                      onPointerCancel={endHandleDrag}
                    />
                  ))}
                </g>
              )}
            </svg>
          )}
        </div>
      </div>

      {drawMode && phase !== 'reviewing' && (
        <div
          style={{
            position: 'absolute',
            top: 16,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 5,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            background: 'rgba(20,20,24,0.78)',
            backdropFilter: 'blur(6px)',
            borderRadius: 100,
            padding: '8px 16px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
            fontSize: 13,
            color: '#fff',
          }}
        >
          <span>Dibuja un rectángulo alrededor del fruto</span>
          <span style={{ width: 1, height: 14, background: 'rgba(255,255,255,0.25)' }} />
          <button
            type="button"
            onClick={onToggleDrawMode}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'rgba(255,255,255,0.75)',
              fontSize: 13,
              cursor: 'pointer',
              padding: 0,
            }}
          >
            Cancelar (Esc)
          </button>
        </div>
      )}

      {reviewing && draft && (
        <div
          style={{
            position: 'absolute',
            right: 16,
            top: 16,
            zIndex: 6,
            width: 300,
            background: T.surface,
            borderRadius: 12,
            boxShadow: '0 12px 32px rgba(0,0,0,0.28)',
            border: `1px solid ${T.grayLine}`,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '12px 14px',
              borderBottom: `1px solid ${T.grayLine}`,
            }}
          >
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: ETAPA_COLOR[draftEtapa] ?? '#1677ff',
                flexShrink: 0,
              }}
            />
            <span style={{ fontSize: 13, fontWeight: 600, color: T.ink }}>Nueva detección</span>
          </div>

          <div style={{ padding: '10px 14px 0', fontSize: 12, color: T.gray }}>
            Arrastra el recuadro para moverlo o sus esquinas para ajustar el tamaño.
          </div>

          <div style={{ padding: 14 }}>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 12, color: T.gray, marginBottom: 4 }}>Etapa</div>
              <Select
                value={draftEtapa}
                onChange={onDraftEtapaChange}
                options={ETAPAS_CONOCIDAS.map((e) => ({ value: e, label: e }))}
                style={{ width: '100%' }}
              />
            </div>
            <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 12, color: T.gray }}>Estado</div>
              <Switch checked={draftSano} onChange={onDraftSanoChange} checkedChildren="Sano" unCheckedChildren="Enfermo" />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Button icon={<CloseOutlined />} onClick={resetDraft} disabled={confirmLoading} style={{ flex: 1 }}>
                Cancelar
              </Button>
              <Button
                type="primary"
                icon={<CheckOutlined />}
                loading={confirmLoading}
                onClick={handleConfirmDraft}
                style={{ flex: 1 }}
              >
                Confirmar
              </Button>
            </div>
          </div>
        </div>
      )}

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
              <div>N: agregar detección · Esc: cancelar</div>
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
