import { Button, Tag } from 'antd';
import { useNavigate } from 'react-router-dom';
import type { AnalisisHeatmapPoint } from './types';
import { useAuth } from '../auth/useAuth';
import { Role } from '../auth/types';

const ESTADO_LABEL: Record<string, { color: string; label: string }> = {
  validado: { color: 'green', label: 'Validado' },
  rechazado: { color: 'red', label: 'Rechazado' },
  pendiente: { color: 'default', label: 'Pendiente' },
};

interface Props {
  analisis: AnalisisHeatmapPoint;
}

export function AnalisisPopup({ analisis }: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const estado = ESTADO_LABEL[analisis.validacionEstado] ?? ESTADO_LABEL['pendiente'];

  function verDetecciones() {
    if (user?.role === Role.ADMIN || user?.role === Role.AGRONOMO) {
      navigate(`/analisis/${analisis.id}/revision-detecciones`);
    } else {
      navigate(`/analisis?id=${analisis.id}`);
    }
  }

  return (
    <div style={{ minWidth: 200 }}>
      <div style={{ fontWeight: 600, marginBottom: 4 }}>
        {new Date(analisis.fechaAnalisis).toLocaleDateString('es-MX')}
        {analisis.variedad ? ` — ${analisis.variedad}` : ''}
      </div>
      <div style={{ fontSize: 12, marginBottom: 2 }}>
        Merma: {analisis.porcentajeMermaGeneral.toFixed(1)}%
      </div>
      <div style={{ fontSize: 12, marginBottom: 8 }}>
        Sanos: {analisis.elementosSanos} · Enfermos: {analisis.elementosEnfermos}
      </div>
      <Tag color={estado.color} style={{ marginBottom: 8 }}>
        {estado.label}
      </Tag>
      <div>
        <Button size="small" type="primary" onClick={verDetecciones} block>
          Ver detecciones
        </Button>
      </div>
    </div>
  );
}
