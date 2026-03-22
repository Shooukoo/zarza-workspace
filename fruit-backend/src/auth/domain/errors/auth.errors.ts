/**
 * Errores de dominio tipados para el módulo de autenticación.
 * Permiten que el Controller capture por `instanceof` en vez de por string literal,
 * eliminando el acoplamiento frágil entre capas.
 */

export class UserAlreadyExistsError extends Error {
  constructor(email: string) {
    super(`User with email "${email}" already exists`);
    this.name = 'UserAlreadyExistsError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class InvalidCredentialsError extends Error {
  constructor() {
    super('Invalid email or password');
    this.name = 'InvalidCredentialsError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class UserNotFoundError extends Error {
  constructor(identifier: string) {
    super(`User "${identifier}" not found`);
    this.name = 'UserNotFoundError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
