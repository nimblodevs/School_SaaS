import { Router } from "express";
import rateLimit from "express-rate-limit";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { validateBody } from "../../middlewares/validate.middleware.js";
import {
  changePassword,
  login,
  logout,
  me,
  refresh,
  register,
  selectSchool,
} from "./auth.controller.js";
import {
  changePasswordSchema,
  loginSchema,
  schoolRegistrationSchema,
  selectSchoolSchema,
} from "./auth.validation.js";

const registerLimiter = rateLimit({
  windowMs: 15 * 60_000,
  limit: 5,
  standardHeaders: "draft-8",
  legacyHeaders: false,
});
const loginLimiter = rateLimit({
  windowMs: 15 * 60_000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
});
const refreshLimiter = rateLimit({
  windowMs: 15 * 60_000,
  limit: 30,
  standardHeaders: "draft-8",
  legacyHeaders: false,
});

const router = Router();

router.post(
  "/register",
  registerLimiter,
  validateBody(schoolRegistrationSchema),
  register,
);
router.post("/login", loginLimiter, validateBody(loginSchema), login);
router.post("/refresh", refreshLimiter, refresh);
router.post("/logout", requireAuth, logout);
router.get("/me", requireAuth, me);
router.post(
  "/select-school",
  requireAuth,
  validateBody(selectSchoolSchema),
  selectSchool,
);
router.post(
  "/change-password",
  requireAuth,
  validateBody(changePasswordSchema),
  changePassword,
);

export default router;
