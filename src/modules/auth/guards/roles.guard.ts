import { ForbiddenException, Injectable } from "@nestjs/common";
import type { CanActivate, ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ROLES_KEY } from "../../../common/decorators/roles.decorator";
import type { UserRole } from "../../../common/enums/user-role.enum";
import type { RequestContext } from "../../../common/types/request-context.type";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!roles || roles.length === 0) {
      return true;
    }

    const user = context.switchToHttp().getRequest<RequestContext>().user;
    if (!user || !roles.includes(user.role)) {
      throw new ForbiddenException("You do not have permission to access this resource");
    }
    return true;
  }
}
