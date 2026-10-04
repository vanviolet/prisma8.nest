import { StringField } from "@/common/decorators/decorator.field";

export class UpdatePostDto {
  @StringField({ required: false, example: "Updated post", max_length: 255 })
  title?: string;

  @StringField({
    required: false,
    nullable: true,
    example: "Updated content",
    min_length: 0,
    max_length: 10000,
  })
  content?: string | null;
}
