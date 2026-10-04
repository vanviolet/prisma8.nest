import { StringField } from "@/common/decorators/decorator.field";

export class AuthMeResponseDto {
  @StringField({ example: "220031", min_length: 1, max_length: 100 })
  username!: string;

  @StringField({ example: "Nama Pegawai", min_length: 1, max_length: 100 })
  nama!: string;

  @StringField({ example: "01", min_length: 1, max_length: 100 })
  id_actor!: string;

  @StringField({ example: "Fakultas Teknik", min_length: 1, max_length: 100 })
  nama_actor!: string;

  @StringField({ example: "FAKULTAS", min_length: 1, max_length: 50 })
  jenis_actor!: string;

  @StringField({ example: "STRUKTURAL", min_length: 1, max_length: 100 })
  nama_pekerjaan!: string;

  @StringField({ required: false, nullable: true, example: "Dekan", max_length: 100 })
  jabatan!: string | null;
}
