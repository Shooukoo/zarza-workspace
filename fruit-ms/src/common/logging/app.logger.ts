import { Injectable } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { traceContext } from './trace-context';

@Injectable()
export class AppLogger {
  constructor(private readonly logger: PinoLogger) {}

  info( message: string, extra: Record<string, unknown> = {}) {
    this.logger.info(
      {
        
        service:'fruit-ms',
        traceId: traceContext.getStore()?.traceId,
        ...extra,
      },
      message,
    );
  }

  warn( message: string, extra: Record<string, unknown> = {}) {
    this.logger.warn(
      {
        service:'fruit-ms',
        traceId: traceContext.getStore()?.traceId,
        ...extra,
      },
      message,
    );
  }

  error(message: string, extra: Record<string, unknown> = {}) {
    this.logger.error(
      {
        service:'fruit-ms',
        traceId: traceContext.getStore()?.traceId,
        ...extra,
      },
      message,
    );
  }

  debug( message: string, extra: Record<string, unknown> = {}) {
    this.logger.debug(
      {
        service:'fruit-ms',
        traceId: traceContext.getStore()?.traceId,
        ...extra,
      },
      message,
    );
  }
}