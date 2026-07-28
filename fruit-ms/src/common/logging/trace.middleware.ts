import { Injectable, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { traceContext } from './trace-context';

@Injectable()
export class TraceMiddleware implements NestMiddleware {
  use(req: any, res: any, next: () => void) {
    const traceId =
      (req.headers?.['x-trace-id'] as string | undefined) ??
      randomUUID();

    traceContext.run(
      {
        traceId,
      },
      next,
    );
  }
}