// zarza-web/src/shared/roleTag.ts
import { Role } from '../auth/types';

export const ROLE_TAG: Record<Role, { color: string; label: string }> = {
  [Role.ADMIN]: { color: 'gold', label: 'Admin' },
  [Role.PRODUCTOR]: { color: 'green', label: 'Productor' },
  [Role.AGRONOMO]: { color: 'blue', label: 'Agrónomo' },
  [Role.MONITOR]: { color: 'orange', label: 'Monitor' },
};
