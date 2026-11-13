import { drizzle } from "drizzle-orm/neon-http";
import { AppError } from "../utils/error/AppError.js";
import { env } from "./env.js";

const createDatabase = (connectionString: string) =>
  drizzle(connectionString);

type Database = ReturnType<typeof createDatabase>;

let database: Database | undefined;

export function getDatabase(): Database {
  const connectionString = env.DATABASE_URL_POOLED ?? env.DATABASE_URL;
  if (!connectionString) {
    throw new AppError("Database connection is not configured.", 503);
  }

  database ??= createDatabase(connectionString);
  return database;
}
