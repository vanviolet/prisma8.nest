import { NestedField } from "@/common/decorators/decorator.field";
import { PaginationMetaDto } from "@/common/dto/dto.pagination.meta";
import { UserResponseDto } from "./dto.user.response";

export class UsersResponseDto {
  @NestedField(() => UserResponseDto, { each: true })
  data!: UserResponseDto[];

  @NestedField(() => PaginationMetaDto)
  meta!: PaginationMetaDto;
}
