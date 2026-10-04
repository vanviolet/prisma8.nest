import { Module } from "@nestjs/common";
import { HealthController } from "./controller.health";

@Module({ controllers: [HealthController] })
export class HealthModule {}
