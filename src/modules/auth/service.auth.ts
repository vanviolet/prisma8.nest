import {
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common";
import { createHmac, timingSafeEqual } from "node:crypto";
import { environment } from "@/config/config.env";
import type { AuthenticatedUser } from "@/common/types/type.request.context";
import { PrismaService } from "@/prisma/service.prisma";
import type { LoginDto } from "./d.request/dto.auth.login";
import type { LoginResponseDto, LoginAuthorizationDto } from "./d.response/dto.auth.login.response";
import type { AuthMeResponseDto } from "./d.response/dto.auth.me.response";
import { auth_token_type } from "./constant.auth";

interface HrmsAssignment {
  nama_pekerjaan: string | null;
  tipe_lembaga: string | null;
  kd_lembaga: string | null;
  kd_sub_lembaga: string | null;
  jabatan: string | null;
}

interface HrmsLoginResponse {
  id_pegawai: string;
  nama: string;
  penugasan: HrmsAssignment[];
}

interface JwtPayload extends AuthenticatedUser {
  iat: number;
  exp: number;
}

interface ActorAuthorization extends LoginAuthorizationDto {
  payload: JwtPayload;
}

function is_record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function as_optional_string(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function parse_hrms_response(value: unknown): HrmsLoginResponse | null {
  if (!is_record(value)) return null;
  if (typeof value.id_pegawai !== "string" || typeof value.nama !== "string") return null;
  if (value.penugasan !== null && !Array.isArray(value.penugasan)) return null;

  const penugasan: HrmsAssignment[] = [];
  for (const item of value.penugasan ?? []) {
    if (!is_record(item)) return null;
    penugasan.push({
      nama_pekerjaan: as_optional_string(item.nama_pekerjaan),
      tipe_lembaga: as_optional_string(item.tipe_lembaga),
      kd_lembaga: as_optional_string(item.kd_lembaga),
      kd_sub_lembaga: as_optional_string(item.kd_sub_lembaga),
      jabatan: as_optional_string(item.jabatan),
    });
  }

  return { id_pegawai: value.id_pegawai, nama: value.nama, penugasan };
}

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  get_current_user(user: AuthenticatedUser): AuthMeResponseDto {
    return {
      username: user.username,
      nama: user.nama,
      id_actor: user.id_actor,
      nama_actor: user.nama_actor,
      jenis_actor: user.jenis_actor,
      nama_pekerjaan: user.nama_pekerjaan,
      jabatan: user.jabatan,
    };
  }

  async login(input: LoginDto): Promise<LoginResponseDto> {
    const hrms_base_url = environment.HRMS_BASE_URL;
    if (!hrms_base_url) {
      throw new ServiceUnavailableException("HRMS belum dikonfigurasi");
    }

    let response: Response;
    try {
      response = await fetch(new URL("/api/v2/login-penugasan", hrms_base_url), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          username: input.username,
          password: input.password,
          id_institusi: environment.HRMS_ID_INSTITUSI,
        }),
        signal: AbortSignal.timeout(30_000),
      });
    } catch {
      throw new ServiceUnavailableException("Layanan HRMS tidak dapat dihubungi");
    }

    if (response.status === 401 || response.status === 403) {
      throw new UnauthorizedException("Username atau password HRMS tidak valid");
    }
    if (!response.ok) {
      throw new ServiceUnavailableException("Layanan HRMS gagal memproses login");
    }

    let hrms_user: HrmsLoginResponse | null;
    try {
      hrms_user = parse_hrms_response(await response.json());
    } catch {
      hrms_user = null;
    }
    if (!hrms_user) {
      throw new ServiceUnavailableException("Respons login HRMS tidak valid");
    }

    const allowed_nama_pekerjaans = new Set([
      "TENDIK",
      "STRUKTURAL",
      "STAF",
      "KOORDINATOR LEMBAGA",
    ]);
    const valid_assignments = hrms_user.penugasan.filter(
      (assignment) =>
        assignment.nama_pekerjaan !== null &&
        allowed_nama_pekerjaans.has(assignment.nama_pekerjaan),
    );
    if (valid_assignments.length === 0) {
      throw new UnauthorizedException("Tidak ada penugasan HRMS yang diizinkan");
    }

    const actors: ActorAuthorization[] = [];
    for (const assignment of valid_assignments) {
      const actor_code =
        assignment.tipe_lembaga === "AKADEMIK"
          ? assignment.kd_lembaga
            ? assignment.kd_sub_lembaga || assignment.kd_lembaga
            : null
          : assignment.kd_lembaga;
      if (!actor_code || actors.some((authorization) => authorization.id_actor === actor_code)) {
        continue;
      }

      const actor = await this.prisma.db.orm.sarpras.aktor.first({ kode: actor_code });
      if (!actor) continue;

      const nama_pekerjaan = assignment.nama_pekerjaan;
      if (!nama_pekerjaan) continue;
      const payload: JwtPayload = {
        username: hrms_user.id_pegawai,
        nama: hrms_user.nama,
        id_actor: actor.kode,
        nama_actor: actor.nama,
        jenis_actor: actor.jenis,
        nama_pekerjaan,
        jabatan: assignment.jabatan,
        iat: 0,
        exp: 0,
      };
      actors.push({
        access_token: "",
        id_actor: actor.kode,
        nama_actor: actor.nama,
        jenis_actor: actor.jenis,
        payload,
      });
    }

    if (actors.length === 0) {
      throw new UnauthorizedException("Actor untuk penugasan HRMS tidak ditemukan");
    }

    await this.sync_pengguna(hrms_user.id_pegawai, hrms_user.nama);
    const issued_at = Math.floor(Date.now() / 1000);
    for (const authorization of actors) {
      authorization.payload.iat = issued_at;
      authorization.payload.exp = issued_at + environment.JWT_EXPIRES_IN_SECONDS;
      authorization.access_token = this.sign(authorization.payload);
    }

    const { access_token } = actors[0];
    return {
      username: hrms_user.id_pegawai,
      nama: hrms_user.nama,
      access_token,
      token_type: auth_token_type,
      expires_in: environment.JWT_EXPIRES_IN_SECONDS,
      authorization: actors.map(({ payload: _payload, ...authorization }) => authorization),
    };
  }

  verify_access_token(token: string): AuthenticatedUser {
    const [encoded_header, encoded_payload, encoded_signature, ...extra_parts] = token.split(".");
    if (!encoded_header || !encoded_payload || !encoded_signature || extra_parts.length > 0) {
      throw new UnauthorizedException("Token akses tidak valid atau kedaluwarsa");
    }

    const expected_signature = this.create_signature(`${encoded_header}.${encoded_payload}`);
    const actual_signature = Buffer.from(encoded_signature, "base64url");
    if (
      actual_signature.length !== expected_signature.length ||
      !timingSafeEqual(actual_signature, expected_signature)
    ) {
      throw new UnauthorizedException("Token akses tidak valid atau kedaluwarsa");
    }

    try {
      const header: unknown = JSON.parse(Buffer.from(encoded_header, "base64url").toString("utf8"));
      const payload: unknown = JSON.parse(Buffer.from(encoded_payload, "base64url").toString("utf8"));
      if (
        !is_record(header) ||
        header.alg !== "HS256" ||
        !is_record(payload) ||
        typeof payload.username !== "string" ||
        typeof payload.nama !== "string" ||
        typeof payload.id_actor !== "string" ||
        typeof payload.nama_actor !== "string" ||
        typeof payload.jenis_actor !== "string" ||
        typeof payload.nama_pekerjaan !== "string" ||
        !(typeof payload.jabatan === "string" || payload.jabatan === null) ||
        typeof payload.exp !== "number" ||
        payload.exp <= Math.floor(Date.now() / 1000)
      ) {
        throw new UnauthorizedException("Token akses tidak valid atau kedaluwarsa");
      }

      return {
        username: payload.username,
        nama: payload.nama,
        id_actor: payload.id_actor,
        nama_actor: payload.nama_actor,
        jenis_actor: payload.jenis_actor,
        nama_pekerjaan: payload.nama_pekerjaan,
        jabatan: payload.jabatan,
      };
    } catch {
      throw new UnauthorizedException("Token akses tidak valid atau kedaluwarsa");
    }
  }

  private async sync_pengguna(username: string, nama: string): Promise<void> {
    const pengguna = this.prisma.db.orm.sarpras.pengguna;
    const existing = await pengguna.first({ id_pegawai: username });
    if (existing) {
      await pengguna.where({ id_pegawai: username }).update({
        nama,
        diubah_pada: new Date().toISOString(),
      });
      return;
    }
    await pengguna.create({ id_pegawai: username, nama });
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
