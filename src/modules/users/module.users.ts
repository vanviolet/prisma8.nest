import { Module } from "@nestjs/common";
import { PrismaModule } from "../../prisma/module.prisma";
import { UsersController } from "./controller.users";
import { UsersRepository } from "./repository.users";
import { UsersService } from "./service.users";

@Module({
  imports: [PrismaModule],
  controllers: [UsersController],
  providers: [UsersRepository, UsersService],
  exports: [UsersService],
})
export class UsersModule {}
