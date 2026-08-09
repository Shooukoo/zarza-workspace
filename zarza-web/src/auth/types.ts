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
  firstName: string | null;
  lastName: string | null;
}

export function displayName(user: AuthUser): string {
  const first = user.firstName?.trim();
  if (first) return first;
  return user.email.split('@')[0];
}
