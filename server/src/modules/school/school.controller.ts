import type { Request, RequestHandler } from "express";
import { getActiveTraceId } from "../../config/tracing.js";
import { AppError } from "../../utils/error/AppError.js";
import {
  createBranch as createBranchService,
  deleteBranch as deleteBranchService,
  getSchoolStructure,
  updateBranch as updateBranchService,
  updateSchoolCurricula,
} from "./school.services.js";
import type {
  createBranchSchema,
  updateBranchSchema,
  updateCurriculaSchema,
} from "./school.validations.js";
import type { z } from "zod";

type CreateBranchInput = z.infer<typeof createBranchSchema>;
type UpdateBranchInput = z.infer<typeof updateBranchSchema>;
type UpdateCurriculaInput = z.infer<typeof updateCurriculaSchema>;

function getRlsContext(req: Request) {
  if (!req.auth || !req.rls) {
    throw new AppError("Authentication and school scope are required.", 401);
  }
  return req.rls;
}

function asyncHandler(
  action: (req: Request, res: Parameters<RequestHandler>[1]) => Promise<void>,
): RequestHandler {
  return (req, res, next) => {
    void action(req, res).catch(next);
  };
}

export const getSchool: RequestHandler = asyncHandler(async (req, res) => {
  const structure = await getSchoolStructure(getRlsContext(req));
  res.status(200).json(structure);
});

export const getBranches: RequestHandler = asyncHandler(async (req, res) => {
  const { branches } = await getSchoolStructure(getRlsContext(req));
  res.status(200).json({ branches });
});

export const createBranch: RequestHandler = asyncHandler(async (req, res) => {
  if (!req.auth) throw new AppError("Authentication is required.", 401);
  const result = await createBranchService(
    req.auth,
    req.body as CreateBranchInput,
    {
      ipAddress: req.ip ?? null,
      userAgent: req.get("user-agent") ?? null,
      traceId: getActiveTraceId() ?? "unknown",
    },
  );
  res.status(201).json(result);
});

export const updateBranch: RequestHandler = asyncHandler(async (req, res) => {
  if (!req.branch) throw new AppError("Branch scope is required.", 404);
  const result = await updateBranchService(
    getRlsContext(req),
    req.branch.id,
    req.body as UpdateBranchInput,
  );
  res.status(200).json(result);
});

export const deleteBranch: RequestHandler = asyncHandler(async (req, res) => {
  if (!req.branch) throw new AppError("Branch scope is required.", 404);
  const result = await deleteBranchService(getRlsContext(req), req.branch.id);
  res.status(200).json(result);
});

export const setSchoolCurricula: RequestHandler = asyncHandler(
  async (req, res) => {
    const result = await updateSchoolCurricula(
      getRlsContext(req),
      req.body as UpdateCurriculaInput,
    );
    res.status(200).json(result);
  },
);
