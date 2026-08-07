import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@rubus/database';
import { CreateCampoDto } from './dto/create-campo.dto';
import { AppLogger } from '../common/logging/app.logger';

@Injectable()
export class CamposService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: AppLogger,
  ) {}

  async create(dto: CreateCampoDto) {
    const campo = await this.prisma.campo.create({
      data: {
        codigoCampo: dto.codigo_campo,
        nombre: dto.nombre,
        productorId: dto.productor_id,
        poligonoGps: dto.poligono_gps ?? [],
      },
    });

    this.logger.info('Campo creado', {
      campoId: campo.id,
      codigoCampo: campo.codigoCampo,
    });

    return campo;
  }

  async findAll(productorId?: string) {
    return this.prisma.campo.findMany({
      where: productorId ? { productorId } : undefined,
      include: { productor: { select: { id: true, email: true } } },
    });
  }

  async findByIds(ids: string[]) {
    if (!ids.length) return [];
    return this.prisma.campo.findMany({ where: { id: { in: ids } } });
  }

  async findById(id: string) {
    const campo = await this.prisma.campo.findUnique({ where: { id } });
    if (!campo)
      throw new NotFoundException(`Campo con id "${id}" no encontrado`);
    return campo;
  }

  async delete(id: string): Promise<void> {
    const result = await this.prisma.campo.deleteMany({ where: { id } });
    if (result.count === 0)
      throw new NotFoundException(`Campo con id "${id}" no encontrado`);
    this.logger.info('Campo eliminado', {
      campoId: id,
    });
  }
}
