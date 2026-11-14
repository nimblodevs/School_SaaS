import { and, eq, gt } from "drizzle-orm";
import type { RequestHandler } from "express";
import { getDatabase } from "../config/database.js";
import {
  authSessions,
  schoolBranchCurriculums,
  schoolCurriculums,
  schoolUserBranchCurriculums,
  schoolUserMemberships,
  schools,
  users,
} from "../db/schema.js";
import { withRlsTransaction } from "./rls.middleware.js";
import {
  ACCESS_TOKEN_COOKIE,
  readCookieValue,
} from "../modules/auth/auth.cookies.js";
import { hashToken } from "../utils/crypto.js";

export const requireAuth: RequestHandler = async (req, res, next) => {
  const rawToken = readCookieValue(req.headers.cookie, ACCESS_TOKEN_COOKIE);
  if (!rawToken) {
    res.status(401).json({ error: "A valid access-token cookie is required." });
    return;
  }

  try {
    const now = new Date();
    const [session] = await getDatabase()
      .select()
      .from(authSessions)
      .where(
        and(
          eq(authSessions.tokenHash, hashToken(rawToken)),
          gt(authSessions.expiresAt, now),
        ),
      )
      .limit(1);

    if (!session?.schoolId || !session.refreshSessionId) {
      res.status(401).json({ error: "The access-token cookie is invalid or expired." });
      return;
    }

    const [user] = await getDatabase()
      .select()
      .from(users)
      .where(eq(users.id, session.userId))
      .limit(1);
    const [membership] = await getDatabase()
      .select()
      .from(schoolUserMemberships)
      .where(
        and(
          eq(schoolUserMemberships.userId, session.userId),
          eq(schoolUserMemberships.schoolId, session.schoolId),
          eq(schoolUserMemberships.isActive, true),
        ),
      )
      .limit(1);

    if (!user?.isActive || !membership) {
      res.status(401).json({ error: "The access-token cookie is invalid or expired." });
      return;
    }

    const assignmentRows = await getDatabase()
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
    const branchIds = [...new Set(assignmentRows.map(({ branchId }) => branchId))];

    const schoolScope = await withRlsTransaction(
      {
        schoolId: membership.schoolId,
        role: membership.role,
        branchIds,
      },
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

    if (!schoolScope.school?.isActive) {
      res.status(401).json({ error: "The access-token cookie is invalid or expired." });
      return;
    }

    const branchCurricula: Record<string, (typeof schoolScope.curricula)[number]["curriculum"][]> = {};
    for (const assignment of assignmentRows) {
      const curriculum = schoolScope.branchCurricula.find(
        (row) =>
          row.branchId === assignment.branchId &&
          row.schoolCurriculumId === assignment.schoolCurriculumId,
      )?.curriculum;
      if (!curriculum) continue;

      const branchAssignments = (branchCurricula[assignment.branchId] ??= []);
      if (!branchAssignments.includes(curriculum)) {
        branchAssignments.push(curriculum);
      }
    }

    req.auth = {
      userId: user.id,
      email: user.email,
      fullName: user.fullName,
      role: membership.role,
      schoolId: membership.schoolId,
      schoolSlug: schoolScope.school.schoolSlug,
      membershipId: membership.id,
      branchIds,
      branchCurricula,
      curricula:
        membership.role === "ADMIN"
          ? schoolScope.curricula.map(({ curriculum }) => curriculum)
          : [...new Set(Object.values(branchCurricula).flat())],
      sessionId: session.id,
      refreshSessionId: session.refreshSessionId,
      mustChangePassword: user.mustChangePassword,
    };
    next();
  } catch (error) {
    next(error);
  }
};
