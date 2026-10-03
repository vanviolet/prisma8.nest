import { EmailField, PasswordField } from "../../../../common/decorators/field.decorator";

export class LoginDto {
  @EmailField({ example: "alex@example.com", maxLength: 254 })
  email!: string;

  @PasswordField({ minLength: 12, maxLength: 128 })
  password!: string;
}
