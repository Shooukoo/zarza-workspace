import { Role } from '../enums/role.enum';

export class User {
  private _passwordHash: string;

  constructor(
    public readonly id: string,
    public readonly email: string,
    passwordHash: string,
    public readonly role: Role,
  ) {
    this._passwordHash = passwordHash;
  }

  /** Hash de la contraseña (bcrypt). Solo debe ser accedido por el IHasherPort. */
  get hashedPassword(): string {
    return this._passwordHash;
  }

  /** Devuelve una nueva instancia con el hash de contraseña actualizado (inmutabilidad). */
  withUpdatedPassword(newHash: string): User {
    return new User(this.id, this.email, newHash, this.role);
  }
}
