import { StringField } from "../decorators/field.decorator";

export class RootResponseDto {
  @StringField({ example: "ok" })
  status!: string;
}
