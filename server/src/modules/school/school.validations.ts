import { z } from "zod";
import { curriculumSchema } from "../auth/auth.validation.js";

const uniqueCurricula = z
  .array(curriculumSchema)
  .min(1)
  .refine(
    (curricula) => new Set(curricula).size === curricula.length,
    "Curricula must not be repeated.",
  );

export const branchIdSchema = z.string().uuid();

export const createBranchSchema = z.object({
  name: z.string().trim().min(1).max(120),
  county: z.string().trim().min(1).max(120),
  subCounty: z.string().trim().min(1).max(120),
  ward: z.string().trim().min(1).max(120),
  area: z.string().trim().min(1).max(160),
  latitude: z.string().trim().default(""),
  longitude: z.string().trim().default(""),
  nearestLandmark: z.string().trim().default(""),
  branchAdminName: z.string().trim().default(""),
  branchAdminTitle: z.enum(["HEAD_TEACHER", "PRINCIPAL", "BRANCH_ADMIN"]).optional(),
  branchAdminEmail: z
    .string()
    .trim()
    .default("")
    .refine((value) => !value || z.email().safeParse(value).success, "Invalid email.")
    .transform((value) => value.toLowerCase()),
  branchAdminMobile: z.string().trim().default(""),
  branchAdminAlternativeMobile: z.string().trim().default(""),
  curricula: uniqueCurricula,
});

export const updateBranchSchema = createBranchSchema
  .partial()
  .refine((branch) => Object.keys(branch).length > 0, {
    message: "At least one branch field is required.",
  });

export const updateCurriculaSchema = z
  .object({
    curricula: uniqueCurricula,
    branches: z
      .array(
        z.object({
          branchId: branchIdSchema,
          curricula: uniqueCurricula,
        }),
      )
      .min(1)
      .refine(
        (branches) =>
          new Set(branches.map(({ branchId }) => branchId)).size ===
          branches.length,
        "Each branch must appear once.",
      ),
  })
  .superRefine(({ curricula, branches }, context) => {
    const enabled = new Set(curricula);
    const offered = new Set<string>();

    branches.forEach((branch, branchIndex) => {
      for (const curriculum of branch.curricula) {
        if (!enabled.has(curriculum)) {
          context.addIssue({
            code: "custom",
            path: ["branches", branchIndex, "curricula"],
            message: "Branch curricula must be enabled for the school.",
          });
        }
        offered.add(curriculum);
      }
    });

    for (const curriculum of enabled) {
      if (!offered.has(curriculum)) {
        context.addIssue({
          code: "custom",
          path: ["branches"],
          message: `Curriculum ${curriculum} must be offered at a branch.`,
        });
      }
    }
  });
