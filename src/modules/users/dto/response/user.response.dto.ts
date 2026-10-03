import {
  EmailField,
  EnumField,
  IntField,
  StringField,
} from "../../../../common/decorators/field.decorator";
import { UserRole } from "../../../../common/enums/user-role.enum";

export class UserResponseDto {
  @IntField({ example: 42 })
  id!: number;

  @EmailField({ example: "alex@example.com", maxLength: 254 })
  email!: string;

  @StringField({
    required: false,
    nullable: true,
    example: "alex",
    minLength: 0,
    maxLength: 50,
  })
  username!: string | null;

  @StringField({
    required: false,
    nullable: true,
    example: "Alex Morgan",
    minLength: 0,
    maxLength: 100,
  })
  name!: string | null;

  @EnumField(UserRole, { enumName: "UserRole", example: UserRole.USER })
  role!: UserRole;

  @StringField({ format: "date-time", maxLength: 40 })
  createdAt!: string;
}
