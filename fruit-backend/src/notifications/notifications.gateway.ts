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
import type { IncomingMessage } from 'http';
import { Server, WebSocket } from 'ws';
import { I_TOKEN_PORT, type ITokenPort } from '../auth/ports/token.port';
import { AppLogger } from '../common/logging/app.logger';

const ACCESS_COOKIE_NAME = 'access_token';

/** Orígenes desde los que se acepta la cookie de sesión en el handshake. */
export const WS_ALLOWED_ORIGINS = Symbol('WS_ALLOWED_ORIGINS');

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
    @Inject(WS_ALLOWED_ORIGINS) private readonly allowedOrigins: string[],
    private readonly logger: AppLogger,
  ) {}

  async handleConnection(
    client: WebSocket,
    request?: IncomingMessage,
  ): Promise<void> {
    this.logger.info('Cliente WebSocket conectado, esperando auth...');
    const timeout = setTimeout(() => {
      this.logger.warn('Timeout de auth — cerrando socket');
      client.close(4001, 'Auth timeout');
    }, 10_000);
    this.authTimeouts.set(client, timeout);

    // El dashboard web guarda el access token en una cookie httpOnly que JS
    // no puede leer, así que no puede mandar el mensaje `auth`: se autentica
    // con la cookie del handshake. El móvil no manda cookie y sigue usando
    // el primer mensaje.
    const token = this.cookieTokenFrom(request);
    if (!token) return;

    try {
      const { sub } = await this.tokenService.verifyToken(token);
      // El socket pudo cerrarse o autenticarse por mensaje mientras se
      // verificaba la cookie.
      if (client.readyState !== WebSocket.OPEN) return;
      if (this.authenticated.has(client)) return;
      this.register(client, sub);
    } catch {
      this.logger.warn('Cookie de sesión inválida — cerrando socket');
      client.close(4001, 'Invalid token');
    }
  }

  handleDisconnect(client: WebSocket) {
    this.clearAuthTimeout(client);
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
    this.clearAuthTimeout(client);

    try {
      const { sub } = await this.tokenService.verifyToken(payload?.token ?? '');
      this.register(client, sub);
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

  private clearAuthTimeout(client: WebSocket): void {
    const timeout = this.authTimeouts.get(client);
    if (timeout) {
      clearTimeout(timeout);
      this.authTimeouts.delete(client);
    }
  }

  private register(client: WebSocket, userId: string): void {
    this.clearAuthTimeout(client);
    // Re-auth con otro usuario: sacar el socket de la room anterior.
    const previous = this.authenticated.get(client);
    if (previous && previous !== userId) {
      const room = this.rooms.get(previous);
      room?.delete(client);
      if (room?.size === 0) this.rooms.delete(previous);
    }
    this.authenticated.set(client, userId);
    if (!this.rooms.has(userId)) this.rooms.set(userId, new Set());
    this.rooms.get(userId)!.add(client);
    client.send(JSON.stringify({ event: 'auth_ok' }));
    this.logger.info('Cliente WebSocket autenticado', { userId });
  }

  /**
   * Access token de la cookie del handshake, solo si el Origin está permitido.
   * Un WebSocket no pasa por CORS: sin esta validación cualquier sitio podría
   * abrir un socket autenticado con la cookie de la víctima (CSWSH).
   */
  private cookieTokenFrom(request?: IncomingMessage): string | null {
    const header = request?.headers?.cookie;
    if (!header) return null;

    let token: string | null = null;
    for (const part of header.split(';')) {
      const eq = part.indexOf('=');
      if (eq === -1) continue;
      if (part.slice(0, eq).trim() !== ACCESS_COOKIE_NAME) continue;
      try {
        token = decodeURIComponent(part.slice(eq + 1).trim());
      } catch {
        token = null;
      }
      break;
    }
    if (!token) return null;

    const origin = request?.headers?.origin;
    if (!origin || !this.allowedOrigins.includes(origin)) {
      this.logger.warn('Origin no permitido — se ignora la cookie de sesión', {
        origin: origin ?? null,
      });
      return null;
    }
    return token;
  }
}
