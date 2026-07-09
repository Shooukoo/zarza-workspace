# Reintentos y Dead Letter Exchange para `nueva_fruta` — Diseño

**Fecha:** 2026-07-09
**Alcance:** `fruit-ms` (consumidor RMQ), `fruit-backend` (publicador de ingestion), topología RabbitMQ.

## Problema

Si `fruit-ms` falla al procesar un evento `nueva_fruta` (fruit-inference caído, timeout, error de DB), el mensaje se pierde sin dejar rastro. Dos causas concretas en el código actual:

1. El transporte RMQ de `fruit-ms` usa la config por defecto de NestJS (`noAck: true`): el broker considera el mensaje entregado en cuanto lo despacha, antes de que el handler termine. Lanzar una excepción en el handler no lo devuelve a la cola.
2. `FruitsService.process()` se traga los errores de inferencia y de persistencia (`catch` + `log` + `return`), así que el `throw` del controller nunca llega a ejecutarse de todas formas.

Además, el publicador de `fruit-backend` emite mensajes no persistentes sobre una cola durable: un reinicio del broker también pierde los mensajes encolados.

## Decisiones

1. **Estrategia de reintentos:** in-process con backoff exponencial dentro del handler (3 intentos, esperas de 2 s y 8 s entre intentos). Se descartó la cola de retry con TTL (más infraestructura de la que el volumen justifica) y la quorum queue con `x-delivery-limit` (reintentos inmediatos sin backoff, inútiles cuando fruit-inference tarda en recuperarse).
2. **Topología declarada en código:** los argumentos DLX van en `queueOptions` de `fruit-ms` y la declaración del exchange/cola de muertos se hace con `amqplib` (ya es dependencia directa) en el bootstrap. Se descartó la policy de RabbitMQ porque los entornos permiten recrear la cola y así todo queda versionado.
3. **Recuperación manual:** la DLQ se inspecciona y se re-publica manualmente vía RabbitMQ Management UI. No se construye tooling de replay por ahora.

## Topología RabbitMQ

- Exchange `fruit.dlx` — tipo `direct`, durable.
- Cola `<RABBITMQ_QUEUE>.dlq` — durable, sin TTL (los mensajes muertos esperan inspección indefinidamente).
- Binding: `fruit.dlx` → `<RABBITMQ_QUEUE>.dlq` con routing key `<RABBITMQ_QUEUE>.dlq`.
- La cola principal `<RABBITMQ_QUEUE>` se declara con argumentos:
  - `x-dead-letter-exchange: fruit.dlx`
  - `x-dead-letter-routing-key: <RABBITMQ_QUEUE>.dlq`

La declaración de `fruit.dlx`, la DLQ y el binding se ejecuta en `main.ts` de `fruit-ms` (helper `setupDeadLetterTopology()` en `src/config/` o similar) con una conexión `amqplib` efímera, antes de `startAllMicroservices()`. Las operaciones son idempotentes (`assertExchange`/`assertQueue`/`bindQueue`).

Los mensajes que llegan a la DLQ conservan el payload original más el header `x-death` que añade RabbitMQ (cola de origen, motivo `rejected`, timestamp), suficiente para saber qué imágenes no se procesaron y cuándo.

## `fruit-ms` — transporte y handlers

### `main.ts`

```ts
options: {
  urls: [envs.rabbitmqUrl],
  queue: envs.rabbitmqQueue,
  noAck: false,
  prefetchCount: 5,
  queueOptions: {
    durable: true,
    arguments: {
      'x-dead-letter-exchange': 'fruit.dlx',
      'x-dead-letter-routing-key': `${envs.rabbitmqQueue}.dlq`,
    },
  },
},
```

`prefetchCount: 5` es deliberado: la misma cola sirve `nueva_fruta` y los request-reply `get_fruits`/`get_fruit_by_id`. Con prefetch 1, un mensaje en backoff (hasta ~10 s de esperas + hasta 3 llamadas de inferencia) bloquearía las queries del dashboard; con 5, otros mensajes siguen fluyendo mientras uno reintenta.

### `FruitsController.handleNuevaFruta`

