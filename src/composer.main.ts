import "reflect-metadata";

import { Logger } from "@nestjs/common";
import service from "../service.ts";
import { bootstrap_application } from "./bootstrap";
import { parse_environment } from "./config/schema.env";

async function bootstrap_composer_application(): Promise<void> {
  service.load();
  const input = service.input();
  const environment = parse_environment({
    NODE_ENV: input.nodeEnv,
    PORT: service.port(),
    JWT_SECRET: input.jwtSecret.expose(),
    JWT_EXPIRES_IN_SECONDS: input.jwtExpiresInSeconds,
    CORS_ORIGIN: input.corsOrigin,
  });

  await bootstrap_application(environment);
}

bootstrap_composer_application().catch(() => {
  Logger.error(
    "Application failed to start; check Composer bindings and database configuration",
    undefined,
    "Bootstrap",
  );
  process.exitCode = 1;
});
