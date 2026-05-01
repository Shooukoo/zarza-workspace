export enum Role {
  ADMIN = 'ADMIN',
  PRODUCTOR = 'PRODUCTOR',
  AGRONOMO = 'AGRONOMO',
  MONITOR = 'MONITOR',
}

export interface AuthUser {
  sub: string;
  email: string;
  role: Role;
}
