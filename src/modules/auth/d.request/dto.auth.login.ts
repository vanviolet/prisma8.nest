import { PasswordField, StringField } from "@/common/decorators/decorator.field";

export class LoginDto {
  @StringField({ example: "220031", min_length: 3, max_length: 100 })
  username!: string;

  @PasswordField({ min_length: 1, max_length: 128 })
  password!: string;
}
