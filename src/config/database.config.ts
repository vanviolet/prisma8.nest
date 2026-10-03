import { z } from "zod";

const databaseUrlSchema = z.string().url().refine(
  (value) => value.startsWith("postgresql://") || value.startsWith("postgres://"),
  "DATABASE_URL must use the PostgreSQL protocol",
);

export function getDatabaseUrl(): string | undefined {
  const value = process.env.DATABASE_URL;

  if (value === undefined || value.length === 0) {
    return undefined;
  }

  const result = databaseUrlSchema.safeParse(value);

  if (!result.success) {
    throw new Error("Invalid DATABASE_URL configuration");
  }

  return result.data;
}
