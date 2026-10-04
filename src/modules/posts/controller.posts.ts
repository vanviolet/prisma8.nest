import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { ApiEndpoint } from "@/common/decorators/decorator.api.endpoint";
import {
  ApiDataResponse,
  ApiErrorResponses,
  ApiMessageResponse,
  ApiPaginatedResponse,
} from "@/common/decorators/decorator.api.response";
import { CurrentUser } from "@/common/decorators/decorator.current.user";
import { Public } from "@/common/decorators/decorator.public";
import { Roles } from "@/common/decorators/decorator.roles";
import { user_role } from "@/common/enums/enum.user.role";
import type { AuthenticatedUser } from "@/common/types/type.request.context";
import { PostQueryDto } from "./d.query/dto.post.query";
import { CreatePostDto } from "./d.request/dto.post.create";
import { UpdatePostDto } from "./d.request/dto.post.update";
import { PostResponseDto } from "./d.response/dto.post.response";
import { PostsResponseDto } from "./d.response/dto.posts.response";
import { PostsService } from "./service.posts";

@ApiTags("Posts")
@Controller("posts")
export class PostsController {
  constructor(private readonly posts_service: PostsService) {}

  @Get()
  @ApiEndpoint({ summary: "List posts" })
  @Public()
  @ApiPaginatedResponse(PostResponseDto)
  @ApiErrorResponses()
  get_posts(@Query() query: PostQueryDto): Promise<PostsResponseDto> {
    return this.posts_service.get_posts(query);
  }

  @Get(":id")
  @ApiEndpoint({ summary: "Get a post by ID" })
  @Public()
  @ApiDataResponse(PostResponseDto)
  @ApiErrorResponses()
  get_post(@Param("id", ParseIntPipe) id: number): Promise<PostResponseDto> {
    return this.posts_service.get_post(id);
  }

  @Post()
  @ApiEndpoint({ summary: "Create a post" })
  @Roles(user_role.admin)
  @ApiDataResponse(PostResponseDto, 201)
  @ApiErrorResponses()
  create_post(
    @Body() body: CreatePostDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PostResponseDto> {
    return this.posts_service.create_post(body, user.sub);
  }

  @Patch(":id")
  @ApiEndpoint({ summary: "Update a post" })
  @Roles(user_role.admin)
  @ApiDataResponse(PostResponseDto)
  @ApiErrorResponses()
  update_post(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: UpdatePostDto,
  ): Promise<PostResponseDto> {
    return this.posts_service.update_post(id, body);
  }

  @Delete(":id")
  @ApiEndpoint({ summary: "Delete a post" })
  @Roles(user_role.admin)
  @ApiMessageResponse()
  @ApiErrorResponses()
  delete_post(@Param("id", ParseIntPipe) id: number): Promise<{ message: string }> {
    return this.posts_service.delete_post(id);
  }
}
