import { HttpStatus, ValidationPipe } from "@nestjs/common";
import type { ValidationError } from "class-validator";
import { AppException } from "../exceptions/app.exception";
import { ErrorCode } from "../enums/error-code.enum";

function flattenValidationErrors(
  validationErrors: ValidationError[],
  parentPath = "",
): Array<{ field: string; message: string }> {
  return validationErrors.flatMap((error) => {
    const field = parentPath ? `${parentPath}.${error.property}` : error.property;
    const ownErrors = Object.values(error.constraints ?? {}).map((message) => ({ field, message }));
    return [...ownErrors, ...flattenValidationErrors(error.children ?? [], field)];
  });
}

export function createValidationPipe(): ValidationPipe {
  return new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
    exceptionFactory: (validationErrors) =>
      new AppException(
        ErrorCode.VALIDATION_ERROR,
        HttpStatus.UNPROCESSABLE_ENTITY,
        "Validation failed",
        flattenValidationErrors(validationErrors),
      ),
  });
}
