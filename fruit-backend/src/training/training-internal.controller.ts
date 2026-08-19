import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { TrainingService } from './training.service';
import { TrainingCompleteDto } from './dto/training-complete.dto';

@ApiExcludeController()
@Controller('internal')
export class TrainingInternalController {
  constructor(private readonly trainingService: TrainingService) {}

  @Get('training/dataset')
  async getDataset(@Headers('x-training-token') token: string) {
    this.assertToken(token);
    return this.trainingService.getDataset();
  }

  @Post('training-complete')
  @HttpCode(204)
  async trainingComplete(
    @Headers('x-training-token') token: string,
    @Body() dto: TrainingCompleteDto,
  ) {
    this.assertToken(token);
    await this.trainingService.recordTrainingComplete(dto);
  }

  private assertToken(token: string): void {
    const expected = process.env.TRAINING_INTERNAL_TOKEN;
    if (!expected || token !== expected) {
      throw new UnauthorizedException('Invalid training token');
    }
  }
}