- Firma: `(@Payload() data: NuevaFrutaDto, @Ctx() context: RmqContext)`.
- Bucle de hasta `maxAttempts` (3) llamadas a `fruitsService.process(data)`:
  - Éxito → `channel.ack(originalMsg)` y fin.
  - Fallo → log de warning con `image_id`, número de intento y mensaje de error; espera `BACKOFF_BASE_MS * 4^(intento-1)` (2 s, 8 s con los defaults) y reintenta.
  - Agotados los intentos → `channel.nack(originalMsg, false, false)` (sin requeue → dead-letter) y log de error con `image_id` y el último error.
- El handler nunca relanza la excepción: el resultado siempre es ack o nack explícito.

### `get_fruits` y `get_fruit_by_id`

Con `noAck: false` el ack manual es obligatorio en todos los handlers de la cola. Ambos reciben `@Ctx()` y hacen `channel.ack(originalMsg)` en un `finally`, sin reintentos (son request-reply: si fallan, el error viaja en la respuesta y el requester decide).

### `FruitsService.process()`

Los `catch` de inferencia (paso 1) y de persistencia (paso 3) dejan de tragar el error: loguean y **relanzan**. La notificación WebSocket al backend (paso 4) sigue siendo no-crítica y mantiene su catch silencioso.

Reintentar `process()` completo es seguro:

- La inferencia es stateless; re-ejecutarla solo cuesta compute.
- El guardado solo se reintenta si falló (un guardado exitoso no lanza y por tanto no se reintenta), así que no genera duplicados.

## Configuración

Nuevas variables en `fruit-ms/src/config/envs.ts`, opcionales con default:

| Variable | Default | Uso |
|---|---|---|
| `NUEVA_FRUTA_MAX_ATTEMPTS` | `3` | Intentos totales antes de dead-letter |
| `NUEVA_FRUTA_BACKOFF_BASE_MS` | `2000` | Base del backoff exponencial |

## `fruit-backend` — publicador persistente

En `ingestion.module.ts`, el cliente RMQ añade `persistent: true` a sus opciones para que los mensajes `nueva_fruta` sobrevivan un reinicio del broker. El cliente de `fruits-query` no lo necesita (request-reply efímero).

Nota: el cliente de ingestion declara la misma cola, así que sus `queueOptions` deben incluir los mismos argumentos DLX que `fruit-ms` (los argumentos de declaración deben coincidir exactamente o RabbitMQ rechaza el canal con `PRECONDITION_FAILED`). Lo mismo aplica al cliente de `fruits-query` si declara la cola principal.

## Despliegue

**Paso manual único por entorno:** borrar la cola existente antes de arrancar las versiones nuevas, porque RabbitMQ no permite redeclarar una cola con argumentos distintos:

```bash
docker compose exec rabbitmq rabbitmqctl delete_queue <RABBITMQ_QUEUE>
```

Hacerlo con `fruit-backend` y `fruit-ms` detenidos (o inmediatamente antes de reiniciarlos) para minimizar la ventana sin cola. Los mensajes que estuvieran encolados en ese momento se pierden — coordinar en un momento de baja actividad.

## Operación de la DLQ

- Inspección: RabbitMQ Management UI (puerto 15672) → cola `<RABBITMQ_QUEUE>.dlq` → *Get messages*. El payload identifica la imagen (`image_id`, `storage_key`) y `x-death` el motivo y momento.
- Recuperación: re-publicar el mensaje a la cola principal desde la UI (*Publish message* con el mismo payload) una vez resuelta la causa raíz. El `offline_sync_id` con índice único sparse protege contra duplicados si el análisis llegó a persistirse.

## Tests

Unit tests en `fruit-ms` (Jest, fake timers para no esperar el backoff real):

1. `handleNuevaFruta` hace `ack` cuando `process()` resuelve al primer intento.
2. Reintenta con backoff y hace `ack` si un intento posterior tiene éxito.
3. Hace `nack(requeue=false)` tras agotar los intentos y no relanza.
4. `get_fruits`/`get_fruit_by_id` hacen `ack` incluso si el service lanza.
5. `FruitsService.process()` propaga el error cuando la inferencia falla y cuando el guardado falla.

Los 11 tests preexistentes que fallan en `fcm`/`solicitudes` de `fruit-backend` no están relacionados con este cambio.
