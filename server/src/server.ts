import "./instrumentation.js";
import app from "./app.js";
import { closeDatabase } from "./config/database.js";
import { env } from "./config/env.js";
import { shutdownTracing } from "./config/tracing.js";
import {
  verifyStorageConnection as verifyNeonStorageConnection,
} from "./services/neon.storage.js";
import {
  verifyStorageConnection as verifyR2StorageConnection,
} from "./services/r2.storage.js";
import { verifyEmailConnection } from "./services/email.service.js";
import { startNgrok, stopNgrok } from "./services/ngrok.service.js";
import { logger } from "./utils/logger.js";

let isShuttingDown = false;

const server = app.listen(env.PORT, () => {
  if (!env.USE_NGROK) {
    logger.info(
      { port: env.PORT, environment: env.NODE_ENV },
      "HTTP server started",
    );
  }
  const storageConnectionCheck =
    env.FILE_STORAGE_PROVIDER === "r2"
      ? verifyR2StorageConnection()
      : verifyNeonStorageConnection();
  void storageConnectionCheck.catch((error) => {
    logger.error(
      { err: error, provider: env.FILE_STORAGE_PROVIDER },
      "File storage connection verification failed",
    );
  });
  void verifyEmailConnection().catch((error) => {
    logger.error({ err: error }, "SMTP email connection verification failed");
  });

  startNgrok();
});

server.on("error", (error) => {
  logger.fatal({ err: error }, "HTTP server failed");
  process.exitCode = 1;
});

async function shutdown(signal: NodeJS.Signals): Promise<void> {
  if (isShuttingDown) return;
  isShuttingDown = true;
  logger.info({ signal }, "Graceful shutdown started");

  const forceShutdownTimer = setTimeout(() => {
    logger.error("Graceful shutdown timed out");
    process.exit(1);
  }, 10_000);

  await stopNgrok();

  server.close(async (error) => {
    if (error) {
      logger.error({ err: error }, "HTTP server failed to close cleanly");
      process.exitCode = 1;
    }

    try {
      await closeDatabase();
      await shutdownTracing();
      logger.info("HTTP server, database, and OpenTelemetry shut down");
    } catch (shutdownError) {
      logger.error({ err: shutdownError }, "Graceful shutdown failed");
      process.exitCode = 1;
    } finally {
      clearTimeout(forceShutdownTimer);
    }
  });
}

process.once("SIGINT", () => void shutdown("SIGINT"));
process.once("SIGTERM", () => void shutdown("SIGTERM"));
