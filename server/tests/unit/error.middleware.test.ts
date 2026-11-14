import type { NextFunction, Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ZodError, z } from "zod";
import { errorMiddleware } from "../../src/middlewares/error.middleware.js";
import { AppError } from "../../src/utils/error/AppError.js";
import { trackError } from "../../src/config/tracing.js";

vi.mock("../../src/config/tracing.js", () => ({
  trackError: vi.fn(() => "trace-test"),
}));

function createRequest(): Request {
  return {
    method: "POST",
    originalUrl: "/api/v1/test",
  } as Request;
}

function createResponse(headersSent = false) {
  const status = vi.fn().mockReturnThis();
  const json = vi.fn();
  return {
    response: { headersSent, status, json } as unknown as Response,
    status,
    json,
  };
}

function createValidationError(): ZodError {
  try {
    z.object({ name: z.string() }).parse({ name: 42 });
  } catch (error) {
    if (error instanceof ZodError) return error;
    throw error;
  }
  throw new Error("Expected validation to fail.");
}

describe("errorMiddleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns safe application errors with their HTTP status", () => {
    const error = new AppError("School was not found.", 404);
    const { response, status, json } = createResponse();

    errorMiddleware(error, createRequest(), response, vi.fn() as NextFunction);

    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith({ error: "School was not found." });
  });

  it("returns structured validation issues", () => {
    const { response, status, json } = createResponse();

    errorMiddleware(
      createValidationError(),
      createRequest(),
      response,
      vi.fn() as NextFunction,
    );

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({
      error: "Request validation failed.",
      issues: [{ path: "name", message: expect.any(String) }],
    });
  });

  it("maps malformed JSON to a safe 400 response", () => {
    const error = Object.assign(new SyntaxError("bad body"), {
      status: 400,
      type: "entity.parse.failed",
    });
    const { response, status, json } = createResponse();

    errorMiddleware(error, createRequest(), response, vi.fn() as NextFunction);

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({ error: "Request body is invalid." });
  });

  it("hides unexpected error details and includes its trace ID", () => {
    const { response, status, json } = createResponse();

    errorMiddleware(
      new Error("database credentials must not be exposed"),
      createRequest(),
      response,
      vi.fn() as NextFunction,
    );

    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith({
      error: "Internal Server Error",
      message: "An unexpected error occurred.",
      traceId: "trace-test",
    });
    expect(trackError).toHaveBeenCalledOnce();
  });

  it("forwards errors when response headers have already been sent", () => {
    const error = new Error("stream failed");
    const { response } = createResponse(true);
    const next = vi.fn();

    errorMiddleware(error, createRequest(), response, next);

    expect(next).toHaveBeenCalledWith(error);
  });
});
