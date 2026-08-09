import { Controller, Get } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('Health')
@SkipThrottle()
@Controller('health')
export class HealthController {
  @Get()
  @ApiOperation({
    summary: 'Comprobar el estado de la API',
    description: 'Devuelve el estado de salud actual de la API.',
  })
  @ApiResponse({
    status: 200,
    description: 'La API está en buen estado y responde correctamente.',
    schema: {
      example: {
        status: 'ok',
      },
    },
  })
  check() {
    return { status: 'ok' };
  }
}
