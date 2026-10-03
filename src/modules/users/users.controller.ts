import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { ApiEndpoint } from "../../common/decorators/api.endpoint.decorator";
import { ApiDataResponse, ApiErrorResponses, ApiMessageResponse, ApiPaginatedResponse } from "../../common/decorators/api.response.decorator";
import { Public } from "../../common/decorators/public.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { UserRole } from "../../common/enums/user-role.enum";
import { UserQueryDto } from "./d.query/user.query.dto";
import { CreateUserDto } from "./d.request/user.create.dto";
import { UpdateUserDto } from "./d.request/user.update.dto";
import { UserResponseDto } from "./d.response/user.response.dto";
import { UsersResponseDto } from "./d.response/users.response.dto";
import { UsersService } from "./users.service";

@ApiTags("Users")
@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiEndpoint({ summary: "List users" })
  @Roles(UserRole.ADMIN)
  @ApiPaginatedResponse(UserResponseDto)
  @ApiErrorResponses()
  getUsers(@Query() query: UserQueryDto): Promise<UsersResponseDto> {
    return this.usersService.getUsers(query);
  }

  @Get("users/:id")
  @ApiEndpoint({ summary: "Get a user by ID" })
  @Roles(UserRole.ADMIN)
  @ApiDataResponse(UserResponseDto)
  @ApiErrorResponses()
  getUser(@Param("id", ParseIntPipe) id: number): Promise<UserResponseDto> {
    return this.usersService.getUser(id);
  }

  @Post()
  @ApiEndpoint({ summary: "Register a user" })
  @Public()
  @ApiDataResponse(UserResponseDto, 201)
  @ApiErrorResponses()
  createUser(@Body() body: CreateUserDto): Promise<UserResponseDto> {
    return this.usersService.createUser(body);
  }

  @Patch(":id")
  @ApiEndpoint({ summary: "Update a user" })
  @Roles(UserRole.ADMIN)
  @ApiDataResponse(UserResponseDto)
  @ApiErrorResponses()
  updateUser(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: UpdateUserDto,
  ): Promise<UserResponseDto> {
    return this.usersService.updateUser(id, body);
  }

  @Delete(":id")
  @ApiEndpoint({ summary: "Delete a user" })
  @Roles(UserRole.ADMIN)
  @ApiMessageResponse()
  @ApiErrorResponses()
  deleteUser(@Param("id", ParseIntPipe) id: number): Promise<{ message: string }> {
    return this.usersService.deleteUser(id);
  }
}
