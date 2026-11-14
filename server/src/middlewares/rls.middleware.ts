import type { Request, RequestHandler } from "express";
import { sql } from "drizzle-orm";
import {
  getDatabase,
  type DatabaseTransaction,
} from "../config/database.js";

export interface RlsContext {
  schoolId: string;
  role: string;
  branchIds: string[];
}

function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.every((item: unknown) => typeof item === "string")
  );
}

export const rlsMiddleware: RequestHandler = (req, res, next) => {
  const scopedRequest = req as Request & {
    auth?: { schoolId: string; role: string; branchIds: string[] };
    tenant?: { schoolId: string };
    rls?: RlsContext;
  };
  const auth = scopedRequest.auth;
  const tenant = scopedRequest.tenant;

  if (
    !auth ||
    !tenant ||
    typeof auth.role !== "string" ||
    !isStringArray(auth.branchIds)
  ) {
    res.status(401).json({
      error: "Authentication and school scope are required.",
    });
    return;
  }
  if (auth.schoolId.toLowerCase() !== tenant.schoolId.toLowerCase()) {
    res.status(404).json({ error: "School was not found." });
    return;
  }
  scopedRequest.rls = {
    schoolId: tenant.schoolId,
    role: auth.role,
    branchIds: [...auth.branchIds],
  };
  next();
};

// Tenant queries must use the transaction passed to this callback.
export function withRlsTransaction<T>(
  context: RlsContext,
  operation: (transaction: DatabaseTransaction) => Promise<T>,
): Promise<T> {
  return getDatabase().transaction(async (transaction) => {
    await transaction.execute(sql`
      SELECT
        set_config('app.current_school_id', ${context.schoolId}, true),
        set_config('app.current_role', ${context.role}, true),
        set_config(
          'app.current_branch_ids',
          ${context.branchIds.join(",")},
          true
        )
    `);
    return operation(transaction);
  });
}