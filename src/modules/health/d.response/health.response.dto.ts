import { EnumField } from "../../../common/decorators/field.decorator";

export class HealthResponseDto {
  @EnumField(["ok"], { enumName: "HealthStatus", example: "ok" })
  status!: "ok";
}
