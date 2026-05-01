import { Tag } from 'antd';
import type { EstadoSolicitud } from './hooks/useSolicitudes';

const COLOR_MAP: Record<EstadoSolicitud, string> = {
  PENDIENTE: 'orange',
  EN_PROGRESO: 'blue',
  COMPLETADO: 'green',
  CANCELADO: 'red',
};

const LABEL_MAP: Record<EstadoSolicitud, string> = {
  PENDIENTE: 'Pendiente',
  EN_PROGRESO: 'En Progreso',
  COMPLETADO: 'Completado',
  CANCELADO: 'Cancelado',
};

export function EstadoBadge({ estado }: { estado: EstadoSolicitud }) {
  return <Tag color={COLOR_MAP[estado]}>{LABEL_MAP[estado]}</Tag>;
}
