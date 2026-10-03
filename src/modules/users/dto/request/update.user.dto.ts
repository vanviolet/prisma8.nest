import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, MaxLength, MinLength, ValidateIf } from "class-validator";

export class UpdateUserDto {
  @ApiPropertyOptional({ example: "Alex Morgan", maxLength: 100, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string | null;

  @ApiPropertyOptional({ minLength: 12, maxLength: 128, writeOnly: true })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsString()
  @MinLength(12)
  @MaxLength(128)
  password?: string;
}
