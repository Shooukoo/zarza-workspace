import { connect } from 'amqplib';
import {
  DLX_NAME,
  deadLetterQueueArguments,
  dlqName,
  setupDeadLetterTopology,
} from './rabbitmq-topology';

jest.mock('amqplib', () => ({ connect: jest.fn() }));

describe('rabbitmq-topology', () => {
  it('dlqName y deadLetterQueueArguments derivan del nombre de la cola', () => {
    expect(dlqName('ingestion_queue')).toBe('ingestion_queue.dlq');
    expect(deadLetterQueueArguments('ingestion_queue')).toEqual({
      'x-dead-letter-exchange': 'fruit.dlx',
      'x-dead-letter-routing-key': 'ingestion_queue.dlq',
    });
  });

  describe('setupDeadLetterTopology', () => {
    let channel: any;

    let connection: any;

    beforeEach(() => {
      channel = {
        assertExchange: jest.fn().mockResolvedValue(undefined),
        assertQueue: jest.fn().mockResolvedValue(undefined),
        bindQueue: jest.fn().mockResolvedValue(undefined),
        close: jest.fn().mockResolvedValue(undefined),
      };
      connection = {
        createChannel: jest.fn().mockResolvedValue(channel),
        close: jest.fn().mockResolvedValue(undefined),
      };

      (connect as jest.Mock).mockResolvedValue(connection);
    });

    it('declara exchange, DLQ y binding, y cierra la conexión', async () => {
      await setupDeadLetterTopology('amqp://localhost', 'ingestion_queue');

      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(channel.assertExchange).toHaveBeenCalledWith(DLX_NAME, 'direct', {
        durable: true,
      });
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(channel.assertQueue).toHaveBeenCalledWith('ingestion_queue.dlq', {
        durable: true,
      });
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(channel.bindQueue).toHaveBeenCalledWith(
        'ingestion_queue.dlq',
        DLX_NAME,
        'ingestion_queue.dlq',
      );
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(connection.close).toHaveBeenCalled();
    });

    it('cierra la conexión aunque la declaración falle', async () => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-unsafe-call
      channel.assertExchange.mockRejectedValue(new Error('boom'));

      await expect(
        setupDeadLetterTopology('amqp://localhost', 'q'),
      ).rejects.toThrow('boom');
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(connection.close).toHaveBeenCalled();
    });
  });
});
