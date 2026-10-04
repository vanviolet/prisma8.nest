import { z } from "zod";

const database_url_schema = z.string().url().refine(
  (value) => value.startsWith("postgresql://") || value.startsWith("postgres://"),
  "DATABASE_URL must use the PostgreSQL protocol",
);

export function get_database_url(): string | undefined {
  const value = process.env.DATABASE_URL;

  if (value === undefined || value.length === 0) {
    return undefined;
  }

  const result = database_url_schema.safeParse(value);

  if (!result.success) {
    throw new Error("Invalid DATABASE_URL configuration");
  }

  return result.data;
}
