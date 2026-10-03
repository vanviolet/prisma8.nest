import node from "@prisma/composer/node";
import { compute } from "@prisma/composer-prisma-cloud";
import { postgres } from "@prisma/composer-prisma-cloud/orm";
import { type } from "arktype";
import { secretString } from "@prisma/composer/arktype";

import { appContract } from "./src/prisma/composer.ts";

export default compute({
  name: "app",
  input: type({
    jwtSecret: secretString(),
    "corsOrigin?": "string",
    "jwtExpiresInSeconds?": "string",
    "nodeEnv?": "string",
  }),
  deps: {
    database: postgres(appContract),
  },
  build: node({ module: import.meta.url, entry: "./dist/composer-server.mjs" }),
});
