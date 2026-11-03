import Redis from 'ioredis';
import { createRedisClient } from './cache.module';

jest.mock('ioredis');

const RedisMock = Redis as unknown as jest.Mock;

describe('createRedisClient', () => {
  const connect = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    connect.mockResolvedValue(undefined);
    RedisMock.mockImplementation(() => ({ connect }));
  });

  it('inicia connect() una vez con la URL y las opciones fail-fast', () => {
    createRedisClient('redis://x:6379');

    expect(RedisMock).toHaveBeenCalledWith(
      'redis://x:6379',
      expect.objectContaining({
        lazyConnect: true,
        enableOfflineQueue: false,
        maxRetriesPerRequest: 1,
        retryStrategy: expect.any(Function),
      }),
    );
    const { retryStrategy } = RedisMock.mock.calls[0][1] as {
      retryStrategy: (times: number) => number;
    };
    expect([1, 4, 20].map(retryStrategy)).toEqual([500, 2000, 5000]);
    expect(connect).toHaveBeenCalledTimes(1);
  });

  it('no lanza ni deja un rechazo sin manejar si connect() falla', async () => {
    connect.mockRejectedValue(new Error('x'));
    const onUnhandled = jest.fn();
    process.on('unhandledRejection', onUnhandled);

    expect(() => createRedisClient('redis://x:6379')).not.toThrow();
    await new Promise(setImmediate);

    process.off('unhandledRejection', onUnhandled);
    expect(onUnhandled).not.toHaveBeenCalled();
  });

  it('devuelve la instancia creada por el constructor', () => {
    const instance = { connect };
    RedisMock.mockImplementation(() => instance);

    expect(createRedisClient('redis://x:6379')).toBe(instance);
  });
});
