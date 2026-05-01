import { Select, notification } from 'antd';
import { useUpdateEstado, type EstadoSolicitud } from './hooks/useSolicitudes';

const ESTADO_OPTIONS: { value: EstadoSolicitud; label: string }[] = [
  { value: 'PENDIENTE', label: 'Pendiente' },
  { value: 'EN_PROGRESO', label: 'En Progreso' },
  { value: 'COMPLETADO', label: 'Completado' },
  { value: 'CANCELADO', label: 'Cancelado' },
];

interface Props {
  solicitudId: string;
  currentEstado: EstadoSolicitud;
}

export function UpdateEstadoDropdown({ solicitudId, currentEstado }: Props) {
  const updateMutation = useUpdateEstado();

  async function handleChange(estado: EstadoSolicitud) {
    try {
      await updateMutation.mutateAsync({ id: solicitudId, estado });
      notification.success({ message: 'Estado actualizado' });
    } catch {
      notification.error({ message: 'Error al actualizar estado' });
    }
  }

  return (
    <Select
      value={currentEstado}
      onChange={handleChange}
      options={ESTADO_OPTIONS}
      loading={updateMutation.isPending}
      style={{ width: 140 }}
      size="small"
    />
  );
}
