import { Modal, Form, Input, Select, notification } from 'antd';
import { useCreateUser } from './hooks/useUsers';
import { Role } from '../auth/types';
import { PasswordStrengthMeter } from '../shared/PasswordStrengthMeter';
import { evaluatePassword } from '../shared/passwordPolicy';

interface Props {
  open: boolean;
  onClose: () => void;
}

interface FormValues {
  email: string;
  password: string;
  role: Role;
  firstName?: string;
  lastName?: string;
}

const ROLE_OPTIONS = [
  { value: Role.PRODUCTOR, label: 'Productor' },
  { value: Role.AGRONOMO, label: 'Agrónomo' },
  { value: Role.MONITOR, label: 'Monitor' },
];

export function CreateUserModal({ open, onClose }: Props) {
  const [form] = Form.useForm<FormValues>();
  const createMutation = useCreateUser();

  const email = Form.useWatch('email', form);
  const password = Form.useWatch('password', form);
  const userInputs = [email].filter((v): v is string => Boolean(v));
  const passwordEvaluation = evaluatePassword(password ?? '', userInputs);

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
        <div style={{ display: 'flex', gap: 12 }}>
          <Form.Item label="Nombre" name="firstName" style={{ flex: 1, marginBottom: 12 }}>
            <Input placeholder="Juan" />
          </Form.Item>
          <Form.Item label="Apellido" name="lastName" style={{ flex: 1, marginBottom: 12 }}>
            <Input placeholder="García" />
          </Form.Item>
        </div>

        <Form.Item
          label="Email"
          name="email"
          rules={[
            { required: true, message: 'Ingresa el email' },
            { type: 'email', message: 'Email inválido' },
          ]}
        >
          <Input placeholder="usuario@rubus.com" />
        </Form.Item>

        <Form.Item
          label="Contraseña"
          name="password"
          rules={[
            { required: true, message: 'Ingresa la contraseña' },
            {
              validator: async (_, value: string) => {
                if (!value || evaluatePassword(value, userInputs).valid) {
                  return Promise.resolve();
                }
                return Promise.reject(
                  new Error('La contraseña no cumple los requisitos de seguridad'),
                );
              },
            },
          ]}
        >
          <Input.Password />
        </Form.Item>

        <PasswordStrengthMeter evaluation={passwordEvaluation} />

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
