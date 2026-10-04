import {
  IntField,
  StringField,
} from "../../../common/decorators/field.decorator";

export class UploadResponseDto {
  @IntField({ example: 42 })
  id!: number;

  @StringField({ example: "photo.png", maxLength: 255 })
  originalName!: string;

  @StringField({ example: "image/png", maxLength: 255 })
  mimeType!: string;

  @IntField({ example: 2048, min: 0 })
  size!: number;

  @IntField({ example: 7 })
  uploadedById!: number;

  @StringField({ format: "date-time", maxLength: 40 })
  createdAt!: string;

  @StringField({ example: "/api/uploads/42/download", maxLength: 255 })
  downloadUrl!: string;
}
