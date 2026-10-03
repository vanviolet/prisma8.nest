import { IntField, StringField } from "../../../../common/decorators/field.decorator";

export class LoginResponseDto {
  @StringField({ example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...", maxLength: 4096 })
  accessToken!: string;

  @StringField({ example: "Bearer", maxLength: 32 })
  tokenType!: string;

  @IntField({ example: 3600, min: 1 })
  expiresIn!: number;
}
