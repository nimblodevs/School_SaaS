import type { RequestHandler } from "express";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export const requireTenant: RequestHandler = (req, res, next) => {
  const schoolId = req.auth?.schoolId;
  if (!schoolId) {
    res.status(401).json({ error: "Authentication is required." });
    return;
  }

  const body = isRecord(req.body) ? req.body : undefined;
  const requestedSchoolIds = [
    req.get("x-school-id"),
    req.params.schoolId,
    req.query.schoolId,
    body?.schoolId,
  ].filter((value) => value !== undefined);
  if (
    requestedSchoolIds.some(
      (requestedId) =>
        typeof requestedId !== "string" ||
        requestedId.toLowerCase() !== schoolId.toLowerCase(),
    )
  ) {
    res.status(404).json({ error: "School was not found." });
    return;
  }

  req.tenant = { schoolId };
  next();
};
