import { Body, Controller, Get, HttpCode, HttpStatus, Post } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { ApiEndpoint } from "../../common/decorators/api.endpoint.decorator";
import { ApiDataResponse, ApiErrorResponses } from "../../common/decorators/api.response.decorator";
import { CurrentUser } from "../../common/decorators/current.user.decorator";
import { Public } from "../../common/decorators/public.decorator";
import type { AuthenticatedUser } from "../../common/types/request-context.type";
import { LoginDto } from "./d.request/auth.login.dto";
import { LoginResponseDto } from "./d.response/auth.login.response.dto";
import { AuthService } from "./auth.service";
import { UserResponseDto } from "../users/d.response/user.response.dto";

@ApiTags("Authentication")
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get("me")
  @ApiEndpoint({ summary: "Get the authenticated user" })
  @ApiDataResponse(UserResponseDto)
  @ApiErrorResponses()
  getCurrentUser(@CurrentUser() user: AuthenticatedUser): Promise<UserResponseDto> {
    return this.authService.getCurrentUser(user);
  }

  @Post("login")
  @ApiEndpoint({ summary: "Create an access token" })
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiDataResponse(LoginResponseDto)
  @ApiErrorResponses()
  login(@Body() body: LoginDto): Promise<LoginResponseDto> {
    return this.authService.login(body);
  }
}
