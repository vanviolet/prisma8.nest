import "reflect-metadata";

import { Logger } from "@nestjs/common";
import service from "../service.ts";
import { bootstrapApplication } from "./bootstrap";
import { parseEnvironment } from "./config/env.schema";

async function bootstrapComposerApplication(): Promise<void> {
  service.load();
  const input = service.input();
  const environment = parseEnvironment({
    NODE_ENV: input.nodeEnv,
    PORT: service.port(),
    JWT_SECRET: input.jwtSecret.expose(),
    JWT_EXPIRES_IN_SECONDS: input.jwtExpiresInSeconds,
    CORS_ORIGIN: input.corsOrigin,
  });

  await bootstrapApplication(environment);
}

bootstrapComposerApplication().catch(() => {
  Logger.error(
    "Application failed to start; check Composer bindings and database configuration",
    undefined,
    "Bootstrap",
  );
  process.exitCode = 1;
});
