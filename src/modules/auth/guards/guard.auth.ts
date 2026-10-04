import { Injectable, UnauthorizedException } from "@nestjs/common";
import type { CanActivate, ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { RequestContext } from "../../../common/types/type.request.context";
import { is_public_key } from "../../../common/decorators/decorator.public";
import { authorization_scheme } from "../constant.auth";
import { AuthService } from "../service.auth";

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly auth_service: AuthService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const is_public = this.reflector.getAllAndOverride<boolean>(is_public_key, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (is_public) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestContext>();
    const authorization = request.headers.authorization;
    if (typeof authorization !== "string" || !authorization.startsWith(authorization_scheme)) {
      throw new UnauthorizedException("Bearer access token is required");
    }

    request.user = this.auth_service.verify_access_token(authorization.slice(authorization_scheme.length));
    return true;
  }
}
