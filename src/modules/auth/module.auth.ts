import { Module } from "@nestjs/common";
import { PrismaModule } from "@/prisma/module.prisma";
import { AuthController } from "./controller.auth";
import { AuthService } from "./service.auth";

@Module({
  imports: [PrismaModule],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}
