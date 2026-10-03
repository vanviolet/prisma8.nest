import { ApiProperty } from "@nestjs/swagger";

export class HealthResponseDto {
  @ApiProperty({ enum: ["ok"], enumName: "HealthStatus", example: "ok" })
  status!: "ok";
}
