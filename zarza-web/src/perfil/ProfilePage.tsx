// zarza-web/src/perfil/ProfilePage.tsx
import type { CSSProperties, ReactNode } from 'react';
import { useState } from 'react';
import {
  Avatar,
  Button,
  Divider,
  Form,
  Input,
  Modal,
  Popconfirm,
  Switch,
  Tag,
  Typography,
  notification,
} from 'antd';
import {
  BarChartOutlined,
  BellOutlined,
  LockOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { useAuth } from '../auth/useAuth';
import { displayName, Role } from '../auth/types';
import {
  useChangePassword,
  useRevokeOtherSessions,
  useUpdateNotificationPreferences,
  useUpdateOwnProfile,
} from './hooks/useProfile';
import { useCampos } from '../campos/hooks/useCampos';
import { useSolicitudes } from '../solicitudes/hooks/useSolicitudes';
import { useAnalisisList } from '../analisis/useAnalisis';
import { useUsers } from '../admin/hooks/useUsers';
import { PasswordStrengthMeter } from '../shared/PasswordStrengthMeter';
import { FormLabelRow } from '../shared/FormLabelRow';
import { evaluatePassword, generatePassword } from '../shared/passwordPolicy';
import { lightTheme } from '../shared/lightTheme';
import { ROLE_TAG } from '../shared/roleTag';

const T = lightTheme;
const { Title, Text } = Typography;

interface NameFormValues {
  firstName?: string;
  lastName?: string;
}

interface PasswordFormValues {
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
}

function cardStyle(): CSSProperties {
  return {
    background: T.surface,
    borderRadius: 12,
    padding: 24,
    border: `1px solid ${T.grayLine}`,
  };
}

function sectionHeaderStyle(): CSSProperties {
  return {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  };
}

function sectionIconStyle(): CSSProperties {
  return {
    width: 28,
    height: 28,
    borderRadius: 8,
    background: T.canvas,
    color: T.brand,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  };
}

function SectionCard({
  icon,
  title,
  description,
  children,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div style={cardStyle()}>
      <div style={sectionHeaderStyle()}>
        <div style={sectionIconStyle()}>{icon}</div>
        <Text strong style={{ color: T.ink, fontSize: 14 }}>
          {title}
        </Text>
      </div>
      <Text style={{ fontSize: 12, color: T.gray }}>{description}</Text>
      <div style={{ marginTop: 16 }}>{children}</div>
    </div>
  );
}

function StatTile({
  label,
  value,
  loading,
}: {
  label: string;
  value: number;
  loading: boolean;
}) {
  return (
    <div
      style={{
        flex: '1 1 100px',
        padding: '12px 14px',
        borderRadius: 10,
        background: T.canvas,
      }}
    >
      <div style={{ fontSize: 22, fontWeight: 600, color: T.ink }}>
        {loading ? '—' : value}
      </div>
      <div style={{ fontSize: 12, color: T.gray, marginTop: 2 }}>{label}</div>
    </div>
  );
}

function initialsFor(firstName: string | null, lastName: string | null, email: string): string {
  const first = firstName?.trim()?.[0];
  const last = lastName?.trim()?.[0];
  if (first) return `${first}${last ?? ''}`.toUpperCase();
  return email.slice(0, 2).toUpperCase();
}

export function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const updateProfileMutation = useUpdateOwnProfile();
  const changePasswordMutation = useChangePassword();
  const revokeSessionsMutation = useRevokeOtherSessions();
  const notificationPrefsMutation = useUpdateNotificationPreferences();

  const [nameForm] = Form.useForm<NameFormValues>();
  const [passwordForm] = Form.useForm<PasswordFormValues>();
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [newPasswordVisible, setNewPasswordVisible] = useState(false);
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);
  const newPassword = Form.useWatch('newPassword', passwordForm);

  const isAdmin = user?.role === Role.ADMIN;
  const isProductor = user?.role === Role.PRODUCTOR;
  const isAgronomo = user?.role === Role.AGRONOMO;
  const isMonitor = user?.role === Role.MONITOR;

  const camposQuery = useCampos(isAdmin || isProductor || isAgronomo);
  const analisisQuery = useAnalisisList(
    isAgronomo ? 'pendiente' : 'all',
    1,
    1,
    isProductor || isAgronomo,
  );
  const solicitudesQuery = useSolicitudes({ limit: 1, enabled: isMonitor });
  const usersQuery = useUsers(1, undefined, isAdmin);

  const tiles: { label: string; value: number; loading: boolean }[] = [];
  if (isProductor) {
    tiles.push(
      { label: 'Campos', value: camposQuery.data?.length ?? 0, loading: camposQuery.isLoading },
      { label: 'Análisis registrados', value: analisisQuery.data?.total ?? 0, loading: analisisQuery.isLoading },
    );
  }
  if (isAgronomo) {
    tiles.push(
      { label: 'Campos asignados', value: camposQuery.data?.length ?? 0, loading: camposQuery.isLoading },
      { label: 'Análisis por validar', value: analisisQuery.data?.total ?? 0, loading: analisisQuery.isLoading },
    );
  }
  if (isMonitor) {
    tiles.push({
      label: 'Solicitudes asignadas',
      value: solicitudesQuery.data?.total ?? 0,
      loading: solicitudesQuery.isLoading,
    });
  }
  if (isAdmin) {
    tiles.push(
      { label: 'Usuarios', value: usersQuery.data?.total ?? 0, loading: usersQuery.isLoading },
      { label: 'Campos', value: camposQuery.data?.length ?? 0, loading: camposQuery.isLoading },
    );
  }

  const userInputs = [user?.email, user?.firstName, user?.lastName].filter(
    (v): v is string => Boolean(v),
  );
  const passwordEvaluation = evaluatePassword(newPassword ?? '', userInputs);

  async function handleSaveName(values: NameFormValues) {
    try {
      await updateProfileMutation.mutateAsync(values);
      await refreshUser();
      notification.success({ message: 'Datos actualizados' });
    } catch {
      notification.error({ message: 'Error al actualizar los datos' });
    }
  }

  async function handleChangePassword(values: PasswordFormValues) {
    try {
      await changePasswordMutation.mutateAsync({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      notification.success({
        message: 'Contraseña actualizada',
        description: 'Se cerraron las demás sesiones activas.',
      });
      passwordForm.resetFields();
      setPasswordModalOpen(false);
    } catch (err) {
      const backendMessage = (
        err as { response?: { data?: { message?: string | string[] } } }
      )?.response?.data?.message;
      const message = Array.isArray(backendMessage)
        ? backendMessage[0]
        : (backendMessage ?? 'Error al cambiar la contraseña');
      notification.error({ message });
    }
  }

  async function handleRevokeOtherSessions() {
    try {
      await revokeSessionsMutation.mutateAsync();
      notification.success({ message: 'Se cerraron las demás sesiones activas' });
    } catch {
      notification.error({ message: 'Error al cerrar las demás sesiones' });
    }
  }

  async function handleTogglePushNotifications(checked: boolean) {
    try {
      await notificationPrefsMutation.mutateAsync({ pushNotificationsEnabled: checked });
      await refreshUser();
    } catch {
      notification.error({ message: 'Error al actualizar la preferencia' });
    }
  }

  function handleClosePasswordModal() {
    passwordForm.resetFields();
    setNewPasswordVisible(false);
    setConfirmPasswordVisible(false);
    setPasswordModalOpen(false);
  }

  function handleGenerateNewPassword() {
    const generated = generatePassword();
    passwordForm.setFieldsValue({
      newPassword: generated,
      confirmNewPassword: generated,
    });
    setNewPasswordVisible(true);
    setConfirmPasswordVisible(true);
  }

  return (
    <div style={{ maxWidth: 1160, margin: '0 auto' }}>
      <Title level={4} style={{ color: T.ink, marginBottom: 20 }}>
        Mi perfil
      </Title>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(280px, 340px) minmax(320px, 1fr)',
          gap: 20,
          alignItems: 'start',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {user && (
            <div style={cardStyle()}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <Avatar
                  size={56}
                  style={{ background: T.brand, color: '#fff', fontSize: 18, fontWeight: 700, flexShrink: 0 }}
                >
                  {initialsFor(user.firstName, user.lastName, user.email)}
                </Avatar>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <Text
                    strong
                    style={{
                      fontSize: 16,
                      color: T.ink,
                      display: 'block',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {displayName(user)}
                  </Text>
                  <Text
                    style={{
                      fontSize: 13,
                      color: T.gray,
                      display: 'block',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {user.email}
                  </Text>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 }}>
                <Tag color={ROLE_TAG[user.role]?.color}>{ROLE_TAG[user.role]?.label ?? user.role}</Tag>
                {user.createdAt && (
                  <Text style={{ fontSize: 12, color: T.gray }}>
                    Miembro desde{' '}
                    {new Date(user.createdAt).toLocaleDateString('es-MX', {
                      month: 'long',
                      year: 'numeric',
                    })}
                  </Text>
                )}
              </div>
            </div>
          )}

          {tiles.length > 0 && (
            <SectionCard
              icon={<BarChartOutlined />}
              title="Resumen de actividad"
              description="Tu actividad dentro de la plataforma."
            >
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                {tiles.map((tile) => (
                  <StatTile key={tile.label} {...tile} />
                ))}
              </div>
            </SectionCard>
          )}

          <SectionCard
            icon={<BellOutlined />}
            title="Notificaciones"
            description="Controla los avisos push que recibes de la plataforma."
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <Text style={{ fontSize: 13, color: T.ink, display: 'block' }}>
                  Notificaciones push
                </Text>
                <Text style={{ fontSize: 12, color: T.gray }}>
                  Avisos de solicitudes, validaciones y análisis.
                </Text>
              </div>
              <Switch
                checked={user?.pushNotificationsEnabled ?? true}
                loading={notificationPrefsMutation.isPending}
                onChange={handleTogglePushNotifications}
              />
            </div>
          </SectionCard>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <SectionCard
            icon={<UserOutlined />}
            title="Datos personales"
            description="Se muestra a otros usuarios dentro de la plataforma."
          >
            <Form
              form={nameForm}
              layout="vertical"
              onFinish={handleSaveName}
              initialValues={{
                firstName: user?.firstName ?? '',
                lastName: user?.lastName ?? '',
              }}
            >
              <div style={{ display: 'flex', gap: 12 }}>
                <Form.Item name="firstName" label="Nombre" style={{ flex: 1 }}>
                  <Input placeholder="Juan" autoComplete="given-name" />
                </Form.Item>
                <Form.Item name="lastName" label="Apellido" style={{ flex: 1 }}>
                  <Input placeholder="García" autoComplete="family-name" />
                </Form.Item>
              </div>
              <Button
                htmlType="submit"
                type="primary"
                loading={updateProfileMutation.isPending}
              >
                {updateProfileMutation.isPending ? 'Guardando…' : 'Guardar datos'}
              </Button>
            </Form>
          </SectionCard>

          <SectionCard
            icon={<LockOutlined />}
            title="Seguridad"
            description="Tu contraseña y las sesiones activas de tu cuenta."
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <Text style={{ fontSize: 13, color: T.ink, display: 'block' }}>Contraseña</Text>
                <Text style={{ fontSize: 12, color: T.gray }}>
                  Cambiarla cierra las demás sesiones activas.
                </Text>
              </div>
              <Button onClick={() => setPasswordModalOpen(true)}>Cambiar contraseña</Button>
            </div>

            <Divider style={{ margin: '16px 0' }} />

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <Text style={{ fontSize: 13, color: T.ink, display: 'block' }}>
                  Sesiones activas
                </Text>
                <Text style={{ fontSize: 12, color: T.gray }}>
                  Cierra tu sesión en cualquier otro dispositivo.
                </Text>
              </div>
              <Popconfirm
                title="Cerrar otras sesiones"
                description="Se cerrará la sesión en todos los demás dispositivos. Esta sesión seguirá activa."
                okText="Cerrar otras sesiones"
                cancelText="Cancelar"
                onConfirm={handleRevokeOtherSessions}
              >
                <Button loading={revokeSessionsMutation.isPending} danger>
                  Cerrar otras sesiones
                </Button>
              </Popconfirm>
            </div>
          </SectionCard>
        </div>
      </div>

      <Modal
        open={passwordModalOpen}
        onCancel={handleClosePasswordModal}
        destroyOnClose
        width={440}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: '50%',
                border: `1px solid ${T.grayLine}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: T.ink,
                fontSize: 17,
                flexShrink: 0,
              }}
            >
              <LockOutlined />
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 600, color: T.ink }}>
                Cambiar contraseña
              </div>
              <Text style={{ fontSize: 12, color: T.gray, fontWeight: 400 }}>
                Actualízala para mayor seguridad de tu cuenta.
              </Text>
            </div>
          </div>
        }
        footer={
          <div style={{ display: 'flex', gap: 12 }}>
            <Button size="large" style={{ flex: 1 }} onClick={handleClosePasswordModal}>
              Cancelar
            </Button>
            <Button
              size="large"
              type="primary"
              style={{ flex: 1 }}
              loading={changePasswordMutation.isPending}
              disabled={!passwordEvaluation.valid}
              onClick={passwordForm.submit}
            >
              {changePasswordMutation.isPending ? 'Cambiando…' : 'Cambiar contraseña'}
            </Button>
          </div>
        }
      >
        <Divider style={{ margin: '20px 0' }} />
        <Form form={passwordForm} layout="vertical" onFinish={handleChangePassword}>
          <Form.Item
            name="currentPassword"
            label="Contraseña actual"
            rules={[{ required: true, message: 'Ingresa tu contraseña actual' }]}
          >
            <Input.Password
              size="large"
              placeholder="••••••••••"
              autoComplete="current-password"
              spellCheck={false}
            />
          </Form.Item>

          <FormLabelRow
            htmlFor="newPassword"
            label="Nueva contraseña"
            required
            action={{ label: 'Generar', onClick: handleGenerateNewPassword }}
          />
          <Form.Item
            name="newPassword"
            rules={[
              { required: true, message: 'Ingresa la nueva contraseña' },
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
            <Input.Password
              id="newPassword"
              size="large"
              placeholder="••••••••••"
              autoComplete="new-password"
              spellCheck={false}
              visibilityToggle={{ visible: newPasswordVisible, onVisibleChange: setNewPasswordVisible }}
            />
          </Form.Item>

          <FormLabelRow
            htmlFor="confirmNewPassword"
            label="Confirmar nueva contraseña"
            required
            action={{
              label: 'Limpiar',
              onClick: () => passwordForm.setFieldValue('confirmNewPassword', undefined),
            }}
          />
          <Form.Item
            name="confirmNewPassword"
            dependencies={['newPassword']}
            rules={[
              { required: true, message: 'Repite la nueva contraseña' },
              ({ getFieldValue }) => ({
                validator(_, value: string) {
                  if (!value || value === getFieldValue('newPassword')) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('Las contraseñas no coinciden'));
                },
              }),
            ]}
          >
            <Input.Password
              id="confirmNewPassword"
              size="large"
              placeholder="••••••••••"
              autoComplete="new-password"
              spellCheck={false}
              visibilityToggle={{
                visible: confirmPasswordVisible,
                onVisibleChange: setConfirmPasswordVisible,
              }}
            />
          </Form.Item>

          <PasswordStrengthMeter evaluation={passwordEvaluation} />
        </Form>
      </Modal>
    </div>
  );
}
