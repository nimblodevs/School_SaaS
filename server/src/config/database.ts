import { neonConfig, Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { AppError } from "../utils/error/AppError.js";
import { env } from "./env.js";

const createDatabase = (connectionString: string) => {
  if (!neonConfig.webSocketConstructor) {
    const webSocketConstructor = globalThis.WebSocket;
    if (!webSocketConstructor) {
      throw new AppError(
        "A WebSocket implementation is required for database transactions.",
        503,
      );
    }
    neonConfig.webSocketConstructor = webSocketConstructor;
  }

  const client = new Pool({ connectionString });
  return { client, db: drizzle({ client }) };
};

type DatabaseConnection = ReturnType<typeof createDatabase>;
type Database = DatabaseConnection["db"];
export type DatabaseTransaction = Parameters<
  Parameters<Database["transaction"]>[0]
>[0];

let connection: DatabaseConnection | undefined;

export function getDatabase(): Database {
  const connectionString = env.DATABASE_URL_POOLED ?? env.DATABASE_URL;
  if (!connectionString) {
    throw new AppError("Database connection is not configured.", 503);
  }

  connection ??= createDatabase(connectionString);
  return connection.db;
}

export async function closeDatabase(): Promise<void> {
  if (!connection) return;

  const currentConnection = connection;
  await currentConnection.client.end();
  if (connection === currentConnection) connection = undefined;
}
