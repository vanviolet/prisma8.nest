import { ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import type { ApiOperationOptions } from "@nestjs/swagger";
import { IS_PUBLIC_KEY } from "./public.decorator";
import { ROLES_KEY } from "./roles.decorator";

export type ApiEndpointOptions = Pick<ApiOperationOptions, "description" | "operationId" | "summary">;

function getMetadata<T>(key: string, handler: Function | undefined, controller: object): T | undefined {
  if (handler) {
    const methodValue = Reflect.getMetadata(key, handler) as T | undefined;
    if (methodValue !== undefined) return methodValue;
  }

  return Reflect.getMetadata(key, controller) as T | undefined;
}

function humanizeMethodName(methodName: string): string {
  const words = methodName
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .trim()
    .toLowerCase();

  return words ? `${words.charAt(0).toUpperCase()}${words.slice(1)}` : "Operation";
}

function humanizeRole(role: string): string {
  return role
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .split(/[_\s-]+/)
    .filter((word) => word.length > 0)
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1).toLowerCase()}`)
    .join(" ");
}

function accessLabel(isPublic: boolean, roles: unknown): string {
  if (isPublic) return "Public";

  const roleNames = Array.isArray(roles)
    ? roles.filter((role): role is string => typeof role === "string")
    : [];
  if (roleNames.length === 0) return "Authenticated";

  return `${roleNames.map(humanizeRole).join(" or ")} only`;
}

/** Builds an operation summary and bearer-auth metadata from the existing access decorators. */
export function ApiEndpoint(options: ApiEndpointOptions = {}): MethodDecorator {
  return (target, propertyKey, descriptor) => {
    const methodName = String(propertyKey);
    const handler = typeof descriptor?.value === "function" ? descriptor.value : undefined;
    const controller = typeof target === "function" ? target : target.constructor;
    const roles = getMetadata<unknown>(ROLES_KEY, handler, controller);
    const isPublic = getMetadata<boolean>(IS_PUBLIC_KEY, handler, controller) === true;
    const summary = options.summary ?? humanizeMethodName(methodName);
    const operation = ApiOperation({
      ...options,
      operationId: options.operationId ?? methodName,
      summary: `${summary} (${accessLabel(isPublic, roles)})`,
    });

    operation(target, propertyKey, descriptor);
    if (!isPublic) ApiBearerAuth()(target, propertyKey, descriptor);
  };
}
