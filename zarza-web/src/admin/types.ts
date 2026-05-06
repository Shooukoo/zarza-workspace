import { Role } from '../auth/types';

export interface User {
  id: string;
  email: string;
  role: Role;
  campos_asignados: string[];
  createdAt: string;
  totalAnalyses?: number;
}
