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

export class InvalidCurrentPasswordError extends Error {
  constructor() {
    super('Current password is incorrect');
    this.name = 'InvalidCurrentPasswordError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class SamePasswordError extends Error {
  constructor() {
    super('New password must be different from the current password');
    this.name = 'SamePasswordError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
