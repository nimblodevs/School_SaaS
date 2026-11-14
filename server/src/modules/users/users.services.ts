import { and, eq, sql } from "drizzle-orm";
import {
  getDatabase,
  type DatabaseTransaction,
} from "../../config/database.js";
import {
  authSessions,
  refreshSessions,
  schoolBranchCurriculums,
  schoolCurriculums,
  schoolUserBranchCurriculums,
  schoolUserMemberships,
  users,
} from "../../db/schema.js";
import {
  withRlsTransaction,
  type RlsContext,
} from "../../middlewares/rls.middleware.js";
import { AppError } from "../../utils/error/AppError.js";
import { hashPassword, randomUUID } from "../../utils/crypto.js";
import type {
  createMemberSchema,
  updateMemberSchema,
} from "./users.validations.js";
import type { z } from "zod";

type CreateMemberInput = z.infer<typeof createMemberSchema>;
type UpdateMemberInput = z.infer<typeof updateMemberSchema>;

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "23505"
  );
}

async function getBranchCurriculumLinks(
  transaction: DatabaseTransaction,
  schoolId: string,
  assignments: NonNullable<UpdateMemberInput["branches"]>,
) {
  const available = await transaction
    .select({
      branchId: schoolBranchCurriculums.branchId,
      schoolCurriculumId: schoolBranchCurriculums.schoolCurriculumId,
      curriculum: schoolCurriculums.curriculum,
    })
    .from(schoolBranchCurriculums)
    .innerJoin(
      schoolCurriculums,
      and(
        eq(schoolCurriculums.id, schoolBranchCurriculums.schoolCurriculumId),
        eq(schoolCurriculums.schoolId, schoolBranchCurriculums.schoolId),
      ),
    )
    .where(eq(schoolBranchCurriculums.schoolId, schoolId));
  const availableByAssignment = new Map(
    available.map(
      (row) => [`${row.branchId}:${row.curriculum}`, row] as const,
    ),
  );

  const links = assignments.flatMap(({ branchId, curricula }) =>
    curricula.map((curriculum) => {
      const link = availableByAssignment.get(`${branchId}:${curriculum}`);
      if (!link) {
        throw new AppError(
          "A branch assignment includes a curriculum not offered at that branch.",
          400,
        );
      }
      return link;
    }),
  );
  return links;
}

export async function listMembers(context: RlsContext) {
  return withRlsTransaction(context, async (transaction) => {
    const members = await transaction
      .select({
        membershipId: schoolUserMemberships.id,
        userId: users.id,
        fullName: users.fullName,
        email: users.email,
        phone: users.phone,
        role: schoolUserMemberships.role,
        isActive: schoolUserMemberships.isActive,
        createdAt: schoolUserMemberships.createdAt,
      })
      .from(schoolUserMemberships)
      .innerJoin(users, eq(users.id, schoolUserMemberships.userId))
      .where(eq(schoolUserMemberships.schoolId, context.schoolId));

    const assignments = await transaction
      .select({
        membershipId: schoolUserBranchCurriculums.membershipId,
        branchId: schoolUserBranchCurriculums.branchId,
        curriculum: schoolCurriculums.curriculum,
      })
      .from(schoolUserBranchCurriculums)
      .innerJoin(
        schoolBranchCurriculums,
        and(
          eq(schoolBranchCurriculums.branchId, schoolUserBranchCurriculums.branchId),
          eq(
            schoolBranchCurriculums.schoolCurriculumId,
            schoolUserBranchCurriculums.schoolCurriculumId,
          ),
          eq(schoolBranchCurriculums.schoolId, schoolUserBranchCurriculums.schoolId),
        ),
      )
      .innerJoin(
        schoolCurriculums,
        and(
          eq(
            schoolCurriculums.id,
            schoolBranchCurriculums.schoolCurriculumId,
          ),
          eq(schoolCurriculums.schoolId, schoolBranchCurriculums.schoolId),
        ),
      )
      .where(eq(schoolUserBranchCurriculums.schoolId, context.schoolId));

    return members.map((member) => ({
      ...member,
      branches: assignments
        .filter((assignment) => assignment.membershipId === member.membershipId)
        .reduce<
          { branchId: string; curricula: typeof assignments[number]["curriculum"][] }[]
        >((result, assignment) => {
          let branch = result.find(
            (item) => item.branchId === assignment.branchId,
          );
          if (!branch) {
            branch = { branchId: assignment.branchId, curricula: [] };
            result.push(branch);
          }
          if (!branch.curricula.includes(assignment.curriculum)) {
            branch.curricula.push(assignment.curriculum);
          }
          return result;
        }, []),
    }));
  });
}

