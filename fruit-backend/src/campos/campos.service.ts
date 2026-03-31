import {
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Campo, CampoDocument, CampoHydratedDocument } from './schemas/campo.schema';
import { CreateCampoDto } from './dto/create-campo.dto';

@Injectable()
export class CamposService {
  private readonly logger = new Logger(CamposService.name);

  constructor(
    @InjectModel(Campo.name)
    private readonly campoModel: Model<CampoDocument>,
  ) {}

  async create(dto: CreateCampoDto): Promise<CampoHydratedDocument> {
    this.logger.log(`Creando campo: ${dto.codigo_campo}`);
    const campo = await this.campoModel.create({
      codigo_campo: dto.codigo_campo,
      nombre: dto.nombre,
      productor_id: new Types.ObjectId(dto.productor_id),
      poligono_gps: dto.poligono_gps ?? [],
    });
    return campo;
  }

  /**
   * Devuelve todos los campos.
   * Si se pasa `productorId`, filtra solo los campos de ese productor.
   */
  async findAll(productorId?: string): Promise<CampoDocument[]> {
    const query: any = {};
    if (productorId) {
      query.productor_id = new Types.ObjectId(productorId);
    }
    return this.campoModel.find(query).lean<CampoDocument[]>().exec();
  }

  async findById(id: string): Promise<CampoDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException(`Campo con id "${id}" no encontrado`);
    }
    const campo = await this.campoModel.findById(id).lean<CampoDocument>().exec();
    if (!campo) {
      throw new NotFoundException(`Campo con id "${id}" no encontrado`);
    }
    return campo;
  }

  async delete(id: string): Promise<void> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException(`Campo con id "${id}" no encontrado`);
    }
    const result = await this.campoModel.deleteOne({ _id: new Types.ObjectId(id) });
    if (result.deletedCount === 0) {
      throw new NotFoundException(`Campo con id "${id}" no encontrado`);
    }
    this.logger.log(`Campo eliminado: ${id}`);
  }
}
