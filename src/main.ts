import "reflect-metadata";

import { Logger } from "@nestjs/common";
import { environment } from "./config/env.config";
import { bootstrapApplication } from "./bootstrap";

bootstrapApplication(environment).catch(() => {
  Logger.error(
    "Application failed to start; check environment and database configuration",
    undefined,
    "Bootstrap",
  );
  process.exitCode = 1;
});
