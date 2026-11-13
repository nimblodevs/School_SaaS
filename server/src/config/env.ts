import "dotenv/config";
import { z } from "zod";

const optionalUrl = z.preprocess(
  (value) =>
    typeof value === "string" && value.trim() === "" ? undefined : value,
  z.string().url().optional(),
);
const optionalCallbackUrl = z.preprocess(
  (value) =>
    typeof value === "string" && value.trim() === "" ? undefined : value,
  z
    .string()
    .trim()
    .min(1)
    .refine((value) => {
      if (value.startsWith("/") && !value.startsWith("//")) return true;
      try {
        return ["http:", "https:"].includes(new URL(value).protocol);
      } catch {
        return false;
      }
    }, "Expected an absolute HTTP(S) URL or an absolute path.")
    .optional(),
);
const optionalString = z.preprocess(
  (value) =>
    typeof value === "string" && value.trim() === "" ? undefined : value,
  z.string().trim().min(1).optional(),
);
const optionalPort = z.preprocess(
  (value) =>
    typeof value === "string" && value.trim() === "" ? undefined : value,
  z.coerce.number().int().min(1).max(65535).optional(),
);
const booleanFromEnv = z.preprocess(
  (value) => {
    if (typeof value !== "string") return value;
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") return true;
    if (normalized === "false" || normalized === "") return false;
    return value;
  },
  z.boolean().default(false),
);

const trustProxy = z.preprocess(
  (value) => {
    if (typeof value !== "string") return value;
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") return true;
    if (normalized === "false" || normalized === "") return false;
    if (/^\d+$/.test(normalized)) return Number(normalized);
    return normalized.split(",").map((entry) => entry.trim());
  },
  z
    .union([z.boolean(), z.number().int().nonnegative(), z.array(z.string())])
    .default(false),
);

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(5000),
  ALLOWED_ORIGINS: z.string().optional(),
  TRUST_PROXY: trustProxy,
  DATABASE_URL: optionalUrl,
  DATABASE_URL_POOLED: optionalUrl,
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
  FILE_STORAGE_PROVIDER: z.enum(["neon", "r2"]).default("neon"),
  SMTP_HOST: optionalString,
  SMTP_PORT: optionalPort,
  SMTP_SECURE: booleanFromEnv,
  SMTP_USER: optionalString,
  SMTP_PASSWORD: optionalString,
  AUTH_EMAIL_FROM: optionalString,
  USE_NGROK: booleanFromEnv,
  NGROK_AUTHTOKEN: optionalString,
  NGROK_URL: optionalUrl,
  R2_ACCOUNT_ID: z.string().trim().min(1).optional(),
  R2_ACCESS_KEY_ID: z.string().trim().min(1).optional(),
  R2_SECRET_ACCESS_KEY: z.string().trim().min(1).optional(),
  R2_BUCKET_NAME: z.string().trim().min(1).optional(),
  AWS_ENDPOINT_URL_S3: optionalUrl,
  NEON_OBJECT_STORAGE_ENDPOINT: optionalUrl,
  AWS_ACCESS_KEY_ID: z.string().trim().min(1).optional(),
  NEON_OBJECT_STORAGE_ACCESS_KEY_ID: z.string().trim().min(1).optional(),
  AWS_SECRET_ACCESS_KEY: z.string().trim().min(1).optional(),
  NEON_OBJECT_STORAGE_SECRET_ACCESS_KEY: z.string().trim().min(1).optional(),
  AWS_REGION: z.string().trim().min(1).optional(),
  NEON_OBJECT_STORAGE_REGION: z.string().trim().min(1).optional(),
  AWS_S3_BUCKET: z.string().trim().min(1).optional(),
  NEON_OBJECT_STORAGE_BUCKET: z.string().trim().min(1).optional(),
  MPESA_ENVIRONMENT: z.enum(["sandbox", "production"]).default("sandbox"),
  MPESA_CONSUMER_KEY: optionalString,
  MPESA_CONSUMER_SECRET: optionalString,
  MPESA_SHORTCODE: optionalString,
  MPESA_PASSKEY: optionalString,
  MPESA_API_KEY: optionalString,
  MPESA_ALLOWED_IPS: optionalString,
  MPESA_INITIATOR_NAME: optionalString,
  MPESA_INITIATOR_PASSWORD: optionalString,
  MPESA_SECURITY_CREDENTIAL: optionalString,
  MPESA_CERT_PATH: optionalString,
  MPESA_CALLBACK_URL: optionalCallbackUrl,
  MPESA_B2C_RESULT_URL: optionalCallbackUrl,
  MPESA_B2C_TIMEOUT_URL: optionalCallbackUrl,
  MPESA_REVERSAL_RESULT_URL: optionalCallbackUrl,
  MPESA_REVERSAL_TIMEOUT_URL: optionalCallbackUrl,
  MPESA_TRANSACTIONSTATUS_RESULT_URL: optionalCallbackUrl,
  MPESA_TRANSACTIONSTATUS_TIMEOUT_URL: optionalCallbackUrl,
  MPESA_RATIBA_CALLBACK_URL: optionalCallbackUrl,
  MPESA_QUEUE_TIMEOUT_URL: optionalCallbackUrl,
  MPESA_RESULT_URL: optionalCallbackUrl,
})
  .refine(
    ({ USE_NGROK, NGROK_AUTHTOKEN, NGROK_URL }) =>
      !USE_NGROK || Boolean(NGROK_URL || NGROK_AUTHTOKEN),
    {
      path: ["NGROK_URL"],
      message:
        "Set NGROK_URL or NGROK_AUTHTOKEN when USE_NGROK=true.",
    },
  )
  .refine(
    ({ USE_NGROK, NODE_ENV }) => !USE_NGROK || NODE_ENV === "development",
    {
      path: ["USE_NGROK"],
      message: "Ngrok can only be enabled in development.",
    },
  )
  .refine(
    ({ USE_NGROK, MPESA_CALLBACK_URL }) =>
      !MPESA_CALLBACK_URL?.startsWith("/") || USE_NGROK,
    {
      path: ["MPESA_CALLBACK_URL"],
      message:
        "MPESA_CALLBACK_URL must be an absolute URL unless USE_NGROK=true.",
    },
  );

const parsedEnv = envSchema.parse(process.env);

export const env = {
  ...parsedEnv,
  LOG_LEVEL:
    parsedEnv.LOG_LEVEL ??
    (parsedEnv.NODE_ENV === "production" ? "info" : "debug"),
};
