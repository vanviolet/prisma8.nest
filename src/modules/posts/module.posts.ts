import { Module } from "@nestjs/common";
import { PrismaModule } from "@/prisma/module.prisma";
import { PostsController } from "./controller.posts";
import { PostsRepository } from "./repository.posts";
import { PostsService } from "./service.posts";

@Module({
  imports: [PrismaModule],
  controllers: [PostsController],
  providers: [PostsRepository, PostsService],
})
export class PostsModule {}
