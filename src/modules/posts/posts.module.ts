import { Module } from "@nestjs/common";
import { PrismaModule } from "../../prisma/prisma.module";
import { PostsController } from "./posts.controller";
import { PostsRepository } from "./posts.repository";
import { PostsService } from "./posts.service";

@Module({
  imports: [PrismaModule],
  controllers: [PostsController],
  providers: [PostsRepository, PostsService],
})
export class PostsModule {}
