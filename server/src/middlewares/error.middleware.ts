import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import { trackError } from "../config/tracing.js";
import { AppError } from "../utils/error/AppError.js";

function isHttpStatus(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 400 &&
    value <= 599
  );
}

function getStatusCode(error: unknown): number {
  if (error instanceof AppError) {
    return isHttpStatus(error.statusCode) ? error.statusCode : 500;
  }
  if (error instanceof ZodError) return 400;
  if (
    error instanceof Error &&
    "type" in error &&
    error.type === "entity.parse.failed"
  ) {
    return 400;
  }
  if (typeof error === "object" && error !== null) {
    if ("statusCode" in error && isHttpStatus(error.statusCode)) {
      return error.statusCode;
    }
    if ("status" in error && isHttpStatus(error.status)) {
      return error.status;
    }
  }
  return 500;
}

function isInvalidJson(error: unknown): boolean {
  return (
    error instanceof Error &&
    "type" in error &&
    error.type === "entity.parse.failed"
  );
}

export const errorMiddleware: ErrorRequestHandler = (
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

  const statusCode = getStatusCode(error);
  if (error instanceof ZodError) {
    res.status(400).json({
      error: "Request validation failed.",
      issues: error.issues.map(({ path, message }) => ({
        path: path.join("."),
        message,
      })),
    });
    return;
  }
  if (error instanceof AppError && statusCode < 500) {
    res.status(statusCode).json({ error: error.message });
    return;
  }
  if (isInvalidJson(error)) {
    res.status(400).json({ error: "Request body is invalid." });
    return;
  }
  if (statusCode < 500) {
    res.status(statusCode).json({
      error: "Request Error",
      message: "The request could not be completed.",
    });
    return;
  }

  res.status(500).json({
    error: "Internal Server Error",
    message: "An unexpected error occurred.",
    ...(traceId ? { traceId } : {}),
  });
};
