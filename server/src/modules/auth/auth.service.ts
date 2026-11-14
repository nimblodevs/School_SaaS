import { and, eq, gt, inArray, isNull, sql } from "drizzle-orm";
import { getDatabase } from "../../config/database.js";
import {
  authSessions,
  refreshSessions,
  schoolBranchCurriculums,
  schoolCurriculums,
  schoolUserBranchCurriculums,
  schoolUserMemberships,
  schools,
  users,
} from "../../db/schema.js";
import { withRlsTransaction } from "../../middlewares/rls.middleware.js";
import { AppError } from "../../utils/error/AppError.js";
import {
  createOpaqueToken,
  hashPassword,
  hashToken,
  randomUUID,
  verifyPassword,
} from "../../utils/crypto.js";
import type { RequestMetadata, SchoolRole } from "./auth.types.js";
import { REFRESH_TOKEN_TTL_SECONDS, ACCESS_TOKEN_TTL_SECONDS } from "./auth.cookies.js";
import { registerSchool } from "../school/school.services.js";
import type { schoolRegistrationSchema, loginSchema } from "./auth.validation.js";
import type { z } from "zod";

type LoginInput = z.infer<typeof loginSchema>;
type RegistrationInput = z.infer<typeof schoolRegistrationSchema>;
type Membership = typeof schoolUserMemberships.$inferSelect;
type User = typeof users.$inferSelect;

interface MembershipScope {
  school: {
    id: string;
    schoolName: string;
    schoolSlug: string;
  };
  branchIds: string[];
  branchCurricula: Record<string, string[]>;
  curricula: string[];
}

interface IssuedSession {
  accessToken: string;
  refreshToken: string;
  refreshSessionId: string;
  accessExpiresAt: string;
  refreshExpiresAt: string;
  membership: {
    membershipId: string;
    userId: string;
    schoolId: string;
    schoolSlug: string;
    schoolName: string;
    role: SchoolRole;
    branchIds: string[];
    branchCurricula: Record<string, string[]>;
    curricula: string[];
  };
}

async function loadMembershipScope(
  membership: Membership,
): Promise<MembershipScope> {
  const assignments = await getDatabase()
    .select({
      branchId: schoolUserBranchCurriculums.branchId,
      schoolCurriculumId: schoolUserBranchCurriculums.schoolCurriculumId,
    })
    .from(schoolUserBranchCurriculums)
    .where(
      and(
        eq(schoolUserBranchCurriculums.membershipId, membership.id),
        eq(schoolUserBranchCurriculums.schoolId, membership.schoolId),
      ),
    );
  const branchIds = [...new Set(assignments.map(({ branchId }) => branchId))];

  const scopedData = await withRlsTransaction(
    { schoolId: membership.schoolId, role: membership.role, branchIds },
    async (transaction) => {
      const [school] = await transaction
        .select({
          id: schools.id,
          schoolName: schools.schoolName,
          schoolSlug: schools.schoolSlug,
          isActive: schools.isActive,
        })
        .from(schools)
        .where(eq(schools.id, membership.schoolId))
        .limit(1);
      const curricula = await transaction
        .select({
          id: schoolCurriculums.id,
          curriculum: schoolCurriculums.curriculum,
        })
        .from(schoolCurriculums)
        .where(eq(schoolCurriculums.schoolId, membership.schoolId));
      const branchCurricula = await transaction
        .select({
          branchId: schoolBranchCurriculums.branchId,
          schoolCurriculumId: schoolBranchCurriculums.schoolCurriculumId,
          curriculum: schoolCurriculums.curriculum,
        })
        .from(schoolBranchCurriculums)
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
        .where(eq(schoolBranchCurriculums.schoolId, membership.schoolId));

      return { school, curricula, branchCurricula };
    },
  );

  if (!scopedData.school?.isActive) {
    throw new AppError("School membership is unavailable.", 403);
  }

  const branchCurricula: Record<string, string[]> = {};
  for (const assignment of assignments) {
    const curriculum = scopedData.branchCurricula.find(
      (row) =>
        row.branchId === assignment.branchId &&
        row.schoolCurriculumId === assignment.schoolCurriculumId,
    )?.curriculum;
    if (!curriculum) continue;

    const branchAssignment = (branchCurricula[assignment.branchId] ??= []);
    if (!branchAssignment.includes(curriculum)) {
      branchAssignment.push(curriculum);
    }
  }

  const assignedCurricula = [...new Set(Object.values(branchCurricula).flat())];
  return {
    school: {
      id: scopedData.school.id,
      schoolName: scopedData.school.schoolName,
      schoolSlug: scopedData.school.schoolSlug,
    },
    branchIds,
    branchCurricula,
    curricula:
      membership.role === "ADMIN"
        ? scopedData.curricula.map(({ curriculum }) => curriculum)
        : assignedCurricula,
  };
}

