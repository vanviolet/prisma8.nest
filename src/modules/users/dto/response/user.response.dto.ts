import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { UserRole } from "../../../../common/enums/user-role.enum";

export class UserResponseDto {
  @ApiProperty({ example: 42 })
  id!: number;

  @ApiProperty({ example: "alex@example.com" })
  email!: string;

  @ApiPropertyOptional({ example: "alex", nullable: true })
  username!: string | null;

  @ApiPropertyOptional({ example: "Alex Morgan", nullable: true })
  name!: string | null;

  @ApiProperty({ enum: UserRole, enumName: "UserRole", example: UserRole.USER })
  role!: UserRole;

  @ApiProperty({ type: String, format: "date-time" })
  createdAt!: string;
}
