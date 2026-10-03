import {
  IntField,
  StringField,
} from "../../../common/decorators/field.decorator";

export class PostResponseDto {
  @IntField({ example: 42 })
  id!: number;

  @StringField({ example: "First post", maxLength: 255 })
  title!: string;

  @StringField({
    required: false,
    nullable: true,
    example: "Post content",
    minLength: 0,
    maxLength: 10000,
  })
  content!: string | null;

  @IntField({ example: 7 })
  authorId!: number;

  @StringField({ format: "date-time", maxLength: 40 })
  createdAt!: string;

  @StringField({ format: "date-time", maxLength: 40 })
  updatedAt!: string;
}
