import { HttpStatus, Injectable } from "@nestjs/common";
import { AppException } from "@/common/exceptions/exception.app";
import { ErrorCode } from "@/common/enums/enum.error.code";
import type { UserQueryDto } from "./d.query/dto.user.query";
import { map_user } from "./mappers/mapper.user";
import { UsersRepository } from "./repository.users";

@Injectable()
export class UsersService {
  constructor(private readonly users_repository: UsersRepository) {}

  async get_users(query: UserQueryDto) {
    const { users, total } = await this.users_repository.find_many(query);
    return {
      data: users.map(map_user),
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        total_pages: Math.ceil(total / query.limit),
      },
    };
  }

  async get_user(username: string) {
    const user = await this.users_repository.find_by_username(username);
    if (!user) {
      throw new AppException(ErrorCode.user_not_found, HttpStatus.NOT_FOUND, "Pengguna tidak ditemukan");
    }
    return map_user(user);
  }
}
