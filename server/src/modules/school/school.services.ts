import { and, eq, inArray, sql } from "drizzle-orm";
import { getDatabase } from "../../config/database.js";
import {
  schoolBranchCurriculums,
  schoolBranches,
  schoolCurriculums,
  schoolOwnerships,
  schoolUserBranchCurriculums,
  schoolUserMemberships,
  schools,
  users,
} from "../../db/schema.js";
import { withRlsTransaction, type RlsContext } from "../../middlewares/rls.middleware.js";
import { AppError } from "../../utils/error/AppError.js";
import { randomUUID } from "../../utils/crypto.js";
import type { AuthContext, RequestMetadata } from "../auth/auth.types.js";
import type {
  createBranchSchema,
  updateBranchSchema,
  updateCurriculaSchema,
} from "./school.validations.js";
import type { schoolRegistrationSchema } from "../auth/auth.validation.js";
import type { z } from "zod";

type RegistrationInput = z.infer<typeof schoolRegistrationSchema>;
type CreateBranchInput = z.infer<typeof createBranchSchema>;
type UpdateBranchInput = z.infer<typeof updateBranchSchema>;
type UpdateCurriculaInput = z.infer<typeof updateCurriculaSchema>;

const toSchoolSlug = (name: string) =>
  `${name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60)}-${randomUUID().slice(0, 8)}`;

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "23505"
  );
}

function authRlsContext(auth: AuthContext): RlsContext {
  return {
    schoolId: auth.schoolId,
    role: auth.role,
    branchIds: auth.branchIds,
  };
}

export async function registerSchool(
  input: RegistrationInput,
  passwordHash: string,
  _metadata: RequestMetadata,
) {
  const schoolId = randomUUID();
  const adminId = randomUUID();
  const membershipId = randomUUID();
  const schoolSlug = toSchoolSlug(input.school.name);
  const schoolCode = `SCH-${randomUUID().slice(0, 8).toUpperCase()}`;
  const branchIds = input.school.branches.map(() => randomUUID());
  const curriculumIds = new Map(
    input.school.curricula.map((curriculum) => [curriculum, randomUUID()]),
  );
  const now = new Date();

  try {
    await withRlsTransaction(
      { schoolId, role: "ADMIN", branchIds },
      async (transaction) => {
        await transaction.insert(schools).values({
          id: schoolId,
          schoolName: input.school.name,
          schoolCode,
          schoolSlug,
          schoolNemisNo: input.school.schoolNemisNo,
          schoolKraPin: input.school.schoolKraPin,
          schoolMotto: input.school.schoolMotto,
          visionStatement: input.school.visionStatement,
          missionStatement: input.school.missionStatement,
          schoolType: input.school.type,
          schoolLocation: input.school.location,
          officialPhone: input.school.phone,
          schoolEmail: input.school.email,
          website: input.school.website,
          headOfficeAddress: input.school.headOfficeAddress,
          createdAt: now,
          updatedAt: now,
        });

        await transaction.insert(users).values({
          id: adminId,
          fullName: input.admin.fullName,
          email: input.admin.email,
          phone: input.admin.phone,
          passwordHash,
          role: "ADMIN",
          schoolId,
          branchId: branchIds[0],
          isActive: true,
          authProvider: "LOCAL",
          createdAt: now,
          updatedAt: now,
        });

        await transaction.insert(schoolUserMemberships).values({
          id: membershipId,
          userId: adminId,
          schoolId,
          role: "ADMIN",
          isActive: true,
          createdAt: now,
        });

        await transaction.insert(schoolOwnerships).values({
          id: randomUUID(),
          schoolId,
          ownershipType: input.school.type,
          schoolAdminName: input.admin.fullName,
          schoolAdminEmail: input.admin.email,
          schoolAdminMobile: input.admin.phone ?? input.school.phone,
          isPrimary: true,
          createdAt: now,
        });

        await transaction.insert(schoolCurriculums).values(
          input.school.curricula.map((curriculum) => ({
            id: curriculumIds.get(curriculum)!,
            schoolId,
            curriculum,
            createdAt: now,
          })),
        );

        for (const [index, branchInput] of input.school.branches.entries()) {
          const branchId = branchIds[index]!;
          await transaction.insert(schoolBranches).values({
            id: branchId,
            schoolId,
            name: branchInput.name,
            county: branchInput.county,
            subCounty: branchInput.subCounty,
            ward: branchInput.ward,
            area: branchInput.area,
            latitude: branchInput.latitude,
            longitude: branchInput.longitude,
            nearestLandmark: branchInput.nearestLandmark,
            branchAdminName:
              branchInput.name === input.school.branches[0]?.name
                ? input.admin.fullName
                : "",
            createdAt: now,
          });

          const curriculumRows = branchInput.curricula.map((curriculum) => ({
            id: randomUUID(),
            schoolId,
            branchId,
            schoolCurriculumId: curriculumIds.get(curriculum)!,
            createdAt: now,
          }));
          await transaction.insert(schoolBranchCurriculums).values(curriculumRows);
          await transaction.insert(schoolUserBranchCurriculums).values(
            curriculumRows.map((row) => ({
              id: randomUUID(),
              membershipId,
              schoolId,
              branchId,
              schoolCurriculumId: row.schoolCurriculumId,
              createdAt: now,
            })),
          );
        }
      },
    );
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new AppError(
        "A school or administrator with these details already exists.",
        409,
        { cause: error },
      );
    }
    throw error;
  }

  return {
    schoolId,
    schoolSlug,
    schoolName: input.school.name,
    adminId,
    branches: input.school.branches.map((branch, index) => ({
      id: branchIds[index]!,
      name: branch.name,
      curricula: branch.curricula,
    })),
  };
}

