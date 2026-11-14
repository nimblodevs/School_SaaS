import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { requireBranchAccess } from "../../middlewares/branch.middleware.js";
import { requireRoles } from "../../middlewares/rbac.middleware.js";
import { rlsMiddleware } from "../../middlewares/rls.middleware.js";
import { requireTenant } from "../../middlewares/tenant.middleware.js";
import { validateBody } from "../../middlewares/validate.middleware.js";
import {
  createBranch,
  deleteBranch,
  getBranches,
  getSchool,
  setSchoolCurricula,
  updateBranch,
} from "./school.controller.js";
import {
  createBranchSchema,
  updateBranchSchema,
  updateCurriculaSchema,
} from "./school.validations.js";

const router = Router();

router.use(requireAuth, requireTenant, rlsMiddleware);
router.get("/", getSchool);
router.get("/branches", getBranches);
router.post(
  "/branches",
  requireRoles("ADMIN"),
  validateBody(createBranchSchema),
  createBranch,
);
router.patch(
  "/branches/:branchId",
  requireRoles("ADMIN"),
  requireBranchAccess,
  validateBody(updateBranchSchema),
  updateBranch,
);
router.delete(
  "/branches/:branchId",
  requireRoles("ADMIN"),
  requireBranchAccess,
  deleteBranch,
);
router.put(
  "/curricula",
  requireRoles("ADMIN"),
  validateBody(updateCurriculaSchema),
  setSchoolCurricula,
);

export default router;
