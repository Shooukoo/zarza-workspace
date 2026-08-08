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
    description: 'Unique code identifying the field.',
  })
  @IsString()
  @IsNotEmpty()
  codigo_campo: string;

  @ApiProperty({
    example: 'Parcela Norte',
    description: 'Name of the field.',
  })
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @ApiProperty({
    example: '37f839ab-b831-4346-a2a5-cdd1ebf9c929',
    description: 'UUID of the producer associated with the field.',
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
      'Array of [longitude, latitude] coordinates forming the field polygon.',
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
