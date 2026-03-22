import { JwtPayload } from '../domain/types/jwt-payload.type';

export const I_TOKEN_PORT = Symbol('I_TOKEN_PORT');

/**
 * Puerto para generación y verificación de tokens de autenticación.
 * Cualquier implementación DEBE validar tanto la firma como la expiración.
 */
export interface ITokenPort {
  /** Genera un token firmado con el payload provisto. */
  generateToken(payload: JwtPayload): Promise<string>;

  /**
   * Verifica un token y retorna su payload decodificado.
   * @throws {Error} Si el token es inválido, está expirado o fue manipulado.
   */
  verifyToken(token: string): Promise<JwtPayload>;
}

