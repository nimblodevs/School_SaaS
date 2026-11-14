import type { RequestHandler } from "express";
import type { SchoolRole } from "../modules/auth/auth.types.js";

export function requireRoles(...roles: SchoolRole[]): RequestHandler {
  return (req, res, next) => {
    if (!req.auth) {
      res.status(401).json({ error: "Authentication is required." });
      return;
    }
    if (!roles.includes(req.auth.role)) {
      res.status(403).json({
        error: "You are not allowed to perform this action.",
      });
      return;
    }
    next();
  };
}
