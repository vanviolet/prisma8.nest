import { defineConfig } from "tsdown";
import { sharedBuildOptions } from "./tsdown.shared.ts";

export default defineConfig({
  ...sharedBuildOptions,
  entry: { server: "src/main.ts" },
  clean: true,
});
