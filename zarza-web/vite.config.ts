import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react()],
    server: {
      host: true,
      port: 5173,
      watch: {
        usePolling: true,
      },
      proxy: {
        '/api': {
          target: env['VITE_API_TARGET'] || 'http://localhost:3001',
          changeOrigin: true,
        },
        '/ws': {
          target: env['VITE_API_TARGET'] || 'http://localhost:3001',
          changeOrigin: true,
          ws: true,
        },
      },
    },
  };
});
