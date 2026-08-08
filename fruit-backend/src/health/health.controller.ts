import { Controller, Get } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('Health')
@SkipThrottle()
@Controller('health')
export class HealthController {
  @Get()
  @ApiOperation({
    summary: 'Check API health',
    description: 'Returns the current health status of the API.',
  })
  @ApiResponse({
    status: 200,
    description: 'API is healthy and responding.',
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
