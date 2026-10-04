import { Controller, Get, Param, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { ApiEndpoint } from "@/common/decorators/decorator.api.endpoint";
import {
  ApiDataResponse,
  ApiErrorResponses,
  ApiPaginatedResponse,
} from "@/common/decorators/decorator.api.response";
import { Roles } from "@/common/decorators/decorator.roles";
import { UserQueryDto } from "./d.query/dto.user.query";
import { UserResponseDto } from "./d.response/dto.user.response";
import { UsersResponseDto } from "./d.response/dto.users.response";
import { UsersService } from "./service.users";

@ApiTags("Pengguna")
@Controller("users")
export class UsersController {
  constructor(private readonly users_service: UsersService) {}

  @Get()
  @ApiEndpoint({ summary: "Daftar pengguna tersinkron dari HRMS" })
  @Roles("TENDIK", "STRUKTURAL", "STAF", "KOORDINATOR LEMBAGA")
  @ApiPaginatedResponse(UserResponseDto)
  @ApiErrorResponses()
  get_users(@Query() query: UserQueryDto): Promise<UsersResponseDto> {
    return this.users_service.get_users(query);
  }

  @Get(":username")
  @ApiEndpoint({ summary: "Detail identitas pengguna HRMS" })
  @Roles("TENDIK", "STRUKTURAL", "STAF", "KOORDINATOR LEMBAGA")
  @ApiDataResponse(UserResponseDto)
  @ApiErrorResponses()
  get_user(@Param("username") username: string): Promise<UserResponseDto> {
    return this.users_service.get_user(username);
  }
}
