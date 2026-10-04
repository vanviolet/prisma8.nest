import "reflect-metadata";

import { Logger } from "@nestjs/common";
import { environment } from "./config/config.env";
import { bootstrap_application } from "./bootstrap";

bootstrap_application(environment).catch(() => {
  Logger.error(
    "Application failed to start; check environment and database configuration",
    undefined,
    "Bootstrap",
  );
  process.exitCode = 1;
});
