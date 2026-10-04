import { HttpStatus, ValidationPipe } from "@nestjs/common";
import type { ValidationError } from "class-validator";
import { AppException } from "@/common/exceptions/exception.app";
import { ErrorCode } from "@/common/enums/enum.error.code";

function flatten_validation_errors(
  validation_errors: ValidationError[],
  parent_path = "",
): Array<{ field: string; message: string }> {
  return validation_errors.flatMap((error) => {
    const field = parent_path ? `${parent_path}.${error.property}` : error.property;
    const own_errors = Object.values(error.constraints ?? {}).map((message) => ({ field, message }));
    return [...own_errors, ...flatten_validation_errors(error.children ?? [], field)];
  });
}

export function create_validation_pipe(): ValidationPipe {
  return new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
    exceptionFactory: (validation_errors) =>
      new AppException(
        ErrorCode.validation_error,
        HttpStatus.UNPROCESSABLE_ENTITY,
        "Validation failed",
        flatten_validation_errors(validation_errors),
      ),
  });
}
