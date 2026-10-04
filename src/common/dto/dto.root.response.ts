import { StringField } from "../decorators/decorator.field";

export class RootResponseDto {
  @StringField({ example: "ok" })
  status!: string;
}
