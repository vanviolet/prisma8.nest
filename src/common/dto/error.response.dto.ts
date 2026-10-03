import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { ErrorCode } from "../enums/error-code.enum";

export class ValidationErrorDto {
  @ApiProperty({ example: "email" })
  field!: string;

  @ApiProperty({ example: "email must be an email" })
  message!: string;
}

export class ErrorResponseDto {
  @ApiProperty({ example: 422 })
  statusCode!: number;

  @ApiProperty({ enum: ErrorCode, enumName: "ErrorCode" })
  code!: string;

  @ApiProperty({ example: "Validation failed" })
  message!: string;

  @ApiPropertyOptional({ type: [ValidationErrorDto] })
  errors?: ValidationErrorDto[];

  @ApiProperty({ example: "2026-10-04T00:00:00.000Z" })
  timestamp!: string;

  @ApiProperty({ example: "/api/users" })
  path!: string;
}
