import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConfigProvider } from 'antd';
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
            token: {
              colorPrimary: '#389e0d',
              colorLink: '#389e0d',
              borderRadius: 8,
              colorBgLayout: '#f4f6f8',
              fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            },
            components: {
              Card: {
                boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
              },
              Statistic: {
                titleFontSize: 13,
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
