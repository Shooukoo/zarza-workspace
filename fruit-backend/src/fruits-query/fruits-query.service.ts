import { Injectable, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class FruitsQueryService {
  constructor(
    @Inject('FRUITS_SERVICE')
    private readonly fruitsClient: ClientProxy,
  ) {}

  async findAll(page: number, limit: number, imageId?: string, userId?: string, startDate?: string, endDate?: string) {
    return firstValueFrom(
      this.fruitsClient.send('get_fruits', { page, limit, imageId, userId, startDate, endDate }),
    );
  }

  async findById(id: string) {
    return firstValueFrom(
      this.fruitsClient.send('get_fruit_by_id', { id }),
    );
  }
}
