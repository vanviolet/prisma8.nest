import type { Models } from "../../../prisma/contract.d.ts";
import type { PostResponseDto } from "../d.response/post.response.dto";

type PostFields = Pick<
  Models.public_Post,
  "id" | "title" | "content" | "authorId" | "createdAt" | "updatedAt"
>;

export function mapPost(post: PostFields): PostResponseDto {
  return {
    id: post.id,
    title: post.title,
    content: post.content,
    authorId: post.authorId,
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
  };
}
