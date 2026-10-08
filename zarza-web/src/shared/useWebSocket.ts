import { useEffect, useRef } from 'react';
import { refreshAccessToken } from '../api/client';

const WS_CLOSE_UNAUTHORIZED = 4001;

export function useWebSocket(onMessage: (event: string, data: unknown) => void) {
  const callbackRef = useRef(onMessage);
  callbackRef.current = onMessage;

  useEffect(() => {
    let destroyed = false;
    let ws: WebSocket;

    function connect() {
      if (destroyed) return;
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      ws = new WebSocket(`${protocol}//${window.location.host}/ws`);

      ws.onmessage = (e) => {
        try {
          const { event, data } = JSON.parse(e.data as string);
          callbackRef.current(event, data);
        } catch {
          // ignore malformed messages
        }
      };

      ws.onerror = () => {};

      ws.onclose = (e) => {
        if (destroyed) return;
        // 4001 = el backend rechazó la sesión (access token vencido o ausente).
        // El socket se autentica con la cookie httpOnly del handshake, así que
        // hay que renovarla antes de reintentar; si no se puede, no hay sesión
        // y reconectar solo repetiría el rechazo.
        if (e.code === WS_CLOSE_UNAUTHORIZED) {
          void refreshAccessToken().then((refreshed) => {
            if (refreshed && !destroyed) setTimeout(connect, 1000);
          });
          return;
        }
        setTimeout(connect, 5000);
      };
    }

    connect();

    return () => {
      destroyed = true;
      if (!ws) return;
      if (ws.readyState === WebSocket.CONNECTING) {
        ws.onopen = () => ws.close();
      } else {
        ws.close();
      }
    };
  }, []);
}
