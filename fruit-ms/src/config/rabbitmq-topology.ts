import { Logger } from '@nestjs/common';
import { connect } from 'amqplib';

export const DLX_NAME = 'fruit.dlx';

export const dlqName = (queue: string) => `${queue}.dlq`;

/**
 * Argumentos de declaración de la cola principal. Deben coincidir exactamente
 * con los que usan los clientes RMQ de fruit-backend (ingestion y fruits-query):
 * RabbitMQ rechaza con PRECONDITION_FAILED cualquier redeclaración distinta.
 */
export const deadLetterQueueArguments = (queue: string) => ({
  'x-dead-letter-exchange': DLX_NAME,
  'x-dead-letter-routing-key': dlqName(queue),
});

/**
 * Declara la topología de dead-lettering: exchange fruit.dlx (direct, durable),
 * cola <queue>.dlq (durable) y su binding. Idempotente: assert* no falla si
 * los recursos ya existen con los mismos parámetros.
 */
export async function setupDeadLetterTopology(
  url: string,
  queue: string,
): Promise<void> {
  const logger = new Logger('RabbitTopology');
  const connection = await connect(url);
  try {
    const channel = await connection.createChannel();
    await channel.assertExchange(DLX_NAME, 'direct', { durable: true });
    await channel.assertQueue(dlqName(queue), { durable: true });
    await channel.bindQueue(dlqName(queue), DLX_NAME, dlqName(queue));
    await channel.close();
    logger.log(`Topología DLX lista: ${DLX_NAME} → ${dlqName(queue)}`);
  } finally {
    await connection.close();
  }
}
