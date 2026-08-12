import { useEffect } from 'react';
import { Form, Select, Switch, Button, Space, message } from 'antd';
import { useFeedbackDeteccion } from './useDetecciones';
import { ETAPAS_CONOCIDAS } from './types';
import type { Deteccion } from './types';

interface Props {
  deteccion: Deteccion;
  analysisId: string;
  onClose: () => void;
}

interface FormValues {
  etapa: (typeof ETAPAS_CONOCIDAS)[number];
  sano: boolean;
}

export function DeteccionPanel({ deteccion, analysisId, onClose }: Props) {
  const feedbackMutation = useFeedbackDeteccion(analysisId);
  const [form] = Form.useForm<FormValues>();

  useEffect(() => {
    form.setFieldsValue({
      etapa: deteccion.etapa as FormValues['etapa'],
      sano: deteccion.sano,
    });
  }, [deteccion, form]);

  async function guardar(values: FormValues) {
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
    }
  }

  async function eliminar() {
    try {
      await feedbackMutation.mutateAsync({
        detectionId: deteccion.id,
        payload: { accion: 'ELIMINAR' },
      });
      message.success('Detección eliminada');
      onClose();
    } catch {
      message.error('Error al eliminar la detección');
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        right: 24,
        bottom: 24,
        width: 280,
        background: '#fff',
        borderRadius: 8,
        boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
        padding: 16,
        zIndex: 10,
      }}
    >
      <Form form={form} layout="vertical" onFinish={guardar}>
        <Form.Item label="Etapa" name="etapa" rules={[{ required: true }]}>
          <Select options={ETAPAS_CONOCIDAS.map((e) => ({ value: e, label: e }))} />
        </Form.Item>
        <Form.Item label="Estado" name="sano" valuePropName="checked">
          <Switch checkedChildren="Sano" unCheckedChildren="Enfermo" />
        </Form.Item>
        <Space>
          <Button type="primary" htmlType="submit" loading={feedbackMutation.isPending}>
            Guardar
          </Button>
          <Button danger onClick={eliminar} loading={feedbackMutation.isPending}>
            Eliminar
          </Button>
          <Button onClick={onClose}>Cerrar</Button>
        </Space>
      </Form>
    </div>
  );
}