export async function createMember(
  context: RlsContext,
  input: CreateMemberInput,
) {
  const passwordHash = await hashPassword(input.password);
  const userId = randomUUID();
  const membershipId = randomUUID();
  const now = new Date();

  try {
    return await withRlsTransaction(context, async (transaction) => {
      const links = await getBranchCurriculumLinks(
        transaction,
        context.schoolId,
        input.branches,
      );
      const [user] = await transaction
        .select({ id: users.id })
        .from(users)
        .where(sql`lower(btrim(${users.email})) = ${input.email}`)
        .limit(1);
      if (user) {
        throw new AppError(
          "A user with this email address already exists.",
          409,
        );
      }

      await transaction.insert(users).values({
        id: userId,
        fullName: input.fullName,
        email: input.email,
        passwordHash,
        role: input.role,
        schoolId: context.schoolId,
        branchId: input.branches[0]!.branchId,
        isActive: true,
        authProvider: "LOCAL",
        createdAt: now,
        updatedAt: now,
      });
      await transaction.insert(schoolUserMemberships).values({
        id: membershipId,
        userId,
        schoolId: context.schoolId,
        role: input.role,
        isActive: true,
        createdAt: now,
      });
      await transaction.insert(schoolUserBranchCurriculums).values(
        links.map((link) => ({
          id: randomUUID(),
          membershipId,
          schoolId: context.schoolId,
          branchId: link.branchId,
          schoolCurriculumId: link.schoolCurriculumId,
          createdAt: now,
        })),
      );

      return {
        membershipId,
        userId,
        fullName: input.fullName,
        email: input.email,
        role: input.role,
        branches: input.branches,
      };
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new AppError("A user with this email address already exists.", 409, {
        cause: error,
      });
    }
    throw error;
  }
}

export async function updateMember(
  context: RlsContext,
  membershipId: string,
  input: UpdateMemberInput,
) {
  return withRlsTransaction(context, async (transaction) => {
    const [member] = await transaction
      .select({
        membershipId: schoolUserMemberships.id,
        userId: users.id,
        role: schoolUserMemberships.role,
      })
      .from(schoolUserMemberships)
      .innerJoin(users, eq(users.id, schoolUserMemberships.userId))
      .where(
        and(
          eq(schoolUserMemberships.id, membershipId),
          eq(schoolUserMemberships.schoolId, context.schoolId),
        ),
      )
      .limit(1);
    if (!member) throw new AppError("School member was not found.", 404);
    if (member.role === "ADMIN") {
      throw new AppError("School administrator membership cannot be changed here.", 409);
    }

    const userValues: {
      fullName?: string;
      branchId?: string;
      updatedAt?: Date;
    } = {};
    if (input.fullName !== undefined) userValues.fullName = input.fullName;

    if (input.branches) {
      const links = await getBranchCurriculumLinks(
        transaction,
        context.schoolId,
        input.branches,
      );
      await transaction
        .delete(schoolUserBranchCurriculums)
        .where(
          and(
            eq(schoolUserBranchCurriculums.membershipId, membershipId),
            eq(schoolUserBranchCurriculums.schoolId, context.schoolId),
          ),
        );
      await transaction.insert(schoolUserBranchCurriculums).values(
        links.map((link) => ({
          id: randomUUID(),
          membershipId,
          schoolId: context.schoolId,
          branchId: link.branchId,
          schoolCurriculumId: link.schoolCurriculumId,
          createdAt: new Date(),
        })),
      );
      userValues.branchId = input.branches[0]!.branchId;
    }

    if (Object.keys(userValues).length > 0) {
      userValues.updatedAt = new Date();
      await transaction
        .update(users)
        .set(userValues)
        .where(eq(users.id, member.userId));
    }
    if (input.role !== undefined) {
      await transaction
        .update(schoolUserMemberships)
        .set({ role: input.role })
        .where(
          and(
            eq(schoolUserMemberships.id, membershipId),
            eq(schoolUserMemberships.schoolId, context.schoolId),
          ),
        );
    }

    return { membershipId, ...input };
  });
}

export async function deleteMember(
  context: RlsContext,
  membershipId: string,
  requestingUserId: string,
) {
  return withRlsTransaction(context, async (transaction) => {
    const [member] = await transaction
      .select({
        membershipId: schoolUserMemberships.id,
        userId: schoolUserMemberships.userId,
        role: schoolUserMemberships.role,
      })
      .from(schoolUserMemberships)
      .where(
        and(
          eq(schoolUserMemberships.id, membershipId),
          eq(schoolUserMemberships.schoolId, context.schoolId),
        ),
      )
      .limit(1);
    if (!member) throw new AppError("School member was not found.", 404);
    if (member.userId === requestingUserId || member.role === "ADMIN") {
      throw new AppError(
        "This school membership cannot be removed through member management.",
        409,
      );
    }

    await transaction
      .delete(schoolUserMemberships)
      .where(
        and(
          eq(schoolUserMemberships.id, membershipId),
          eq(schoolUserMemberships.schoolId, context.schoolId),
        ),
      );
    await transaction
      .delete(authSessions)
      .where(
        and(
          eq(authSessions.userId, member.userId),
          eq(authSessions.schoolId, context.schoolId),
        ),
      );
    await transaction
      .update(refreshSessions)
      .set({ revokedAt: new Date(), updatedAt: new Date() })
      .where(
        and(
          eq(refreshSessions.userId, member.userId),
          eq(refreshSessions.schoolId, context.schoolId),
        ),
      );

    const remainingMemberships = await transaction
      .select({
        schoolId: schoolUserMemberships.schoolId,
        role: schoolUserMemberships.role,
      })
      .from(schoolUserMemberships)
      .where(
        and(
          eq(schoolUserMemberships.userId, member.userId),
          eq(schoolUserMemberships.isActive, true),
        ),
      );
    if (remainingMemberships.length === 0) {
      await transaction
        .update(users)
        .set({
          isActive: false,
          schoolId: null,
          branchId: null,
          updatedAt: new Date(),
        })
        .where(eq(users.id, member.userId));
    } else {
      const nextMembership = remainingMemberships[0]!;
      const [assignment] = await transaction
        .select({ branchId: schoolUserBranchCurriculums.branchId })
        .from(schoolUserBranchCurriculums)
        .innerJoin(
          schoolUserMemberships,
          and(
            eq(schoolUserMemberships.id, schoolUserBranchCurriculums.membershipId),
            eq(schoolUserMemberships.schoolId, schoolUserBranchCurriculums.schoolId),
          ),
        )
        .where(
          and(
            eq(schoolUserBranchCurriculums.schoolId, nextMembership.schoolId),
            eq(schoolUserMemberships.userId, member.userId),
          ),
        )
        .limit(1);
      await transaction
        .update(users)
        .set({
          schoolId: nextMembership.schoolId,
          branchId: assignment?.branchId ?? null,
          updatedAt: new Date(),
        })
        .where(eq(users.id, member.userId));
    }

    return { membershipId };
  });
}
