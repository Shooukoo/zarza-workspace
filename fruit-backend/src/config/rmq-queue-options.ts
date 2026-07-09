import { envs } from './envs';

/**
 * Opciones de declaración de la cola de fruit-ms. Los argumentos DLX deben
 * coincidir exactamente con fruit-ms/src/config/rabbitmq-topology.ts:
 * RabbitMQ rechaza con PRECONDITION_FAILED cualquier redeclaración distinta.
 */
export const fruitsQueueOptions = {
  durable: true,
  arguments: {
    'x-dead-letter-exchange': 'fruit.dlx',
    'x-dead-letter-routing-key': `${envs.rabbitmqQueue}.dlq`,
  },
};
