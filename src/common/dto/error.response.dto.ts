import {
  EnumField,
  IntField,
  NestedField,
  StringField,
} from "../decorators/field.decorator";
import { ErrorCode } from "../enums/error-code.enum";

export class ValidationErrorDto {
  @StringField({ example: "email" })
  field!: string;

  @StringField({ example: "email must be an email" })
  message!: string;
}

export class ErrorResponseDto {
  @IntField({ example: 422 })
  statusCode!: number;

  @EnumField(ErrorCode, { enumName: "ErrorCode" })
  code!: ErrorCode;

  @StringField({ example: "Validation failed" })
  message!: string;

  @NestedField(() => ValidationErrorDto, { required: false, each: true })
  errors?: ValidationErrorDto[];

  @StringField({ format: "date-time", example: "2026-10-04T00:00:00.000Z" })
  timestamp!: string;

  @StringField({ example: "/api/users", maxLength: 2048 })
  path!: string;
}
