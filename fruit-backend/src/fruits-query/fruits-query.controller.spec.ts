import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { FruitsQueryController } from './fruits-query.controller';
import { FruitsQueryService } from './fruits-query.service';
import { I_USER_REPOSITORY } from '../auth/ports/user-repository.port';
import { Role } from '../auth/domain/enums/role.enum';

describe('FruitsQueryController — scope enforcement', () => {
  let controller: FruitsQueryController;
  let service: { findAll: jest.Mock; findOne: jest.Mock };
  let userRepo: { findById: jest.Mock };

  beforeEach(async () => {
    service = { findAll: jest.fn(), findOne: jest.fn() };
    userRepo = { findById: jest.fn() };

    const module = await Test.createTestingModule({
      controllers: [FruitsQueryController],
      providers: [
        { provide: FruitsQueryService, useValue: service },
        { provide: I_USER_REPOSITORY, useValue: userRepo },
      ],
    }).compile();

    controller = module.get(FruitsQueryController);
  });

  it('PRODUCTOR: passes productor scope to service.findAll', async () => {
    service.findAll.mockResolvedValue([]);
    const req = { user: { sub: 'prod1', role: Role.PRODUCTOR, email: 'p@test.com' } };
    await controller.findAll(req as any, 1, 20);
    expect(service.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, limit: 20 }),
      { role: Role.PRODUCTOR, sub: 'prod1' },
    );
  });

  it('MONITOR: resolves camposAsignados and passes to service.findAll', async () => {
    service.findAll.mockResolvedValue([]);
    userRepo.findById.mockResolvedValue({ id: 'mon1', camposAsignados: ['c1', 'c2'] });
    const req = { user: { sub: 'mon1', role: Role.MONITOR, email: 'm@test.com' } };
    await controller.findAll(req as any, 1, 20);
    expect(service.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, limit: 20 }),
      { role: Role.MONITOR, sub: 'mon1', camposAsignados: ['c1', 'c2'] },
    );
  });

  it('ADMIN: passes no scope restriction', async () => {
    service.findAll.mockResolvedValue([]);
    const req = { user: { sub: 'adm1', role: Role.ADMIN, email: 'a@test.com' } };
    await controller.findAll(req as any, 1, 20);
    expect(service.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, limit: 20 }),
      { role: Role.ADMIN, sub: 'adm1' },
    );
  });

  it('findOne: throws 404 when service returns null', async () => {
    service.findOne.mockResolvedValue(null);
    const req = { user: { sub: 'prod1', role: Role.PRODUCTOR, email: 'p@test.com' } };
    await expect(controller.findOne('some-id', req as any)).rejects.toThrow(NotFoundException);
  });
});
