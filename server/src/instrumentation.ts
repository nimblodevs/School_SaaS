import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-http";
import { PrometheusExporter } from "@opentelemetry/exporter-prometheus";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics";
import { NodeSDK } from "@opentelemetry/sdk-node";
import { ConsoleSpanExporter } from "@opentelemetry/sdk-trace";
import { env } from "./config/env.js";

function getOtlpEndpoint(
  specificEndpoint: string | undefined,
  baseEndpoint: string | undefined,
  signal: "traces" | "metrics",
): string | undefined {
  const endpoint =
    specificEndpoint?.trim() ||
    (baseEndpoint?.trim()
      ? `${baseEndpoint.trim().replace(/\/+$/, "")}/v1/${signal}`
      : undefined);

  if (!endpoint) return undefined;

  let parsedEndpoint: URL;
  try {
    parsedEndpoint = new URL(endpoint);
  } catch (error) {
    throw new Error(`Invalid OpenTelemetry ${signal} endpoint: ${endpoint}`, {
      cause: error,
    });
  }

  if (
    parsedEndpoint.protocol !== "http:" &&
    parsedEndpoint.protocol !== "https:"
  ) {
    throw new Error(
      `OpenTelemetry ${signal} endpoint must use HTTP or HTTPS: ${endpoint}`,
    );
  }

  return parsedEndpoint.toString();
}

const baseEndpoint = env.OTEL_EXPORTER_OTLP_ENDPOINT;
const traceEndpoint = getOtlpEndpoint(
  env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT,
  baseEndpoint,
  "traces",
);
const metricEndpoint = getOtlpEndpoint(
  env.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT,
  baseEndpoint,
  "metrics",
);
const metricReaders = [
  new PrometheusExporter({
    host: env.OTEL_PROMETHEUS_HOST,
    port: env.OTEL_PROMETHEUS_PORT,
    endpoint: "/metrics",
  }),
  ...(metricEndpoint
    ? [
        new PeriodicExportingMetricReader({
          exporter: new OTLPMetricExporter({ url: metricEndpoint }),
        }),
      ]
    : []),
];

const sdk = new NodeSDK({
  serviceName:
    env.OTEL_SERVICE_NAME || env.SERVICE_NAME || "school-saas-api",
  traceExporter: traceEndpoint
    ? new OTLPTraceExporter({ url: traceEndpoint })
    : new ConsoleSpanExporter(),
  metricReaders,
  instrumentations: [
    getNodeAutoInstrumentations({
      "@opentelemetry/instrumentation-fs": {
        enabled: false,
      },
    }),
  ],
});

sdk.start();

let shutdownPromise: Promise<void> | undefined;

export function shutdownOpenTelemetry(): Promise<void> {
  shutdownPromise ??= sdk.shutdown();
  return shutdownPromise;
}
