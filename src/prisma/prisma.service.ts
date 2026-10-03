import { Injectable } from "@nestjs/common";
import type { OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { connectDatabase, db } from "./db";

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  readonly db = db;

  onModuleInit(): Promise<void> {
    return connectDatabase();
  }

  async onModuleDestroy(): Promise<void> {
    await this.db.close();
  }
}
