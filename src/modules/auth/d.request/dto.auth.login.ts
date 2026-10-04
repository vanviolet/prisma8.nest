import { EmailField, PasswordField } from "../../../common/decorators/decorator.field";

export class LoginDto {
  @EmailField({ example: "alex@example.com", max_length: 254 })
  email!: string;

  @PasswordField({ min_length: 12, max_length: 128 })
  password!: string;
}
