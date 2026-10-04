import { StringField } from "@/common/decorators/decorator.field";

export class UserResponseDto {
  @StringField({ example: "220031", min_length: 1, max_length: 100 })
  username!: string;

  @StringField({ example: "Nama Pegawai", min_length: 1, max_length: 100 })
  nama!: string;

  @StringField({ format: "date-time", max_length: 40 })
  created_at!: string;
}
