import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConfigProvider, theme } from 'antd';
import esES from 'antd/locale/es_ES';
import { AuthProvider } from './auth/AuthContext';
import { App } from './App';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <QueryClientProvider client={queryClient}>
        <ConfigProvider
          locale={esES}
          theme={{
            algorithm: theme.darkAlgorithm,
            token: {
              colorPrimary: '#7B00D4',
              colorLink: '#A030F0',
              colorBgBase: '#0D0221',
              colorBgLayout: '#0D0221',
              colorBgContainer: '#160630',
              colorBgElevated: '#1F0A40',
              colorBorder: '#2A1547',
              colorBorderSecondary: '#2A1547',
              colorText: '#F5F5FA',
              colorTextSecondary: '#C8C8D4',
              colorTextTertiary: '#8A8AA0',
              colorSuccess: '#10B981',
              colorWarning: '#F59E0B',
              colorError: '#EF4444',
              borderRadius: 12,
              fontFamily: "'Lexend', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            },
            components: {
              Card: {
                colorBgContainer: 'rgba(255,255,255,0.04)',
              },
              Table: {
                colorBgContainer: '#160630',
                headerBg: '#1F0A40',
                headerColor: '#C8C8D4',
                rowHoverBg: 'rgba(123,0,212,0.08)',
                borderColor: '#2A1547',
                headerSplitColor: '#2A1547',
              },
              Modal: {
                contentBg: '#160630',
                headerBg: '#160630',
              },
              Drawer: {
                colorBgElevated: '#160630',
              },
              Select: {
                colorBgContainer: '#1F0A40',
              },
              Input: {
                colorBgContainer: '#1F0A40',
              },
              DatePicker: {
                colorBgContainer: '#1F0A40',
              },
            },
          }}
        >
          <AuthProvider>
            <App />
          </AuthProvider>
        </ConfigProvider>
      </QueryClientProvider>
    </BrowserRouter>
  </StrictMode>,
);
