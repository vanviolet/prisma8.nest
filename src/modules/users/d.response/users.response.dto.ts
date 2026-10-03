import { NestedField } from "../../../common/decorators/field.decorator";
import { PaginationMetaDto } from "../../../common/dto/pagination.meta.dto";
import { UserResponseDto } from "./user.response.dto";

export class UsersResponseDto {
  @NestedField(() => UserResponseDto, { each: true })
  data!: UserResponseDto[];

  @NestedField(() => PaginationMetaDto)
  meta!: PaginationMetaDto;
}
