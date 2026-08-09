import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Input, Button, notification } from 'antd';
import { useAuth } from './useAuth';
import { defaultRouteForRole } from './defaultRoute';
import { lightTheme as T } from '../shared/lightTheme';
import loginIllustration from '../assets/login-illustration.svg';

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
        description: 'Verifica tu email y contraseña e inténtalo de nuevo.',
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="zw-login-page"
      style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: T.canvas, fontFamily: "'Lexend', sans-serif", padding: '40px 24px',
      }}
    >
      <style>{`
        .zw-login-card { width: 100%; max-width: 1180px; min-height: 640px; display: flex; }
        .zw-login-form-col { flex: 1 1 480px; padding: 56px 64px; }
        .zw-login-art-col { flex: 1 1 520px; margin: 0; }
        @media (max-width: 960px) {
          .zw-login-art-col { display: none; }
          .zw-login-form-col { flex: 1 1 100%; }
        }
        @media (max-width: 560px) {
          .zw-login-page { padding: 0 !important; }
          .zw-login-card { border-radius: 0 !important; min-height: 100vh; }
          .zw-login-form-col { padding: 40px 24px; }
        }
        .zw-cloud {
          position: absolute; border-radius: 50%; filter: blur(2px);
          background: ${T.champagne}55; pointer-events: none;
        }
        .zw-float { animation: zw-bob 6s ease-in-out infinite; }
        @keyframes zw-bob {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        @media (prefers-reduced-motion: reduce) {
          .zw-float { animation: none; }
        }
        .zw-login-submit {
          transition: transform 0.12s ease, filter 0.12s ease;
          touch-action: manipulation;
        }
        .zw-login-submit:hover { filter: brightness(1.08); }
        .zw-login-submit:active { transform: scale(0.98); }
        .zw-login-submit:focus-visible {
          outline: 2px solid ${T.brand};
          outline-offset: 3px;
        }
      `}</style>

      <div
        className="zw-login-card"
        style={{
          background: '#FFFFFF', borderRadius: 32,
          boxShadow: '0 24px 70px rgba(17,17,40,0.14)', overflow: 'hidden',
        }}
      >
        {/* ── Left: form ── */}
        <div className="zw-login-form-col" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ width: '100%', maxWidth: 360 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 48 }}>
              <span aria-hidden="true" style={{
                width: 16, height: 16, borderRadius: 5,
                background: `linear-gradient(135deg, ${T.emerald}, ${T.brand})`,
                display: 'inline-block',
              }} />
              <span style={{ fontSize: 15, fontWeight: 700, color: T.ink }}>RubusAI</span>
            </div>

            <h1 style={{
              fontSize: 38, lineHeight: 1.15, fontWeight: 700, color: T.ink,
              textWrap: 'balance', margin: '0 0 12px',
            }}>
              Hola,<br />Bienvenido de Vuelta
            </h1>
            <p style={{ fontSize: 14, color: T.gray, margin: '0 0 32px' }}>
              Ingresa tus credenciales para acceder a tu panel
            </p>

            <Form layout="vertical" onFinish={onFinish} scrollToFirstError>
              <Form.Item
                label={<span style={{ color: T.ink, fontSize: 13, fontWeight: 500 }}>Email</span>}
                name="email"
                rules={[
                  { required: true, message: 'Ingresa tu email' },
                  { type: 'email', message: 'Email inválido' },
                ]}
              >
                <Input
                  id="email"
                  name="email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  spellCheck={false}
                  autoFocus
                  placeholder="admin@rubus.mx"
                  size="large"
                  style={{ border: `1px solid ${T.grayLine}`, borderRadius: 12 }}
                />
              </Form.Item>
              <Form.Item
                label={<span style={{ color: T.ink, fontSize: 13, fontWeight: 500 }}>Contraseña</span>}
                name="password"
                rules={[{ required: true, message: 'Ingresa tu contraseña' }]}
              >
                <Input.Password
                  id="password"
                  name="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  size="large"
                  style={{ border: `1px solid ${T.grayLine}`, borderRadius: 12 }}
                />
              </Form.Item>
              <Form.Item style={{ marginBottom: 0, marginTop: 20 }}>
                <Button
                  className="zw-login-submit"
                  type="primary"
                  htmlType="submit"
                  loading={loading}
                  size="large"
                  style={{
                    background: `linear-gradient(135deg, ${T.emerald}, ${T.brand})`,
                    border: 'none', borderRadius: 12, height: 48, minWidth: 160,
                    fontSize: 15, fontWeight: 600, fontFamily: "'Lexend', sans-serif",
                    boxShadow: `0 8px 24px ${T.brand}33`,
                  }}
                >
                  {loading ? 'Iniciando sesión…' : 'Iniciar Sesión'}
                </Button>
              </Form.Item>
            </Form>

            <div style={{ marginTop: 56 }}>
              <span style={{ fontSize: 11, color: '#9CA3AF' }}>
                Plataforma de inteligencia agrícola · <span style={{ color: T.emerald, fontWeight: 600 }}>v2.0</span>
              </span>
            </div>
          </div>
        </div>

        {/* ── Right: illustration ── */}
        <div
          className="zw-login-art-col"
          style={{
            position: 'relative', borderRadius: '0 32px 32px 0', overflow: 'hidden',
            background: `radial-gradient(120% 100% at 15% 10%, ${T.champagne}40 0%, ${T.surface} 62%)`,
            borderLeft: `1px solid ${T.grayLine}`,
          }}
        >
          <div aria-hidden="true" className="zw-cloud" style={{ width: 160, height: 160, top: -50, left: -40 }} />
          <div aria-hidden="true" className="zw-cloud" style={{ width: 100, height: 100, top: 40, left: 90, opacity: 0.5 }} />
          <div aria-hidden="true" className="zw-cloud" style={{ width: 200, height: 200, bottom: -70, right: -60 }} />
          <div aria-hidden="true" className="zw-cloud" style={{ width: 90, height: 90, bottom: 60, right: 120, opacity: 0.4 }} />

          <img
            src={loginIllustration}
            alt=""
            aria-hidden="true"
            className="zw-float"
            style={{
              position: 'absolute', inset: 0, width: '100%', height: '100%',
              objectFit: 'contain', padding: 32,
            }}
          />

          <div
            aria-hidden="true"
            className="zw-float"
            style={{
              position: 'absolute', top: '18%', left: '10%',
              width: 52, height: 52, borderRadius: '50%', background: '#FFFFFF',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: `1px solid ${T.grayLine}`, boxShadow: `0 10px 24px ${T.brand}26`,
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={T.emerald} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </div>

          <div
            aria-hidden="true"
            className="zw-float"
            style={{
              position: 'absolute', bottom: '14%', right: '12%', animationDelay: '1.5s',
              width: 48, height: 48, borderRadius: 14, background: '#FFFFFF',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: `1px solid ${T.grayLine}`, boxShadow: `0 10px 24px ${T.brand}26`,
            }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={T.brand} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2l2.4 6.2L21 10l-6.2 2.4L12 19l-2.4-6.6L3 10l6.6-1.8z" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