async function issueSession(
  user: User,
  membership: Membership,
  metadata: RequestMetadata,
  familyId: string = randomUUID(),
  replacesRefreshSessionId?: string,
): Promise<IssuedSession> {
  const scope = await loadMembershipScope(membership);
  const accessToken = createOpaqueToken();
  const refreshToken = createOpaqueToken();
  const sessionId = randomUUID();
  const refreshSessionId = randomUUID();
  const now = new Date();
  const accessExpiresAt = new Date(
    now.getTime() + ACCESS_TOKEN_TTL_SECONDS * 1000,
  );
  const refreshExpiresAt = new Date(
    now.getTime() + REFRESH_TOKEN_TTL_SECONDS * 1000,
  );

  await getDatabase().transaction(async (transaction) => {
    if (replacesRefreshSessionId) {
      const [replacedSession] = await transaction
        .update(refreshSessions)
        .set({
          revokedAt: now,
          replacedById: refreshSessionId,
          updatedAt: now,
        })
        .where(
          and(
            eq(refreshSessions.id, replacesRefreshSessionId),
            isNull(refreshSessions.revokedAt),
            isNull(refreshSessions.reusedAt),
          ),
        )
        .returning({ id: refreshSessions.id });
      if (!replacedSession) {
        throw new AppError("The refresh-token cookie has already been used.", 401);
      }
      await transaction
        .delete(authSessions)
        .where(
          eq(authSessions.refreshSessionId, replacesRefreshSessionId),
        );
    }
    await transaction.insert(refreshSessions).values({
      id: refreshSessionId,
      userId: user.id,
      schoolId: membership.schoolId,
      tokenHash: hashToken(refreshToken),
      familyId,
      expiresAt: refreshExpiresAt,
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent,
      createdAt: now,
      updatedAt: now,
    });
    await transaction.insert(authSessions).values({
      id: sessionId,
      userId: user.id,
      schoolId: membership.schoolId,
      refreshSessionId,
      tokenHash: hashToken(accessToken),
      expiresAt: accessExpiresAt,
      createdAt: now,
    });
    await transaction
      .update(users)
      .set({ lastLoginAt: now, updatedAt: now })
      .where(eq(users.id, user.id));
  });

  return {
    accessToken,
    refreshToken,
    refreshSessionId,
    accessExpiresAt: accessExpiresAt.toISOString(),
    refreshExpiresAt: refreshExpiresAt.toISOString(),
    membership: {
      membershipId: membership.id,
      userId: user.id,
      schoolId: membership.schoolId,
      schoolSlug: scope.school.schoolSlug,
      schoolName: scope.school.schoolName,
      role: membership.role,
      branchIds: scope.branchIds,
      branchCurricula: scope.branchCurricula,
      curricula: scope.curricula,
    },
  };
}

async function getMemberships(userId: string): Promise<Membership[]> {
  return getDatabase()
    .select()
    .from(schoolUserMemberships)
    .where(
      and(
        eq(schoolUserMemberships.userId, userId),
        eq(schoolUserMemberships.isActive, true),
      ),
    );
}

export async function register(
  input: RegistrationInput,
  metadata: RequestMetadata,
) {
  const passwordHash = await hashPassword(input.admin.password);
  const registered = await registerSchool(input, passwordHash, metadata);
  const [user] = await getDatabase()
    .select()
    .from(users)
    .where(eq(users.id, registered.adminId))
    .limit(1);
  if (!user) {
    throw new AppError("School registration could not be completed.", 500);
  }

  return {
    schoolId: registered.schoolId,
    schoolSlug: registered.schoolSlug,
    schoolName: registered.schoolName,
    admin: { id: user.id, fullName: user.fullName, email: user.email },
    branches: registered.branches,
  };
}

export async function login(input: LoginInput, metadata: RequestMetadata) {
  const [user] = await getDatabase()
    .select()
    .from(users)
    .where(sql`lower(btrim(${users.email})) = ${input.email}`)
    .limit(1);

  if (!user?.isActive || !(await verifyPassword(user.passwordHash, input.password))) {
    throw new AppError("Invalid email or password.", 401);
  }

  const memberships = await getMemberships(user.id);
  const availableMemberships = input.schoolId
    ? memberships.filter(({ schoolId }) => schoolId === input.schoolId)
    : memberships;
  if (input.schoolId && availableMemberships.length === 0) {
    throw new AppError("Invalid email or password.", 401);
  }
  if (availableMemberships.length === 0) {
    throw new AppError("This user has no active school membership.", 403);
  }

  if (!input.schoolId && availableMemberships.length > 1) {
    const schoolsForSelection = await Promise.all(
      availableMemberships.map(async (membership) => {
        const scope = await loadMembershipScope(membership);
        return {
          schoolId: membership.schoolId,
          schoolSlug: scope.school.schoolSlug,
          schoolName: scope.school.schoolName,
          role: membership.role,
        };
      }),
    );
    const selectionSession = await issueSession(
      user,
      availableMemberships[0]!,
      metadata,
    );
    return {
      requiresSchoolSelection: true as const,
      user: { id: user.id, fullName: user.fullName, email: user.email },
      schools: schoolsForSelection,
      accessToken: selectionSession.accessToken,
      refreshToken: selectionSession.refreshToken,
      accessExpiresAt: selectionSession.accessExpiresAt,
      refreshExpiresAt: selectionSession.refreshExpiresAt,
    };
  }

  const session = await issueSession(user, availableMemberships[0]!, metadata);
  return {
    requiresSchoolSelection: false as const,
    user: {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      mustChangePassword: user.mustChangePassword,
    },
    membership: session.membership,
    accessExpiresAt: session.accessExpiresAt,
    refreshExpiresAt: session.refreshExpiresAt,
    accessToken: session.accessToken,
    refreshToken: session.refreshToken,
  };
}

