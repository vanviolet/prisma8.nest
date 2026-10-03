import { HttpStatus, Injectable } from "@nestjs/common";
import { AppException } from "../../common/exceptions/app.exception";
import { ErrorCode } from "../../common/enums/error-code.enum";
import type { PostQueryDto } from "./d.query/post.query.dto";
import type { CreatePostDto } from "./d.request/post.create.dto";
import type { UpdatePostDto } from "./d.request/post.update.dto";
import { mapPost } from "./mappers/post.mapper";
import { PostsRepository } from "./posts.repository";

@Injectable()
export class PostsService {
  constructor(private readonly postsRepository: PostsRepository) {}

  async getPosts(query: PostQueryDto) {
    const { posts, total } = await this.postsRepository.findMany(query);

    return {
      data: posts.map(mapPost),
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async getPost(id: number) {
    const post = await this.postsRepository.findById(id);
    if (!post) {
      throw new AppException(ErrorCode.POST_NOT_FOUND, HttpStatus.NOT_FOUND, "Post not found");
    }
    return mapPost(post);
  }

  async createPost(input: CreatePostDto, authorId: number) {
    const post = await this.postsRepository.create({
      title: input.title,
      ...(input.content === undefined ? {} : { content: input.content }),
      authorId,
    });
    return mapPost(post);
  }

  async updatePost(id: number, input: UpdatePostDto) {
    if (input.title === undefined && input.content === undefined) {
      throw new AppException(
        ErrorCode.VALIDATION_ERROR,
        HttpStatus.UNPROCESSABLE_ENTITY,
        "At least one updatable field is required",
        [{ field: "body", message: "Provide title or content" }],
      );
    }

    const existingPost = await this.postsRepository.findById(id);
    if (!existingPost) {
      throw new AppException(ErrorCode.POST_NOT_FOUND, HttpStatus.NOT_FOUND, "Post not found");
    }

    const updatedPost = await this.postsRepository.update(id, {
      ...(input.title === undefined ? {} : { title: input.title }),
      ...(input.content === undefined ? {} : { content: input.content }),
    });
    if (!updatedPost) {
      throw new AppException(ErrorCode.POST_NOT_FOUND, HttpStatus.NOT_FOUND, "Post not found");
    }
    return mapPost(updatedPost);
  }

  async deletePost(id: number): Promise<{ message: string }> {
    const existingPost = await this.postsRepository.findById(id);
    if (!existingPost) {
      throw new AppException(ErrorCode.POST_NOT_FOUND, HttpStatus.NOT_FOUND, "Post not found");
    }

    await this.postsRepository.delete(id);
    return { message: "Post successfully deleted" };
  }
}
