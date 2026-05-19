import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@rubus/database';
import { CreateCampoDto } from './dto/create-campo.dto';

@Injectable()
export class CamposService {
  private readonly logger = new Logger(CamposService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateCampoDto) {
    this.logger.log(`Creando campo: ${dto.codigo_campo}`);
    return this.prisma.campo.create({
      data: {
        codigoCampo: dto.codigo_campo,
        nombre: dto.nombre,
        productorId: dto.productor_id,
        poligonoGps: dto.poligono_gps ?? [],
      },
    });
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
    if (!campo) throw new NotFoundException(`Campo con id "${id}" no encontrado`);
    return campo;
  }

  async delete(id: string): Promise<void> {
    const result = await this.prisma.campo.deleteMany({ where: { id } });
    if (result.count === 0) throw new NotFoundException(`Campo con id "${id}" no encontrado`);
    this.logger.log(`Campo eliminado: ${id}`);
  }
}