export async function getSchoolStructure(context: RlsContext) {
  return withRlsTransaction(context, async (transaction) => {
    const [school] = await transaction
      .select()
      .from(schools)
      .where(eq(schools.id, context.schoolId))
      .limit(1);
    if (!school) throw new AppError("School was not found.", 404);

    const allBranches = await transaction
      .select()
      .from(schoolBranches)
      .where(eq(schoolBranches.schoolId, context.schoolId));
    const branches =
      context.role === "ADMIN"
        ? allBranches
        : allBranches.filter((branch) => context.branchIds.includes(branch.id));
    const curriculumRows = await transaction
      .select({
        branchId: schoolBranchCurriculums.branchId,
        curriculum: schoolCurriculums.curriculum,
      })
      .from(schoolBranchCurriculums)
      .innerJoin(
        schoolCurriculums,
        and(
          eq(schoolCurriculums.id, schoolBranchCurriculums.schoolCurriculumId),
          eq(schoolCurriculums.schoolId, schoolBranchCurriculums.schoolId),
        ),
      )
      .where(eq(schoolBranchCurriculums.schoolId, context.schoolId));
    const curricula = await transaction
      .select({ curriculum: schoolCurriculums.curriculum })
      .from(schoolCurriculums)
      .where(eq(schoolCurriculums.schoolId, context.schoolId));

    return {
      school,
      curricula: curricula.map(({ curriculum }) => curriculum),
      branches: branches.map((branch) => ({
        ...branch,
        curricula: curriculumRows
          .filter((row) => row.branchId === branch.id)
          .map(({ curriculum }) => curriculum),
      })),
    };
  });
}

