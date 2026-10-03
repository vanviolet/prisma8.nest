import { ApiProperty } from "@nestjs/swagger";

export class RootResponseDto {
  @ApiProperty({ example: "ok" })
  status!: string;
}
