import { parseEnvironment } from "./env.schema";

export const environment = parseEnvironment(process.env);