export async function createBranch(
  auth: AuthContext,
  input: CreateBranchInput,
  _metadata: RequestMetadata,
) {
  const now = new Date();
  const branchId = randomUUID();

  return withRlsTransaction(authRlsContext(auth), async (transaction) => {
    const enabledCurricula = await transaction
      .select({
        id: schoolCurriculums.id,
        curriculum: schoolCurriculums.curriculum,
      })
      .from(schoolCurriculums)
      .where(eq(schoolCurriculums.schoolId, auth.schoolId));
    const curriculumIds = new Map(
      enabledCurricula.map(({ id, curriculum }) => [curriculum, id]),
    );
    if (input.curricula.some((curriculum) => !curriculumIds.has(curriculum))) {
      throw new AppError(
        "One or more curricula are not enabled for this school.",
        400,
      );
    }

    const [duplicate] = await transaction
      .select({ id: schoolBranches.id })
      .from(schoolBranches)
      .where(
        and(
          eq(schoolBranches.schoolId, auth.schoolId),
          sql`lower(btrim(${schoolBranches.name})) = ${input.name.toLowerCase()}`,
        ),
      )
      .limit(1);
    if (duplicate) throw new AppError("A branch with this name already exists.", 409);

    await transaction.insert(schoolBranches).values({
      id: branchId,
      schoolId: auth.schoolId,
      name: input.name,
      county: input.county,
      subCounty: input.subCounty,
      ward: input.ward,
      area: input.area,
      latitude: input.latitude,
      longitude: input.longitude,
      nearestLandmark: input.nearestLandmark,
      branchAdminName: input.branchAdminName,
      branchAdminTitle: input.branchAdminTitle,
      branchAdminEmail: input.branchAdminEmail,
      branchAdminMobile: input.branchAdminMobile,
      branchAdminAlternativeMobile: input.branchAdminAlternativeMobile,
      createdAt: now,
    });

    const branchCurricula = input.curricula.map((curriculum) => ({
      id: randomUUID(),
      schoolId: auth.schoolId,
      branchId,
      schoolCurriculumId: curriculumIds.get(curriculum)!,
      createdAt: now,
    }));
    await transaction.insert(schoolBranchCurriculums).values(branchCurricula);
    if (auth.role === "ADMIN") {
      await transaction.insert(schoolUserBranchCurriculums).values(
        branchCurricula.map((row) => ({
          id: randomUUID(),
          membershipId: auth.membershipId,
          schoolId: auth.schoolId,
          branchId,
          schoolCurriculumId: row.schoolCurriculumId,
          createdAt: now,
        })),
      );
    }

    return {
      schoolId: auth.schoolId,
      branches: [
        {
          id: branchId,
          name: input.name,
          county: input.county,
          subCounty: input.subCounty,
          ward: input.ward,
          area: input.area,
          curricula: input.curricula,
        },
      ],
    };
  });
}

export async function updateBranch(
  context: RlsContext,
  branchId: string,
  input: UpdateBranchInput,
) {
  return withRlsTransaction(context, async (transaction) => {
    const { curricula, ...branchFields } = input;
    if (curricula) {
      const enabledCurricula = await transaction
        .select({
          id: schoolCurriculums.id,
          curriculum: schoolCurriculums.curriculum,
        })
        .from(schoolCurriculums)
        .where(eq(schoolCurriculums.schoolId, context.schoolId));
      const curriculumIds = new Map(
        enabledCurricula.map(({ id, curriculum }) => [curriculum, id]),
      );
      if (curricula.some((curriculum) => !curriculumIds.has(curriculum))) {
        throw new AppError(
          "One or more curricula are not enabled for this school.",
          400,
        );
      }
      const currentLinks = await transaction
        .select({
          id: schoolBranchCurriculums.id,
          schoolCurriculumId: schoolBranchCurriculums.schoolCurriculumId,
        })
        .from(schoolBranchCurriculums)
        .where(
          and(
            eq(schoolBranchCurriculums.schoolId, context.schoolId),
            eq(schoolBranchCurriculums.branchId, branchId),
          ),
        );
      const desiredCurriculumIds = new Set(
        curricula.map((curriculum) => curriculumIds.get(curriculum)!),
      );
      const removedLinkIds = currentLinks
        .filter((link) => !desiredCurriculumIds.has(link.schoolCurriculumId))
        .map(({ id }) => id);
      if (removedLinkIds.length > 0) {
        await transaction
          .delete(schoolBranchCurriculums)
          .where(inArray(schoolBranchCurriculums.id, removedLinkIds));
      }
      const currentCurriculumIds = new Set(
        currentLinks.map(({ schoolCurriculumId }) => schoolCurriculumId),
      );
      const addedLinks = curricula
        .map((curriculum) => curriculumIds.get(curriculum)!)
        .filter((id) => !currentCurriculumIds.has(id))
        .map((schoolCurriculumId) => ({
          id: randomUUID(),
          schoolId: context.schoolId,
          branchId,
          schoolCurriculumId,
        }));
      if (addedLinks.length > 0) {
        await transaction.insert(schoolBranchCurriculums).values(addedLinks);
      }
    }
    if (Object.keys(branchFields).length > 0) {
      await transaction
        .update(schoolBranches)
        .set(branchFields)
        .where(
          and(
            eq(schoolBranches.id, branchId),
            eq(schoolBranches.schoolId, context.schoolId),
          ),
        );
    }
    return { branchId, ...input };
  });
}

