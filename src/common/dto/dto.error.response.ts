import {
  EnumField,
  IntField,
  NestedField,
  StringField,
} from "@/common/decorators/decorator.field";
import { ErrorCode } from "@/common/enums/enum.error.code";

export class ValidationErrorDto {
  @StringField({ example: "email" })
  field!: string;

  @StringField({ example: "email must be an email" })
  message!: string;
}

export class ErrorResponseDto {
  @IntField({ example: 422 })
  status_code!: number;

  @EnumField(ErrorCode, { enum_name: "ErrorCode" })
  code!: ErrorCode;

  @StringField({ example: "Validation failed" })
  message!: string;

  @NestedField(() => ValidationErrorDto, { required: false, each: true })
  errors?: ValidationErrorDto[];

  @StringField({ format: "date-time", example: "2026-10-04T00:00:00.000Z" })
  timestamp!: string;

  @StringField({ example: "/api/users", max_length: 2048 })
  path!: string;
}
