import { HttpStatus, Injectable } from "@nestjs/common";
import { AppException } from "@/common/exceptions/exception.app";
import { ErrorCode } from "@/common/enums/enum.error.code";
import { hash_password } from "@/common/utils/util.password";
import { normalize_email } from "@/common/utils/util.string";
import type { UserQueryDto } from "./d.query/dto.user.query";
import type { CreateUserDto } from "./d.request/dto.user.create";
import type { UpdateUserDto } from "./d.request/dto.user.update";
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

  async get_user(id: number) {
    const user = await this.users_repository.find_by_id(id);
    if (!user) {
      throw new AppException(
        ErrorCode.user_not_found,
        HttpStatus.NOT_FOUND,
        "User not found",
      );
    }
    return map_user(user);
  }

  async create_user(input: CreateUserDto) {
    const email = normalize_email(input.email);
    const existing_user = await this.users_repository.find_by_email(email);
    if (existing_user) {
      throw new AppException(
        ErrorCode.user_email_exists,
        HttpStatus.CONFLICT,
        "A user with this email already exists",
      );
    }

    const user = await this.users_repository.create({
      email,
      ...(input.username === undefined ? {} : { username: input.username }),
      ...(input.name === undefined ? {} : { name: input.name }),
      password_hash: await hash_password(input.password),
    });

    return map_user(user);
  }

  async update_user(id: number, input: UpdateUserDto) {
    if (input.name === undefined && input.password === undefined) {
      throw new AppException(
        ErrorCode.validation_error,
        HttpStatus.UNPROCESSABLE_ENTITY,
        "At least one updatable field is required",
        [{ field: "body", message: "Provide name or password" }],
      );
    }

    const existing_user = await this.users_repository.find_by_id(id);
    if (!existing_user) {
      throw new AppException(
        ErrorCode.user_not_found,
        HttpStatus.NOT_FOUND,
        "User not found",
      );
    }

    const updated_user = await this.users_repository.update(id, {
      ...(input.name === undefined ? {} : { name: input.name }),
      ...(input.password === undefined
        ? {}
        : { password_hash: await hash_password(input.password) }),
    });
    if (!updated_user) {
      throw new AppException(
        ErrorCode.user_not_found,
        HttpStatus.NOT_FOUND,
        "User not found",
      );
    }

    return map_user(updated_user);
  }

  async delete_user(id: number): Promise<{ message: string }> {
    const existing_user = await this.users_repository.find_by_id(id);
    if (!existing_user) {
      throw new AppException(
        ErrorCode.user_not_found,
        HttpStatus.NOT_FOUND,
        "User not found",
      );
    }

    await this.users_repository.delete(id);
    return { message: "User successfully deleted" };
  }

  get_auth_record_by_email(email: string) {
    return this.users_repository.find_auth_record_by_email(email);
  }
}
