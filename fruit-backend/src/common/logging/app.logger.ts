import { Injectable } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { traceContext } from './trace-context';

@Injectable()
export class AppLogger {
  constructor(private readonly logger: PinoLogger) {}

  info(message: string, extra: object = {}) {
    this.logger.info(
      {
        service: 'fruit-backend',
        traceId: traceContext.getStore()?.traceId,
        ...extra,
      },
      message,
    );
  }

  warn(message: string, extra: object = {}) {
    this.logger.warn(
      {
        service: 'fruit-backend',
        traceId: traceContext.getStore()?.traceId,
        ...extra,
      },
      message,
    );
  }

  error(message: string, extra: object = {}) {
    this.logger.error(
      {
        service: 'fruit-backend',
        traceId: traceContext.getStore()?.traceId,
        ...extra,
      },
      message,
    );
  }

  debug(message: string, extra: object = {}) {
    this.logger.debug(
      {
        service: 'fruit-backend',
        traceId: traceContext.getStore()?.traceId,
        ...extra,
      },
      message,
    );
  }
}