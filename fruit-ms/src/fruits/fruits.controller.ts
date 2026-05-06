import { Controller, Logger } from '@nestjs/common';
import { EventPattern, MessagePattern, Payload } from '@nestjs/microservices';
import { FruitsService } from './fruits.service';
import { NuevaFrutaDto } from './dto/nueva-fruta.dto';

@Controller()
export class FruitsController {
  private readonly logger = new Logger(FruitsController.name);

  constructor(private readonly fruitsService: FruitsService) {}

  @EventPattern('nueva_fruta')
  async handleNuevaFruta(@Payload() data: NuevaFrutaDto) {
    try {
      await this.fruitsService.process(data);
    } catch (err) {
      this.logger.error(`Error procesando nueva_fruta id=${data.image_id}: ${(err as Error).message}`);
      throw err;
    }
  }

  /** Devuelve todos los análisis almacenados (paginado, 20 por página) */
  @MessagePattern('get_fruits')
  async getAll(
    @Payload() payload: {
      page?: number;
      limit?: number;
      imageId?: string;
      userId?: string;
      startDate?: string;
      endDate?: string;
      productorId?: string;
      campoIds?: string[];
    },
  ) {
    this.logger.debug(`get_fruits page=${payload.page ?? 1} limit=${payload.limit ?? 20}`);
    const sDate = payload.startDate ? new Date(payload.startDate) : undefined;

    let eDate = payload.endDate ? new Date(payload.endDate) : undefined;
    if (eDate) {
      eDate.setHours(23, 59, 59, 999);
    }

    return this.fruitsService.findAll(
      payload?.page ?? 1,
      payload?.limit ?? 20,
      payload?.imageId,
      payload?.userId,
      sDate,
      eDate,
      { productorId: payload.productorId, campoIds: payload.campoIds },
    );
  }

  /** Devuelve un análisis por su _id de MongoDB */
  @MessagePattern('get_fruit_by_id')
  async getById(@Payload() payload: { id: string; productorId?: string; campoIds?: string[] }) {
    try {
      const analysis = await this.fruitsService.findById(payload.id);
      if (payload.productorId && analysis.productor_id?.toString() !== payload.productorId) {
        return null;
      }
      if (payload.campoIds?.length && !payload.campoIds.includes(analysis.campo_id?.toString() ?? '')) {
        return null;
      }
      return analysis;
    } catch {
      return null;
    }
  }
}

