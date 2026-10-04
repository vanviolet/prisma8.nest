import { Module } from "@nestjs/common";
import { PrismaModule } from "../../prisma/prisma.module";
import { UploadsController } from "./uploads.controller";
import { UploadsRepository } from "./uploads.repository";
import { UploadsService } from "./uploads.service";

@Module({
  imports: [PrismaModule],
  controllers: [UploadsController],
  providers: [UploadsRepository, UploadsService],
})
export class UploadsModule {}
