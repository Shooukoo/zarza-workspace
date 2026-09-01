import { useEffect, useState } from 'react';
import {
  Button,
  Checkbox,
  Divider,
  Drawer,
  Form,
  Input,
  notification,
  Popconfirm,
  Select,
  Typography,
} from 'antd';
import { useCampos } from '../campos/hooks/useCampos';
import {
  useDeleteUser,
  useUpdateCampos,
  useUpdateName,
  useUpdatePassword,
  useUpdateRole,
} from './hooks/useUsers';
import { useAuth } from '../auth/useAuth';
import { Role } from '../auth/types';
import type { User } from './types';
import { PasswordStrengthMeter } from '../shared/PasswordStrengthMeter';
import { evaluatePassword } from '../shared/passwordPolicy';

const { Text } = Typography;

interface Props {
  user: User | null;
  open: boolean;
  onClose: () => void;
}

const ROLE_OPTIONS = [
  { value: Role.PRODUCTOR, label: 'Productor' },
  { value: Role.AGRONOMO, label: 'Agrónomo' },
  { value: Role.MONITOR, label: 'Monitor' },
];

export function UserDrawer({ user, open, onClose }: Props) {
  const { user: authUser } = useAuth();
  const camposQuery = useCampos();
  const updateRoleMutation = useUpdateRole();
  const updateCamposMutation = useUpdateCampos();
  const updateNameMutation = useUpdateName();
  const updatePasswordMutation = useUpdatePassword();
  const deleteUserMutation = useDeleteUser();

  const [selectedRole, setSelectedRole] = useState<Role>(Role.MONITOR);
  const [selectedCampos, setSelectedCampos] = useState<string[]>([]);
  const [passwordForm] = Form.useForm<{ password: string }>();
  const [nameForm] = Form.useForm<{ firstName?: string; lastName?: string }>();

  const watchedPassword = Form.useWatch('password', passwordForm);
  const passwordUserInputs = user?.email ? [user.email] : [];
  const passwordEvaluation = evaluatePassword(watchedPassword ?? '', passwordUserInputs);

  useEffect(() => {
    if (user) {
      setSelectedRole(user.role);
      setSelectedCampos(user.campos_asignados ?? []);
      nameForm.setFieldsValue({ firstName: user.firstName ?? '', lastName: user.lastName ?? '' });
    }
  }, [user, nameForm]);

  async function handleSaveName(values: { firstName?: string; lastName?: string }) {
    if (!user) return;
    try {
      await updateNameMutation.mutateAsync({ id: user.id, ...values });
      notification.success({ message: 'Nombre actualizado' });
    } catch {
      notification.error({ message: 'Error al actualizar nombre' });
    }
  }

  async function handleSaveRole() {
    if (!user) return;
    try {
      await updateRoleMutation.mutateAsync({ id: user.id, role: selectedRole });
      notification.success({ message: 'Rol actualizado' });
    } catch {
      notification.error({ message: 'Error al actualizar rol' });
    }
  }

  async function handleSaveCampos() {
    if (!user) return;
    try {
      await updateCamposMutation.mutateAsync({
        id: user.id,
        campos_ids: selectedCampos,
      });
      notification.success({ message: 'Campos actualizados' });
    } catch {
      notification.error({ message: 'Error al actualizar campos' });
    }
  }

  async function handleSavePassword(values: { password: string }) {
    if (!user) return;
    try {
      await updatePasswordMutation.mutateAsync({
        id: user.id,
        password: values.password,
      });
      notification.success({ message: 'Contraseña actualizada' });
      passwordForm.resetFields();
    } catch {
      notification.error({ message: 'Error al actualizar contraseña' });
    }
  }

  async function handleDelete() {
    if (!user) return;
    try {
      await deleteUserMutation.mutateAsync(user.id);
      notification.success({ message: 'Usuario eliminado' });
      onClose();
    } catch {
      notification.error({ message: 'Error al eliminar usuario' });
    }
  }

  const isSelf = user?.id === authUser?.sub;

  return (
    <Drawer
      title={user?.email ?? ''}
      open={open}
      onClose={onClose}
      width={380}
      destroyOnClose
    >
      {user && (
        <>
          {/* Sección ① — Nombre */}
          <div>
            <Text strong style={{ color: '#722ed1', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              ① Nombre
            </Text>
            <Form form={nameForm} layout="vertical" onFinish={handleSaveName} style={{ marginTop: 8 }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <Form.Item name="firstName" label="Nombre" style={{ flex: 1, marginBottom: 8 }}>
                  <Input placeholder="Juan" />
                </Form.Item>
                <Form.Item name="lastName" label="Apellido" style={{ flex: 1, marginBottom: 8 }}>
                  <Input placeholder="García" />
                </Form.Item>
              </div>
              <Button
                htmlType="submit"
                type="primary"
                block
                loading={updateNameMutation.isPending}
                style={{ background: '#722ed1', borderColor: '#722ed1' }}
              >
                Guardar nombre
              </Button>
            </Form>
          </div>

          <Divider />

          {/* Sección ② — Rol */}
          <div>
            <Text
              strong
              style={{
                color: '#389e0d',
                fontSize: 11,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
            >
              ② Rol
            </Text>
            <div style={{ marginTop: 8 }}>
              <Select
                value={selectedRole}
                onChange={setSelectedRole}
                options={ROLE_OPTIONS}
                style={{ width: '100%', marginBottom: 8 }}
              />
              <Button
                type="primary"
                block
                loading={updateRoleMutation.isPending}
                onClick={handleSaveRole}
              >
                Guardar rol
              </Button>
            </div>
          </div>

          <Divider />

          {/* Sección ② — Campos asignados */}
          <div>
            <Text
              strong
              style={{
                color: '#1890ff',
                fontSize: 11,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
            >
              ③ Campos asignados
            </Text>
            <div style={{ marginTop: 8 }}>
              {!camposQuery.isLoading && (camposQuery.data?.length ?? 0) === 0 ? (
                <Text type="secondary">No hay campos registrados</Text>
              ) : (
                <Checkbox.Group
                  value={selectedCampos}
                  onChange={(vals) => setSelectedCampos(vals as string[])}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                    marginBottom: 8,
                  }}
                  options={(camposQuery.data ?? []).map((c) => ({
                    value: c.id,
                    label: `${c.codigoCampo} — ${c.nombre}`,
                  }))}
                />
              )}
              <Button
                block
                loading={updateCamposMutation.isPending}
                onClick={handleSaveCampos}
                style={{
                  marginTop: 4,
                  background: '#1890ff',
                  borderColor: '#1890ff',
                  color: '#fff',
                }}
              >
                Guardar campos
              </Button>
            </div>
          </div>

          <Divider />

          {/* Sección ③ — Zona de riesgo */}
          <div>
            <Text
              strong
              style={{
                color: '#cf1322',
                fontSize: 11,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
            >
              ④ Zona de riesgo
            </Text>
            <Form
              form={passwordForm}
              layout="vertical"
              onFinish={handleSavePassword}
              style={{ marginTop: 8 }}
            >
              <Form.Item
                name="password"
                label="Nueva contraseña"
                rules={[
                  { required: true, message: 'Ingresa la contraseña' },
                  {
                    validator: async (_, value: string) => {
                      if (!value || evaluatePassword(value, passwordUserInputs).valid) {
                        return Promise.resolve();
                      }
                      return Promise.reject(
                        new Error('La contraseña no cumple los requisitos de seguridad'),
                      );
                    },
                  },
                ]}
              >
                <Input.Password placeholder="••••••" />
              </Form.Item>
              <PasswordStrengthMeter evaluation={passwordEvaluation} />
              <Button
                htmlType="submit"
                block
                loading={updatePasswordMutation.isPending}
                style={{
                  marginBottom: 8,
                  borderColor: '#cf1322',
                  color: '#cf1322',
                }}
              >
                Guardar contraseña
              </Button>
            </Form>

            {!isSelf && (
              <Popconfirm
                title="¿Eliminar este usuario?"
                description="Esta acción no se puede deshacer."
                okText="Sí, eliminar"
                cancelText="Cancelar"
                okButtonProps={{ danger: true }}
                onConfirm={handleDelete}
              >
                <Button danger block loading={deleteUserMutation.isPending}>
                  Eliminar usuario
                </Button>
              </Popconfirm>
            )}
          </div>
        </>
      )}
    </Drawer>
  );
}
