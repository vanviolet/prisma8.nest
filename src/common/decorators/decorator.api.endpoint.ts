import { ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import type { ApiOperationOptions } from "@nestjs/swagger";
import { is_public_key } from "./decorator.public";
import { roles_key } from "./decorator.roles";

export type ApiEndpointOptions = Pick<ApiOperationOptions, "description" | "operationId" | "summary">;

function get_metadata<T>(key: string, handler: Function | undefined, controller: object): T | undefined {
  if (handler) {
    const method_value = Reflect.getMetadata(key, handler) as T | undefined;
    if (method_value !== undefined) return method_value;
  }

  return Reflect.getMetadata(key, controller) as T | undefined;
}

function humanize_method_name(method_name: string): string {
  const words = method_name
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .trim()
    .toLowerCase();

  return words ? `${words.charAt(0).toUpperCase()}${words.slice(1)}` : "Operation";
}

function humanize_role(role: string): string {
  return role
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .split(/[_\s-]+/)
    .filter((word) => word.length > 0)
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1).toLowerCase()}`)
    .join(" ");
}

function access_label(is_public: boolean, roles: unknown): string {
  if (is_public) return "Public";

  const role_names = Array.isArray(roles)
    ? roles.filter((role): role is string => typeof role === "string")
    : [];
  if (role_names.length === 0) return "Authenticated";

  return `${role_names.map(humanize_role).join(" or ")} only`;
}

/** Builds an operation summary and bearer-auth metadata from the existing access decorators. */
export function ApiEndpoint(options: ApiEndpointOptions = {}): MethodDecorator {
  return (target, property_key, descriptor) => {
    const method_name = String(property_key);
    const handler = typeof descriptor?.value === "function" ? descriptor.value : undefined;
    const controller = typeof target === "function" ? target : target.constructor;
    const roles = get_metadata<unknown>(roles_key, handler, controller);
    const is_public = get_metadata<boolean>(is_public_key, handler, controller) === true;
    const summary = options.summary ?? humanize_method_name(method_name);
    const operation_id = options.operationId ?? method_name.replace(
      /_([a-z])/g,
      (_match, letter: string) => letter.toUpperCase(),
    );
    const operation = ApiOperation({
      ...options,
      operationId: operation_id,
      summary: `${summary} (${access_label(is_public, roles)})`,
    });

    operation(target, property_key, descriptor);
    if (!is_public) ApiBearerAuth()(target, property_key, descriptor);
  };
}
