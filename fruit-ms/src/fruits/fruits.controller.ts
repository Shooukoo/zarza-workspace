import { Controller } from '@nestjs/common';
import {
  Ctx,
  EventPattern,
  MessagePattern,
  Payload,
  RmqContext,
} from '@nestjs/microservices';
import type { Channel } from 'amqplib';
import { FruitsService } from './fruits.service';
import { NuevaFrutaDto } from './dto/nueva-fruta.dto';
import { envs } from '../config/envs';
import { traceContext } from '../common/logging/trace-context';
import { randomUUID } from 'crypto';
import { AppLogger } from '../common/logging/app.logger';
const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

@Controller()
export class FruitsController {
  constructor(
    private readonly fruitsService: FruitsService,
    private readonly logger: AppLogger,
  ) {}

  /**
   * Reintenta process() con backoff exponencial. El resultado es siempre
   * un ack o un nack explícito (noAck: false): nack sin requeue enruta el
   * mensaje al DLX fruit.dlx → cola <queue>.dlq.
   */

  @EventPattern('nueva_fruta')
  async handleNuevaFruta(
    @Payload() data: NuevaFrutaDto,
    @Ctx() context: RmqContext,
  ) {
    const traceId =
      context.getMessage().properties.headers?.['x-trace-id'] ?? randomUUID();

    return traceContext.run({ traceId }, async () => {
      this.logger.info('Mensaje recibido desde RabbitMQ', {
        imageId: data.image_id,
        storageKey: data.storage_key,
        userId: data.userId,
      });

      const channel = context.getChannelRef() as Channel;
      const originalMsg = context.getMessage() as Parameters<Channel['ack']>[0];

      const maxAttempts = envs.nuevaFrutaMaxAttempts;

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          await this.fruitsService.process(data);

          channel.ack(originalMsg);
          return;
        } catch (err) {
          const message = (err as Error).message;

          if (attempt === maxAttempts) {
            this.logger.error(
              'nueva_fruta agotó los intentos, enviando a DLQ',
              {
                imageId: data.image_id,
                attempt,
                maxAttempts,
                error: message,
              },
            );

            channel.nack(originalMsg, false, false);
            return;
          }

          const delayMs = envs.nuevaFrutaBackoffBaseMs * 4 ** (attempt - 1);

          this.logger.warn('Reintentando procesamiento de nueva_fruta', {
            imageId: data.image_id,
            attempt,
            maxAttempts,
            delayMs,
            error: message,
          });

          await sleep(delayMs);
        }
      }
    });
  }

  /** Devuelve todos los análisis almacenados (paginado, 20 por página) */
  @MessagePattern('get_fruits')
  async getAll(
    @Payload()
    payload: {
      page?: number;
      limit?: number;
      imageId?: string;
      userId?: string;
      startDate?: string;
      endDate?: string;
      productorId?: string;
      campoIds?: string[];
    },
    @Ctx() context: RmqContext,
  ) {
    try {
      this.logger.debug('Consultando análisis', {
        page: payload.page ?? 1,
        limit: payload.limit ?? 20,
      });
      const sDate = payload.startDate ? new Date(payload.startDate) : undefined;

      const eDate = payload.endDate ? new Date(payload.endDate) : undefined;
      if (eDate) {
        eDate.setHours(23, 59, 59, 999);
      }

      return await this.fruitsService.findAll(
        payload?.page ?? 1,
        payload?.limit ?? 20,
        payload?.imageId,
        payload?.userId,
        sDate,
        eDate,
        { productorId: payload.productorId, campoIds: payload.campoIds },
      );
    } finally {
      this.ackRequest(context);
    }
  }

  /** Devuelve un análisis por su _id de MongoDB */
  @MessagePattern('get_fruit_by_id')
  async getById(
    @Payload()
    payload: { id: string; productorId?: string; campoIds?: string[] },
    @Ctx() context: RmqContext,
  ) {
    try {
      const analysis = await this.fruitsService.findById(payload.id);
      if (
        payload.productorId &&
        analysis.productor_id?.toString() !== payload.productorId
      ) {
        return null;
      }
      if (
        payload.campoIds?.length &&
        !payload.campoIds.includes(analysis.campo_id?.toString() ?? '')
      ) {
        return null;
      }
      return analysis;
    } catch {
      return null;
    } finally {
      this.ackRequest(context);
    }
  }

  /** Los request-reply se ackean siempre: si fallan, el error viaja en la respuesta. */
  private ackRequest(context: RmqContext) {
    const channel = context.getChannelRef() as Channel;
    channel.ack(context.getMessage() as Parameters<Channel['ack']>[0]);
  }
}
