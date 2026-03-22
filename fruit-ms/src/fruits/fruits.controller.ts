import { Controller } from '@nestjs/common';
import { EventPattern, MessagePattern, Payload } from '@nestjs/microservices';
import { FruitsService } from './fruits.service';
import { NuevaFrutaDto } from './dto/nueva-fruta.dto';

@Controller()
export class FruitsController {
  constructor(private readonly fruitsService: FruitsService) {}

  @EventPattern('nueva_fruta')
  handleNuevaFruta(@Payload() data: NuevaFrutaDto) {
    this.fruitsService.process(data);
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
    },
  ) {
    console.log(`[FruitMS] get_fruits payload=`, payload);
    const sDate = payload.startDate ? new Date(payload.startDate) : undefined;
    
    let eDate = payload.endDate ? new Date(payload.endDate) : undefined;
    if (eDate) {
      // Ajustar la fecha final para incluir todo el día hasta las 23:59:59
      eDate = new Date(eDate.setHours(23, 59, 59, 999));
    }

    return this.fruitsService.findAll(
      payload?.page ?? 1,
      payload?.limit ?? 20,
      payload?.imageId,
      payload?.userId,
      sDate,
      eDate,
    );
  }

  /** Devuelve un análisis por su _id de MongoDB */
  @MessagePattern('get_fruit_by_id')
  async getById(@Payload() payload: { id: string }) {
    return this.fruitsService.findById(payload.id);
  }
}

