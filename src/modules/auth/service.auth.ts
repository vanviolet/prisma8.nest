import { createHmac, timingSafeEqual } from "node:crypto";
import { Injectable, UnauthorizedException } from "@nestjs/common";
import { environment } from "@/config/config.env";
import type { AuthenticatedUser } from "@/common/types/type.request.context";
import { verify_password } from "@/common/utils/util.password";
import { normalize_email } from "@/common/utils/util.string";
import type { UserResponseDto } from "@/modules/users/d.response/dto.user.response";
import type { LoginDto } from "./d.request/dto.auth.login";
import { auth_token_type } from "./constant.auth";
import { UsersService } from "@/modules/users/service.users";

interface JwtPayload extends AuthenticatedUser {
  iat: number;
  exp: number;
}

function is_record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

@Injectable()
export class AuthService {
  constructor(private readonly users_service: UsersService) {}

  get_current_user(user: AuthenticatedUser): Promise<UserResponseDto> {
    return this.users_service.get_user(user.sub);
  }

  async login(input: LoginDto) {
    const user = await this.users_service.get_auth_record_by_email(normalize_email(input.email));
    if (!user?.password_hash || !(await verify_password(input.password, user.password_hash))) {
      throw new UnauthorizedException("Email or password is incorrect");
    }

    const issued_at = Math.floor(Date.now() / 1000);
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      iat: issued_at,
      exp: issued_at + environment.JWT_EXPIRES_IN_SECONDS,
    };
    const access_token = this.sign(payload);

    return {
      access_token,
      token_type: auth_token_type,
      expires_in: environment.JWT_EXPIRES_IN_SECONDS,
    };
  }

  verify_access_token(token: string): AuthenticatedUser {
    const [encoded_header, encoded_payload, encoded_signature, ...extra_parts] = token.split(".");
    if (!encoded_header || !encoded_payload || !encoded_signature || extra_parts.length > 0) {
      throw new UnauthorizedException("Invalid or expired access token");
    }

    const expected_signature = this.create_signature(`${encoded_header}.${encoded_payload}`);
    const actual_signature = Buffer.from(encoded_signature, "base64url");
    if (
      actual_signature.length !== expected_signature.length ||
      !timingSafeEqual(actual_signature, expected_signature)
    ) {
      throw new UnauthorizedException("Invalid or expired access token");
    }

    try {
      const header: unknown = JSON.parse(Buffer.from(encoded_header, "base64url").toString("utf8"));
      const payload: unknown = JSON.parse(Buffer.from(encoded_payload, "base64url").toString("utf8"));
      if (
        !is_record(header) ||
        header.alg !== "HS256" ||
        !is_record(payload) ||
        typeof payload.sub !== "number" ||
        !Number.isSafeInteger(payload.sub) ||
        typeof payload.email !== "string" ||
        (payload.role !== "USER" && payload.role !== "ADMIN") ||
        typeof payload.exp !== "number" ||
        payload.exp <= Math.floor(Date.now() / 1000)
      ) {
        throw new UnauthorizedException("Invalid or expired access token");
      }

      return { sub: payload.sub, email: payload.email, role: payload.role };
    } catch {
      throw new UnauthorizedException("Invalid or expired access token");
    }
  }

  private sign(payload: JwtPayload): string {
    const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
    const encoded_payload = Buffer.from(JSON.stringify(payload)).toString("base64url");
    const signing_input = `${header}.${encoded_payload}`;
    const signature = this.create_signature(signing_input).toString("base64url");
    return `${signing_input}.${signature}`;
  }

  private create_signature(value: string): Buffer {
    return createHmac("sha256", environment.JWT_SECRET).update(value).digest();
  }
}
