import { NestedField } from "../../../common/decorators/field.decorator";
import { PaginationMetaDto } from "../../../common/dto/pagination.meta.dto";
import { PostResponseDto } from "./post.response.dto";

export class PostsResponseDto {
  @NestedField(() => PostResponseDto, { each: true })
  data!: PostResponseDto[];

  @NestedField(() => PaginationMetaDto)
  meta!: PaginationMetaDto;
}
