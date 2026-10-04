import postgres from "@prisma/orm-postgres/runtime";
import "temporal-polyfill/global";
import service from "../../service.ts";
import type { Contract } from "./contract.d.ts";
import contractJson from "./contract.json" with { type: "json" };

function load_composer_database() {
  try {
    return service.load().database.client;
  } catch {
    return undefined;
  }
}

export const db =
  load_composer_database() ??
  (process.env.DATABASE_URL
    ? postgres<Contract>({ contractJson, url: process.env.DATABASE_URL })
    : postgres<Contract>({ contractJson }));

let connection: Promise<void> | undefined;

export function connect_database(): Promise<void> {
  connection ??= db.connect().then(() => undefined).catch((error: unknown) => {
    connection = undefined;
    throw error;
  });
  return connection;
}
