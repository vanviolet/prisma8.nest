import { StringField } from "../../../common/decorators/field.decorator";

export class CreatePostDto {
  @StringField({ example: "First post", maxLength: 255 })
  title!: string;

  @StringField({
    required: false,
    nullable: true,
    example: "Post content",
    minLength: 0,
    maxLength: 10000,
  })
  content?: string | null;
}
