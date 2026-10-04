import { IntField, NestedField, StringField } from "@/common/decorators/decorator.field";

export class LoginAuthorizationDto {
  @StringField({ example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...", max_length: 4096 })
  access_token!: string;

  @StringField({ example: "01", min_length: 1, max_length: 100 })
  id_actor!: string;

  @StringField({ example: "Fakultas Teknik", min_length: 1, max_length: 100 })
  nama_actor!: string;

  @StringField({ example: "FAKULTAS", min_length: 1, max_length: 50 })
  jenis_actor!: string;
}

export class LoginResponseDto {
  @StringField({ example: "220031", min_length: 1, max_length: 100 })
  username!: string;

  @StringField({ example: "Nama Pegawai", min_length: 1, max_length: 100 })
  nama!: string;

  @StringField({ example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...", max_length: 4096 })
  access_token!: string;

  @StringField({ example: "Bearer", max_length: 32 })
  token_type!: string;

  @IntField({ example: 3600, min: 1 })
  expires_in!: number;

  @NestedField(() => LoginAuthorizationDto, { each: true })
  authorization!: LoginAuthorizationDto[];
}
