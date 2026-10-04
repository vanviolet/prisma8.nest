import { Injectable } from "@nestjs/common";
import type { OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { connect_database, db } from "./db";

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  readonly db = db;

  onModuleInit(): Promise<void> {
    return connect_database();
  }

  async onModuleDestroy(): Promise<void> {
    await this.db.close();
  }
}
