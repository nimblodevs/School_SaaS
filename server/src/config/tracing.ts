import { randomBytes } from "node:crypto";
import { trace, SpanStatusCode, type Attributes } from "@opentelemetry/api";
import type { ErrorRequestHandler, RequestHandler } from "express";
import { shutdownOpenTelemetry } from "../instrumentation.js";
import {
  getContextTraceId,
  logger,
  requestLogger,
  runWithTraceId,
} from "../utils/logger.js";

const TRACE_ID_PATTERN = /^(?!0{32})[0-9a-f]{32}$/i;

export function createTraceId(): string {
  return randomBytes(16).toString("hex");
}

export function getActiveTraceId(): string | null {
  return (
    trace.getActiveSpan()?.spanContext().traceId ??
    getContextTraceId() ??
    null
  );
}

export function getOrCreateTraceId(
  preferredTraceId: string | string[] | null = null,
): string {
  const activeTraceId = getActiveTraceId();
  if (activeTraceId) return activeTraceId;

  if (
    typeof preferredTraceId === "string" &&
    TRACE_ID_PATTERN.test(preferredTraceId)
  ) {
    return preferredTraceId.toLowerCase();
  }

  return createTraceId();
}

export const requestTracingMiddleware: RequestHandler = (
  req,
  res,
  next,
) => {
  const traceId = getOrCreateTraceId(req.headers["x-trace-id"]);

  res.setHeader("X-Trace-Id", traceId);
  runWithTraceId(traceId, () => requestLogger(req, res, next));
};

export function trackError(
  error: unknown,
  context: Record<string, unknown> = {},
): string | null {
  const normalizedError =
    error instanceof Error
      ? error
      : new Error("A non-Error value was thrown", { cause: error });
  const traceId = getActiveTraceId();
  const activeSpan = trace.getActiveSpan();

  if (activeSpan) {
    activeSpan.recordException(normalizedError);
    activeSpan.setStatus({ code: SpanStatusCode.ERROR });
  }

  logger.error(
    {
      ...context,
      err: normalizedError,
      ...(traceId ? { traceId } : {}),
    },
    "Application error",
  );

  return traceId;
}

export function recordAuditTrace(
  name: string,
  attributes: Attributes = {},
): string | null {
  const activeSpan = trace.getActiveSpan();
  if (!activeSpan) return null;

  const safeAttributes = Object.fromEntries(
    Object.entries(attributes).filter(
      ([key]) => !/(password|token|secret|authorization|cookie)/i.test(key),
    ),
  );
  activeSpan.addEvent(name, safeAttributes);
  return activeSpan.spanContext().traceId;
}

export const errorTrackingMiddleware: ErrorRequestHandler = (
  error,
  req,
  res,
  next,
) => {
  const traceId = trackError(error, {
    method: req.method,
    path: req.originalUrl,
  });

  if (res.headersSent) {
    next(error);
    return;
  }

  const statusCode =
    typeof error === "object" &&
    error !== null &&
    "statusCode" in error &&
    typeof error.statusCode === "number" &&
    Number.isInteger(error.statusCode) &&
    error.statusCode >= 400 &&
    error.statusCode <= 599
      ? error.statusCode
      : 500;

  res.status(statusCode).json({
    error: statusCode >= 500 ? "Internal Server Error" : "Request Error",
    message:
      statusCode >= 500
        ? "An unexpected error occurred."
        : "The request could not be completed.",
    ...(traceId ? { traceId } : {}),
  });
};

export async function shutdownTracing(): Promise<void> {
  await shutdownOpenTelemetry();
}
