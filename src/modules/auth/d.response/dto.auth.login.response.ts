import { IntField, StringField } from "../../../common/decorators/decorator.field";

export class LoginResponseDto {
  @StringField({ example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...", max_length: 4096 })
  access_token!: string;

  @StringField({ example: "Bearer", max_length: 32 })
  token_type!: string;

  @IntField({ example: 3600, min: 1 })
  expires_in!: number;
}
