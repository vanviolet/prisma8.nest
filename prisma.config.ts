import { definePrismaConfig } from "prisma/config";
import { defineConfig as ormConfig } from "@prisma/orm-postgres/config";
import { getDatabaseUrl } from "./src/config/database.config";

export default definePrismaConfig({
  skills: {
    agents: ["claude", "cursor", "agents", "devin"],
  },
  orm: ormConfig({
    contract: "./src/prisma/contract.prisma",
    db: {
      connection: getDatabaseUrl()!,
    },
  }),
  composer: {
    configPath: "./prisma-composer.config.ts",
  },
});
