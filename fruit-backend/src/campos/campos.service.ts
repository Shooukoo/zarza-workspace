import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@rubus/database';
import { CreateCampoDto } from './dto/create-campo.dto';
import { AppLogger } from '../common/logging/app.logger';
import { Role } from '../auth/domain/enums/role.enum';

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

  async updatePoligono(
    id: string,
    poligonoGps: number[][],
    requester: { sub: string; role: Role },
  ) {
    assertValidPoligono(poligonoGps);

    const campo = await this.prisma.campo.findUnique({ where: { id } });
    if (!campo)
      throw new NotFoundException(`Campo con id "${id}" no encontrado`);

    if (
      requester.role === Role.PRODUCTOR &&
      campo.productorId !== requester.sub
    ) {
      throw new ForbiddenException('No sos el productor dueño de este campo');
    }

    const updated = await this.prisma.campo.update({
      where: { id },
      data: { poligonoGps },
    });

    this.logger.info('Polígono de campo actualizado', {
      campoId: id,
      points: poligonoGps.length,
    });

    return updated;
  }
}

function assertValidPoligono(points: number[][]): void {
  if (!Array.isArray(points) || points.length < 3) {
    throw new BadRequestException('El polígono debe tener al menos 3 puntos');
  }
  for (const point of points) {
    if (!Array.isArray(point) || point.length !== 2) {
      throw new BadRequestException(
        'Cada punto del polígono debe ser [longitud, latitud]',
      );
    }
    const [lng, lat] = point;
    if (typeof lng !== 'number' || lng < -180 || lng > 180) {
      throw new BadRequestException(`Longitud fuera de rango: ${lng}`);
    }
    if (typeof lat !== 'number' || lat < -90 || lat > 90) {
      throw new BadRequestException(`Latitud fuera de rango: ${lat}`);
    }
  }
}
