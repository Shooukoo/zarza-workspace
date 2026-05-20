import { Role } from '../enums/role.enum';

export class User {
  private _passwordHash: string;
  public fcm_token: string | null = null;

  constructor(
    public readonly id: string,
    public readonly email: string,
    passwordHash: string,
    public readonly role: Role,
    public readonly firstName: string | null = null,
    public readonly lastName: string | null = null,
  ) {
    this._passwordHash = passwordHash;
  }

  get hashedPassword(): string {
    return this._passwordHash;
  }

  withUpdatedPassword(newHash: string): User {
    return new User(
      this.id,
      this.email,
      newHash,
      this.role,
      this.firstName,
      this.lastName,
    );
  }
}
