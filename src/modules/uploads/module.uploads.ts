import { Module } from "@nestjs/common";
import { PrismaModule } from "@/prisma/module.prisma";
import { UploadsController } from "./controller.uploads";
import { UploadsRepository } from "./repository.uploads";
import { UploadsService } from "./service.uploads";

@Module({
  imports: [PrismaModule],
  controllers: [UploadsController],
  providers: [UploadsRepository, UploadsService],
})
export class UploadsModule {}
