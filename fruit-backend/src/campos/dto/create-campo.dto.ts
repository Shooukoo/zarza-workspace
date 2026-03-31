import {
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsArray,
  IsNumber,
} from 'class-validator';

export class CreateCampoDto {
  @IsString()
  @IsNotEmpty()
  codigo_campo: string;

  @IsString()
  @IsNotEmpty()
  nombre: string;

  /** ObjectId del usuario con rol PRODUCTOR dueño de la huerta */
  @IsMongoId()
  productor_id: string;

  /**
   * Array de coordenadas [lon, lat] que forman el polígono de la parcela.
   * Cada elemento es [number, number]. Campo opcional en creación.
   */
  @IsOptional()
  @IsArray()
  poligono_gps?: number[][];
}
