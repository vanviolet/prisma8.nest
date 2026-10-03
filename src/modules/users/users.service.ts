import { HttpStatus, Injectable } from "@nestjs/common";
import { AppException } from "../../common/exceptions/app.exception";
import { ErrorCode } from "../../common/enums/error-code.enum";
import { hashPassword } from "../../common/utils/password.util";
import { normalizeEmail } from "../../common/utils/string.util";
import type { UserQueryDto } from "./d.query/user.query.dto";
import type { CreateUserDto } from "./d.request/user.create.dto";
import type { UpdateUserDto } from "./d.request/user.update.dto";
import { mapUser } from "./mappers/user.mapper";
import { UsersRepository } from "./users.repository";

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async getUsers(query: UserQueryDto) {
    const { users, total } = await this.usersRepository.findMany(query);

    return {
      data: users.map(mapUser),
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async getUser(id: number) {
    const user = await this.usersRepository.findById(id);
    if (!user) {
      throw new AppException(ErrorCode.USER_NOT_FOUND, HttpStatus.NOT_FOUND, "User not found");
    }
    return mapUser(user);
  }

  async createUser(input: CreateUserDto) {
    const email = normalizeEmail(input.email);
    const existingUser = await this.usersRepository.findByEmail(email);
    if (existingUser) {
      throw new AppException(
        ErrorCode.USER_EMAIL_EXISTS,
        HttpStatus.CONFLICT,
        "A user with this email already exists",
      );
    }

    const user = await this.usersRepository.create({
      email,
      ...(input.username === undefined ? {} : { username: input.username }),
      ...(input.name === undefined ? {} : { name: input.name }),
      passwordHash: await hashPassword(input.password),
    });

    return mapUser(user);
  }

  async updateUser(id: number, input: UpdateUserDto) {
    if (input.name === undefined && input.password === undefined) {
      throw new AppException(
        ErrorCode.VALIDATION_ERROR,
        HttpStatus.UNPROCESSABLE_ENTITY,
        "At least one updatable field is required",
        [{ field: "body", message: "Provide name or password" }],
      );
    }

    const existingUser = await this.usersRepository.findById(id);
    if (!existingUser) {
      throw new AppException(ErrorCode.USER_NOT_FOUND, HttpStatus.NOT_FOUND, "User not found");
    }

    const updatedUser = await this.usersRepository.update(id, {
      ...(input.name === undefined ? {} : { name: input.name }),
      ...(input.password === undefined ? {} : { passwordHash: await hashPassword(input.password) }),
    });
    if (!updatedUser) {
      throw new AppException(ErrorCode.USER_NOT_FOUND, HttpStatus.NOT_FOUND, "User not found");
    }

    return mapUser(updatedUser);
  }

  async deleteUser(id: number): Promise<{ message: string }> {
    const existingUser = await this.usersRepository.findById(id);
    if (!existingUser) {
      throw new AppException(ErrorCode.USER_NOT_FOUND, HttpStatus.NOT_FOUND, "User not found");
    }

    await this.usersRepository.delete(id);
    return { message: "User successfully deleted" };
  }

  getAuthRecordByEmail(email: string) {
    return this.usersRepository.findAuthRecordByEmail(email);
  }
}
