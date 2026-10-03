import {
  EmailField,
  PasswordField,
  StringField,
} from "../../../common/decorators/field.decorator";

export class CreateUserDto {
  @EmailField({ example: "alex@example.com", maxLength: 254 })
  email!: string;

  @PasswordField({ minLength: 12, maxLength: 128 })
  password!: string;

  @StringField({ required: false, example: "alex", minLength: 0, maxLength: 50 })
  username?: string;

  @StringField({ required: false, example: "Alex Morgan", minLength: 0, maxLength: 100 })
  name?: string;
}
