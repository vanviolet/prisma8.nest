import { z } from "zod";

const environmentSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.coerce.number().int().min(0).max(65535).default(3000),
  ),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN_SECONDS: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.coerce.number().int().positive().max(2_592_000).default(3600),
  ),
  CORS_ORIGIN: z.string().default("*"),
});

export type AppEnvironment = z.infer<typeof environmentSchema> & {
  CORS_ORIGINS: string[];
};

export function parseEnvironment(source: Record<string, unknown>): AppEnvironment {
  const result = environmentSchema.safeParse(source);

  if (!result.success) {
    const invalidKeys = result.error.issues.map((issue) => issue.path.join(".")).join(", ");
    throw new Error(`Invalid environment configuration: ${invalidKeys}`);
  }

  return {
    ...result.data,
    CORS_ORIGINS: result.data.CORS_ORIGIN.split(",")
      .map((origin) => origin.trim())
      .filter((origin) => origin.length > 0),
  };
}
