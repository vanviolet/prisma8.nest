import { NestedField } from "@/common/decorators/decorator.field";
import { PaginationMetaDto } from "@/common/dto/dto.pagination.meta";
import { PostResponseDto } from "./dto.post.response";

export class PostsResponseDto {
  @NestedField(() => PostResponseDto, { each: true })
  data!: PostResponseDto[];

  @NestedField(() => PaginationMetaDto)
  meta!: PaginationMetaDto;
}
