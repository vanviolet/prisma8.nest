import { module } from "@prisma/composer";
import { envParam, envSecret } from "@prisma/composer-prisma-cloud";
import { postgres } from "@prisma/composer-prisma-cloud/orm";

import { appContract } from "./src/prisma/composer.ts";
import app from "./service.ts";

export default module("nest-template", ({ provision }) => {
  const database = provision(
    postgres({
      name: "database",
      contract: appContract,
      config: "./prisma.config.ts",
    }),
    { id: "database" },
  );

  provision(app, {
    deps: { database },
    input: {
      jwtSecret: envSecret("JWT_SECRET"),
      corsOrigin: envParam("CORS_ORIGIN"),
      jwtExpiresInSeconds: envParam("JWT_EXPIRES_IN_SECONDS"),
      nodeEnv: envParam("NODE_ENV"),
    },
  });
});
