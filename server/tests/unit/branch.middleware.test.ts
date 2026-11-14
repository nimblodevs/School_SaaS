import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getDatabase } from "../../src/config/database.js";
import type { AuthContext, SchoolRole } from "../../src/modules/auth/auth.types.js";
import { requireBranchAccess } from "../../src/middlewares/branch.middleware.js";

vi.mock("../../src/config/database.js", () => ({
  getDatabase: vi.fn(),
}));

const schoolId = "c793994d-6b51-4b19-bdfb-06b77cb15072";
const branchId = "c6392e84-9f2e-4665-a727-d05c2151c248";

function createAuth(role: SchoolRole, branchIds: string[]): AuthContext {
  return {
    userId: "3878cd28-51c1-4d44-b21e-19f79fcdde27",
    email: "admin@example.test",
    fullName: "School Administrator",
    role,
    schoolId,
    schoolSlug: "nova-pioneer-academy",
    membershipId: "761bcbe8-99bd-46e7-8f2f-55f79209953b",
    branchIds,
    branchCurricula: {},
    curricula: ["CBC"],
    sessionId: "b22f8f1d-398a-4df7-b05f-b6e5fef7627c",
    refreshSessionId: "8a7300a1-7706-4f82-ac9d-63b90f41352f",
    mustChangePassword: false,
  };
}

function createRequest(
  role: SchoolRole,
  branchIds: string[],
  id = branchId,
): Request {
  return {
    auth: createAuth(role, branchIds),
    tenant: { schoolId },
    rls: { schoolId, role, branchIds },
    params: { branchId: id },
  } as unknown as Request;
}

function createResponse() {
  const status = vi.fn().mockReturnThis();
  const json = vi.fn();
  return { response: { status, json } as unknown as Response, status, json };
}

describe("requireBranchAccess", () => {
  let limit: ReturnType<typeof vi.fn>;
  let database: {
    select: ReturnType<typeof vi.fn>;
    transaction: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    limit = vi.fn().mockResolvedValue([{ id: branchId }]);
    const query = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit,
    };
    const select = vi.fn(() => query);
    const transaction = {
      execute: vi.fn().mockResolvedValue(undefined),
      select,
    };
    database = {
      select,
      transaction: vi.fn((operation) => operation(transaction)),
    };
    vi.mocked(getDatabase).mockReturnValue(
      database as unknown as ReturnType<typeof getDatabase>,
    );
  });

  it("allows a school ADMIN to access any branch in their school", async () => {
    const req = createRequest("ADMIN", []);
    const { response } = createResponse();
    const next = vi.fn();

    await requireBranchAccess(req, response, next);

    expect(req.branch).toEqual({ id: branchId, schoolId });
    expect(next).toHaveBeenCalledOnce();
  });

  it("allows a non-admin only when the branch is assigned to their membership", async () => {
    const req = createRequest("TEACHER", [branchId]);
    const { response } = createResponse();
    const next = vi.fn();

    await requireBranchAccess(req, response, next);

    expect(req.branch).toEqual({ id: branchId, schoolId });
    expect(next).toHaveBeenCalledOnce();
  });

  it("hides branches that are not assigned to a non-admin", async () => {
    const req = createRequest("TEACHER", []);
    const { response, status, json } = createResponse();
    const next = vi.fn();

    await requireBranchAccess(req, response, next);

    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith({ error: "Branch was not found." });
    expect(next).not.toHaveBeenCalled();
  });

  it("rejects a branch outside the authenticated school", async () => {
    limit.mockResolvedValue([]);
    const req = createRequest("ADMIN", []);
    const { response, status } = createResponse();
    const next = vi.fn();

    await requireBranchAccess(req, response, next);

    expect(status).toHaveBeenCalledWith(404);
    expect(next).not.toHaveBeenCalled();
  });

  it("rejects malformed branch IDs before querying the database", async () => {
    const req = createRequest("ADMIN", [], "not-a-uuid");
    const { response, status } = createResponse();
    const next = vi.fn();

    await requireBranchAccess(req, response, next);

    expect(status).toHaveBeenCalledWith(400);
    expect(database.select).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });
});
