import { Module } from "@nestjs/common";
import { UsersModule } from "@/modules/users/module.users";
import { AuthController } from "./controller.auth";
import { AuthService } from "./service.auth";

@Module({
  imports: [UsersModule],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}
