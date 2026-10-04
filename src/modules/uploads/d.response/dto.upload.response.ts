import {
  IntField,
  StringField,
} from "../../../common/decorators/decorator.field";

export class UploadResponseDto {
  @IntField({ example: 42 })
  id!: number;

  @StringField({ example: "photo.png", max_length: 255 })
  original_name!: string;

  @StringField({ example: "image/png", max_length: 255 })
  mime_type!: string;

  @IntField({ example: 2048, min: 0 })
  size!: number;

  @IntField({ example: 7 })
  uploaded_by_id!: number;

  @StringField({ format: "date-time", max_length: 40 })
  created_at!: string;

  @StringField({ example: "/api/uploads/42/download", max_length: 255 })
  download_url!: string;
}
