import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Input, Button, notification } from 'antd';
import { useAuth } from './useAuth';
import { defaultRouteForRole } from './defaultRoute';

interface LoginFormValues {
  email: string;
  password: string;
}

const T = {
  obsidian:  '#0D0221',
  obsidian2: '#160630',
  obsidian3: '#1F0A40',
  frost:     '#F5F5FA',
  frostDim:  '#C8C8D4',
  gray:      '#8A8AA0',
  grayLine:  '#2A1547',
  rubus:     '#7B00D4',
  rubusLt:   '#A030F0',
  emerald:   '#10B981',
};

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
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: T.obsidian, fontFamily: "'Lexend', sans-serif", position: 'relative', overflow: 'hidden',
    }}>
      {/* Background glow */}
      <div style={{
        position: 'absolute', top: '20%', left: '50%', transform: 'translateX(-50%)',
        width: 600, height: 600, borderRadius: '50%',
        background: `radial-gradient(circle, ${T.rubus}18 0%, transparent 70%)`,
        pointerEvents: 'none',
      }}/>

      <div style={{
        width: 400, background: 'rgba(255,255,255,0.04)',
        backdropFilter: 'blur(16px)', border: `1px solid rgba(255,255,255,0.07)`,
        borderRadius: 20, padding: '40px 36px',
        boxShadow: `0 24px 80px rgba(0,0,0,0.4), 0 0 0 1px ${T.grayLine}`,
        position: 'relative',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16, margin: '0 auto 16px',
            background: `linear-gradient(135deg, ${T.rubus}, ${T.rubusLt})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 8px 32px ${T.rubus}44`,
          }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff"
              strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2C6 2 2 9 2 14c0 3.3 2.7 6 6 6 2.2 0 4.2-1.2 5.3-3A6 6 0 0021 11c0-5-4-9-9-9z"/>
            </svg>
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: T.frost, marginBottom: 4 }}>
            rubusAI<span style={{ color: T.rubus }}>.mx</span>
          </div>
          <div style={{ fontSize: 12, color: T.gray, letterSpacing: '0.05em' }}>
            Detección inteligente. Cosecha exacta.
          </div>
        </div>

        <Form layout="vertical" onFinish={onFinish} autoComplete="off">
          <Form.Item
            label={<span style={{ color: T.frostDim, fontSize: 13 }}>Email</span>}
            name="email"
            rules={[
              { required: true, message: 'Ingresa tu email' },
              { type: 'email', message: 'Email inválido' },
            ]}
          >
            <Input
              placeholder="admin@rubus.mx"
              size="large"
              style={{ border: `1px solid ${T.grayLine}`, borderRadius: 10 }}
            />
          </Form.Item>
          <Form.Item
            label={<span style={{ color: T.frostDim, fontSize: 13 }}>Contraseña</span>}
            name="password"
            rules={[{ required: true, message: 'Ingresa tu contraseña' }]}
          >
            <Input.Password
              placeholder="Ingresa tu contraseña"
              size="large"
              autoComplete="current-password"
              style={{ border: `1px solid ${T.grayLine}`, borderRadius: 10 }}
            />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0, marginTop: 8 }}>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              block
              size="large"
              style={{
                background: `linear-gradient(135deg, ${T.rubus}, ${T.rubusLt})`,
                border: 'none', borderRadius: 12, height: 48,
                fontSize: 15, fontWeight: 600, fontFamily: "'Lexend', sans-serif",
                boxShadow: `0 6px 24px ${T.rubus}44`,
              }}
            >
              Iniciar sesión
            </Button>
          </Form.Item>
        </Form>

        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <span style={{ fontSize: 11, color: T.gray }}>
            Plataforma de inteligencia agrícola · <span style={{ color: T.emerald }}>v2.0</span>
          </span>
        </div>
      </div>
    </div>
  );
}
