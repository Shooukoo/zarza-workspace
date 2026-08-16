import { IsOptional, IsISO8601 } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class HeatmapQueryDto {
  @ApiPropertyOptional({
    description:
      'Fecha de inicio del rango (ISO 8601). Sin ella, se incluye todo el histórico.',
    example: '2026-01-01',
  })
  @IsOptional()
  @IsISO8601()
  from?: string;

  @ApiPropertyOptional({
    description:
      'Fecha de fin del rango (ISO 8601). Sin ella, se incluye todo el histórico.',
    example: '2026-12-31',
  })
  @IsOptional()
  @IsISO8601()
  to?: string;
}
