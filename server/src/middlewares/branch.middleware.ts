import { and, eq } from "drizzle-orm";
import type { RequestHandler } from "express";
import { schoolBranches } from "../db/schema.js";
import { withRlsTransaction } from "./rls.middleware.js";
import { branchIdSchema } from "../modules/school/school.validations.js";

export const requireBranchAccess: RequestHandler = async (req, res, next) => {
  const auth = req.auth;
  const schoolId = req.tenant?.schoolId;
  const rlsContext = req.rls;
  if (
    !auth ||
    !schoolId ||
    !rlsContext ||
    auth.schoolId !== schoolId ||
    rlsContext.schoolId !== schoolId
  ) {
    res.status(401).json({
      error: "Authentication, school scope, and RLS context are required.",
    });
    return;
  }

  const parsedBranchId = branchIdSchema.safeParse(req.params.branchId);
  if (!parsedBranchId.success) {
    res.status(400).json({ error: "A valid branch ID is required." });
    return;
  }

  try {
    const [branch] = await withRlsTransaction(rlsContext, (transaction) =>
      transaction
        .select({ id: schoolBranches.id })
        .from(schoolBranches)
        .where(
          and(
            eq(schoolBranches.id, parsedBranchId.data),
            eq(schoolBranches.schoolId, schoolId),
          ),
        )
        .limit(1),
    );

    if (
      !branch ||
      (auth.role !== "ADMIN" && !auth.branchIds.includes(parsedBranchId.data))
    ) {
      res.status(404).json({ error: "Branch was not found." });
      return;
    }

    req.branch = { id: parsedBranchId.data, schoolId };
    next();
  } catch (error) {
    next(error);
  }
};