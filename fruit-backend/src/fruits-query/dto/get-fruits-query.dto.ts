import { IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class GetFruitsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Filtrar frutas por ID de imagen.',
    example: 'IMG_20260807_153000.jpg',
  })
  @IsOptional()
  @IsString()
  image_id?: string;

  @ApiPropertyOptional({
    description: 'Filtrar frutas por ID de usuario.',
    example: '37f839ab-b831-4346-a2a5-cdd1ebf9c929',
  })
  @IsOptional()
  @IsString()
  user_id?: string;

  @ApiPropertyOptional({
    description: 'Filtra las frutas a partir de esta fecha.',
    example: '2026-08-01',
  })
  @IsOptional()
  @IsString()
  start_date?: string;

  @ApiPropertyOptional({
    description: 'Filtrar las frutas hasta esta fecha.',
    example: '2026-08-07',
  })
  @IsOptional()
  @IsString()
  end_date?: string;
}
