import { Router, type RequestHandler } from "express";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { requireRoles } from "../../middlewares/rbac.middleware.js";
import { rlsMiddleware } from "../../middlewares/rls.middleware.js";
import { requireTenant } from "../../middlewares/tenant.middleware.js";
import { validateBody } from "../../middlewares/validate.middleware.js";
import { AppError } from "../../utils/error/AppError.js";
import {
  createMember,
  deleteMember,
  listMembers,
  updateMember,
} from "./users.controller.js";
import {
  createMemberSchema,
  membershipIdSchema,
  updateMemberSchema,
} from "./users.validations.js";

const validateMembershipId: RequestHandler = (req, _res, next) => {
  const parsed = membershipIdSchema.safeParse(req.params.membershipId);
  if (!parsed.success) {
    next(new AppError("A valid membership ID is required.", 400));
    return;
  }
  next();
};

const router = Router();

router.use(requireAuth, requireTenant, rlsMiddleware, requireRoles("ADMIN"));
router.get("/", listMembers);
router.post("/", validateBody(createMemberSchema), createMember);
router.patch(
  "/:membershipId",
  validateMembershipId,
  validateBody(updateMemberSchema),
  updateMember,
);
router.delete("/:membershipId", validateMembershipId, deleteMember);

export default router;
