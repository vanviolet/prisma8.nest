import { defineConfig } from "tsdown";
import { sharedBuildOptions } from "./tsdown.shared.ts";

export default defineConfig({
  ...sharedBuildOptions,
  entry: { "composer-server": "src/composer.main.ts" },
  clean: false,
});
