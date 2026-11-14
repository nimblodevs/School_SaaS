import assert from "node:assert/strict";
import { test } from "vitest";
import { createMemberSchema } from "../../src/modules/users/users.validations.ts";

test("member management rejects a repeated branch assignment", () => {
  const result = createMemberSchema.safeParse({
    fullName: "Teacher User",
    email: "teacher@example.test",
    password: "A-secure-password-2026",
    role: "TEACHER",
    branches: [
      { branchId: "f47ac10b-58cc-4372-a567-0e02b2c3d479", curricula: ["CBC"] },
      { branchId: "f47ac10b-58cc-4372-a567-0e02b2c3d479", curricula: ["IB"] },
    ],
  });
  assert.equal(result.success, false);
});
