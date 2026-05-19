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
  useUpdatePassword,
  useUpdateRole,
} from './hooks/useUsers';
import { useAuth } from '../auth/useAuth';
import { Role } from '../auth/types';
import type { User } from './types';

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
  const updatePasswordMutation = useUpdatePassword();
  const deleteUserMutation = useDeleteUser();

  const [selectedRole, setSelectedRole] = useState<Role>(Role.MONITOR);
  const [selectedCampos, setSelectedCampos] = useState<string[]>([]);
  const [passwordForm] = Form.useForm<{ password: string }>();

  useEffect(() => {
    if (user) {
      setSelectedRole(user.role);
      setSelectedCampos(user.campos_asignados ?? []);
    }
  }, [user]);

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
          {/* Sección ① — Rol */}
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
              ① Rol
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
              ② Campos asignados
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
              ③ Zona de riesgo
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
                  { min: 6, message: 'Mínimo 6 caracteres' },
                ]}
              >
                <Input.Password placeholder="••••••" />
              </Form.Item>
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
