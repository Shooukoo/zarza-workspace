import { Injectable, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { FastifyRequest, FastifyReply } from 'fastify';
import { traceContext } from './trace-context';

@Injectable()
export class TraceMiddleware implements NestMiddleware {
  use(req: FastifyRequest, res: FastifyReply, next: () => void) {
    const traceId =
      (req.headers['x-trace-id'] as string | undefined) ??
      randomUUID();

    traceContext.run(
      {
        traceId,
      },
      next,
    );
  }
}