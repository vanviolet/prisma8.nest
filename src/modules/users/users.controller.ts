import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import { ApiDataResponse, ApiErrorResponses, ApiMessageResponse, ApiPaginatedResponse } from "../../common/decorators/api.response.decorator";
import { Public } from "../../common/decorators/public.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { UserRole } from "../../common/enums/user-role.enum";
import { PaginationQueryDto } from "../../common/dto/pagination.query.dto";
import { CreateUserDto } from "./dto/request/create.user.dto";
import { UpdateUserDto } from "./dto/request/update.user.dto";
import { UserResponseDto } from "./dto/response/user.response.dto";
import { UsersResponseDto } from "./dto/response/users.response.dto";
import { UsersService } from "./users.service";

@ApiTags("Users")
@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiBearerAuth()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ operationId: "getUsers", summary: "List users" })
  @ApiPaginatedResponse(UserResponseDto)
  @ApiErrorResponses()
  getUsers(@Query() query: PaginationQueryDto): Promise<UsersResponseDto> {
    return this.usersService.getUsers(query);
  }

  @Get(":id")
  @ApiBearerAuth()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ operationId: "getUser", summary: "Get a user by ID" })
  @ApiDataResponse(UserResponseDto)
  @ApiErrorResponses()
  getUser(@Param("id", ParseIntPipe) id: number): Promise<UserResponseDto> {
    return this.usersService.getUser(id);
  }

  @Post()
  @Public()
  @ApiOperation({ operationId: "createUser", summary: "Register a user" })
  @ApiDataResponse(UserResponseDto, 201)
  @ApiErrorResponses()
  createUser(@Body() body: CreateUserDto): Promise<UserResponseDto> {
    return this.usersService.createUser(body);
  }

  @Patch(":id")
  @ApiBearerAuth()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ operationId: "updateUser", summary: "Update a user" })
  @ApiDataResponse(UserResponseDto)
  @ApiErrorResponses()
  updateUser(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: UpdateUserDto,
  ): Promise<UserResponseDto> {
    return this.usersService.updateUser(id, body);
  }

  @Delete(":id")
  @ApiBearerAuth()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ operationId: "deleteUser", summary: "Delete a user" })
  @ApiMessageResponse()
  @ApiErrorResponses()
  deleteUser(@Param("id", ParseIntPipe) id: number): Promise<{ message: string }> {
    return this.usersService.deleteUser(id);
  }
}
