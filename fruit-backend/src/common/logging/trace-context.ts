import { AsyncLocalStorage } from 'async_hooks';

export type TraceContext = {
  traceId: string;
};

export const traceContext = new AsyncLocalStorage<TraceContext>();