import { Injectable, UnauthorizedException } from "@nestjs/common";
import type { CanActivate, ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { RequestContext } from "../../../common/types/request-context.type";
import { IS_PUBLIC_KEY } from "../../../common/decorators/public.decorator";
import { AUTHORIZATION_SCHEME } from "../auth.constant";
import { AuthService } from "../auth.service";

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authService: AuthService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestContext>();
    const authorization = request.headers.authorization;
    if (typeof authorization !== "string" || !authorization.startsWith(AUTHORIZATION_SCHEME)) {
      throw new UnauthorizedException("Bearer access token is required");
    }

    request.user = this.authService.verifyAccessToken(authorization.slice(AUTHORIZATION_SCHEME.length));
    return true;
  }
}
