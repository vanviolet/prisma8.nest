import { StringField } from "../decorators/decorator.field";

export class MessageResponseDto {
  @StringField({ example: "User successfully deleted" })
  message!: string;
}
