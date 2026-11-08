import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";
import type { Request, Response } from "express";
import pino from "pino";
import { pinoHttp } from "pino-http";
import { env } from "../config/env.js";

interface TraceContext {
  traceId: string;
}

const traceContext = new AsyncLocalStorage<TraceContext>();
const isDevelopment = env.NODE_ENV === "development";

export function runWithTraceId<T>(traceId: string, callback: () => T): T {
  return traceContext.run({ traceId }, callback);
}

export function getContextTraceId(): string | undefined {
  return traceContext.getStore()?.traceId;
}

export const logger = pino({
  level: env.LOG_LEVEL,
  base: {
    service: env.OTEL_SERVICE_NAME || env.SERVICE_NAME || "school-saas-api",
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "res.headers.set-cookie",
      'res.headers["set-cookie"]',
      "password",
      "passwordHash",
      "token",
      "accessToken",
      "refreshToken",
      "secret",
      "*.password",
      "*.passwordHash",
      "*.token",
      "*.accessToken",
      "*.refreshToken",
      "*.secret",
    ],
    censor: "[REDACTED]",
  },
  ...(isDevelopment && {
    transport: {
      target: "pino-pretty",
      options: {
        colorize: true,
        translateTime: "SYS:standard",
        ignore: "pid,hostname",
      },
    },
  }),
  mixin() {
    const traceId = getContextTraceId();
    return traceId ? { traceId } : {};
  },
});

function getRequestId(header: string | string[] | undefined): string {
  if (
    typeof header === "string" &&
    /^[A-Za-z0-9._-]{1,128}$/.test(header)
  ) {
    return header;
  }

  return randomUUID();
}

export const requestLogger = pinoHttp<Request, Response>({
  logger,
  genReqId(req, res) {
    const requestId = getRequestId(req.headers["x-request-id"]);
    res.setHeader("X-Request-Id", requestId);
    return requestId;
  },
  customLogLevel(_req, res, error) {
    if (error || res.statusCode >= 500) return "error";
    if (res.statusCode >= 400) return "warn";
    return "info";
  },
  customSuccessMessage(req) {
    return `${req.method} ${req.originalUrl} completed`;
  },
  customErrorMessage(req) {
    return `${req.method} ${req.originalUrl} failed`;
  },
  wrapSerializers: false,
  serializers: {
    req(req) {
      return {
        id: req.id,
        method: req.method,
        url: req.originalUrl,
        remoteAddress: req.ip,
      };
    },
    res(res) {
      return {
        statusCode: res.statusCode,
      };
    },
  },
});
