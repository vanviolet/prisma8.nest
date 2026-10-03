import { isBuiltin } from "node:module";

const optionalNestDependencies = [
  /^@nestjs\/microservices(?:\/|$)/,
  /^@nestjs\/platform-socket\.io(?:\/|$)/,
  /^@nestjs\/websockets(?:\/|$)/,
];

export const sharedBuildOptions = {
  platform: "node" as const,
  target: "node22.18",
  format: "esm" as const,
  hash: false,
  outputOptions: {
    codeSplitting: false,
  },
  deps: {
    onlyBundle: false,
    alwaysBundle: (id: string) =>
      !isBuiltin(id) && !optionalNestDependencies.some((pattern) => pattern.test(id)),
    neverBundle: optionalNestDependencies,
  },
};
