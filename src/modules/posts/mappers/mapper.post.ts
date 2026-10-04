import type { Models } from "@/prisma/contract.d.ts";
import type { PostResponseDto } from "@/modules/posts/d.response/dto.post.response";

type PostFields = Pick<
  Models.public_post,
  "id" | "title" | "content" | "author_id" | "created_at" | "updated_at"
>;

export function map_post(post: PostFields): PostResponseDto {
  return {
    id: post.id,
    title: post.title,
    content: post.content,
    author_id: post.author_id,
    created_at: post.created_at,
    updated_at: post.updated_at,
  };
}
