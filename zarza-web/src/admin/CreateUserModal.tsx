import { Modal, Form, Input, Select, notification } from 'antd';
import { useCreateUser } from './hooks/useUsers';
import { Role } from '../auth/types';

interface Props {
  open: boolean;
  onClose: () => void;
}

interface FormValues {
  email: string;
  password: string;
  role: Role;
}

const ROLE_OPTIONS = [
  { value: Role.PRODUCTOR, label: 'Productor' },
  { value: Role.AGRONOMO, label: 'Agrónomo' },
  { value: Role.MONITOR, label: 'Monitor' },
];

export function CreateUserModal({ open, onClose }: Props) {
  const [form] = Form.useForm<FormValues>();
  const createMutation = useCreateUser();

  async function onFinish(values: FormValues) {
    try {
      await createMutation.mutateAsync(values);
      notification.success({ message: 'Usuario creado exitosamente' });
      form.resetFields();
      onClose();
    } catch {
      notification.error({ message: 'Error al crear usuario' });
    }
  }

  return (
    <Modal
      title="Nuevo Usuario"
      open={open}
      onOk={form.submit}
      onCancel={() => {
        form.resetFields();
        onClose();
      }}
      confirmLoading={createMutation.isPending}
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        initialValues={{ role: Role.MONITOR }}
      >
        <Form.Item
          label="Email"
          name="email"
          rules={[
            { required: true, message: 'Ingresa el email' },
            { type: 'email', message: 'Email inválido' },
          ]}
        >
          <Input placeholder="usuario@zarza.mx" />
        </Form.Item>

        <Form.Item
          label="Contraseña"
          name="password"
          rules={[
            { required: true, message: 'Ingresa la contraseña' },
            { min: 6, message: 'Mínimo 6 caracteres' },
          ]}
        >
          <Input.Password />
        </Form.Item>

        <Form.Item
          label="Rol"
          name="role"
          rules={[{ required: true, message: 'Selecciona un rol' }]}
        >
          <Select options={ROLE_OPTIONS} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
