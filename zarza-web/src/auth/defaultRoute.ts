import { Role } from './types';

export function defaultRouteForRole(role: Role): string {
  switch (role) {
    case Role.AGRONOMO: return '/analisis';
    case Role.MONITOR: return '/solicitudes';
    default: return '/dashboard';
  }
}
