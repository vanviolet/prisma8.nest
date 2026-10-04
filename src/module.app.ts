import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { AppController } from "./controller.app";
import { AuthModule } from "./modules/auth/module.auth";
import { JwtAuthGuard } from "./modules/auth/guards/guard.auth";
import { RolesGuard } from "./modules/auth/guards/guard.roles";
import { HealthModule } from "./modules/health/module.health";
import { UsersModule } from "./modules/users/module.users";
import { PostsModule } from "./modules/posts/module.posts";
import { UploadsModule } from "./modules/uploads/module.uploads";

@Module({
  imports: [AuthModule, HealthModule, UsersModule, PostsModule, UploadsModule],
  controllers: [AppController],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
