import type { Models } from "@/prisma/contract.d.ts";
import type { UserResponseDto } from "@/modules/users/d.response/dto.user.response";

type UserFields = Pick<Models.sarpras_pengguna, "id_pegawai" | "nama" | "dibuat_pada">;

export function map_user(user: UserFields): UserResponseDto {
  return {
    username: user.id_pegawai,
    nama: user.nama,
    created_at: user.dibuat_pada,
  };
}
