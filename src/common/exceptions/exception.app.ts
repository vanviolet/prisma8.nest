import { HttpException } from "@nestjs/common";
import { ErrorCode } from "../enums/enum.error.code";
import type { ValidationErrorDto } from "../dto/dto.error.response";

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
