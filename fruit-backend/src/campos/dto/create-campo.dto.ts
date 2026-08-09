import {
  IsUUID,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsArray,
} from 'class-validator';

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCampoDto {
  @ApiProperty({
    example: 'CAMPO-001',
    description: 'Código único que identifica el campo.',
  })
  @IsString()
  @IsNotEmpty()
  codigo_campo: string;

  @ApiProperty({
    example: 'Parcela Norte',
    description: 'Nombre del campo.',
  })
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @ApiProperty({
    example: '37f839ab-b831-4346-a2a5-cdd1ebf9c929',
    description: 'UUID del productor asociado al campo.',
  })
  @IsUUID()
  productor_id: string;

  @ApiPropertyOptional({
    example: [
      [-103.3472, 19.7023],
      [-103.3465, 19.7023],
      [-103.3465, 19.7015],
      [-103.3472, 19.7015],
    ],
    description:
      'Matriz de coordenadas [longitud, latitud] que forman el polígono del campo.',
    type: 'array',
    items: {
      type: 'array',
      items: {
        type: 'number',
      },
    },
  })
  /**
   * Array de coordenadas [lon, lat] que forman el polígono de la parcela.
   * Cada elemento es [number, number]. Campo opcional en creación.
   */
  @IsOptional()
  @IsArray()
  poligono_gps?: number[][];
}
