import { Injectable } from "@nestjs/common";
import { or } from "@prisma/orm-postgres/orm-client";
import type { Models } from "@/prisma/contract.d.ts";
import { PrismaService } from "@/prisma/service.prisma";
import type { UserQueryDto } from "./d.query/dto.user.query";

type UserRecord = Pick<Models.sarpras_pengguna, "id_pegawai" | "nama" | "dibuat_pada">;

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async find_many(query: UserQueryDto): Promise<{ users: UserRecord[]; total: number }> {
    let collection = this.prisma.db.orm.sarpras.pengguna;

    if (query.search) {
      const pattern = `%${query.search}%`;
      collection = collection.where((pengguna) =>
        or(pengguna.id_pegawai.ilike(pattern), pengguna.nama.ilike(pattern)),
      );
    }

    const sort_field = {
      created_at: "dibuat_pada",
      username: "id_pegawai",
      nama: "nama",
    } as const satisfies Record<UserQueryDto["sort_by"], string>;
    const users = await collection
      .select("id_pegawai", "nama", "dibuat_pada")
      .orderBy((pengguna) => pengguna[sort_field[query.sort_by]][query.sort_order]())
      .limit(query.limit)
      .offset((query.page - 1) * query.limit)
      .all();
    const aggregate = await collection.aggregate((values) => ({ total: values.count() }));

    return { users, total: aggregate.total };
  }

  find_by_username(username: string) {
    return this.prisma.db.orm.sarpras.pengguna
      .select("id_pegawai", "nama", "dibuat_pada")
      .first({ id_pegawai: username });
  }
}
