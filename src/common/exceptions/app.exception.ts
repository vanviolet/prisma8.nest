import { HttpException } from "@nestjs/common";
import { ErrorCode } from "../enums/error-code.enum";
import type { ValidationErrorDto } from "../dto/error.response.dto";

export class AppException extends HttpException {
  constructor(
    readonly code: ErrorCode,
    status: number,
    message: string,
    readonly errors?: ValidationErrorDto[],
  ) {
    super(message, status);
  }
}
