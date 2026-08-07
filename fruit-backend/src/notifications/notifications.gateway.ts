// fruit-backend/src/notifications/notifications.gateway.ts
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Inject } from '@nestjs/common';
import { Server, WebSocket } from 'ws';
import { I_TOKEN_PORT, type ITokenPort } from '../auth/ports/token.port';
import { AppLogger } from '../common/logging/app.logger';

@WebSocketGateway({ path: '/ws' })
export class NotificationsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  // socket → userId autenticado
  private readonly authenticated = new Map<WebSocket, string>();
  // userId → sockets activos (multi-dispositivo)
  private readonly rooms = new Map<string, Set<WebSocket>>();
  // socket → handle del timeout de auth pendiente
  private readonly authTimeouts = new Map<WebSocket, NodeJS.Timeout>();

  constructor(
    @Inject(I_TOKEN_PORT) private readonly tokenService: ITokenPort,
    private readonly logger: AppLogger,
  ) {}

  handleConnection(client: WebSocket) {
    this.logger.info('Cliente WebSocket conectado, esperando auth...');
    const timeout = setTimeout(() => {
      this.logger.warn('Timeout de auth — cerrando socket');
      client.close(4001, 'Auth timeout');
    }, 10_000);
    this.authTimeouts.set(client, timeout);
  }

  handleDisconnect(client: WebSocket) {
    const timeout = this.authTimeouts.get(client);
    if (timeout) {
      clearTimeout(timeout);
      this.authTimeouts.delete(client);
    }
    const userId = this.authenticated.get(client);
    this.authenticated.delete(client);
    if (userId) {
      const room = this.rooms.get(userId);
      if (room) {
        room.delete(client);
        if (room.size === 0) this.rooms.delete(userId);
      }
    }
    this.logger.info('Cliente WebSocket desconectado', {
      userId: userId ?? null,
    });
  }

  @SubscribeMessage('auth')
  async handleAuth(
    @ConnectedSocket() client: WebSocket,
    @MessageBody() payload: { token: string },
  ): Promise<void> {
    const timeout = this.authTimeouts.get(client);
    if (timeout) {
      clearTimeout(timeout);
      this.authTimeouts.delete(client);
    }

    try {
      const { sub } = await this.tokenService.verifyToken(payload?.token ?? '');
      this.authenticated.set(client, sub);
      if (!this.rooms.has(sub)) this.rooms.set(sub, new Set());
      this.rooms.get(sub)!.add(client);
      client.send(JSON.stringify({ event: 'auth_ok' }));
      this.logger.info('Cliente WebSocket autenticado', {
        userId: sub,
      });
    } catch {
      this.logger.warn('Token inválido — cerrando socket');
      client.close(4001, 'Invalid token');
    }
  }

  @SubscribeMessage('ping')
  handlePing(@MessageBody() _data: unknown): { event: string; data: string } {
    return { event: 'pong', data: 'ok' };
  }

  emitToUser(userId: string, event: string, data: unknown): void {
    const sockets = this.rooms.get(userId);
    if (!sockets?.size) return;
    const payload = JSON.stringify({ event, data });
    for (const client of sockets) {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(payload);
        } catch (err) {
          this.logger.warn('Error al enviar notificación WebSocket', {
            userId,
            error: (err as Error).message,
          });
        }
      }
    }
  }
}
