import type { Request, RequestHandler } from "express";
import { getActiveTraceId } from "../../config/tracing.js";
import { AppError } from "../../utils/error/AppError.js";
import {
  changePassword as changePasswordService,
  login as loginService,
  logout as logoutService,
  refreshSession,
  register as registerService,
  selectSchool as selectSchoolService,
} from "./auth.service.js";
import {
  clearAuthCookies,
  readCookieValue,
  setAuthCookies,
  REFRESH_TOKEN_COOKIE,
} from "./auth.cookies.js";
import type {
  changePasswordSchema,
  loginSchema,
  schoolRegistrationSchema,
  selectSchoolSchema,
} from "./auth.validation.js";
import type { z } from "zod";

type RegistrationInput = z.infer<typeof schoolRegistrationSchema>;
type LoginInput = z.infer<typeof loginSchema>;
type SelectSchoolInput = z.infer<typeof selectSchoolSchema>;
type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

function requestMetadata(req: Request) {
  return {
    ipAddress: req.ip ?? null,
    userAgent: req.get("user-agent") ?? null,
    traceId: getActiveTraceId() ?? req.get("x-trace-id") ?? "unknown",
  };
}

function asyncHandler(
  action: (req: Request, res: Parameters<RequestHandler>[1]) => Promise<void>,
): RequestHandler {
  return (req, res, next) => {
    void action(req, res).catch(next);
  };
}

export const register: RequestHandler = asyncHandler(async (req, res) => {
  const result = await registerService(
    req.body as RegistrationInput,
    requestMetadata(req),
  );
  res.status(201).json(result);
});

export const login: RequestHandler = asyncHandler(async (req, res) => {
  const result = await loginService(req.body as LoginInput, requestMetadata(req));
  if (result.requiresSchoolSelection) {
    setAuthCookies(res, result.accessToken, result.refreshToken);
    const {
      accessToken: _accessToken,
      refreshToken: _refreshToken,
      ...publicResult
    } = result;
    res.status(200).json(publicResult);
    return;
  }

  setAuthCookies(res, result.accessToken, result.refreshToken);
  const {
    accessToken: _accessToken,
    refreshToken: _refreshToken,
    ...publicResult
  } = result;
  res.status(200).json(publicResult);
});

export const refresh: RequestHandler = asyncHandler(async (req, res) => {
  const token = readCookieValue(req.headers.cookie, REFRESH_TOKEN_COOKIE);
  if (!token) throw new AppError("A valid refresh-token cookie is required.", 401);

  const result = await refreshSession(token, requestMetadata(req));
  setAuthCookies(res, result.accessToken, result.refreshToken);
  const {
    accessToken: _accessToken,
    refreshToken: _refreshToken,
    refreshSessionId: _refreshSessionId,
    ...publicResult
  } = result;
  res.status(200).json(publicResult);
});

export const logout: RequestHandler = asyncHandler(async (req, res) => {
  if (!req.auth) throw new AppError("Authentication is required.", 401);
  await logoutService(req.auth);
  clearAuthCookies(res);
  res.status(200).json({ message: "Logged out." });
});

export const me: RequestHandler = (req, res, next) => {
  if (!req.auth) {
    next(new AppError("Authentication is required.", 401));
    return;
  }

  const {
    userId,
    email,
    fullName,
    mustChangePassword,
    ...membership
  } = req.auth;
  res.status(200).json({
    user: { id: userId, email, fullName, mustChangePassword },
    membership,
  });
};

export const selectSchool: RequestHandler = asyncHandler(async (req, res) => {
  if (!req.auth) throw new AppError("Authentication is required.", 401);
  const input = req.body as SelectSchoolInput;
  const result = await selectSchoolService(
    req.auth.userId,
    input.schoolId,
    requestMetadata(req),
  );
  setAuthCookies(res, result.accessToken, result.refreshToken);
  const {
    accessToken: _accessToken,
    refreshToken: _refreshToken,
    refreshSessionId: _refreshSessionId,
    ...publicResult
  } = result;
  res.status(200).json(publicResult);
});

export const changePassword: RequestHandler = asyncHandler(async (req, res) => {
  if (!req.auth) throw new AppError("Authentication is required.", 401);
  const input = req.body as ChangePasswordInput;
  await changePasswordService(
    req.auth.userId,
    input.currentPassword,
    input.newPassword,
  );
  clearAuthCookies(res);
  res.status(200).json({ message: "Password changed. Please sign in again." });
});
