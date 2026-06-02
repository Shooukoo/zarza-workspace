// fruit-backend/src/notifications/notifications.gateway.spec.ts
import { Test } from '@nestjs/testing';
import { WebSocket } from 'ws';
import { NotificationsGateway } from './notifications.gateway';
import { I_TOKEN_PORT } from '../auth/ports/token.port';

const mockTokenService = { verifyToken: jest.fn() };

function makeSocket(readyState = WebSocket.OPEN): WebSocket {
  return {
    send: jest.fn(),
    close: jest.fn(),
    readyState,
  } as unknown as WebSocket;
}

describe('NotificationsGateway', () => {
  let gateway: NotificationsGateway;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        NotificationsGateway,
        { provide: I_TOKEN_PORT, useValue: mockTokenService },
      ],
    }).compile();
    gateway = module.get(NotificationsGateway);
    jest.clearAllMocks();
  });

  describe('handleConnection()', () => {
    it('cierra socket con 4001 tras 10 segundos sin auth', () => {
      jest.useFakeTimers();
      const client = makeSocket();

      gateway.handleConnection(client);

      expect(client.close).not.toHaveBeenCalled();
      jest.advanceTimersByTime(10_000);
      expect(client.close).toHaveBeenCalledWith(4001, 'Auth timeout');
      jest.useRealTimers();
    });
  });

  describe('handleAuth()', () => {
    it('registra socket en rooms y envía auth_ok con token válido', async () => {
      const client = makeSocket();
      mockTokenService.verifyToken.mockResolvedValue({
        sub: 'user-1',
        email: 'a@b.com',
        role: 'PRODUCTOR',
      });

      gateway.handleConnection(client);
      await gateway.handleAuth(client, { token: 'valid-jwt' });

      expect(client.send).toHaveBeenCalledWith(
        JSON.stringify({ event: 'auth_ok' }),
      );
    });

    it('cancela el timeout de auth al recibir token válido', async () => {
      jest.useFakeTimers();
      const client = makeSocket();
      mockTokenService.verifyToken.mockResolvedValue({
        sub: 'user-1',
        email: 'a@b.com',
        role: 'PRODUCTOR',
      });

      gateway.handleConnection(client);
      await gateway.handleAuth(client, { token: 'valid-jwt' });
      jest.advanceTimersByTime(10_000);

      expect(client.close).not.toHaveBeenCalledWith(4001, 'Auth timeout');
      jest.useRealTimers();
    });

    it('cierra socket con 4001 con token inválido', async () => {
      const client = makeSocket();
      mockTokenService.verifyToken.mockRejectedValue(new Error('expired'));

      gateway.handleConnection(client);
      await gateway.handleAuth(client, { token: 'bad-jwt' });

      expect(client.close).toHaveBeenCalledWith(4001, 'Invalid token');
      expect(client.send).not.toHaveBeenCalledWith(
        JSON.stringify({ event: 'auth_ok' }),
      );
    });
  });

  describe('handleDisconnect()', () => {
    it('cancela timeout si el cliente desconecta antes de auth', () => {
      jest.useFakeTimers();
      const client = makeSocket();

      gateway.handleConnection(client);
      gateway.handleDisconnect(client);
      jest.advanceTimersByTime(10_000);

      expect(client.close).not.toHaveBeenCalled();
      jest.useRealTimers();
    });

    it('elimina el socket de la room tras autenticar y desconectar', async () => {
      const client = makeSocket();
      mockTokenService.verifyToken.mockResolvedValue({
        sub: 'user-1',
        email: 'a@b.com',
        role: 'PRODUCTOR',
      });

      gateway.handleConnection(client);
      await gateway.handleAuth(client, { token: 'valid' });
      gateway.handleDisconnect(client);

      // emitToUser no debe enviar nada tras desconectar
      (client.send as jest.Mock).mockClear();
      gateway.emitToUser('user-1', 'test', {});
      expect(client.send).not.toHaveBeenCalled();
    });
  });

  describe('emitToUser()', () => {
    it('envía a todos los sockets de la room del usuario', async () => {
      const client1 = makeSocket();
      const client2 = makeSocket();
      mockTokenService.verifyToken.mockResolvedValue({
        sub: 'user-1',
        email: 'a@b.com',
        role: 'PRODUCTOR',
      });

      gateway.handleConnection(client1);
      await gateway.handleAuth(client1, { token: 'jwt' });
      gateway.handleConnection(client2);
      await gateway.handleAuth(client2, { token: 'jwt' });

      (client1.send as jest.Mock).mockClear();
      (client2.send as jest.Mock).mockClear();

      gateway.emitToUser('user-1', 'analisis_listo', { id: 'abc' });

      const expected = JSON.stringify({ event: 'analisis_listo', data: { id: 'abc' } });
      expect(client1.send).toHaveBeenCalledWith(expected);
      expect(client2.send).toHaveBeenCalledWith(expected);
    });

    it('no envía a sockets de otro usuario', async () => {
      const clientA = makeSocket();
      const clientB = makeSocket();
      mockTokenService.verifyToken
        .mockResolvedValueOnce({ sub: 'user-A', email: 'a@b.com', role: 'PRODUCTOR' })
        .mockResolvedValueOnce({ sub: 'user-B', email: 'b@b.com', role: 'PRODUCTOR' });

      gateway.handleConnection(clientA);
      await gateway.handleAuth(clientA, { token: 'jwtA' });
      gateway.handleConnection(clientB);
      await gateway.handleAuth(clientB, { token: 'jwtB' });

      (clientA.send as jest.Mock).mockClear();
      (clientB.send as jest.Mock).mockClear();

      gateway.emitToUser('user-A', 'test', {});

      expect(clientA.send).toHaveBeenCalled();
      expect(clientB.send).not.toHaveBeenCalled();
    });

    it('no lanza error cuando userId no tiene sockets registrados', () => {
      expect(() => gateway.emitToUser('ghost-user', 'test', {})).not.toThrow();
    });

    it('omite sockets con readyState !== OPEN', async () => {
      const closedClient = makeSocket(WebSocket.CLOSED);
      mockTokenService.verifyToken.mockResolvedValue({
        sub: 'user-1',
        email: 'a@b.com',
        role: 'PRODUCTOR',
      });

      gateway.handleConnection(closedClient);
      await gateway.handleAuth(closedClient, { token: 'valid' });

      (closedClient.send as jest.Mock).mockClear();
      gateway.emitToUser('user-1', 'test', {});

      expect(closedClient.send).not.toHaveBeenCalled();
    });
  });
});
