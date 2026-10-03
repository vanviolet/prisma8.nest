import { Injectable } from "@nestjs/common";
import { or } from "@prisma/orm-postgres/orm-client";
import { PrismaService } from "../../prisma/prisma.service";
import type { PostQueryDto } from "./d.query/post.query.dto";
import type { PostResponseDto } from "./d.response/post.response.dto";

@Injectable()
export class PostsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findMany(query: PostQueryDto): Promise<{ posts: PostResponseDto[]; total: number }> {
    let collection = this.prisma.db.orm.public.Post;

    if (query.search) {
      const pattern = `%${query.search}%`;
      collection = collection.where((post) =>
        or(post.title.ilike(pattern), post.content.ilike(pattern)),
      );
    }

    const offset = (query.page - 1) * query.limit;
    const posts = await collection
      .select("id", "title", "content", "authorId", "createdAt", "updatedAt")
      .orderBy((post) => post[query.sortBy][query.sortOrder]())
      .limit(query.limit)
      .offset(offset)
      .all();
    const aggregate = await collection.aggregate((values) => ({ total: values.count() }));

    return { posts, total: aggregate.total };
  }

  findById(id: number) {
    return this.prisma.db.orm.public.Post
      .select("id", "title", "content", "authorId", "createdAt", "updatedAt")
      .first({ id });
  }

  create(data: { title: string; content?: string | null; authorId: number }) {
    return this.prisma.db.orm.public.Post
      .select("id", "title", "content", "authorId", "createdAt", "updatedAt")
      .create(data);
  }

  update(id: number, data: { title?: string; content?: string | null }) {
    return this.prisma.db.orm.public.Post
      .where({ id })
      .select("id", "title", "content", "authorId", "createdAt", "updatedAt")
      .update(data);
  }

  delete(id: number) {
    return this.prisma.db.orm.public.Post.where({ id }).delete();
  }
}
