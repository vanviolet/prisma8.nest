import { StringField } from "../decorators/field.decorator";

export class MessageResponseDto {
  @StringField({ example: "User successfully deleted" })
  message!: string;
}
