import {
  EmailField,
  EnumField,
  IntField,
  StringField,
} from "@/common/decorators/decorator.field";
import { user_role, type UserRole } from "@/common/enums/enum.user.role";

export class UserResponseDto {
  @IntField({ example: 42 })
  id!: number;

  @EmailField({ example: "alex@example.com", max_length: 254 })
  email!: string;

  @StringField({
    required: false,
    nullable: true,
    example: "alex",
    min_length: 0,
    max_length: 50,
  })
  username!: string | null;

  @StringField({
    required: false,
    nullable: true,
    example: "Alex Morgan",
    min_length: 0,
    max_length: 100,
  })
  name!: string | null;

  @EnumField(user_role, { enum_name: "UserRole", example: user_role.user })
  role!: UserRole;

  @StringField({ format: "date-time", max_length: 40 })
  created_at!: string;
}
