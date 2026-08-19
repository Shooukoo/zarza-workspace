import { IsArray, ArrayMinSize } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdatePoligonoDto {
  @ApiProperty({
    example: [
      [-103.3472, 19.7023],
      [-103.3465, 19.7023],
      [-103.3465, 19.7015],
    ],
    description:
      'Matriz de coordenadas [longitud, latitud] que forman el polígono del campo. Mínimo 3 puntos.',
    type: 'array',
    items: {
      type: 'array',
      items: { type: 'number' },
    },
  })
  @IsArray()
  @ArrayMinSize(3, { message: 'El polígono debe tener al menos 3 puntos' })
  poligono_gps: number[][];
}