export async function deleteBranch(context: RlsContext, branchId: string) {
  return withRlsTransaction(context, async (transaction) => {
    await transaction
      .select({ id: schools.id })
      .from(schools)
      .where(eq(schools.id, context.schoolId))
      .for("update");
    const branches = await transaction
      .select({ id: schoolBranches.id })
      .from(schoolBranches)
      .where(eq(schoolBranches.schoolId, context.schoolId));
    if (branches.length <= 1) {
      throw new AppError("A school must have at least one branch.", 409);
    }

    await transaction
      .delete(schoolBranches)
      .where(
        and(
          eq(schoolBranches.id, branchId),
          eq(schoolBranches.schoolId, context.schoolId),
        ),
      );
    return { branchId };
  });
}

export async function updateSchoolCurricula(
  context: RlsContext,
  input: UpdateCurriculaInput,
) {
  return withRlsTransaction(context, async (transaction) => {
    const branchRows = await transaction
      .select({ id: schoolBranches.id })
      .from(schoolBranches)
      .where(eq(schoolBranches.schoolId, context.schoolId));
    const branchIds = new Set(branchRows.map(({ id }) => id));
    if (input.branches.some(({ branchId }) => !branchIds.has(branchId))) {
      throw new AppError("One or more branches were not found.", 404);
    }
    if (input.branches.length !== branchIds.size) {
      throw new AppError("Curricula must be configured for every branch.", 400);
    }

    const existing = await transaction
      .select()
      .from(schoolCurriculums)
      .where(eq(schoolCurriculums.schoolId, context.schoolId));
    const existingIds = new Map(
      existing.map(({ id, curriculum }) => [curriculum, id]),
    );
    const nextIds = new Map(
      input.curricula.map((curriculum) => [
        curriculum,
        existingIds.get(curriculum) ?? randomUUID(),
      ]),
    );
    const removedIds = existing
      .filter(({ curriculum }) => !nextIds.has(curriculum))
      .map(({ id }) => id);

    const added = input.curricula
      .filter((curriculum) => !existingIds.has(curriculum))
      .map((curriculum) => ({
        id: nextIds.get(curriculum)!,
        schoolId: context.schoolId,
        curriculum,
      }));
    if (added.length > 0) {
      await transaction.insert(schoolCurriculums).values(added);
    }

    const existingBranchLinks = await transaction
      .select({
        id: schoolBranchCurriculums.id,
        branchId: schoolBranchCurriculums.branchId,
        schoolCurriculumId: schoolBranchCurriculums.schoolCurriculumId,
      })
      .from(schoolBranchCurriculums)
      .where(eq(schoolBranchCurriculums.schoolId, context.schoolId));
    const desiredBranchLinks = new Set(
      input.branches.flatMap((branch) =>
        branch.curricula.map(
          (curriculum) => `${branch.branchId}:${nextIds.get(curriculum)!}`,
        ),
      ),
    );
    const removedBranchLinkIds = existingBranchLinks
      .filter(
        (link) =>
          !desiredBranchLinks.has(
            `${link.branchId}:${link.schoolCurriculumId}`,
          ),
      )
      .map(({ id }) => id);
    if (removedBranchLinkIds.length > 0) {
      await transaction
        .delete(schoolBranchCurriculums)
        .where(inArray(schoolBranchCurriculums.id, removedBranchLinkIds));
    }

    const existingBranchLinkKeys = new Set(
      existingBranchLinks.map(
        (link) => `${link.branchId}:${link.schoolCurriculumId}`,
      ),
    );
    const addedBranchLinks = input.branches.flatMap((branch) =>
      branch.curricula
        .map((curriculum) => ({
          branchId: branch.branchId,
          schoolCurriculumId: nextIds.get(curriculum)!,
        }))
        .filter(
          (link) =>
            !existingBranchLinkKeys.has(
              `${link.branchId}:${link.schoolCurriculumId}`,
            ),
        )
        .map((link) => ({
          id: randomUUID(),
          schoolId: context.schoolId,
          ...link,
        })),
    );
    if (addedBranchLinks.length > 0) {
      await transaction.insert(schoolBranchCurriculums).values(addedBranchLinks);
    }
    if (removedIds.length > 0) {
      await transaction
        .delete(schoolCurriculums)
        .where(
          and(
            eq(schoolCurriculums.schoolId, context.schoolId),
            inArray(schoolCurriculums.id, removedIds),
          ),
        );
    }

    return {
      curricula: input.curricula,
      branches: input.branches,
    };
  });
}
