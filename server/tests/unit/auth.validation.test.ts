import assert from "node:assert/strict";
import { test } from "vitest";
import { schoolRegistrationSchema } from "../../src/modules/auth/auth.validation.ts";

const schoolRegistration = {
  school: {
    name: "Example Academy",
    type: "PRIVATE",
    email: "office@example.test",
    phone: "+254700000000",
    curricula: ["CBC", "CAMBRIDGE"],
    branches: [
      {
        name: "North Campus",
        county: "Nairobi",
        subCounty: "Westlands",
        ward: "Parklands",
        area: "Parklands",
        curricula: ["CBC"],
      },
      {
        name: "South Campus",
        county: "Nairobi",
        subCounty: "Langata",
        ward: "Karen",
        area: "Karen",
        curricula: ["CAMBRIDGE"],
      },
    ],
  },
  admin: {
    fullName: "School Administrator",
    email: "ADMIN@EXAMPLE.TEST",
    password: "A-secure-password-2026",
  },
};

test("school registration accepts multiple branches with branch-specific curricula", () => {
  const parsed = schoolRegistrationSchema.parse(schoolRegistration);
  assert.equal(parsed.admin.email, "admin@example.test");
  assert.equal(parsed.school.branches.length, 2);
  assert.deepEqual(parsed.school.branches[1]?.curricula, ["CAMBRIDGE"]);
  assert.equal(parsed.school.website, "");
});

test("school registration accepts an empty website", () => {
  const input = structuredClone(schoolRegistration);
  input.school.website = "";
  assert.equal(schoolRegistrationSchema.parse(input).school.website, "");
});

test("school registration rejects curricula not enabled at the school", () => {
  const invalid = structuredClone(schoolRegistration);
  invalid.school.branches[0]!.curricula = ["IB"];
  assert.equal(schoolRegistrationSchema.safeParse(invalid).success, false);
});
