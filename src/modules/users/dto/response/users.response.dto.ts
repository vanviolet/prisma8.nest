import { ApiProperty } from "@nestjs/swagger";
import { PaginationMetaDto } from "../../../../common/dto/pagination.meta.dto";
import { UserResponseDto } from "./user.response.dto";

export class UsersResponseDto {
  @ApiProperty({ type: [UserResponseDto] })
  data!: UserResponseDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta!: PaginationMetaDto;
}
