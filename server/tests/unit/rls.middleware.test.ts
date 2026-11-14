import type { NextFunction, Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getDatabase } from "../../src/config/database.js";
import {
  type RlsContext,
  rlsMiddleware,
  withRlsTransaction,
} from "../../src/middlewares/rls.middleware.js";

const { getDatabaseMock } = vi.hoisted(() => ({
  getDatabaseMock: vi.fn(),
}));

vi.mock("../../src/config/database.js", () => ({
  getDatabase: getDatabaseMock,
}));

type TestRequest = Request & {
  auth?: { userId: string; schoolId: string; role: string; branchIds: string[] };
  tenant?: { schoolId: string };
  rls?: RlsContext;
};

function createRequest(overrides: Partial<TestRequest> = {}): TestRequest {
  return {
    auth: {
      userId: "user-1",
      schoolId: "school-1",
      role: "TEACHER",
      branchIds: ["branch-1"],
    },
    tenant: { schoolId: "school-1" },
    ...overrides,
  } as TestRequest;
}

function createResponse() {
  const status = vi.fn().mockReturnThis();
  const json = vi.fn();
  return {
    response: { status, json } as unknown as Response,
    status,
    json,
  };
}

describe("rlsMiddleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("derives RLS scope from authenticated tenant and branch claims", () => {
    const request = createRequest();
    const { response } = createResponse();
    const next = vi.fn();

    rlsMiddleware(request, response, next as NextFunction);

    expect(request.rls).toEqual({
      schoolId: "school-1",
      role: "TEACHER",
      branchIds: ["branch-1"],
    });
    expect(next).toHaveBeenCalledOnce();
  });

  it("rejects mismatched tenant scope", () => {
    const request = createRequest({ tenant: { schoolId: "school-2" } });
    const { response, status, json } = createResponse();

    rlsMiddleware(request, response, vi.fn() as NextFunction);

    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith({ error: "School was not found." });
  });

  it("sets transaction-local tenant, role, and branch scope", async () => {
    const transaction = { execute: vi.fn().mockResolvedValue(undefined) };
    const transactionMock = vi.fn(
      async (callback: (tx: typeof transaction) => Promise<unknown>) =>
        callback(transaction),
    );
    getDatabaseMock.mockReturnValue({ transaction: transactionMock });
    const operation = vi.fn(async () => "result");

    const result = await withRlsTransaction(
      { schoolId: "school-1", role: "TEACHER", branchIds: ["branch-1"] },
      operation,
    );

    expect(result).toBe("result");
    expect(transactionMock).toHaveBeenCalledOnce();
    expect(transaction.execute).toHaveBeenCalledOnce();
    expect(operation).toHaveBeenCalledWith(transaction);
  });
});
