import { Injectable, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { Role } from '../auth/domain/enums/role.enum';
import { type UserScope } from '../auth/domain/types/user-scope.type';

type FindAllParams = {
  page: number;
  limit: number;
  imageId?: string;
  startDate?: string;
  endDate?: string;
};

@Injectable()
export class FruitsQueryService {
  constructor(
    @Inject('FRUITS_SERVICE')
    private readonly fruitsClient: ClientProxy,
  ) {}

  async findAll(params: FindAllParams, scope: UserScope) {
    const payload: Record<string, unknown> = { ...params };
    if (scope.role === Role.PRODUCTOR) payload.productorId = scope.sub;
    if (scope.role === Role.MONITOR) payload.campoIds = scope.camposAsignados;
    return firstValueFrom(this.fruitsClient.send('get_fruits', payload));
  }

  async findOne(id: string, scope: UserScope) {
    const payload: Record<string, unknown> = { id };
    if (scope.role === Role.PRODUCTOR) payload.productorId = scope.sub;
    if (scope.role === Role.MONITOR) payload.campoIds = scope.camposAsignados;
    return firstValueFrom(this.fruitsClient.send('get_fruit_by_id', payload));
  }
}
