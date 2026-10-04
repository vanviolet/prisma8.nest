import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { ApiEndpoint } from "@/common/decorators/decorator.api.endpoint";
import { ApiDataResponse, ApiErrorResponses, ApiMessageResponse, ApiPaginatedResponse } from "@/common/decorators/decorator.api.response";
import { Public } from "@/common/decorators/decorator.public";
import { Roles } from "@/common/decorators/decorator.roles";
import { user_role } from "@/common/enums/enum.user.role";
import { UserQueryDto } from "./d.query/dto.user.query";
import { CreateUserDto } from "./d.request/dto.user.create";
import { UpdateUserDto } from "./d.request/dto.user.update";
import { UserResponseDto } from "./d.response/dto.user.response";
import { UsersResponseDto } from "./d.response/dto.users.response";
import { UsersService } from "./service.users";

@ApiTags("Users")
@Controller("users")
export class UsersController {
  constructor(private readonly users_service: UsersService) {}

  @Get()
  @ApiEndpoint({ summary: "List users" })
  @Roles(user_role.admin)
  @ApiPaginatedResponse(UserResponseDto)
  @ApiErrorResponses()
  get_users(@Query() query: UserQueryDto): Promise<UsersResponseDto> {
       return this.users_service.get_users(query);
  }

  @Get("users/:id")
  @ApiEndpoint({ summary: "Get a user by ID" })
  @Roles(user_role.admin)
  @ApiDataResponse(UserResponseDto)
  @ApiErrorResponses()
  get_user(@Param("id", ParseIntPipe) id: number): Promise<UserResponseDto> {
    return this.users_service.get_user(id);
  }

  @Post()
  @ApiEndpoint({ summary: "Register a user" })
  @Public()
  @ApiDataResponse(UserResponseDto, 201)
  @ApiErrorResponses()
  create_user(@Body() body: CreateUserDto): Promise<UserResponseDto> {
    return this.users_service.create_user(body);
  }

  @Patch(":id")
  @ApiEndpoint({ summary: "Update a user" })
  @Roles(user_role.admin)
  @ApiDataResponse(UserResponseDto)
  @ApiErrorResponses()
  update_user(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: UpdateUserDto,
  ): Promise<UserResponseDto> {
    return this.users_service.update_user(id, body);
  }

  @Delete(":id")
  @ApiEndpoint({ summary: "Delete a user" })
  @Roles(user_role.admin)
  @ApiMessageResponse()
  @ApiErrorResponses()
  delete_user(@Param("id", ParseIntPipe) id: number): Promise<{ message: string }> {
    return this.users_service.delete_user(id);
  }
}
