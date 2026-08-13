import { UserRole } from '@prisma/client';
import { Request } from 'express';

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
};

export type AuthenticatedRequest = Request & {
  user: AuthUser;
};
