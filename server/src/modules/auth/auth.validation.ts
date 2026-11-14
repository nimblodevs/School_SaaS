import { z } from "zod";

export const curriculumSchema = z.enum(["CBC", "KCSE", "CAMBRIDGE", "IB"]);

const uniqueArray = <T extends z.ZodType>(itemSchema: T) =>
  z.array(itemSchema).min(1).refine(
    (items) => new Set(items).size === items.length,
    "Values must not be repeated.",
  );

const registrationBranchSchema = z.object({
  name: z.string().trim().min(1).max(120),
  county: z.string().trim().min(1).max(120),
  subCounty: z.string().trim().min(1).max(120),
  ward: z.string().trim().min(1).max(120),
  area: z.string().trim().min(1).max(160),
  latitude: z.string().trim().default(""),
  longitude: z.string().trim().default(""),
  nearestLandmark: z.string().trim().default(""),
  curricula: uniqueArray(curriculumSchema),
});

export const schoolRegistrationSchema = z
  .object({
    school: z.object({
      name: z.string().trim().min(1).max(200),
      type: z.string().trim().min(1).max(80),
      email: z.string().trim().email().transform((value) => value.toLowerCase()),
      phone: z.string().trim().min(1).max(40),
      website: z
        .string()
        .trim()
        .default("")
        .refine((value) => {
          if (!value) return true;
          try {
            return ["http:", "https:"].includes(new URL(value).protocol);
          } catch {
            return false;
          }
        }, "Invalid URL"),
      schoolNemisNo: z.string().trim().optional(),
      schoolKraPin: z.string().trim().optional(),
      schoolMotto: z.string().trim().default(""),
      visionStatement: z.string().trim().default(""),
      missionStatement: z.string().trim().default(""),
      headOfficeAddress: z.string().trim().default(""),
      location: z.record(z.string(), z.unknown()).optional(),
      curricula: uniqueArray(curriculumSchema),
      branches: z.array(registrationBranchSchema).min(1),
    }),
    admin: z.object({
      fullName: z.string().trim().min(2).max(160),
      email: z
        .string()
        .trim()
        .email()
        .transform((value) => value.toLowerCase()),
      password: z.string().min(12).max(256),
      phone: z.string().trim().max(40).optional(),
    }),
  })
  .superRefine(({ school }, context) => {
    const enabled = new Set(school.curricula);
    const offered = new Set<string>();

    for (const [branchIndex, branch] of school.branches.entries()) {
      for (const curriculum of branch.curricula) {
        if (!enabled.has(curriculum)) {
          context.addIssue({
            code: "custom",
            path: ["school", "branches", branchIndex, "curricula"],
            message: "Branch curricula must be enabled for the school.",
          });
        }
        offered.add(curriculum);
      }
    }

    for (const curriculum of enabled) {
      if (!offered.has(curriculum)) {
        context.addIssue({
          code: "custom",
          path: ["school", "branches"],
          message: `Curriculum ${curriculum} must be offered at a branch.`,
        });
      }
    }

    const branchNames = school.branches.map((branch) =>
      branch.name.toLocaleLowerCase(),
    );
    if (new Set(branchNames).size !== branchNames.length) {
      context.addIssue({
        code: "custom",
        path: ["school", "branches"],
        message: "Branch names must be unique within the school.",
      });
    }
  });

export const loginSchema = z.object({
  email: z.string().trim().email().transform((value) => value.toLowerCase()),
  password: z.string().min(1).max(256),
  schoolId: z.string().uuid().optional(),
});

export const selectSchoolSchema = z.object({
  schoolId: z.string().uuid(),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1).max(256),
    newPassword: z.string().min(12).max(256),
  })
  .refine((values) => values.currentPassword !== values.newPassword, {
    path: ["newPassword"],
    message: "New password must differ from the current password.",
  });
