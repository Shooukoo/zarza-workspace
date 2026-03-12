import { IsString } from 'class-validator';

/** DTO para el cuerpo de la petición POST /analyze enviada a fruit-inference */
export class AnalyzeRequestDto {
  @IsString()
  storage_key: string;

  @IsString()
  image_id: string;
}
