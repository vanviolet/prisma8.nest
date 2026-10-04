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
import { AuthMeResponseDto } from "./d.response/dto.auth.me.response";

@ApiTags("Autentikasi")
@Controller("auth")
export class AuthController {
  constructor(private readonly auth_service: AuthService) {}

  @Get("me")
  @ApiEndpoint({ summary: "Lihat identitas HRMS dan actor aktif" })
  @ApiDataResponse(AuthMeResponseDto)
  @ApiErrorResponses()
  get_current_user(@CurrentUser() user: AuthenticatedUser): AuthMeResponseDto {
    return this.auth_service.get_current_user(user);
  }

  @Post("login")
  @ApiEndpoint({ summary: "Login melalui HRMS dan pilih konteks actor" })
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiDataResponse(LoginResponseDto)
  @ApiErrorResponses()
  login(@Body() body: LoginDto): Promise<LoginResponseDto> {
    return this.auth_service.login(body);
  }
}
