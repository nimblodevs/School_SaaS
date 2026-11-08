import {
  boolean,
  check,
  date,
  foreignKey,
  integer,
  index,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  time,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { sql, relations } from "drizzle-orm";

export const roleEnum = pgEnum("Role", [
  "SUPER_ADMIN",
  "ADMIN",
  "BRANCH_ADMIN",
  "MANAGER",
  "TEACHER",
  "STAFF",
  "STUDENT",
  "PARENT",
  "BURSAR",
]);
export const branchAdminTitleEnum = pgEnum("BranchAdminTitle", [
  "HEAD_TEACHER",
  "PRINCIPAL",
  "BRANCH_ADMIN",
]);
export const genderEnum = pgEnum("Gender", ["MALE", "FEMALE", "OTHER"]);
export const parentRelationEnum = pgEnum("ParentRelation", [
  "MOTHER",
  "FATHER",
  "GUARDIAN",
]);
export const staffModuleEnum = pgEnum("StaffModule", [
  "STUDENTS",
  "ATTENDANCE",
  "TIMETABLE",
  "EXAMS",
  "CBC",
  "FEES",
  "REPORTS",
]);
export const auditActionEnum = pgEnum("AuditAction", [
  "CREATE",
  "UPDATE",
  "DELETE",
  "AUTH_LOGIN_SUCCESS",
  "AUTH_LOGIN_FAILED",
  "AUTH_REFRESH_TOKEN_REUSE",
  "AUTH_LOGOUT",
  "PASSWORD_CHANGED",
  "PASSWORD_CHANGE_FAILED",
  "ACCOUNT_LOCKED",
  "IMPERSONATION_STARTED",
  "IMPERSONATED_ACTION",
  "IMPERSONATION_ENDED",
  "PAYMENT_RECORDED",
  "PAYMENT_ALLOCATED",
  "PAYMENT_REFUNDED",
  "INVOICE_ISSUED",
  "PAYROLL_PROCESSED",
  "INVITE",
]);
export const bloodGroupEnum = pgEnum("BloodGroup", [
  "A_POSITIVE",
  "A_NEGATIVE",
  "B_POSITIVE",
  "B_NEGATIVE",
  "AB_POSITIVE",
  "AB_NEGATIVE",
  "O_POSITIVE",
  "O_NEGATIVE",
]);
export const admissionApplicationStatusEnum = pgEnum(
  "AdmissionApplicationStatus",
  [
    "SUBMITTED",
    "RESUBMITTED",
    "UNDER_REVIEW",
    "RETURNED",
    "ACCEPTED",
    "WAITLISTED",
    "REJECTED",
    "WITHDRAWN",
    "ENROLLED",
  ],
);
export const enrollmentStatusEnum = pgEnum("EnrollmentStatus", [
  "ACTIVE",
  "COMPLETED",
  "TRANSFERRED",
  "GRADUATED",
  "WITHDRAWN",
]);
export const studentLifecycleStatusEnum = pgEnum("StudentLifecycleStatus", [
  "ACTIVE",
  "WITHDRAWN",
  "GRADUATED",
]);
export const curriculumEnum = pgEnum("Curriculum", [
  "KCSE",
  "CBC",
  "CAMBRIDGE",
  "IB",
]);
export const curriculumFrameworkStatusEnum = pgEnum(
  "CurriculumFrameworkStatus",
  ["DRAFT", "ACTIVE", "ARCHIVED", "LEGACY"],
);
export const weekdayEnum = pgEnum("Weekday", [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
]);
export const attendanceStatusEnum = pgEnum("AttendanceStatus", [
  "PRESENT",
  "ABSENT",
  "LATE",
  "EXCUSED",
]);
export const assessmentTypeEnum = pgEnum("AssessmentType", [
  "DIAGNOSTIC",
  "FORMATIVE",
  "SCHOOL_BASED_ASSESSMENT",
  "PROJECT",
  "PRACTICAL",
  "OBSERVATION",
  "PORTFOLIO",
  "ORAL",
  "WRITTEN",
  "PERFORMANCE",
  "NATIONAL_ASSESSMENT",
]);
export const competencyLevelEnum = pgEnum("CompetencyLevel", [
  "EXCEEDING_EXPECTATION",
  "MEETING_EXPECTATION",
  "APPROACHING_EXPECTATION",
  "BELOW_EXPECTATION",
]);
export const invoiceStatusEnum = pgEnum("InvoiceStatus", [
  "UNPAID",
  "PARTIALLY_PAID",
  "PAID",
  "OVERDUE",
]);
export const allocationStatusEnum = pgEnum("AllocationStatus", [
  "ACTIVE",
  "REVERSED",
]);
export const creditNoteStatusEnum = pgEnum("CreditNoteStatus", [
  "ISSUED",
  "PARTIALLY_APPLIED",
  "APPLIED",
  "REFUNDED",
  "VOIDED",
]);
export const refundStatusEnum = pgEnum("RefundStatus", [
  "PENDING",
  "PROCESSING",
  "COMPLETED",
  "FAILED",
  "CANCELLED",
]);
export const feeReminderProviderEnum = pgEnum("FeeReminderProvider", [
  "GMAIL",
  "OUTLOOK",
]);
export const feeReminderStatusEnum = pgEnum("FeeReminderStatus", [
  "PENDING",
  "SENT",
  "FAILED",
  "SKIPPED",
]);
export const creditNoteReasonEnum = pgEnum("CreditNoteReason", [
  "OVERPAYMENT",
  "REFUND",
  "REVERSAL",
  "ADJUSTMENT",
  "WRONG_INVOICE",
  "DUPLICATE",
  "CHARGEBACK",
]);
export const paymentMethodEnum = pgEnum("PaymentMethod", [
  "MPESA",
  "CASH",
  "CHEQUE",
  "BANK_DEPOSIT",
  "BANK_TRANSFER",
  "CARD",
]);
export const paymentStatusEnum = pgEnum("PaymentStatus", [
  "PENDING",
  "COMPLETED",
  "FAILED",
  "REFUNDED",
]);
export const ledgerDirectionEnum = pgEnum("LedgerDirection", [
  "DEBIT",
  "CREDIT",
]);
export const allowanceApplicabilityEnum = pgEnum("AllowanceApplicability", [
  "ALL_EMPLOYEES",
  "TEACHERS",
  "STAFF",
  "JOB_GROUP",
]);
export const loanStatusEnum = pgEnum("LoanStatus", [
  "ACTIVE",
  "PARTIALLY_PAID",
  "COMPLETED",
  "DEFAULTED",
]);
export const loanRequestStatusEnum = pgEnum("LoanRequestStatus", [
  "PENDING",
  "APPROVED",
  "REJECTED",
  "CANCELLED",
]);
export const loanSourceTypeEnum = pgEnum("LoanSourceType", [
  "SCHOOL",
  "BANK",
  "SACCO",
  "OTHER",
]);
export const payrollStatusEnum = pgEnum("PayrollStatus", [
  "PENDING",
  "DRAFT",
  "PROCESSING",
  "PENDING_APPROVAL",
  "APPROVED",
  "PAID",
]);
export const contractTypeEnum = pgEnum("ContractType", [
  "PERMANENT",
  "CONTRACT",
  "FIXED_TERM",
  "CASUAL",
  "INTERNSHIP",
]);
export const leaveStatusEnum = pgEnum("LeaveStatus", [
  "PENDING",
  "APPROVED",
  "REJECTED",
  "CANCELLED",
]);
export const resignationStatusEnum = pgEnum("ResignationStatus", [
  "PENDING",
  "REVIEWED",
  "APPROVED",
  "REJECTED",
  "COMPLETED",
]);

export const schools = pgTable(
  "schools",
  {
    id: uuid("id").primaryKey(),
    schoolName: text("school_name").notNull(),
    schoolCode: text("school_code").notNull(),
    schoolSlug: text("school_slug").notNull(),
    schoolNemisNo: text("school_nemis_no"),
    schoolKraPin: text("school_kra_pin"),
    schoolMotto: text("school_motto").notNull(),
    visionStatement: text("vision_statement").notNull(),
    missionStatement: text("mission_statement").notNull(),
    schoolType: text("school_type").notNull(),
    schoolLocation: jsonb("school_location"),
    officialPhone: text("official_phone").notNull(),
    schoolEmail: text("school_email").notNull(),
    website: text("website").notNull().default(""),
    headOfficeAddress: text("head_office_address").notNull().default(""),
    logoObjectKey: text("logo_object_key"),
    logoContentType: text("logo_content_type"),
    isActive: boolean("is_active").notNull().default(true),
    nextTeacherSequence: integer("next_teacher_sequence").notNull().default(0),
    nextStaffSequence: integer("next_staff_sequence").notNull().default(0),
    nextStudentSequence: integer("next_student_sequence").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("schools_school_code_unique").on(table.schoolCode),
    uniqueIndex("schools_school_slug_unique").on(table.schoolSlug),
    uniqueIndex("schools_school_nemis_no_unique")
      .on(table.schoolNemisNo)
      .where(
        sql`${table.schoolNemisNo} IS NOT NULL AND ${table.schoolNemisNo} <> ''`,
      ),
    uniqueIndex("schools_school_kra_pin_unique")
      .on(table.schoolKraPin)
      .where(
        sql`${table.schoolKraPin} IS NOT NULL AND ${table.schoolKraPin} <> ''`,
      ),
    uniqueIndex("schools_official_phone_nonempty_unique")
      .on(table.officialPhone)
      .where(sql`${table.officialPhone} <> ''`),
    uniqueIndex("schools_school_email_normalized_unique")
      .on(sql`lower(btrim(${table.schoolEmail}))`)
      .where(sql`btrim(${table.schoolEmail}) <> ''`),
    index("schools_school_name_idx").on(table.schoolName),
  ],
);

export const schoolBranches = pgTable(
  "school_branches",
  {
    id: uuid("id").primaryKey(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    county: text("county").notNull(),
    subCounty: text("sub_county").notNull(),
    ward: text("ward").notNull(),
    area: text("area").notNull(),
    latitude: text("latitude").notNull().default(""),
    longitude: text("longitude").notNull().default(""),
    nearestLandmark: text("nearest_landmark").notNull().default(""),
    branchAdminName: text("branch_admin_name").notNull().default(""),
    branchAdminTitle: branchAdminTitleEnum("branch_admin_title"),
    branchAdminEmail: text("branch_admin_email").notNull().default(""),
    branchAdminMobile: text("branch_admin_mobile").notNull().default(""),
    branchAdminAlternativeMobile: text("branch_admin_alternative_mobile")
      .notNull()
      .default(""),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("school_branches_id_school_unique").on(
      table.id,
      table.schoolId,
    ),
    uniqueIndex("school_branches_admin_email_normalized_unique")
      .on(sql`lower(btrim(${table.branchAdminEmail}))`)
      .where(sql`btrim(${table.branchAdminEmail}) <> ''`),
    index("school_branches_school_id_idx").on(table.schoolId),
  ],
);

export const schoolContactEmails = pgTable(
  "school_contact_emails",
  {
    email: text("email").primaryKey(),
    sourceType: text("source_type").notNull(),
    sourceId: uuid("source_id").notNull(),
  },
  (table) => [
    uniqueIndex("school_contact_emails_source_unique").on(
      table.sourceType,
      table.sourceId,
    ),
  ],
);

export const schoolOwnerships = pgTable(
  "school_ownerships",
  {
    id: uuid("id").primaryKey(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    ownershipType: text("ownership_type").notNull(),
    schoolAdminName: text("school_admin_name").notNull(),
    schoolAdminEmail: text("school_admin_email").notNull(),
    schoolAdminMobile: text("school_admin_mobile").notNull(),
    alternativeMobile: text("alternative_mobile").notNull().default(""),
    isPrimary: boolean("is_primary").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("school_ownerships_one_primary_per_school_unique")
      .on(table.schoolId)
      .where(sql`${table.isPrimary}`),
    index("school_ownerships_school_id_idx").on(table.schoolId),
  ],
);

export const jobGroups = pgTable(
  "job_groups",
  {
    id: uuid("id").primaryKey(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    code: text("code").notNull(),
    description: text("description"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("job_groups_id_school_unique").on(table.id, table.schoolId),
    uniqueIndex("job_groups_school_code_unique").on(table.schoolId, table.code),
    index("job_groups_school_id_idx").on(table.schoolId),
  ],
);

export const schoolDocuments = pgTable(
  "school_documents",
  {
    id: uuid("id").primaryKey(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    branchId: uuid("branch_id"),
    documentType: text("document_type").notNull(),
    originalName: text("original_name").notNull(),
    contentType: text("content_type").notNull(),
    objectKey: text("object_key").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    foreignKey({
      columns: [table.branchId, table.schoolId],
      foreignColumns: [schoolBranches.id, schoolBranches.schoolId],
      name: "school_documents_branch_school_fk",
    }).onDelete("cascade"),
    index("school_documents_school_id_idx").on(table.schoolId),
    index("school_documents_branch_id_idx").on(table.branchId),
  ],
);

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey(),
    fullName: text("full_name").notNull(),
    username: text("username"),
    email: text("email").notNull(),
    phone: text("phone"),
    passwordHash: text("password_hash").notNull(),
    role: roleEnum("role").notNull().default("ADMIN"),
    schoolId: uuid("school_id").references(() => schools.id, {
      onDelete: "set null",
    }),
    branchId: uuid("branch_id"),
    branchAdminTitle: branchAdminTitleEnum("branch_admin_title"),
    isActive: boolean("is_active").notNull().default(true),
    mustChangePassword: boolean("must_change_password")
      .notNull()
      .default(false),
    authProvider: text("auth_provider").notNull().default("LOCAL"),
    googleSubject: text("google_subject"),
    currentSessionId: uuid("current_session_id"),
    failedLoginAttempts: integer("failed_login_attempts").notNull().default(0),
    lockedUntil: timestamp("locked_until", { withTimezone: true }),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    lastLoginIp: text("last_login_ip"),
    emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    foreignKey({
      columns: [table.branchId, table.schoolId],
      foreignColumns: [schoolBranches.id, schoolBranches.schoolId],
      name: "users_branch_school_fk",
    }),
    uniqueIndex("users_id_school_unique").on(table.id, table.schoolId),
    uniqueIndex("users_email_unique").on(table.email),
    uniqueIndex("users_username_unique").on(table.username),
    uniqueIndex("users_phone_unique").on(table.phone),
    uniqueIndex("users_google_subject_unique").on(table.googleSubject),
    index("users_school_id_idx").on(table.schoolId),
  ],
);

export const authSessions = pgTable(
  "auth_sessions",
  {
    id: uuid("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("auth_sessions_token_hash_unique").on(table.tokenHash),
    index("auth_sessions_user_id_idx").on(table.userId),
    index("auth_sessions_expires_at_idx").on(table.expiresAt),
  ],
);

export const authChallenges = pgTable(
  "auth_challenges",
  {
    id: uuid("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    purpose: text("purpose").notNull(),
    codeHash: text("code_hash").notNull(),
    attempts: integer("attempts").notNull().default(0),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("auth_challenges_user_purpose_idx").on(table.userId, table.purpose),
    index("auth_challenges_expires_at_idx").on(table.expiresAt),
  ],
);

export const schoolUserMemberships = pgTable(
  "school_user_memberships",
  {
    id: uuid("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("school_user_memberships_user_school_unique").on(
      table.userId,
      table.schoolId,
    ),
    index("school_user_memberships_school_id_idx").on(table.schoolId),
  ],
);

export const schoolSettings = pgTable(
  "school_settings",
  {
    id: uuid("id").primaryKey(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    mpesaShortcode: text("mpesa_shortcode"),
    mpesaEnabled: boolean("mpesa_enabled").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("school_settings_school_id_unique").on(table.schoolId),
    uniqueIndex("school_settings_mpesa_shortcode_unique").on(
      table.mpesaShortcode,
    ),
  ],
);

export const userPasswordHistory = pgTable(
  "user_password_history",
  {
    id: uuid("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    passwordHash: text("password_hash").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("user_password_history_user_created_idx").on(
      table.userId,
      table.createdAt,
    ),
  ],
);

export const passwordResetOtps = pgTable(
  "password_reset_otps",
  {
    id: uuid("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    codeHash: text("code_hash").notNull(),
    challengeTokenHash: text("challenge_token_hash"),
    purpose: text("purpose").notNull(),
    isResend: boolean("is_resend").notNull().default(false),
    attempts: integer("attempts").notNull().default(0),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("password_reset_otps_user_purpose_created_idx").on(
      table.userId,
      table.purpose,
      table.createdAt,
    ),
    uniqueIndex("password_reset_otps_challenge_token_unique").on(
      table.challengeTokenHash,
    ),
  ],
);

export const refreshSessions = pgTable(
  "refresh_sessions",
  {
    id: uuid("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    familyId: uuid("family_id").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    replacedById: text("replaced_by_id"),
    reusedAt: timestamp("reused_at", { withTimezone: true }),
    isImpersonated: boolean("is_impersonated").notNull().default(false),
    impersonatedUserId: uuid("impersonated_user_id").references(
      () => users.id,
      {
        onDelete: "set null",
      },
    ),
    actorSessionId: uuid("actor_session_id"),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("refresh_sessions_token_hash_unique").on(table.tokenHash),
    index("refresh_sessions_user_id_idx").on(table.userId),
    index("refresh_sessions_family_id_idx").on(table.familyId),
  ],
);

export const staffModuleAccess = pgTable(
  "staff_module_access",
  {
    id: uuid("id").primaryKey(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    module: staffModuleEnum("module").notNull(),
    grantedById: uuid("granted_by_id")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("staff_module_access_user_module_unique").on(
      table.userId,
      table.module,
    ),
    index("staff_module_access_school_id_idx").on(table.schoolId),
  ],
);

export const employeeNumbers = pgTable(
  "employee_numbers",
  {
    id: uuid("id").primaryKey(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    employeeNo: text("employee_no").notNull(),
    ownerKey: text("owner_key").notNull().unique(),
  },
  (table) => [
    uniqueIndex("employee_numbers_school_employee_no_unique").on(
      table.schoolId,
      table.employeeNo,
    ),
    uniqueIndex("employee_numbers_owner_key_unique").on(table.ownerKey),
  ],
);

function employeeProfileColumns() {
  return {
    id: uuid("id").primaryKey(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    branchId: uuid("branch_id"),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    firstName: text("first_name").notNull(),
    middleName: text("middle_name"),
    lastName: text("last_name").notNull(),
    nationalIdNumber: text("national_id_number"),
    passportNumber: text("passport_number"),
    employeeKey: text("employee_key")
      .notNull()
      .references(() => employeeNumbers.ownerKey),
    nssfNumber: text("nssf_number"),
    kraPin: text("kra_pin"),
    shaNumber: text("sha_number"),
    jobGroupId: uuid("job_group_id").references(() => jobGroups.id),
    hireDate: timestamp("hire_date", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  };
}

export const teachers = pgTable(
  "teachers",
  employeeProfileColumns(),
  (table) => [
    uniqueIndex("teachers_id_school_unique").on(table.id, table.schoolId),
    foreignKey({
      columns: [table.branchId, table.schoolId],
      foreignColumns: [schoolBranches.id, schoolBranches.schoolId],
      name: "teachers_branch_school_fk",
    }),
    foreignKey({
      columns: [table.userId, table.schoolId],
      foreignColumns: [users.id, users.schoolId],
      name: "teachers_user_school_fk",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.jobGroupId, table.schoolId],
      foreignColumns: [jobGroups.id, jobGroups.schoolId],
      name: "teachers_job_group_school_fk",
    }),
    uniqueIndex("teachers_user_id_unique").on(table.userId),
    uniqueIndex("teachers_employee_key_unique").on(table.employeeKey),
    index("teachers_school_id_idx").on(table.schoolId),
    uniqueIndex("teachers_school_nssf_unique").on(
      table.schoolId,
      table.nssfNumber,
    ),
    uniqueIndex("teachers_school_kra_unique").on(table.schoolId, table.kraPin),
    uniqueIndex("teachers_school_sha_unique").on(
      table.schoolId,
      table.shaNumber,
    ),
    uniqueIndex("teachers_school_national_id_unique").on(
      table.schoolId,
      table.nationalIdNumber,
    ),
    uniqueIndex("teachers_school_passport_unique").on(
      table.schoolId,
      table.passportNumber,
    ),
  ],
);

export const staff = pgTable(
  "staff",
  {
    ...employeeProfileColumns(),
    department: text("department").notNull(),
    jobTitle: text("job_title").notNull(),
  },
  (table) => [
    uniqueIndex("staff_id_school_unique").on(table.id, table.schoolId),
    foreignKey({
      columns: [table.branchId, table.schoolId],
      foreignColumns: [schoolBranches.id, schoolBranches.schoolId],
      name: "staff_branch_school_fk",
    }),
    foreignKey({
      columns: [table.userId, table.schoolId],
      foreignColumns: [users.id, users.schoolId],
      name: "staff_user_school_fk",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.jobGroupId, table.schoolId],
      foreignColumns: [jobGroups.id, jobGroups.schoolId],
      name: "staff_job_group_school_fk",
    }),
    uniqueIndex("staff_user_id_unique").on(table.userId),
    uniqueIndex("staff_employee_key_unique").on(table.employeeKey),
    index("staff_school_id_idx").on(table.schoolId),
    uniqueIndex("staff_school_nssf_unique").on(
      table.schoolId,
      table.nssfNumber,
    ),
    uniqueIndex("staff_school_kra_unique").on(table.schoolId, table.kraPin),
    uniqueIndex("staff_school_sha_unique").on(table.schoolId, table.shaNumber),
    uniqueIndex("staff_school_national_id_unique").on(
      table.schoolId,
      table.nationalIdNumber,
    ),
    uniqueIndex("staff_school_passport_unique").on(
      table.schoolId,
      table.passportNumber,
    ),
  ],
);

export const students = pgTable(
  "students",
  {
    id: uuid("id").primaryKey(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    branchId: uuid("branch_id"),
    userId: uuid("user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    firstName: text("first_name").notNull(),
    middleName: text("middle_name"),
    lastName: text("last_name").notNull(),
    nationalIdNumber: text("national_id_number"),
    passportNumber: text("passport_number"),
    birthCertificateNumber: text("birth_certificate_number"),
    admissionNo: text("admission_no"),
    dateOfBirth: date("date_of_birth"),
    gender: genderEnum("gender"),
    bloodGroup: bloodGroupEnum("blood_group"),
    admissionDate: date("admission_date").notNull().defaultNow(),
    lifecycleStatus: studentLifecycleStatusEnum("lifecycle_status")
      .notNull()
      .default("ACTIVE"),
    isActive: boolean("is_active").notNull().default(true),
    isSuspended: boolean("is_suspended").notNull().default(false),
    suspensionReason: text("suspension_reason"),
    suspendedAt: timestamp("suspended_at", { withTimezone: true }),
    suspendedBy: uuid("suspended_by").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    foreignKey({
      columns: [table.branchId, table.schoolId],
      foreignColumns: [schoolBranches.id, schoolBranches.schoolId],
      name: "students_branch_school_fk",
    }),
    uniqueIndex("students_user_id_unique").on(table.userId),
    index("students_school_id_idx").on(table.schoolId),
    uniqueIndex("students_school_admission_no_unique").on(
      table.schoolId,
      table.admissionNo,
    ),
    uniqueIndex("students_school_national_id_unique").on(
      table.schoolId,
      table.nationalIdNumber,
    ),
    uniqueIndex("students_school_birth_certificate_unique").on(
      table.schoolId,
      table.birthCertificateNumber,
    ),
    uniqueIndex("students_school_passport_unique").on(
      table.schoolId,
      table.passportNumber,
    ),
    uniqueIndex("students_id_school_unique").on(table.id, table.schoolId),
  ],
);

export const parents = pgTable(
  "parents",
  {
    id: uuid("id").primaryKey(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    userId: uuid("user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    firstName: text("first_name").notNull(),
    middleName: text("middle_name"),
    lastName: text("last_name").notNull(),
    nationalIdNumber: text("national_id_number"),
    passportNumber: text("passport_number"),
    phone: text("phone"),
    email: text("email"),
    relation: parentRelationEnum("relation"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("parents_id_school_unique").on(table.id, table.schoolId),
    uniqueIndex("parents_user_id_unique").on(table.userId),
    index("parents_school_id_idx").on(table.schoolId),
    uniqueIndex("parents_school_national_id_unique").on(
      table.schoolId,
      table.nationalIdNumber,
    ),
    uniqueIndex("parents_school_phone_unique").on(table.schoolId, table.phone),
    uniqueIndex("parents_school_email_unique").on(table.schoolId, table.email),
    uniqueIndex("parents_school_passport_unique").on(
      table.schoolId,
      table.passportNumber,
    ),
  ],
);

export const parentStudents = pgTable(
  "student_parents",
  {
    parentId: uuid("parent_id")
      .notNull()
      .references(() => parents.id, { onDelete: "cascade" }),
    studentId: uuid("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    isPrimaryContact: boolean("is_primary_contact").notNull().default(false),
    isFinanciallyResponsible: boolean("is_financially_responsible")
      .notNull()
      .default(false),
    canPickUp: boolean("can_pick_up").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.studentId, table.parentId] })],
);

export const systemSequences = pgTable("system_sequences", {
  key: text("key").primaryKey(),
  nextSchoolCode: integer("next_school_code").notNull().default(1),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").primaryKey(),
    action: auditActionEnum("action").notNull(),
    actorId: uuid("actor_id"),
    schoolId: uuid("school_id").references(() => schools.id, {
      onDelete: "set null",
    }),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id"),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    traceId: text("trace_id").notNull(),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("audit_logs_school_id_idx").on(table.schoolId),
    index("audit_logs_entity_type_entity_id_idx").on(
      table.entityType,
      table.entityId,
    ),
    index("audit_logs_action_created_at_idx").on(table.action, table.createdAt),
  ],
);

export const activationTokens = pgTable(
  "activation_tokens",
  {
    id: uuid("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    isUsed: boolean("is_used").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("activation_tokens_token_hash_unique").on(table.tokenHash),
    index("activation_tokens_user_expires_idx").on(
      table.userId,
      table.expiresAt,
    ),
  ],
);

export const admissionSequences = pgTable(
  "admission_sequences",
  {
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    year: integer("year").notNull(),
    nextVal: integer("next_val").notNull().default(1),
  },
  (table) => [primaryKey({ columns: [table.schoolId, table.year] })],
);

export const admissionApplicationSequences = pgTable(
  "admission_application_sequences",
  {
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    year: integer("year").notNull(),
    nextVal: integer("next_val").notNull().default(1),
  },
  (table) => [primaryKey({ columns: [table.schoolId, table.year] })],
);

export const fileUploads = pgTable(
  "file_uploads",
  {
    id: uuid("id").primaryKey(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    fileName: text("file_name").notNull(),
    originalName: text("original_name").notNull(),
    mimeType: text("mime_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    storageKey: text("storage_key").notNull(),
    storageBucket: text("storage_bucket").notNull(),
    url: text("url"),
    relatedType: text("related_type"),
    relatedId: text("related_id"),
    uploadedById: uuid("uploaded_by_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("file_uploads_related_idx").on(table.relatedType, table.relatedId),
  ],
);

// --- Drizzle Relations Definitions ---

export const schoolsRelations = relations(schools, ({ many }) => ({
  branches: many(schoolBranches),
  users: many(users),
  teachers: many(teachers),
  staff: many(staff),
  students: many(students),
  parents: many(parents),
  jobGroups: many(jobGroups),
  documents: many(schoolDocuments),
  ownerships: many(schoolOwnerships),
  auditLogs: many(auditLogs),
  fileUploads: many(fileUploads),
}));

export const schoolBranchesRelations = relations(schoolBranches, ({ one, many }) => ({
  school: one(schools, {
    fields: [schoolBranches.schoolId],
    references: [schools.id],
  }),
  teachers: many(teachers),
  staff: many(staff),
  students: many(students),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  school: one(schools, {
    fields: [users.schoolId],
    references: [schools.id],
  }),
  branch: one(schoolBranches, {
    fields: [users.branchId],
    references: [schoolBranches.id],
  }),
  teacherProfile: one(teachers, {
    fields: [users.id],
    references: [teachers.userId],
  }),
  staffProfile: one(staff, {
    fields: [users.id],
    references: [staff.userId],
  }),
  studentProfile: one(students, {
    fields: [users.id],
    references: [students.userId],
  }),
  parentProfile: one(parents, {
    fields: [users.id],
    references: [parents.userId],
  }),
  sessions: many(authSessions),
  refreshSessions: many(refreshSessions),
}));

export const studentsRelations = relations(students, ({ one, many }) => ({
  school: one(schools, {
    fields: [students.schoolId],
    references: [schools.id],
  }),
  branch: one(schoolBranches, {
    fields: [students.branchId],
    references: [schoolBranches.id],
  }),
  user: one(users, {
    fields: [students.userId],
    references: [users.id],
  }),
  parents: many(parentStudents),
}));

export const parentsRelations = relations(parents, ({ one, many }) => ({
  school: one(schools, {
    fields: [parents.schoolId],
    references: [schools.id],
  }),
  user: one(users, {
    fields: [parents.userId],
    references: [users.id],
  }),
  students: many(parentStudents),
}));

export const parentStudentsRelations = relations(parentStudents, ({ one }) => ({
  parent: one(parents, {
    fields: [parentStudents.parentId],
    references: [parents.id],
  }),
  student: one(students, {
    fields: [parentStudents.studentId],
    references: [students.id],
  }),
}));
