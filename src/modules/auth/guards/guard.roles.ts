import { ForbiddenException, Injectable } from "@nestjs/common";
import type { CanActivate, ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { roles_key } from "@/common/decorators/decorator.roles";
import type { RequestContext } from "@/common/types/type.request.context";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<string[]>(roles_key, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!roles || roles.length === 0) {
      return true;
    }

    const user = context.switchToHttp().getRequest<RequestContext>().user;
    if (!user || !roles.includes(user.nama_pekerjaan)) {
      throw new ForbiddenException("You do not have permission to access this resource");
    }
    return true;
  }
}
