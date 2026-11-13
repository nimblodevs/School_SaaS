import "dotenv/config";
import { defineConfig } from "drizzle-kit";

const databaseUrl =
  process.env.DATABASE_URL ?? process.env.DATABASE_URL_POOLED;

if (!databaseUrl) {
  throw new Error("Set DATABASE_URL or DATABASE_URL_POOLED to use Drizzle Kit.");
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: { url: databaseUrl },
  migrations: {
    schema: "drizzle",
    table: "__drizzle_migrations",
  },
  schemaFilter: ["public"],
  strict: true,
});
