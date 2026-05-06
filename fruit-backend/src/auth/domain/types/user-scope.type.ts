import { Role } from '../enums/role.enum';

export type UserScope = {
  role: Role;
  sub: string;
  camposAsignados?: string[];
};
