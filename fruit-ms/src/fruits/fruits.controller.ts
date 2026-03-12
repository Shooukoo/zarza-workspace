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
  async getAll(@Payload() payload: { page?: number; limit?: number; imageId?: string }) {
    return this.fruitsService.findAll(payload?.page ?? 1, payload?.limit ?? 20, payload?.imageId);
  }

  /** Devuelve un análisis por su _id de MongoDB */
  @MessagePattern('get_fruit_by_id')
  async getById(@Payload() payload: { id: string }) {
    return this.fruitsService.findById(payload.id);
  }
}

