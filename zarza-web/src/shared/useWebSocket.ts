import { useEffect, useRef } from 'react';

export function useWebSocket(onMessage: (event: string, data: unknown) => void) {
  const callbackRef = useRef(onMessage);
  callbackRef.current = onMessage;

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);

    ws.onmessage = (e) => {
      try {
        const { event, data } = JSON.parse(e.data as string);
        callbackRef.current(event, data);
      } catch {
        // ignore malformed messages
      }
    };

    return () => ws.close();
  }, []);
}
