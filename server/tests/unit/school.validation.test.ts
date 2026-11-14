import assert from "node:assert/strict";
import { test } from "vitest";
import {
  createBranchSchema,
  updateCurriculaSchema,
} from "../../src/modules/school/school.validations.ts";

const mainBranchId = "f47ac10b-58cc-4372-a567-0e02b2c3d479";
const secondBranchId = "a22ac10b-58cc-4372-a567-0e02b2c3d479";

test("branch creation accepts required details and defaults optional fields", () => {
  const parsed = createBranchSchema.parse({
    name: "Branch 2",
    county: "Kiambu",
    subCounty: "Juja",
    ward: "Kalimoni",
    area: "JKUAT Area",
    curricula: ["CBC", "KCSE"],
  });

  assert.equal(parsed.name, "Branch 2");
  assert.equal(parsed.latitude, "");
  assert.equal(parsed.longitude, "");
  assert.deepEqual(parsed.curricula, ["CBC", "KCSE"]);
});

test("branch creation rejects an empty or repeated curriculum list", () => {
  const branch = {
    name: "Branch 2",
    county: "Kiambu",
    subCounty: "Juja",
    ward: "Kalimoni",
    area: "JKUAT Area",
  };

  assert.equal(createBranchSchema.safeParse({ ...branch, curricula: [] }).success, false);
  assert.equal(
    createBranchSchema.safeParse({ ...branch, curricula: ["CBC", "CBC"] }).success,
    false,
  );
});

test("curriculum setup accepts standalone and multi-branch school structures", () => {
  const configurations = [
    {
      curricula: ["CBC"],
      branches: [{ branchId: mainBranchId, curricula: ["CBC"] }],
    },
    {
      curricula: ["CBC", "IB"],
      branches: [{ branchId: mainBranchId, curricula: ["CBC", "IB"] }],
    },
    {
      curricula: ["CBC"],
      branches: [
        { branchId: mainBranchId, curricula: ["CBC"] },
        { branchId: secondBranchId, curricula: ["CBC"] },
      ],
    },
    {
      curricula: ["CBC", "IB"],
      branches: [
        { branchId: mainBranchId, curricula: ["CBC"] },
        { branchId: secondBranchId, curricula: ["IB"] },
      ],
    },
  ];

  for (const configuration of configurations) {
    assert.equal(updateCurriculaSchema.safeParse(configuration).success, true);
  }
});

test("curriculum setup rejects offerings outside the school curriculum set", () => {
  const result = updateCurriculaSchema.safeParse({
    curricula: ["CBC"],
    branches: [{ branchId: mainBranchId, curricula: ["IB"] }],
  });

  assert.equal(result.success, false);
});

test("curriculum setup requires every enabled curriculum to be offered", () => {
  const result = updateCurriculaSchema.safeParse({
    curricula: ["CBC", "IB"],
    branches: [{ branchId: mainBranchId, curricula: ["CBC"] }],
  });

  assert.equal(result.success, false);
});
