import { useEffect, useRef } from 'react';

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

      ws.onclose = () => {
        if (!destroyed) setTimeout(connect, 5000);
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
