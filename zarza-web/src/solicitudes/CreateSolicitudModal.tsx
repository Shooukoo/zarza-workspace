import { Modal, Form, Input, Select, DatePicker, notification } from 'antd';
import type { Dayjs } from 'dayjs';
import {
  useCreateSolicitud,
  useCamposOptions,
  useMonitores,
} from './hooks/useSolicitudes';

interface Props {
  open: boolean;
  onClose: () => void;
}

interface FormValues {
  campo_id: string;
  asignado_a: string;
  mensaje: string;
  fecha_limite?: Dayjs;
}

export function CreateSolicitudModal({ open, onClose }: Props) {
  const [form] = Form.useForm<FormValues>();
  const createMutation = useCreateSolicitud();
  const camposQuery = useCamposOptions();
  const monitoresQuery = useMonitores();

  async function onFinish(values: FormValues) {
    try {
      await createMutation.mutateAsync({
        campo_id: values.campo_id,
        asignado_a: values.asignado_a,
        mensaje: values.mensaje,
        fecha_limite: values.fecha_limite?.toISOString(),
      });
      notification.success({ message: 'Solicitud creada exitosamente' });
      form.resetFields();
      onClose();
    } catch {
      notification.error({ message: 'Error al crear solicitud' });
    }
  }

  return (
    <Modal
      title="Nueva Solicitud de Muestreo"
      open={open}
      onOk={form.submit}
      onCancel={() => {
        form.resetFields();
        onClose();
      }}
      confirmLoading={createMutation.isPending}
    >
      <Form form={form} layout="vertical" onFinish={onFinish}>
        <Form.Item
          label="Campo"
          name="campo_id"
          rules={[{ required: true, message: 'Selecciona un campo' }]}
        >
          <Select
            loading={camposQuery.isLoading}
            placeholder="Selecciona campo"
            options={(camposQuery.data ?? []).map((c) => ({
              value: c._id,
              label: `${c.codigo_campo} — ${c.nombre}`,
            }))}
          />
        </Form.Item>

        <Form.Item
          label="Asignar a (Monitor)"
          name="asignado_a"
          rules={[{ required: true, message: 'Selecciona un monitor' }]}
        >
          <Select
            loading={monitoresQuery.isLoading}
            placeholder="Selecciona monitor"
            options={(monitoresQuery.data ?? []).map((u) => ({
              value: u.id,
              label: u.email,
            }))}
          />
        </Form.Item>

        <Form.Item
          label="Mensaje / Instrucciones"
          name="mensaje"
          rules={[{ required: true, message: 'Ingresa instrucciones' }]}
        >
          <Input.TextArea rows={3} placeholder="Instrucciones para el monitor..." />
        </Form.Item>

        <Form.Item label="Fecha límite (opcional)" name="fecha_limite">
          <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
        </Form.Item>
      </Form>
    </Modal>
  );
}
