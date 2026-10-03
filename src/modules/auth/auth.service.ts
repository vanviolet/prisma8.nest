import { createHmac, timingSafeEqual } from "node:crypto";
import { Injectable, UnauthorizedException } from "@nestjs/common";
import { environment } from "../../config/env.config";
import type { AuthenticatedUser } from "../../common/types/request-context.type";
import { verifyPassword } from "../../common/utils/password.util";
import { normalizeEmail } from "../../common/utils/string.util";
import type { UserResponseDto } from "../users/d.response/user.response.dto";
import type { LoginDto } from "./d.request/auth.login.dto";
import { AUTH_TOKEN_TYPE } from "./auth.constant";
import { UsersService } from "../users/users.service";

interface JwtPayload extends AuthenticatedUser {
  iat: number;
  exp: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

@Injectable()
export class AuthService {
  constructor(private readonly usersService: UsersService) {}

  getCurrentUser(user: AuthenticatedUser): Promise<UserResponseDto> {
    return this.usersService.getUser(user.sub);
  }

  async login(input: LoginDto) {
    const user = await this.usersService.getAuthRecordByEmail(normalizeEmail(input.email));
    if (!user?.passwordHash || !(await verifyPassword(input.password, user.passwordHash))) {
      throw new UnauthorizedException("Email or password is incorrect");
    }

    const issuedAt = Math.floor(Date.now() / 1000);
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      iat: issuedAt,
      exp: issuedAt + environment.JWT_EXPIRES_IN_SECONDS,
    };
    const accessToken = this.sign(payload);

    return {
      accessToken,
      tokenType: AUTH_TOKEN_TYPE,
      expiresIn: environment.JWT_EXPIRES_IN_SECONDS,
    };
  }

  verifyAccessToken(token: string): AuthenticatedUser {
    const [encodedHeader, encodedPayload, encodedSignature, ...extraParts] = token.split(".");
    if (!encodedHeader || !encodedPayload || !encodedSignature || extraParts.length > 0) {
      throw new UnauthorizedException("Invalid or expired access token");
    }

    const expectedSignature = this.createSignature(`${encodedHeader}.${encodedPayload}`);
    const actualSignature = Buffer.from(encodedSignature, "base64url");
    if (
      actualSignature.length !== expectedSignature.length ||
      !timingSafeEqual(actualSignature, expectedSignature)
    ) {
      throw new UnauthorizedException("Invalid or expired access token");
    }

    try {
      const header: unknown = JSON.parse(Buffer.from(encodedHeader, "base64url").toString("utf8"));
      const payload: unknown = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8"));
      if (
        !isRecord(header) ||
        header.alg !== "HS256" ||
        !isRecord(payload) ||
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
    const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
    const signingInput = `${header}.${encodedPayload}`;
    const signature = this.createSignature(signingInput).toString("base64url");
    return `${signingInput}.${signature}`;
  }

  private createSignature(value: string): Buffer {
    return createHmac("sha256", environment.JWT_SECRET).update(value).digest();
  }
}
