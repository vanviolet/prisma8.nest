import type { UserRole } from "@/common/enums/enum.user.role";

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