export async function selectSchool(
  userId: string,
  schoolId: string,
  metadata: RequestMetadata,
) {
  const memberships = await getMemberships(userId);
  const membership = memberships.find((candidate) => candidate.schoolId === schoolId);
  const [user] = await getDatabase()
    .select()
    .from(users)
    .where(and(eq(users.id, userId), eq(users.isActive, true)))
    .limit(1);
  if (!membership || !user) {
    throw new AppError("School membership was not found.", 404);
  }
  return issueSession(user, membership, metadata);
}

export async function refreshSession(
  rawRefreshToken: string,
  metadata: RequestMetadata,
) {
  const db = getDatabase();
  const [refreshSession] = await db
    .select()
    .from(refreshSessions)
    .where(eq(refreshSessions.tokenHash, hashToken(rawRefreshToken)))
    .limit(1);

  if (!refreshSession) {
    throw new AppError("A valid refresh-token cookie is required.", 401);
  }
  if (refreshSession.revokedAt || refreshSession.reusedAt) {
    const now = new Date();
    await db.transaction(async (transaction) => {
      await transaction
        .update(refreshSessions)
        .set({ revokedAt: now, reusedAt: now, updatedAt: now })
        .where(eq(refreshSessions.familyId, refreshSession.familyId));
      const family = await transaction
        .select({ id: refreshSessions.id })
        .from(refreshSessions)
        .where(eq(refreshSessions.familyId, refreshSession.familyId));
      const familyIds = family.map(({ id }) => id);
      if (familyIds.length > 0) {
        await transaction
          .delete(authSessions)
          .where(inArray(authSessions.refreshSessionId, familyIds));
      }
    });
    throw new AppError("The refresh-token cookie has already been used.", 401);
  }
  if (refreshSession.expiresAt <= new Date() || !refreshSession.schoolId) {
    throw new AppError("The refresh-token cookie is invalid or expired.", 401);
  }

  const [user] = await db
    .select()
    .from(users)
    .where(and(eq(users.id, refreshSession.userId), eq(users.isActive, true)))
    .limit(1);
  const [membership] = await db
    .select()
    .from(schoolUserMemberships)
    .where(
      and(
        eq(schoolUserMemberships.userId, refreshSession.userId),
        eq(schoolUserMemberships.schoolId, refreshSession.schoolId),
        eq(schoolUserMemberships.isActive, true),
      ),
    )
    .limit(1);
  if (!user || !membership) {
    throw new AppError("The refresh-token cookie is invalid or expired.", 401);
  }

  const session = await issueSession(
    user,
    membership,
    metadata,
    refreshSession.familyId,
    refreshSession.id,
  );
  return session;
}

export async function logout(auth: { sessionId: string; refreshSessionId: string }) {
  const now = new Date();
  await getDatabase().transaction(async (transaction) => {
    await transaction
      .delete(authSessions)
      .where(eq(authSessions.id, auth.sessionId));
    await transaction
      .update(refreshSessions)
      .set({ revokedAt: now, updatedAt: now })
      .where(eq(refreshSessions.id, auth.refreshSessionId));
  });
}

export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
) {
  const [user] = await getDatabase()
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!user || !(await verifyPassword(user.passwordHash, currentPassword))) {
    throw new AppError("Current password is incorrect.", 400);
  }

  const now = new Date();
  const nextHash = await hashPassword(newPassword);
  await getDatabase().transaction(async (transaction) => {
    await transaction
      .update(users)
      .set({ passwordHash: nextHash, mustChangePassword: false, updatedAt: now })
      .where(eq(users.id, userId));
    await transaction.delete(authSessions).where(eq(authSessions.userId, userId));
    await transaction
      .update(refreshSessions)
      .set({ revokedAt: now, updatedAt: now })
      .where(eq(refreshSessions.userId, userId));
  });
}
