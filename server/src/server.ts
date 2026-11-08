import "./instrumentation.js";
import app from "./app.js";
import { env } from "./config/env.js";
import { shutdownTracing } from "./config/tracing.js";
import { logger } from "./utils/logger.js";

const server = app.listen(env.PORT, () => {
  logger.info(
    { port: env.PORT, environment: env.NODE_ENV },
    "HTTP server started",
  );
});

server.on("error", (error) => {
  logger.fatal({ err: error }, "HTTP server failed");
  process.exitCode = 1;
});

let isShuttingDown = false;

async function shutdown(signal: NodeJS.Signals): Promise<void> {
  if (isShuttingDown) return;
  isShuttingDown = true;
  logger.info({ signal }, "Graceful shutdown started");

  const forceShutdownTimer = setTimeout(() => {
    logger.error("Graceful shutdown timed out");
    process.exit(1);
  }, 10_000);

  server.close(async (error) => {
    try {
      if (error) {
        logger.error({ err: error }, "HTTP server failed to close cleanly");
        process.exitCode = 1;
      }
      await shutdownTracing();
      logger.info("HTTP server and OpenTelemetry shut down");
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
