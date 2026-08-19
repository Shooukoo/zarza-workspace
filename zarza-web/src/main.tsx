import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConfigProvider, theme } from 'antd';
import esES from 'antd/locale/es_ES';
import { AuthProvider } from './auth/AuthContext';
import { App } from './App';
import { lightTheme } from './shared/lightTheme';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* Los flags v7_startTransition y v7_relativeSplatPath eran opt-ins de v6:
        en react-router v7 son el comportamiento por defecto y la prop ya no existe. */}
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <ConfigProvider
          locale={esES}
          theme={{
            algorithm: theme.defaultAlgorithm,
            token: {
              colorPrimary: lightTheme.brand,
              colorBgContainer: lightTheme.surface,
              colorBorder: lightTheme.grayLine,
              colorText: lightTheme.ink,
              colorSuccess: lightTheme.emerald,
              colorWarning: lightTheme.warn,
              colorError: lightTheme.danger,
              borderRadius: 12,
              fontFamily: "'Lexend', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
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
