import { PasswordField, StringField } from "../../../common/decorators/field.decorator";

export class UpdateUserDto {
  @StringField({
    required: false,
    nullable: true,
    example: "Alex Morgan",
    minLength: 0,
    maxLength: 100,
  })
  name?: string | null;

  @PasswordField({ required: false, minLength: 12, maxLength: 128 })
  password?: string;
}
