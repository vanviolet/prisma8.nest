import { SetMetadata } from "@nestjs/common";

export const roles_key = "roles";
export const Roles = (...roles: string[]) => SetMetadata(roles_key, roles);
