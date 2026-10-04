import { EnumField } from "../../../common/decorators/decorator.field";

export class HealthResponseDto {
  @EnumField(["ok"], { enum_name: "HealthStatus", example: "ok" })
  status!: "ok";
}
