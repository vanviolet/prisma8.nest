import { definePrismaConfig } from "prisma/config";
import { defineConfig as ormConfig } from "@prisma/orm-postgres/config";
import { get_database_url } from "./src/config/config.database";

export default definePrismaConfig({
  skills: {
    agents: ["claude", "cursor", "agents", "devin"],
  },
  orm: ormConfig({
    contract: "./src/prisma/contract.prisma",
    db: {
      connection: get_database_url()!,
    },
  }),
  composer: {
    configPath: "./prisma-composer.config.ts",
  },
});
