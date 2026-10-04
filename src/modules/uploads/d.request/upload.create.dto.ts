import { ApiProperty } from "@nestjs/swagger";

export class UploadCreateDto {
  @ApiProperty({
    type: "string",
    format: "binary",
    description: "File to upload (maximum 10 MB)",
  })
  file!: string;
}
