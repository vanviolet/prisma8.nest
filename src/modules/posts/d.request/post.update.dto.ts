import { StringField } from "../../../common/decorators/field.decorator";

export class UpdatePostDto {
  @StringField({ required: false, example: "Updated post", maxLength: 255 })
  title?: string;

  @StringField({
    required: false,
    nullable: true,
    example: "Updated content",
    minLength: 0,
    maxLength: 10000,
  })
  content?: string | null;
}
