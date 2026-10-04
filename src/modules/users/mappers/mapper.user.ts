import type { Models } from "../../../prisma/contract.d.ts";
import type { UserResponseDto } from "../d.response/dto.user.response";

type PublicUserFields = Pick<
  Models.public_user,
  "id" | "email" | "username" | "name" | "role" | "created_at"
>;

export function map_user(user: PublicUserFields): UserResponseDto {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    name: user.name,
    role: user.role,
    created_at: user.created_at,
  };
}
