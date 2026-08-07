import { Injectable, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { traceContext } from './trace-context';

function isValidTraceId(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
  );
}

@Injectable()
export class TraceMiddleware implements NestMiddleware {
  use(req: any, res: any, next: () => void) {
    const incoming = req.headers?.['x-trace-id'] as string | undefined;

    const traceId = isValidTraceId(incoming) ? incoming : randomUUID();

    traceContext.run(
      {
        traceId,
      },
      next,
    );
  }
}
