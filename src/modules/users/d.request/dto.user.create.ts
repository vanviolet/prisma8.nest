import {
  EmailField,
  PasswordField,
  StringField,
} from "../../../common/decorators/decorator.field";

export class CreateUserDto {
  @EmailField({ example: "alex@example.com", max_length: 254 })
  email!: string;

  @PasswordField({ min_length: 12, max_length: 128 })
  password!: string;

  @StringField({ required: false, example: "alex", min_length: 0, max_length: 50 })
  username?: string;

  @StringField({ required: false, example: "Alex Morgan", min_length: 0, max_length: 100 })
  name?: string;
}
