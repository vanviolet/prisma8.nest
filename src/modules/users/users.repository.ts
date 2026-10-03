import { Injectable } from "@nestjs/common";
import { or } from "@prisma/orm-postgres/orm-client";
import { PrismaService } from "../../prisma/prisma.service";
import type { UserQueryDto } from "./d.query/user.query.dto";
import type { UserResponseDto } from "./d.response/user.response.dto";

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findMany(query: UserQueryDto): Promise<{ users: UserResponseDto[]; total: number }> {
    let collection = this.prisma.db.orm.public.User;

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
      .select("id", "email", "username", "name", "role", "createdAt")
      .orderBy((user) => user[query.sortBy][query.sortOrder]())
      .limit(query.limit)
      .offset(offset)
      .all();
    const aggregate = await collection.aggregate((values) => ({ total: values.count() }));

    return { users, total: aggregate.total };
  }

  findById(id: number) {
    return this.prisma.db.orm.public.User
      .select("id", "email", "username", "name", "role", "createdAt")
      .first({ id });
  }

  findAuthRecordByEmail(email: string) {
    return this.prisma.db.orm.public.User
      .select("id", "email", "passwordHash", "role")
      .where({ email })
      .first();
  }

  findByEmail(email: string) {
    return this.prisma.db.orm.public.User.select("id").where({ email }).first();
  }

  create(data: { email: string; username?: string; name?: string; passwordHash: string }) {
    return this.prisma.db.orm.public.User
      .select("id", "email", "username", "name", "role", "createdAt")
      .create(data);
  }

  update(
    id: number,
    data: { name?: string | null; passwordHash?: string },
  ) {
    return this.prisma.db.orm.public.User
      .where({ id })
      .select("id", "email", "username", "name", "role", "createdAt")
      .update(data);
  }

  delete(id: number) {
    return this.prisma.db.orm.public.User.where({ id }).delete();
  }
}
