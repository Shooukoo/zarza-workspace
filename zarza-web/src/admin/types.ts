import { Role } from '../auth/types';

export interface User {
  id: string;
  email: string;
  role: Role;
  firstName?: string | null;
  lastName?: string | null;
  campos_asignados: string[];
  createdAt: string;
  totalAnalyses?: number;
}
