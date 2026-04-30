import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, WebSocket } from 'ws';

/**
 * Gateway WebSocket para notificaciones en tiempo real.
 *
 * Endpoint: ws://<host>:<PORT>/ws
 *   - Soporta la estrategia de notificación de resultados de análisis
 *     de fruta desde fruit-ms hacia la app móvil Flutter.
 *
 * Eventos entrantes (cliente → servidor):
 *   { "event": "ping", "data": {} }
 *
 * Eventos salientes (servidor → cliente):
 *   { "event": "pong",            "data": "ok" }
 *   { "event": "analisis_listo",  "data": <AnalysisResult> }
 */
@WebSocketGateway({ path: '/ws' })
export class NotificationsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationsGateway.name);

  handleConnection(client: WebSocket) {
    this.logger.log('Cliente WebSocket conectado');
    // Confirmamos la conexión con un mensaje de bienvenida
    client.send(JSON.stringify({ event: 'connected', data: 'ok' }));
  }

  handleDisconnect() {
    this.logger.log('Cliente WebSocket desconectado');
  }

  /** Ping de heartbeat — útil para verificar la conexión desde la app */
  @SubscribeMessage('ping')
  handlePing(@MessageBody() _data: unknown): { event: string; data: string } {
    return { event: 'pong', data: 'ok' };
  }

  /**
   * Emite el resultado de un análisis a TODOS los clientes conectados.
   * Llamado desde el servicio de ingesta cuando fruit-ms devuelve el resultado.
   */
  broadcast(event: string, data: unknown): void {
    const payload = JSON.stringify({ event, data });
    this.server.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(payload);
        } catch (err) {
          this.logger.warn(`Error enviando mensaje WebSocket: ${(err as Error).message}`);
        }
      }
    });
  }
}
