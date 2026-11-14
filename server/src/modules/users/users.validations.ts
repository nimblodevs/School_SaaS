import { z } from "zod";
import { curriculumSchema } from "../auth/auth.validation.js";

const uniqueCurricula = z
  .array(curriculumSchema)
  .min(1)
  .refine(
    (curricula) => new Set(curricula).size === curricula.length,
    "Curricula must not be repeated.",
  );

const branchAssignmentSchema = z.object({
  branchId: z.string().uuid(),
  curricula: uniqueCurricula,
});

const uniqueBranchAssignments = z
  .array(branchAssignmentSchema)
  .min(1)
  .refine(
    (branches) =>
      new Set(branches.map(({ branchId }) => branchId)).size ===
      branches.length,
    "Branch assignments must be unique.",
  );

export const schoolRoleSchema = z.enum([
  "BRANCH_ADMIN",
  "MANAGER",
  "TEACHER",
  "STAFF",
  "STUDENT",
  "PARENT",
  "BURSAR",
]);

export const createMemberSchema = z.object({
  fullName: z.string().trim().min(2).max(160),
  email: z.string().trim().email().transform((value) => value.toLowerCase()),
  password: z.string().min(12).max(256),
  role: schoolRoleSchema,
  branches: uniqueBranchAssignments,
});

export const updateMemberSchema = z
  .object({
    fullName: z.string().trim().min(2).max(160).optional(),
    role: schoolRoleSchema.optional(),
    branches: uniqueBranchAssignments.optional(),
  })
  .refine((member) => Object.values(member).some((value) => value !== undefined), {
    message: "At least one member field is required.",
  });

export const membershipIdSchema = z.string().uuid();
