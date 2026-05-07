import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Input, Button, Card, Typography, notification } from 'antd';
import { useAuth } from './useAuth';
import { defaultRouteForRole } from './defaultRoute';

const { Title } = Typography;

interface LoginFormValues {
  email: string;
  password: string;
}

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  async function onFinish(values: LoginFormValues) {
    setLoading(true);
    try {
      const loggedUser = await login(values.email, values.password);
      navigate(defaultRouteForRole(loggedUser.role), { replace: true });
    } catch {
      notification.error({
        message: 'Credenciales incorrectas',
        description: 'Verifica tu email y contraseña.',
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #e8f5e1 0%, #f0f7eb 40%, #f4f6f8 100%)',
      }}
    >
      <Card
        style={{
          width: 400,
          boxShadow: '0 8px 32px rgba(56,158,13,0.12)',
          border: '1px solid #d9f0c8',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>🌿</div>
          <Title level={3} style={{ margin: 0, color: '#389e0d' }}>
            Zarza AI
          </Title>
          <Typography.Text type="secondary" style={{ fontSize: 13 }}>
            Plataforma de agricultura de precisión
          </Typography.Text>
        </div>

        <Form layout="vertical" onFinish={onFinish} autoComplete="off">
          <Form.Item
            label="Email"
            name="email"
            rules={[
              { required: true, message: 'Ingresa tu email' },
              { type: 'email', message: 'Email inválido' },
            ]}
          >
            <Input placeholder="admin@zarza.io" size="large" />
          </Form.Item>
          <Form.Item
            label="Contraseña"
            name="password"
            rules={[{ required: true, message: 'Ingresa tu contraseña' }]}
          >
            <Input.Password size="large" />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0 }}>
            <Button type="primary" htmlType="submit" loading={loading} block size="large">
              Iniciar sesión
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
