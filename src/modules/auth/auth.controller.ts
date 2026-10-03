import { Body, Controller, Get, HttpCode, HttpStatus, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { ApiDataResponse, ApiErrorResponses } from "../../common/decorators/api.response.decorator";
import { CurrentUser } from "../../common/decorators/current.user.decorator";
import { Public } from "../../common/decorators/public.decorator";
import type { AuthenticatedUser } from "../../common/types/request-context.type";
import { LoginDto } from "./dto/request/login.dto";
import { LoginResponseDto } from "./dto/response/login.response.dto";
import { AuthService } from "./auth.service";
import { UserResponseDto } from "../users/dto/response/user.response.dto";

@ApiTags("Authentication")
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get("me")
  @ApiBearerAuth()
  @ApiOperation({ operationId: "getCurrentUser", summary: "Get the authenticated user" })
  @ApiDataResponse(UserResponseDto)
  @ApiErrorResponses()
  getCurrentUser(@CurrentUser() user: AuthenticatedUser): Promise<UserResponseDto> {
    return this.authService.getCurrentUser(user);
  }

  @Post("login")
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ operationId: "login", summary: "Create an access token" })
  @ApiDataResponse(LoginResponseDto)
  @ApiErrorResponses()
  login(@Body() body: LoginDto): Promise<LoginResponseDto> {
    return this.authService.login(body);
  }
}
