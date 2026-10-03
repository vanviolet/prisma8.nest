import { createParamDecorator, type ExecutionContext } from "@nestjs/common";
import type { AuthenticatedUser, RequestContext } from "../types/request-context.type";

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedUser | undefined =>
    context.switchToHttp().getRequest<RequestContext>().user,
);
