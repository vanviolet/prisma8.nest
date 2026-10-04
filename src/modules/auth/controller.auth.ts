import { Body, Controller, Get, HttpCode, HttpStatus, Post } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { ApiEndpoint } from "@/common/decorators/decorator.api.endpoint";
import { ApiDataResponse, ApiErrorResponses } from "@/common/decorators/decorator.api.response";
import { CurrentUser } from "@/common/decorators/decorator.current.user";
import { Public } from "@/common/decorators/decorator.public";
import type { AuthenticatedUser } from "@/common/types/type.request.context";
import { LoginDto } from "./d.request/dto.auth.login";
import { LoginResponseDto } from "./d.response/dto.auth.login.response";
import { AuthService } from "./service.auth";
import { UserResponseDto } from "@/modules/users/d.response/dto.user.response";

@ApiTags("Authentication")
@Controller("auth")
export class AuthController {
  constructor(private readonly auth_service: AuthService) {}

  @Get("me")
  @ApiEndpoint({ summary: "Get the authenticated user" })
  @ApiDataResponse(UserResponseDto)
  @ApiErrorResponses()
  get_current_user(@CurrentUser() user: AuthenticatedUser): Promise<UserResponseDto> {
    return this.auth_service.get_current_user(user);
  }

  @Post("login")
  @ApiEndpoint({ summary: "Create an access token" })
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiDataResponse(LoginResponseDto)
  @ApiErrorResponses()
  login(@Body() body: LoginDto): Promise<LoginResponseDto> {
    return this.auth_service.login(body);
  }
}
