import { SetMetadata } from "@nestjs/common";
import type { UserRole } from "@/common/enums/enum.user.role";

export const roles_key = "roles";
export const Roles = (...roles: UserRole[]) => SetMetadata(roles_key, roles);
