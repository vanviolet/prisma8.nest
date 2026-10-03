import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEmail, IsString, MaxLength, MinLength, ValidateIf } from "class-validator";

export class CreateUserDto {
  @ApiProperty({ example: "alex@example.com", maxLength: 254 })
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @ApiProperty({ minLength: 12, maxLength: 128, writeOnly: true })
  @IsString()
  @MinLength(12)
  @MaxLength(128)
  password!: string;

  @ApiPropertyOptional({ example: "alex", maxLength: 50 })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsString()
  @MaxLength(50)
  username?: string;

  @ApiPropertyOptional({ example: "Alex Morgan", maxLength: 100 })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsString()
  @MaxLength(100)
  name?: string;
}
