import type { Request, RequestHandler } from "express";
import { AppError } from "../../utils/error/AppError.js";
import {
  createMember as createMemberService,
  deleteMember as deleteMemberService,
  listMembers as listMembersService,
  updateMember as updateMemberService,
} from "./users.services.js";
import type {
  createMemberSchema,
  updateMemberSchema,
} from "./users.validations.js";
import type { z } from "zod";

type CreateMemberInput = z.infer<typeof createMemberSchema>;
type UpdateMemberInput = z.infer<typeof updateMemberSchema>;

function getRlsContext(req: Request) {
  if (!req.rls) {
    throw new AppError("Authentication and school scope are required.", 401);
  }
  return req.rls;
}

function getMembershipId(req: Request): string {
  const membershipId = req.params.membershipId;
  if (typeof membershipId !== "string") {
    throw new AppError("A valid membership ID is required.", 400);
  }
  return membershipId;
}

function asyncHandler(
  action: (req: Request, res: Parameters<RequestHandler>[1]) => Promise<void>,
): RequestHandler {
  return (req, res, next) => {
    void action(req, res).catch(next);
  };
}

export const listMembers: RequestHandler = asyncHandler(async (req, res) => {
  const members = await listMembersService(getRlsContext(req));
  res.status(200).json({ members });
});

export const createMember: RequestHandler = asyncHandler(async (req, res) => {
  const member = await createMemberService(
    getRlsContext(req),
    req.body as CreateMemberInput,
  );
  res.status(201).json({ member });
});

export const updateMember: RequestHandler = asyncHandler(async (req, res) => {
  const member = await updateMemberService(
    getRlsContext(req),
    getMembershipId(req),
    req.body as UpdateMemberInput,
  );
  res.status(200).json({ member });
});

export const deleteMember: RequestHandler = asyncHandler(async (req, res) => {
  if (!req.auth) throw new AppError("Authentication is required.", 401);
  const result = await deleteMemberService(
    getRlsContext(req),
    getMembershipId(req),
    req.auth.userId,
  );
  res.status(200).json(result);
});
