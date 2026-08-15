import axios from 'axios';
import type { AxiosRequestConfig } from 'axios';

export const apiClient = axios.create({
  baseURL: '/api/v1',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

interface RetriableConfig extends AxiosRequestConfig {
  _retry?: boolean;
}

let refreshPromise: Promise<boolean> | null = null;

// El access_token (cookie httpOnly) expira a los 15 min; sin esto cualquier
// sesión de revisión más larga empieza a fallar a mitad de trabajo con 401.
// El refresh token vive en su propia cookie httpOnly (seteada por el backend
// en /auth/login y /auth/refresh) — el navegador la manda solo, así que esto
// sobrevive recargas de página (a diferencia de guardar el token en memoria/JS).
function refreshAccessToken(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        await axios.post('/api/v1/auth/refresh', {}, { withCredentials: true });
        return true;
      } catch {
        return false;
      } finally {
        refreshPromise = null;
      }
    })();
  }
  return refreshPromise;
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config as RetriableConfig | undefined;

    if (
      error.response?.status === 401 &&
      original &&
      !original._retry &&
      !original.url?.startsWith('/auth/login')
    ) {
      original._retry = true;
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        return apiClient(original);
      }
    }

    if (error.response?.status === 401 && window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);
