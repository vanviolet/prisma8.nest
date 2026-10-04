import { HttpStatus, Injectable } from "@nestjs/common";
import { AppException } from "../../common/exceptions/exception.app";
import { ErrorCode } from "../../common/enums/enum.error.code";
import type { PostQueryDto } from "./d.query/dto.post.query";
import type { CreatePostDto } from "./d.request/dto.post.create";
import type { UpdatePostDto } from "./d.request/dto.post.update";
import { map_post } from "./mappers/mapper.post";
import { PostsRepository } from "./repository.posts";

@Injectable()
export class PostsService {
  constructor(private readonly posts_repository: PostsRepository) {}

  async get_posts(query: PostQueryDto) {
    const { posts, total } = await this.posts_repository.find_many(query);

    return {
      data: posts.map(map_post),
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        total_pages: Math.ceil(total / query.limit),
      },
    };
  }

  async get_post(id: number) {
    const post = await this.posts_repository.find_by_id(id);
    if (!post) {
      throw new AppException(ErrorCode.post_not_found, HttpStatus.NOT_FOUND, "Post not found");
    }
    return map_post(post);
  }

  async create_post(input: CreatePostDto, author_id: number) {
    const post = await this.posts_repository.create({
      title: input.title,
      ...(input.content === undefined ? {} : { content: input.content }),
      author_id,
    });
    return map_post(post);
  }

  async update_post(id: number, input: UpdatePostDto) {
    if (input.title === undefined && input.content === undefined) {
      throw new AppException(
        ErrorCode.validation_error,
        HttpStatus.UNPROCESSABLE_ENTITY,
        "At least one updatable field is required",
        [{ field: "body", message: "Provide title or content" }],
      );
    }

    const existing_post = await this.posts_repository.find_by_id(id);
    if (!existing_post) {
      throw new AppException(ErrorCode.post_not_found, HttpStatus.NOT_FOUND, "Post not found");
    }

    const updated_post = await this.posts_repository.update(id, {
      ...(input.title === undefined ? {} : { title: input.title }),
      ...(input.content === undefined ? {} : { content: input.content }),
    });
    if (!updated_post) {
      throw new AppException(ErrorCode.post_not_found, HttpStatus.NOT_FOUND, "Post not found");
    }
    return map_post(updated_post);
  }

  async delete_post(id: number): Promise<{ message: string }> {
    const existing_post = await this.posts_repository.find_by_id(id);
    if (!existing_post) {
      throw new AppException(ErrorCode.post_not_found, HttpStatus.NOT_FOUND, "Post not found");
    }

    await this.posts_repository.delete(id);
    return { message: "Post successfully deleted" };
  }
}
