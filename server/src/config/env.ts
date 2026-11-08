import "dotenv/config";
import { z } from "zod";

const optionalUrl = z.preprocess(
  (value) =>
    typeof value === "string" && value.trim() === "" ? undefined : value,
  z.string().url().optional(),
);

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(5000),
  ALLOWED_ORIGINS: z.string().optional(),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
    .optional(),
  SERVICE_NAME: z.string().trim().min(1).optional(),
  OTEL_SERVICE_NAME: z.string().trim().min(1).default("school-saas-api"),
  OTEL_EXPORTER_OTLP_ENDPOINT: optionalUrl,
  OTEL_EXPORTER_OTLP_TRACES_ENDPOINT: optionalUrl,
  OTEL_EXPORTER_OTLP_METRICS_ENDPOINT: optionalUrl,
  OTEL_PROMETHEUS_HOST: z.string().trim().min(1).default("0.0.0.0"),
  OTEL_PROMETHEUS_PORT: z.coerce.number().int().min(1).max(65535).default(9464),
});

const parsedEnv = envSchema.parse(process.env);

export const env = {
  ...parsedEnv,
  LOG_LEVEL:
    parsedEnv.LOG_LEVEL ??
    (parsedEnv.NODE_ENV === "production" ? "info" : "debug"),
};
