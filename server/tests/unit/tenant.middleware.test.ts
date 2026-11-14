import type { Request, Response } from "express";
import { describe, expect, it, vi } from "vitest";
import type { AuthContext } from "../../src/modules/auth/auth.types.js";
import { requireTenant } from "../../src/middlewares/tenant.middleware.js";

const schoolId = "c793994d-6b51-4b19-bdfb-06b77cb15072";
const otherSchoolId = "a22ac10b-6b51-4b19-bdfb-06b77cb15072";

const auth: AuthContext = {
  userId: "3878cd28-51c1-4d44-b21e-19f79fcdde27",
  email: "admin@example.test",
  fullName: "School Administrator",
  role: "ADMIN",
  schoolId,
  schoolSlug: "nova-pioneer-academy",
  membershipId: "761bcbe8-99bd-46e7-8f2f-55f79209953b",
  branchIds: [],
  branchCurricula: {},
  curricula: ["CBC"],
  sessionId: "b22f8f1d-398a-4df7-b05f-b6e5fef7627c",
  refreshSessionId: "8a7300a1-7706-4f82-ac9d-63b90f41352f",
  mustChangePassword: false,
};

function createRequest(overrides: Partial<Request> = {}): Request {
  return {
    auth,
    params: {},
    query: {},
    body: {},
    get: () => undefined,
    ...overrides,
  } as unknown as Request;
}

function createResponse() {
  const status = vi.fn().mockReturnThis();
  const json = vi.fn();
  return { response: { status, json } as unknown as Response, status, json };
}

describe("requireTenant", () => {
  it("binds the authenticated school as the request tenant", () => {
    const req = createRequest({ body: { schoolId } });
    const { response } = createResponse();
    const next = vi.fn();

    requireTenant(req, response, next);

    expect(req.tenant).toEqual({ schoolId });
    expect(next).toHaveBeenCalledOnce();
  });

  it("rejects a client-supplied school that differs from the authenticated school", () => {
    const req = createRequest({ body: { schoolId: otherSchoolId } });
    const { response, status, json } = createResponse();
    const next = vi.fn();

    requireTenant(req, response, next);

    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith({ error: "School was not found." });
    expect(next).not.toHaveBeenCalled();
  });

  it("rejects requests without an authenticated school", () => {
    const req = createRequest({ auth: undefined });
    const { response, status } = createResponse();
    const next = vi.fn();

    requireTenant(req, response, next);

    expect(status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });
});
