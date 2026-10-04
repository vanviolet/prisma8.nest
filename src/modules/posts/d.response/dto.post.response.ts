import {
  IntField,
  StringField,
} from "@/common/decorators/decorator.field";

export class PostResponseDto {
  @IntField({ example: 42 })
  id!: number;

  @StringField({ example: "First post", max_length: 255 })
  title!: string;

  @StringField({
    required: false,
    nullable: true,
    example: "Post content",
    min_length: 0,
    max_length: 10000,
  })
  content!: string | null;

  @IntField({ example: 7 })
  author_id!: number;

  @StringField({ format: "date-time", max_length: 40 })
  created_at!: string;

  @StringField({ format: "date-time", max_length: 40 })
  updated_at!: string;
}
