import type { Models } from "../../../prisma/contract.d.ts";
import type { UserResponseDto } from "../d.response/user.response.dto";

type PublicUserFields = Pick<
  Models.public_User,
  "id" | "email" | "username" | "name" | "role" | "createdAt"
>;

export function mapUser(user: PublicUserFields): UserResponseDto {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    name: user.name,
    role: user.role,
    createdAt: user.createdAt,
  };
}
