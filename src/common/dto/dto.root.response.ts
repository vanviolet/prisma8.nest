import { StringField } from "@/common/decorators/decorator.field";

export class RootResponseDto {
  @StringField({ example: "ok" })
  status!: string;
}
