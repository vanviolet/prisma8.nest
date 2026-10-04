import { Injectable } from "@nestjs/common";
import { or } from "@prisma/orm-postgres/orm-client";
import { PrismaService } from "@/prisma/service.prisma";
import type { PostQueryDto } from "./d.query/dto.post.query";
import type { PostResponseDto } from "./d.response/dto.post.response";

@Injectable()
export class PostsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async find_many(query: PostQueryDto): Promise<{ posts: PostResponseDto[]; total: number }> {
    let collection = this.prisma.db.orm.public.post;

    if (query.search) {
      const pattern = `%${query.search}%`;
      collection = collection.where((post) =>
        or(post.title.ilike(pattern), post.content.ilike(pattern)),
      );
    }

    const offset = (query.page - 1) * query.limit;
    const posts = await collection
      .select("id", "title", "content", "author_id", "created_at", "updated_at")
      .orderBy((post) => post[query.sort_by][query.sort_order]())
      .limit(query.limit)
      .offset(offset)
      .all();
    const aggregate = await collection.aggregate((values) => ({ total: values.count() }));

    return { posts, total: aggregate.total };
  }

  find_by_id(id: number) {
    return this.prisma.db.orm.public.post
      .select("id", "title", "content", "author_id", "created_at", "updated_at")
      .first({ id });
  }

  create(data: { title: string; content?: string | null; author_id: number }) {
    return this.prisma.db.orm.public.post
      .select("id", "title", "content", "author_id", "created_at", "updated_at")
      .create(data);
  }

  update(id: number, data: { title?: string; content?: string | null }) {
    return this.prisma.db.orm.public.post
      .where({ id })
      .select("id", "title", "content", "author_id", "created_at", "updated_at")
      .update(data);
  }

  delete(id: number) {
    return this.prisma.db.orm.public.post.where({ id }).delete();
  }
}
