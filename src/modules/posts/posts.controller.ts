import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { ApiEndpoint } from "../../common/decorators/api.endpoint.decorator";
import {
  ApiDataResponse,
  ApiErrorResponses,
  ApiMessageResponse,
  ApiPaginatedResponse,
} from "../../common/decorators/api.response.decorator";
import { CurrentUser } from "../../common/decorators/current.user.decorator";
import { Public } from "../../common/decorators/public.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { UserRole } from "../../common/enums/user-role.enum";
import type { AuthenticatedUser } from "../../common/types/request-context.type";
import { PostQueryDto } from "./d.query/post.query.dto";
import { CreatePostDto } from "./d.request/post.create.dto";
import { UpdatePostDto } from "./d.request/post.update.dto";
import { PostResponseDto } from "./d.response/post.response.dto";
import { PostsResponseDto } from "./d.response/posts.response.dto";
import { PostsService } from "./posts.service";

@ApiTags("Posts")
@Controller("posts")
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Get()
  @ApiEndpoint({ summary: "List posts" })
  @Public()
  @ApiPaginatedResponse(PostResponseDto)
  @ApiErrorResponses()
  getPosts(@Query() query: PostQueryDto): Promise<PostsResponseDto> {
    return this.postsService.getPosts(query);
  }

  @Get(":id")
  @ApiEndpoint({ summary: "Get a post by ID" })
  @Public()
  @ApiDataResponse(PostResponseDto)
  @ApiErrorResponses()
  getPost(@Param("id", ParseIntPipe) id: number): Promise<PostResponseDto> {
    return this.postsService.getPost(id);
  }

  @Post()
  @ApiEndpoint({ summary: "Create a post" })
  @Roles(UserRole.ADMIN)
  @ApiDataResponse(PostResponseDto, 201)
  @ApiErrorResponses()
  createPost(
    @Body() body: CreatePostDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PostResponseDto> {
    return this.postsService.createPost(body, user.sub);
  }

  @Patch(":id")
  @ApiEndpoint({ summary: "Update a post" })
  @Roles(UserRole.ADMIN)
  @ApiDataResponse(PostResponseDto)
  @ApiErrorResponses()
  updatePost(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: UpdatePostDto,
  ): Promise<PostResponseDto> {
    return this.postsService.updatePost(id, body);
  }

  @Delete(":id")
  @ApiEndpoint({ summary: "Delete a post" })
  @Roles(UserRole.ADMIN)
  @ApiMessageResponse()
  @ApiErrorResponses()
  deletePost(@Param("id", ParseIntPipe) id: number): Promise<{ message: string }> {
    return this.postsService.deletePost(id);
  }
}
