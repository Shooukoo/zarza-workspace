// zarza-web/src/perfil/ProfilePage.tsx
import type { CSSProperties } from 'react';
import { Button, Divider, Form, Input, Typography, notification } from 'antd';
import { useAuth } from '../auth/useAuth';
import { useChangePassword, useUpdateOwnProfile } from './hooks/useProfile';
import { PasswordStrengthMeter } from '../shared/PasswordStrengthMeter';
import { evaluatePassword } from '../shared/passwordPolicy';
import { lightTheme } from '../shared/lightTheme';

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

function sectionStyle(): CSSProperties {
  return {
    background: T.surface,
    borderRadius: 12,
    padding: 20,
    border: `1px solid ${T.grayLine}`,
  };
}

function sectionLabelStyle(): CSSProperties {
  return {
    color: T.brand,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  };
}

export function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const updateProfileMutation = useUpdateOwnProfile();
  const changePasswordMutation = useChangePassword();

  const [nameForm] = Form.useForm<NameFormValues>();
  const [passwordForm] = Form.useForm<PasswordFormValues>();
  const newPassword = Form.useWatch('newPassword', passwordForm);

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

  return (
    <div style={{ maxWidth: 480 }}>
      <Title level={4} style={{ color: T.ink }}>
        Mi perfil
      </Title>

      <div style={sectionStyle()}>
        <Text strong style={sectionLabelStyle()}>
          Datos personales
        </Text>
        <Form
          form={nameForm}
          layout="vertical"
          onFinish={handleSaveName}
          initialValues={{
            firstName: user?.firstName ?? '',
            lastName: user?.lastName ?? '',
          }}
          style={{ marginTop: 12 }}
        >
          <div style={{ display: 'flex', gap: 8 }}>
            <Form.Item name="firstName" label="Nombre" style={{ flex: 1 }}>
              <Input placeholder="Juan" />
            </Form.Item>
            <Form.Item name="lastName" label="Apellido" style={{ flex: 1 }}>
              <Input placeholder="García" />
            </Form.Item>
          </div>
          <Button
            htmlType="submit"
            type="primary"
            loading={updateProfileMutation.isPending}
          >
            Guardar datos
          </Button>
        </Form>
      </div>

      <Divider />

      <div style={sectionStyle()}>
        <Text strong style={sectionLabelStyle()}>
          Cambiar contraseña
        </Text>
        <Form
          form={passwordForm}
          layout="vertical"
          onFinish={handleChangePassword}
          style={{ marginTop: 12 }}
        >
          <Form.Item
            name="currentPassword"
            label="Contraseña actual"
            rules={[{ required: true, message: 'Ingresa tu contraseña actual' }]}
          >
            <Input.Password placeholder="••••••••••" />
          </Form.Item>

          <Form.Item
            name="newPassword"
            label="Nueva contraseña"
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
            <Input.Password placeholder="••••••••••" />
          </Form.Item>

          <PasswordStrengthMeter evaluation={passwordEvaluation} />

          <Form.Item
            name="confirmNewPassword"
            label="Confirmar nueva contraseña"
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
            <Input.Password placeholder="••••••••••" />
          </Form.Item>

          <Button
            htmlType="submit"
            type="primary"
            loading={changePasswordMutation.isPending}
            disabled={!passwordEvaluation.valid}
          >
            Cambiar contraseña
          </Button>
        </Form>
      </div>
    </div>
  );
}
