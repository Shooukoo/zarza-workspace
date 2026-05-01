import { Modal, Form, Input, Select, notification } from 'antd';
import { useCreateCampo, useProductores } from './hooks/useCampos';
import { useAuth } from '../auth/useAuth';
import { Role } from '../auth/types';

interface Props {
  open: boolean;
  onClose: () => void;
}

interface FormValues {
  codigo_campo: string;
  nombre: string;
  productor_id?: string;
}

export function CreateCampoModal({ open, onClose }: Props) {
  const { user } = useAuth();
  const [form] = Form.useForm<FormValues>();
  const createMutation = useCreateCampo();
  const productoresQuery = useProductores();
  const isAdmin = user?.role === Role.ADMIN;

  async function onFinish(values: FormValues) {
    const productor_id = isAdmin ? values.productor_id! : user!.sub;
    try {
      await createMutation.mutateAsync({
        codigo_campo: values.codigo_campo,
        nombre: values.nombre,
        productor_id,
      });
      notification.success({ message: 'Campo creado exitosamente' });
      form.resetFields();
      onClose();
    } catch {
      notification.error({ message: 'Error al crear campo' });
    }
  }

  return (
    <Modal
      title="Nuevo Campo / Huerta"
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
          label="Código"
          name="codigo_campo"
          rules={[{ required: true, message: 'Ingresa el código del campo' }]}
        >
          <Input placeholder="C-001" />
        </Form.Item>

        <Form.Item
          label="Nombre"
          name="nombre"
          rules={[{ required: true, message: 'Ingresa el nombre del campo' }]}
        >
          <Input placeholder="Huerta Norte" />
        </Form.Item>

        {isAdmin && (
          <Form.Item
            label="Productor"
            name="productor_id"
            rules={[{ required: true, message: 'Selecciona un productor' }]}
          >
            <Select
              loading={productoresQuery.isLoading}
              placeholder="Selecciona productor"
              options={(productoresQuery.data ?? []).map((u) => ({
                value: u.id,
                label: u.email,
              }))}
            />
          </Form.Item>
        )}
      </Form>
    </Modal>
  );
}
