import type { UserRole } from "../enums/enum.user.role";

export interface AuthenticatedUser {
  sub: number;
  email: string;
  role: UserRole;
}

export interface RequestContext {
  headers: {
    authorization?: string | string[];
  };
  user?: AuthenticatedUser;
}
