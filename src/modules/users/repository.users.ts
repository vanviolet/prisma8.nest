import { Injectable } from "@nestjs/common";
import { or } from "@prisma/orm-postgres/orm-client";
import { PrismaService } from "@/prisma/service.prisma";
import type { UserQueryDto } from "./d.query/dto.user.query";
import type { UserResponseDto } from "./d.response/dto.user.response";

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async find_many(query: UserQueryDto): Promise<{ users: UserResponseDto[]; total: number }> {
    let collection = this.prisma.db.orm.public.user;

    if (query.search) {
      const pattern = `%${query.search}%`;
      collection = collection.where((user) =>
        or(user.email.ilike(pattern), user.name.ilike(pattern), user.username.ilike(pattern)),
      );
    }

    if (query.role) {
      collection = collection.where({ role: query.role });
    }

    const offset = (query.page - 1) * query.limit;
    const users = await collection
      .select("id", "email", "username", "name", "role", "created_at")
      .orderBy((user) => user[query.sort_by][query.sort_order]())
      .limit(query.limit)
      .offset(offset)
      .all();
    const aggregate = await collection.aggregate((values) => ({ total: values.count() }));

    return { users, total: aggregate.total };
  }

  find_by_id(id: number) {
    return this.prisma.db.orm.public.user
      .select("id", "email", "username", "name", "role", "created_at")
      .first({ id });
  }

  find_auth_record_by_email(email: string) {
    return this.prisma.db.orm.public.user
      .select("id", "email", "password_hash", "role")
      .where({ email })
      .first();
  }

  find_by_email(email: string) {
    return this.prisma.db.orm.public.user.select("id").where({ email }).first();
  }

  create(data: { email: string; username?: string; name?: string; password_hash: string }) {
    return this.prisma.db.orm.public.user
      .select("id", "email", "username", "name", "role", "created_at")
      .create(data);
  }

  update(
    id: number,
    data: { name?: string | null; password_hash?: string },
  ) {
    return this.prisma.db.orm.public.user
      .where({ id })
      .select("id", "email", "username", "name", "role", "created_at")
      .update(data);
  }

  delete(id: number) {
    return this.prisma.db.orm.public.user.where({ id }).delete();
  }
}
