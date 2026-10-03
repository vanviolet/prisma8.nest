import postgres from "@prisma/orm-postgres/runtime";

import "temporal-polyfill/global";

import service from "../../service.ts";
import type { Contract } from "./contract.d.ts";
import contractJson from "./contract.json" with { type: "json" };
import { getDatabaseUrl } from "../config/database.config";

function loadComposerDatabase() {
  try {
    return service.load().database.client;
  } catch {
    return undefined;
  }
}

const composerDatabase = loadComposerDatabase();
const databaseUrl = composerDatabase ? undefined : getDatabaseUrl();

export const db =
  composerDatabase ??
  (databaseUrl
    ? postgres<Contract>({ contractJson, url: databaseUrl })
    : postgres<Contract>({ contractJson }));

let connection: Promise<void> | undefined;

export function connectDatabase(): Promise<void> {
  connection ??= db.connect().then(() => undefined).catch((error: unknown) => {
    connection = undefined;
    throw error;
  });
  return connection;
}
