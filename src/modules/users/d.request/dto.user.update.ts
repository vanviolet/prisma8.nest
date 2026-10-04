import { PasswordField, StringField } from "../../../common/decorators/decorator.field";

export class UpdateUserDto {
  @StringField({
    required: false,
    nullable: true,
    example: "Alex Morgan",
    min_length: 0,
    max_length: 100,
  })
  name?: string | null;

  @PasswordField({ required: false, min_length: 12, max_length: 128 })
  password?: string;
}
