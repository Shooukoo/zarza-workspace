import { useEffect, useState } from 'react';
import { Alert, Form, Select, Switch, Button, Popconfirm, Tag, message } from 'antd';
import { CloseOutlined, DeleteOutlined, SaveOutlined } from '@ant-design/icons';
import { useFeedbackDeteccion } from './useDetecciones';
import { ETAPAS_CONOCIDAS } from './types';
import type { Deteccion } from './types';
import { lightTheme } from '../shared/lightTheme';

const T = lightTheme;

interface Props {
  deteccion: Deteccion;
  analysisId: string;
  onClose: () => void;
}

interface FormValues {
  etapa: (typeof ETAPAS_CONOCIDAS)[number];
  sano: boolean;
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

export function DeteccionPanel({ deteccion, analysisId, onClose }: Props) {
  const feedbackMutation = useFeedbackDeteccion(analysisId);
  const [form] = Form.useForm<FormValues>();
  const [pendingAction, setPendingAction] = useState<'EDITAR' | 'ELIMINAR' | null>(null);

  useEffect(() => {
    form.setFieldsValue({
      etapa: deteccion.etapa as FormValues['etapa'],
      sano: deteccion.sano,
    });
  }, [deteccion, form]);

  async function guardar(values: FormValues) {
    setPendingAction('EDITAR');
    try {
      await feedbackMutation.mutateAsync({
        detectionId: deteccion.id,
        payload: {
          accion: 'EDITAR',
          etapaCorregida: values.etapa,
          saludCorregida: values.sano,
        },
      });
      message.success('Corrección guardada');
    } catch {
      message.error('Error al guardar la corrección');
    } finally {
      setPendingAction(null);
    }
  }

  async function eliminar() {
    setPendingAction('ELIMINAR');
    try {
      await feedbackMutation.mutateAsync({
        detectionId: deteccion.id,
        payload: { accion: 'ELIMINAR' },
      });
      message.success('Detección eliminada');
      onClose();
    } catch {
      message.error('Error al eliminar la detección');
    } finally {
      setPendingAction(null);
    }
  }

  const color = ETAPA_COLOR[deteccion.etapa] ?? '#1677ff';

  return (
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
          justifyContent: 'space-between',
          padding: '12px 14px',
          borderBottom: `1px solid ${T.grayLine}`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: color,
              flexShrink: 0,
            }}
          />
          <span style={{ fontSize: 13, fontWeight: 600, color: T.ink, textTransform: 'capitalize' }}>
            {deteccion.etapa.replace('_', ' ')}
          </span>
          <Tag color={deteccion.sano ? 'success' : 'error'} style={{ marginInlineEnd: 0 }}>
            {deteccion.sano ? 'Sano' : 'Enfermo'}
          </Tag>
        </div>
        <Button type="text" size="small" icon={<CloseOutlined />} onClick={onClose} />
      </div>

      <div style={{ padding: '10px 14px 0', fontSize: 12, color: T.gray }}>
        {deteccion.origen === 'MODELO'
          ? `Detectado por el modelo · confianza ${((deteccion.confidence ?? 0) * 100).toFixed(0)}%`
          : 'Agregado manualmente'}
      </div>

      <div style={{ padding: 14 }}>
        {deteccion.eliminada ? (
          <>
            <Alert
              type="warning"
              showIcon
              message="Esta detección fue eliminada."
              style={{ marginBottom: 12 }}
            />
            <Button onClick={onClose} block>
              Cerrar
            </Button>
          </>
        ) : (
          <Form form={form} layout="vertical" onFinish={guardar} requiredMark={false}>
            <Form.Item label="Etapa" name="etapa" rules={[{ required: true }]} style={{ marginBottom: 12 }}>
              <Select options={ETAPAS_CONOCIDAS.map((e) => ({ value: e, label: e }))} />
            </Form.Item>
            <Form.Item label="Estado" name="sano" valuePropName="checked" style={{ marginBottom: 16 }}>
              <Switch checkedChildren="Sano" unCheckedChildren="Enfermo" />
            </Form.Item>
            <div style={{ display: 'flex', gap: 8 }}>
              <Button
                type="primary"
                htmlType="submit"
                icon={<SaveOutlined />}
                loading={pendingAction === 'EDITAR'}
                style={{ flex: 1 }}
              >
                Guardar
              </Button>
              <Popconfirm
                title="Eliminar detección"
                description="Esta acción se puede revertir editándola de nuevo."
                okText="Eliminar"
                okButtonProps={{ danger: true }}
                cancelText="Cancelar"
                onConfirm={eliminar}
              >
                <Button danger icon={<DeleteOutlined />} loading={pendingAction === 'ELIMINAR'} />
              </Popconfirm>
            </div>
          </Form>
        )}
      </div>
    </div>
  );
}
