import { beforeEach, describe, expect, it, vi } from "vitest";
import { getDatabase } from "../../src/config/database.js";
import {
  schoolBranchCurriculums,
  schoolBranches,
  schoolCurriculums,
  schoolUserBranchCurriculums,
  schools,
} from "../../src/db/schema.js";
import type { AuthContext } from "../../src/modules/auth/auth.types.js";
import {
  createBranch,
  getSchoolStructure,
} from "../../src/modules/school/school.services.ts";
import { createBranchSchema } from "../../src/modules/school/school.validations.ts";

vi.mock("../../src/config/database.js", () => ({
  getDatabase: vi.fn(),
}));

const schoolId = "c793994d-6b51-4b19-bdfb-06b77cb15072";
const membershipId = "761bcbe8-99bd-46e7-8f2f-55f79209953b";
const curriculumId = "63a4a134-f4ec-4774-95d2-8b05f741536b";

function createFakeDatabase() {
  const rows = new Map<unknown, Record<string, unknown>[]>([
    [schools, [{ id: schoolId, name: "Nova Pioneer Academy" }]],
    [
      schoolCurriculums,
      [{ id: curriculumId, schoolId, curriculum: "CBC" }],
    ],
    [schoolBranches, []],
    [schoolBranchCurriculums, []],
    [schoolUserBranchCurriculums, []],
  ]);
  const getRows = (table: unknown) => {
    const tableRows = rows.get(table) ?? [];
    if (table !== schoolBranchCurriculums) return tableRows;
    return tableRows.map((row) => ({
      ...row,
      curriculum: rows
        .get(schoolCurriculums)
        ?.find(
          (curriculum) =>
            curriculum.id === row.schoolCurriculumId &&
            curriculum.schoolId === row.schoolId,
        )?.curriculum,
    }));
  };
  const createSelectQuery = () => {
    let selectedTable: unknown;
    const query: {
      from: (table: unknown) => typeof query;
      where: () => typeof query;
      innerJoin: () => typeof query;
      limit: (count: number) => Promise<Record<string, unknown>[]>;
      then: (
        resolve: (value: Record<string, unknown>[]) => unknown,
        reject: (reason: unknown) => unknown,
      ) => Promise<unknown>;
    } = {
      from: (table) => {
        selectedTable = table;
        return query;
      },
      where: () => query,
      innerJoin: () => query,
      limit: async (count) => getRows(selectedTable).slice(0, count),
      then: (resolve, reject) =>
        Promise.resolve(getRows(selectedTable)).then(resolve, reject),
    };
    return query;
  };
  const database = {
    select: createSelectQuery,
    insert: (table: unknown) => ({
      values: (values: Record<string, unknown> | Record<string, unknown>[]) => {
        const tableRows = rows.get(table);
        if (tableRows) {
          tableRows.push(...(Array.isArray(values) ? values : [values]));
        }
      },
    }),
    execute: async () => undefined,
  };
  const transaction = {
    ...database,
  };
  Object.assign(database, {
    transaction: async (operation: (value: typeof transaction) => unknown) =>
      operation(transaction),
  });

  return {
    database: database as typeof database & {
      transaction: (operation: (value: typeof transaction) => unknown) => unknown;
    },
    rows,
  };
}

const auth: AuthContext = {
  userId: "3878cd28-51c1-4d44-b21e-19f79fcdde27",
  email: "admin@example.test",
  fullName: "School Administrator",
  role: "ADMIN",
  schoolId,
  schoolSlug: "nova-pioneer-academy",
  membershipId,
  branchIds: [],
  branchCurricula: {},
  curricula: ["CBC"],
  sessionId: "b22f8f1d-398a-4df7-b05f-b6e5fef7627c",
  refreshSessionId: "8a7300a1-7706-4f82-ac9d-63b90f41352f",
  mustChangePassword: false,
};

const metadata = {
  ipAddress: "127.0.0.1",
  userAgent: "vitest",
  traceId: "test-trace",
};

describe("createBranch", () => {
  let fake: ReturnType<typeof createFakeDatabase>;

  beforeEach(() => {
    fake = createFakeDatabase();
    vi.mocked(getDatabase).mockReturnValue(
      fake.database as unknown as ReturnType<typeof getDatabase>,
    );
  });

  it("creates a branch and grants its curricula to the creating admin", async () => {
    const input = createBranchSchema.parse({
      name: "Branch 2",
      county: "Kiambu",
      subCounty: "Juja",
      ward: "Kalimoni",
      area: "JKUAT Area",
      curricula: ["CBC"],
    });

    const result = await createBranch(auth, input, metadata);
    const branches = fake.rows.get(schoolBranches) ?? [];
    const branchCurricula = fake.rows.get(schoolBranchCurriculums) ?? [];
    const memberAssignments =
      fake.rows.get(schoolUserBranchCurriculums) ?? [];

    expect(result.branches).toHaveLength(1);
    expect(result.branches[0]).toMatchObject({
      name: "Branch 2",
      curricula: ["CBC"],
    });
    expect(branches).toHaveLength(1);
    expect(branchCurricula).toHaveLength(1);
    expect(memberAssignments).toHaveLength(1);
    expect(memberAssignments[0]).toMatchObject({
      membershipId,
      schoolId,
      branchId: branches[0]?.id,
      schoolCurriculumId: curriculumId,
    });
  });

  it("rejects curricula that are not enabled for the school", async () => {
    const input = createBranchSchema.parse({
      name: "Branch 2",
      county: "Kiambu",
      subCounty: "Juja",
      ward: "Kalimoni",
      area: "JKUAT Area",
      curricula: ["KCSE"],
    });

    await expect(createBranch(auth, input, metadata)).rejects.toThrow(
      "One or more curricula are not enabled for this school.",
    );
    expect(fake.rows.get(schoolBranches)).toHaveLength(0);
  });

  it("only returns branches assigned to a non-admin member", async () => {
    const assignedBranchId = "a22ac10b-58cc-4372-a567-0e02b2c3d479";
    fake.rows.get(schoolBranches)?.push(
      { id: assignedBranchId, schoolId, name: "Assigned Branch" },
      {
        id: "c22ac10b-58cc-4372-a567-0e02b2c3d479",
        schoolId,
        name: "Other Branch",
      },
    );

    const structure = await getSchoolStructure({
      schoolId,
      role: "TEACHER",
      branchIds: [assignedBranchId],
    });

    expect(structure.branches.map(({ id }) => id)).toEqual([assignedBranchId]);
  });
});
