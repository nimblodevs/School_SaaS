import { curriculumEnum } from "../../db/schema.js";

export type SchoolRole = (typeof roleValues)[number];
export type Curriculum = (typeof curriculumEnum.enumValues)[number];

const roleValues = [
  "SUPER_ADMIN",
  "ADMIN",
  "BRANCH_ADMIN",
  "MANAGER",
  "TEACHER",
  "STAFF",
  "STUDENT",
  "PARENT",
  "BURSAR",
] as const;

export interface AuthContext {
  userId: string;
  email: string;
  fullName: string;
  role: SchoolRole;
  schoolId: string;
  schoolSlug: string;
  membershipId: string;
  branchIds: string[];
  branchCurricula: Record<string, Curriculum[]>;
  curricula: Curriculum[];
  sessionId: string;
  refreshSessionId: string;
  mustChangePassword: boolean;
}

export interface RequestMetadata {
  ipAddress: string | null;
  userAgent: string | null;
  traceId: string;
}
