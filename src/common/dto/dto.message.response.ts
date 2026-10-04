import { StringField } from "@/common/decorators/decorator.field";

export class MessageResponseDto {
  @StringField({ example: "User successfully deleted" })
  message!: string;
}
