CREATE TYPE "AdmissionApplicationStatus" AS ENUM('SUBMITTED', 'RESUBMITTED', 'UNDER_REVIEW', 'RETURNED', 'ACCEPTED', 'WAITLISTED', 'REJECTED', 'WITHDRAWN', 'ENROLLED');--> statement-breakpoint
CREATE TYPE "AllocationStatus" AS ENUM('ACTIVE', 'REVERSED');--> statement-breakpoint
CREATE TYPE "AllowanceApplicability" AS ENUM('ALL_EMPLOYEES', 'TEACHERS', 'STAFF', 'JOB_GROUP');--> statement-breakpoint
CREATE TYPE "AssessmentType" AS ENUM('DIAGNOSTIC', 'FORMATIVE', 'SCHOOL_BASED_ASSESSMENT', 'PROJECT', 'PRACTICAL', 'OBSERVATION', 'PORTFOLIO', 'ORAL', 'WRITTEN', 'PERFORMANCE', 'NATIONAL_ASSESSMENT');--> statement-breakpoint
CREATE TYPE "AttendanceStatus" AS ENUM('PRESENT', 'ABSENT', 'LATE', 'EXCUSED');--> statement-breakpoint
CREATE TYPE "AuditAction" AS ENUM('CREATE', 'UPDATE', 'DELETE', 'AUTH_LOGIN_SUCCESS', 'AUTH_LOGIN_FAILED', 'AUTH_REFRESH_TOKEN_REUSE', 'AUTH_LOGOUT', 'PASSWORD_CHANGED', 'PASSWORD_CHANGE_FAILED', 'ACCOUNT_LOCKED', 'IMPERSONATION_STARTED', 'IMPERSONATED_ACTION', 'IMPERSONATION_ENDED', 'PAYMENT_RECORDED', 'PAYMENT_ALLOCATED', 'PAYMENT_REFUNDED', 'INVOICE_ISSUED', 'PAYROLL_PROCESSED', 'INVITE');--> statement-breakpoint
CREATE TYPE "BloodGroup" AS ENUM('A_POSITIVE', 'A_NEGATIVE', 'B_POSITIVE', 'B_NEGATIVE', 'AB_POSITIVE', 'AB_NEGATIVE', 'O_POSITIVE', 'O_NEGATIVE');--> statement-breakpoint
CREATE TYPE "BranchAdminTitle" AS ENUM('HEAD_TEACHER', 'PRINCIPAL', 'BRANCH_ADMIN');--> statement-breakpoint
CREATE TYPE "CompetencyLevel" AS ENUM('EXCEEDING_EXPECTATION', 'MEETING_EXPECTATION', 'APPROACHING_EXPECTATION', 'BELOW_EXPECTATION');--> statement-breakpoint
CREATE TYPE "ContractType" AS ENUM('PERMANENT', 'CONTRACT', 'FIXED_TERM', 'CASUAL', 'INTERNSHIP');--> statement-breakpoint
CREATE TYPE "CreditNoteReason" AS ENUM('OVERPAYMENT', 'REFUND', 'REVERSAL', 'ADJUSTMENT', 'WRONG_INVOICE', 'DUPLICATE', 'CHARGEBACK');--> statement-breakpoint
CREATE TYPE "CreditNoteStatus" AS ENUM('ISSUED', 'PARTIALLY_APPLIED', 'APPLIED', 'REFUNDED', 'VOIDED');--> statement-breakpoint
CREATE TYPE "Curriculum" AS ENUM('KCSE', 'CBC', 'CAMBRIDGE', 'IB');--> statement-breakpoint
CREATE TYPE "CurriculumFrameworkStatus" AS ENUM('DRAFT', 'ACTIVE', 'ARCHIVED', 'LEGACY');--> statement-breakpoint
CREATE TYPE "EnrollmentStatus" AS ENUM('ACTIVE', 'COMPLETED', 'TRANSFERRED', 'GRADUATED', 'WITHDRAWN');--> statement-breakpoint
CREATE TYPE "FeeReminderProvider" AS ENUM('GMAIL', 'OUTLOOK');--> statement-breakpoint
CREATE TYPE "FeeReminderStatus" AS ENUM('PENDING', 'SENT', 'FAILED', 'SKIPPED');--> statement-breakpoint
CREATE TYPE "Gender" AS ENUM('MALE', 'FEMALE', 'OTHER');--> statement-breakpoint
CREATE TYPE "InvoiceStatus" AS ENUM('UNPAID', 'PARTIALLY_PAID', 'PAID', 'OVERDUE');--> statement-breakpoint
CREATE TYPE "LeaveStatus" AS ENUM('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "LedgerDirection" AS ENUM('DEBIT', 'CREDIT');--> statement-breakpoint
CREATE TYPE "LoanRequestStatus" AS ENUM('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "LoanSourceType" AS ENUM('SCHOOL', 'BANK', 'SACCO', 'OTHER');--> statement-breakpoint
CREATE TYPE "LoanStatus" AS ENUM('ACTIVE', 'PARTIALLY_PAID', 'COMPLETED', 'DEFAULTED');--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "MpesaOperationStatus" AS ENUM('PENDING', 'SUCCEEDED', 'FAILED', 'TIMED_OUT', 'UNKNOWN', 'ACTIVE');
EXCEPTION
  WHEN duplicate_object THEN
    IF (
      SELECT array_agg(e.enumlabel::text ORDER BY e.enumsortorder)
      FROM pg_type t
      JOIN pg_namespace n ON n.oid = t.typnamespace
      JOIN pg_enum e ON e.enumtypid = t.oid
      WHERE n.nspname = 'public' AND t.typname = 'MpesaOperationStatus'
    ) IS DISTINCT FROM ARRAY['PENDING', 'SUCCEEDED', 'FAILED', 'TIMED_OUT', 'UNKNOWN', 'ACTIVE']::text[] THEN
      RAISE EXCEPTION 'Existing public.MpesaOperationStatus enum does not match the application schema';
    END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "MpesaOperationType" AS ENUM('STK_PUSH', 'STK_QUERY', 'B2C', 'REVERSAL', 'TRANSACTION_STATUS', 'STANDING_ORDER', 'STANDING_ORDER_EXECUTION', 'ACCOUNT_BALANCE');
EXCEPTION
  WHEN duplicate_object THEN
    IF (
      SELECT array_agg(e.enumlabel::text ORDER BY e.enumsortorder)
      FROM pg_type t
      JOIN pg_namespace n ON n.oid = t.typnamespace
      JOIN pg_enum e ON e.enumtypid = t.oid
      WHERE n.nspname = 'public' AND t.typname = 'MpesaOperationType'
    ) IS DISTINCT FROM ARRAY['STK_PUSH', 'STK_QUERY', 'B2C', 'REVERSAL', 'TRANSACTION_STATUS', 'STANDING_ORDER', 'STANDING_ORDER_EXECUTION', 'ACCOUNT_BALANCE']::text[] THEN
      RAISE EXCEPTION 'Existing public.MpesaOperationType enum does not match the application schema';
    END IF;
END $$;--> statement-breakpoint
CREATE TYPE "ParentRelation" AS ENUM('MOTHER', 'FATHER', 'GUARDIAN');--> statement-breakpoint
CREATE TYPE "PaymentMethod" AS ENUM('MPESA', 'CASH', 'CHEQUE', 'BANK_DEPOSIT', 'BANK_TRANSFER', 'CARD');--> statement-breakpoint
CREATE TYPE "PaymentStatus" AS ENUM('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED');--> statement-breakpoint
CREATE TYPE "PayrollStatus" AS ENUM('PENDING', 'DRAFT', 'PROCESSING', 'PENDING_APPROVAL', 'APPROVED', 'PAID');--> statement-breakpoint
CREATE TYPE "RefundStatus" AS ENUM('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "ResignationStatus" AS ENUM('PENDING', 'REVIEWED', 'APPROVED', 'REJECTED', 'COMPLETED');--> statement-breakpoint
CREATE TYPE "Role" AS ENUM('SUPER_ADMIN', 'ADMIN', 'BRANCH_ADMIN', 'MANAGER', 'TEACHER', 'STAFF', 'STUDENT', 'PARENT', 'BURSAR');--> statement-breakpoint
CREATE TYPE "StaffModule" AS ENUM('STUDENTS', 'ATTENDANCE', 'TIMETABLE', 'EXAMS', 'CBC', 'FEES', 'REPORTS');--> statement-breakpoint
CREATE TYPE "StudentLifecycleStatus" AS ENUM('ACTIVE', 'WITHDRAWN', 'GRADUATED');--> statement-breakpoint
CREATE TYPE "Weekday" AS ENUM('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY');--> statement-breakpoint
CREATE TABLE "activation_tokens" (
	"id" uuid PRIMARY KEY,
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"is_used" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "admission_application_sequences" (
	"school_id" uuid,
	"year" integer,
	"next_val" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "admission_application_sequences_pkey" PRIMARY KEY("school_id","year")
);
--> statement-breakpoint
CREATE TABLE "admission_sequences" (
	"school_id" uuid,
	"year" integer,
	"next_val" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "admission_sequences_pkey" PRIMARY KEY("school_id","year")
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY,
	"action" "AuditAction" NOT NULL,
	"actor_id" uuid,
	"school_id" uuid,
	"entity_type" text NOT NULL,
	"entity_id" text,
	"ip_address" text,
	"user_agent" text,
	"trace_id" text NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth_challenges" (
	"id" uuid PRIMARY KEY,
	"user_id" uuid NOT NULL,
	"purpose" text NOT NULL,
	"code_hash" text NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth_sessions" (
	"id" uuid PRIMARY KEY,
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "employee_numbers" (
	"id" uuid PRIMARY KEY,
	"school_id" uuid NOT NULL,
	"employee_no" text NOT NULL,
	"owner_key" text NOT NULL UNIQUE
);
--> statement-breakpoint
CREATE TABLE "file_uploads" (
	"id" uuid PRIMARY KEY,
	"school_id" uuid NOT NULL,
	"file_name" text NOT NULL,
	"original_name" text NOT NULL,
	"mime_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"storage_key" text NOT NULL,
	"storage_bucket" text NOT NULL,
	"url" text,
	"related_type" text,
	"related_id" text,
	"uploaded_by_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "job_groups" (
	"id" uuid PRIMARY KEY,
	"school_id" uuid NOT NULL,
	"name" text NOT NULL,
	"code" text NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mpesa_operations" (
	"id" uuid PRIMARY KEY,
	"reference" text NOT NULL,
	"idempotency_key" text,
	"request_fingerprint" text,
	"operation_type" "MpesaOperationType" NOT NULL,
	"status" "MpesaOperationStatus" DEFAULT 'PENDING'::"MpesaOperationStatus" NOT NULL,
	"phone" text,
	"amount" integer,
	"merchant_reference" text,
	"related_transaction_id" text,
	"checkout_request_id" text,
	"merchant_request_id" text,
	"conversation_id" text,
	"originator_conversation_id" text,
	"mpesa_receipt_number" text,
	"result_code" integer,
	"result_desc" text,
	"currency" text DEFAULT 'KES' NOT NULL,
	"provider_response" jsonb,
	"callback_payload" jsonb,
	"callback_processed_at" timestamp with time zone,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "student_parents" (
	"parent_id" uuid,
	"student_id" uuid,
	"is_primary_contact" boolean DEFAULT false NOT NULL,
	"is_financially_responsible" boolean DEFAULT false NOT NULL,
	"can_pick_up" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "student_parents_pkey" PRIMARY KEY("student_id","parent_id")
);
--> statement-breakpoint
CREATE TABLE "parents" (
	"id" uuid PRIMARY KEY,
	"school_id" uuid NOT NULL,
	"user_id" uuid,
	"first_name" text NOT NULL,
	"middle_name" text,
	"last_name" text NOT NULL,
	"national_id_number" text,
	"passport_number" text,
	"phone" text,
	"email" text,
	"relation" "ParentRelation",
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "password_reset_otps" (
	"id" uuid PRIMARY KEY,
	"user_id" uuid NOT NULL,
	"code_hash" text NOT NULL,
	"challenge_token_hash" text,
	"purpose" text NOT NULL,
	"is_resend" boolean DEFAULT false NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "refresh_sessions" (
	"id" uuid PRIMARY KEY,
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"family_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"replaced_by_id" text,
	"reused_at" timestamp with time zone,
	"is_impersonated" boolean DEFAULT false NOT NULL,
	"impersonated_user_id" uuid,
	"actor_session_id" uuid,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "school_branches" (
	"id" uuid PRIMARY KEY,
	"school_id" uuid NOT NULL,
	"name" text NOT NULL,
	"county" text NOT NULL,
	"sub_county" text NOT NULL,
	"ward" text NOT NULL,
	"area" text NOT NULL,
	"latitude" text DEFAULT '' NOT NULL,
	"longitude" text DEFAULT '' NOT NULL,
	"nearest_landmark" text DEFAULT '' NOT NULL,
	"branch_admin_name" text DEFAULT '' NOT NULL,
	"branch_admin_title" "BranchAdminTitle",
	"branch_admin_email" text DEFAULT '' NOT NULL,
	"branch_admin_mobile" text DEFAULT '' NOT NULL,
	"branch_admin_alternative_mobile" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "school_contact_emails" (
	"email" text PRIMARY KEY,
	"source_type" text NOT NULL,
	"source_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "school_documents" (
	"id" uuid PRIMARY KEY,
	"school_id" uuid NOT NULL,
	"branch_id" uuid,
	"document_type" text NOT NULL,
	"original_name" text NOT NULL,
	"content_type" text NOT NULL,
	"object_key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "school_ownerships" (
	"id" uuid PRIMARY KEY,
	"school_id" uuid NOT NULL,
	"ownership_type" text NOT NULL,
	"school_admin_name" text NOT NULL,
	"school_admin_email" text NOT NULL,
	"school_admin_mobile" text NOT NULL,
	"alternative_mobile" text DEFAULT '' NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "school_settings" (
	"id" uuid PRIMARY KEY,
	"school_id" uuid NOT NULL,
	"mpesa_shortcode" text,
	"mpesa_enabled" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "school_user_memberships" (
	"id" uuid PRIMARY KEY,
	"user_id" uuid NOT NULL,
	"school_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "schools" (
	"id" uuid PRIMARY KEY,
	"school_name" text NOT NULL,
	"school_code" text NOT NULL,
	"school_slug" text NOT NULL,
	"school_nemis_no" text,
	"school_kra_pin" text,
	"school_motto" text NOT NULL,
	"vision_statement" text NOT NULL,
	"mission_statement" text NOT NULL,
	"school_type" text NOT NULL,
	"school_location" jsonb,
	"official_phone" text NOT NULL,
	"school_email" text NOT NULL,
	"website" text DEFAULT '' NOT NULL,
	"head_office_address" text DEFAULT '' NOT NULL,
	"logo_object_key" text,
	"logo_content_type" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"next_teacher_sequence" integer DEFAULT 0 NOT NULL,
	"next_staff_sequence" integer DEFAULT 0 NOT NULL,
	"next_student_sequence" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "staff" (
	"id" uuid PRIMARY KEY,
	"school_id" uuid NOT NULL,
	"branch_id" uuid,
	"user_id" uuid NOT NULL,
	"first_name" text NOT NULL,
	"middle_name" text,
	"last_name" text NOT NULL,
	"national_id_number" text,
	"passport_number" text,
	"employee_key" text NOT NULL,
	"nssf_number" text,
	"kra_pin" text,
	"sha_number" text,
	"job_group_id" uuid,
	"hire_date" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"department" text NOT NULL,
	"job_title" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "staff_module_access" (
	"id" uuid PRIMARY KEY,
	"school_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"module" "StaffModule" NOT NULL,
	"granted_by_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "students" (
	"id" uuid PRIMARY KEY,
	"school_id" uuid NOT NULL,
	"branch_id" uuid,
	"user_id" uuid,
	"first_name" text NOT NULL,
	"middle_name" text,
	"last_name" text NOT NULL,
	"national_id_number" text,
	"passport_number" text,
	"birth_certificate_number" text,
	"admission_no" text,
	"date_of_birth" date,
	"gender" "Gender",
	"blood_group" "BloodGroup",
	"admission_date" date DEFAULT now() NOT NULL,
	"lifecycle_status" "StudentLifecycleStatus" DEFAULT 'ACTIVE'::"StudentLifecycleStatus" NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_suspended" boolean DEFAULT false NOT NULL,
	"suspension_reason" text,
	"suspended_at" timestamp with time zone,
	"suspended_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "system_sequences" (
	"key" text PRIMARY KEY,
	"next_school_code" integer DEFAULT 1 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "teachers" (
	"id" uuid PRIMARY KEY,
	"school_id" uuid NOT NULL,
	"branch_id" uuid,
	"user_id" uuid NOT NULL,
	"first_name" text NOT NULL,
	"middle_name" text,
	"last_name" text NOT NULL,
	"national_id_number" text,
	"passport_number" text,
	"employee_key" text NOT NULL,
	"nssf_number" text,
	"kra_pin" text,
	"sha_number" text,
	"job_group_id" uuid,
	"hire_date" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_password_history" (
	"id" uuid PRIMARY KEY,
	"user_id" uuid NOT NULL,
	"password_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY,
	"full_name" text NOT NULL,
	"username" text,
	"email" text NOT NULL,
	"phone" text,
	"password_hash" text NOT NULL,
	"role" "Role" DEFAULT 'ADMIN'::"Role" NOT NULL,
	"school_id" uuid,
	"branch_id" uuid,
	"branch_admin_title" "BranchAdminTitle",
	"is_active" boolean DEFAULT true NOT NULL,
	"must_change_password" boolean DEFAULT false NOT NULL,
	"auth_provider" text DEFAULT 'LOCAL' NOT NULL,
	"google_subject" text,
	"current_session_id" uuid,
	"failed_login_attempts" integer DEFAULT 0 NOT NULL,
	"locked_until" timestamp with time zone,
	"last_login_at" timestamp with time zone,
	"last_login_ip" text,
	"email_verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "activation_tokens_token_hash_unique" ON "activation_tokens" ("token_hash");--> statement-breakpoint
CREATE INDEX "activation_tokens_user_expires_idx" ON "activation_tokens" ("user_id","expires_at");--> statement-breakpoint
CREATE INDEX "audit_logs_school_id_idx" ON "audit_logs" ("school_id");--> statement-breakpoint
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs" ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "audit_logs_action_created_at_idx" ON "audit_logs" ("action","created_at");--> statement-breakpoint
CREATE INDEX "auth_challenges_user_purpose_idx" ON "auth_challenges" ("user_id","purpose");--> statement-breakpoint
CREATE INDEX "auth_challenges_expires_at_idx" ON "auth_challenges" ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "auth_sessions_token_hash_unique" ON "auth_sessions" ("token_hash");--> statement-breakpoint
CREATE INDEX "auth_sessions_user_id_idx" ON "auth_sessions" ("user_id");--> statement-breakpoint
CREATE INDEX "auth_sessions_expires_at_idx" ON "auth_sessions" ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "employee_numbers_school_employee_no_unique" ON "employee_numbers" ("school_id","employee_no");--> statement-breakpoint
CREATE UNIQUE INDEX "employee_numbers_owner_key_unique" ON "employee_numbers" ("owner_key");--> statement-breakpoint
CREATE INDEX "file_uploads_related_idx" ON "file_uploads" ("related_type","related_id");--> statement-breakpoint
CREATE UNIQUE INDEX "job_groups_id_school_unique" ON "job_groups" ("id","school_id");--> statement-breakpoint
CREATE UNIQUE INDEX "job_groups_school_code_unique" ON "job_groups" ("school_id","code");--> statement-breakpoint
CREATE INDEX "job_groups_school_id_idx" ON "job_groups" ("school_id");--> statement-breakpoint
CREATE UNIQUE INDEX "mpesa_operations_reference_unique" ON "mpesa_operations" ("reference");--> statement-breakpoint
CREATE UNIQUE INDEX "mpesa_operations_idempotency_key_unique" ON "mpesa_operations" ("idempotency_key");--> statement-breakpoint
CREATE UNIQUE INDEX "mpesa_operations_checkout_request_id_unique" ON "mpesa_operations" ("checkout_request_id");--> statement-breakpoint
CREATE UNIQUE INDEX "mpesa_operations_active_reversal_unique" ON "mpesa_operations" ("related_transaction_id") WHERE "operation_type" = 'REVERSAL' and "status" in ('PENDING', 'UNKNOWN', 'TIMED_OUT', 'SUCCEEDED');--> statement-breakpoint
CREATE INDEX "mpesa_operations_type_status_idx" ON "mpesa_operations" ("operation_type","status");--> statement-breakpoint
CREATE INDEX "mpesa_operations_conversation_id_idx" ON "mpesa_operations" ("conversation_id");--> statement-breakpoint
CREATE INDEX "mpesa_operations_originator_conversation_id_idx" ON "mpesa_operations" ("originator_conversation_id");--> statement-breakpoint
CREATE INDEX "mpesa_operations_receipt_idx" ON "mpesa_operations" ("mpesa_receipt_number");--> statement-breakpoint
CREATE INDEX "mpesa_operations_phone_created_idx" ON "mpesa_operations" ("phone","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "parents_id_school_unique" ON "parents" ("id","school_id");--> statement-breakpoint
CREATE UNIQUE INDEX "parents_user_id_unique" ON "parents" ("user_id");--> statement-breakpoint
CREATE INDEX "parents_school_id_idx" ON "parents" ("school_id");--> statement-breakpoint
CREATE UNIQUE INDEX "parents_school_national_id_unique" ON "parents" ("school_id","national_id_number");--> statement-breakpoint
CREATE UNIQUE INDEX "parents_school_phone_unique" ON "parents" ("school_id","phone");--> statement-breakpoint
CREATE UNIQUE INDEX "parents_school_email_unique" ON "parents" ("school_id","email");--> statement-breakpoint
CREATE UNIQUE INDEX "parents_school_passport_unique" ON "parents" ("school_id","passport_number");--> statement-breakpoint
CREATE INDEX "password_reset_otps_user_purpose_created_idx" ON "password_reset_otps" ("user_id","purpose","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "password_reset_otps_challenge_token_unique" ON "password_reset_otps" ("challenge_token_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "refresh_sessions_token_hash_unique" ON "refresh_sessions" ("token_hash");--> statement-breakpoint
CREATE INDEX "refresh_sessions_user_id_idx" ON "refresh_sessions" ("user_id");--> statement-breakpoint
CREATE INDEX "refresh_sessions_family_id_idx" ON "refresh_sessions" ("family_id");--> statement-breakpoint
CREATE UNIQUE INDEX "school_branches_id_school_unique" ON "school_branches" ("id","school_id");--> statement-breakpoint
CREATE UNIQUE INDEX "school_branches_admin_email_normalized_unique" ON "school_branches" (lower(btrim("branch_admin_email"))) WHERE btrim("branch_admin_email") <> '';--> statement-breakpoint
CREATE INDEX "school_branches_school_id_idx" ON "school_branches" ("school_id");--> statement-breakpoint
CREATE UNIQUE INDEX "school_contact_emails_source_unique" ON "school_contact_emails" ("source_type","source_id");--> statement-breakpoint
CREATE INDEX "school_documents_school_id_idx" ON "school_documents" ("school_id");--> statement-breakpoint
CREATE INDEX "school_documents_branch_id_idx" ON "school_documents" ("branch_id");--> statement-breakpoint
CREATE UNIQUE INDEX "school_ownerships_one_primary_per_school_unique" ON "school_ownerships" ("school_id") WHERE "is_primary";--> statement-breakpoint
CREATE INDEX "school_ownerships_school_id_idx" ON "school_ownerships" ("school_id");--> statement-breakpoint
CREATE UNIQUE INDEX "school_settings_school_id_unique" ON "school_settings" ("school_id");--> statement-breakpoint
CREATE UNIQUE INDEX "school_settings_mpesa_shortcode_unique" ON "school_settings" ("mpesa_shortcode");--> statement-breakpoint
CREATE UNIQUE INDEX "school_user_memberships_user_school_unique" ON "school_user_memberships" ("user_id","school_id");--> statement-breakpoint
CREATE INDEX "school_user_memberships_school_id_idx" ON "school_user_memberships" ("school_id");--> statement-breakpoint
CREATE UNIQUE INDEX "schools_school_code_unique" ON "schools" ("school_code");--> statement-breakpoint
CREATE UNIQUE INDEX "schools_school_slug_unique" ON "schools" ("school_slug");--> statement-breakpoint
CREATE UNIQUE INDEX "schools_school_nemis_no_unique" ON "schools" ("school_nemis_no") WHERE "school_nemis_no" IS NOT NULL AND "school_nemis_no" <> '';--> statement-breakpoint
CREATE UNIQUE INDEX "schools_school_kra_pin_unique" ON "schools" ("school_kra_pin") WHERE "school_kra_pin" IS NOT NULL AND "school_kra_pin" <> '';--> statement-breakpoint
CREATE UNIQUE INDEX "schools_official_phone_nonempty_unique" ON "schools" ("official_phone") WHERE "official_phone" <> '';--> statement-breakpoint
CREATE UNIQUE INDEX "schools_school_email_normalized_unique" ON "schools" (lower(btrim("school_email"))) WHERE btrim("school_email") <> '';--> statement-breakpoint
CREATE INDEX "schools_school_name_idx" ON "schools" ("school_name");--> statement-breakpoint
CREATE UNIQUE INDEX "staff_id_school_unique" ON "staff" ("id","school_id");--> statement-breakpoint
CREATE UNIQUE INDEX "staff_user_id_unique" ON "staff" ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "staff_employee_key_unique" ON "staff" ("employee_key");--> statement-breakpoint
CREATE INDEX "staff_school_id_idx" ON "staff" ("school_id");--> statement-breakpoint
CREATE UNIQUE INDEX "staff_school_nssf_unique" ON "staff" ("school_id","nssf_number");--> statement-breakpoint
CREATE UNIQUE INDEX "staff_school_kra_unique" ON "staff" ("school_id","kra_pin");--> statement-breakpoint
CREATE UNIQUE INDEX "staff_school_sha_unique" ON "staff" ("school_id","sha_number");--> statement-breakpoint
CREATE UNIQUE INDEX "staff_school_national_id_unique" ON "staff" ("school_id","national_id_number");--> statement-breakpoint
CREATE UNIQUE INDEX "staff_school_passport_unique" ON "staff" ("school_id","passport_number");--> statement-breakpoint
CREATE UNIQUE INDEX "staff_module_access_user_module_unique" ON "staff_module_access" ("user_id","module");--> statement-breakpoint
CREATE INDEX "staff_module_access_school_id_idx" ON "staff_module_access" ("school_id");--> statement-breakpoint
CREATE UNIQUE INDEX "students_user_id_unique" ON "students" ("user_id");--> statement-breakpoint
CREATE INDEX "students_school_id_idx" ON "students" ("school_id");--> statement-breakpoint
CREATE UNIQUE INDEX "students_school_admission_no_unique" ON "students" ("school_id","admission_no");--> statement-breakpoint
CREATE UNIQUE INDEX "students_school_national_id_unique" ON "students" ("school_id","national_id_number");--> statement-breakpoint
CREATE UNIQUE INDEX "students_school_birth_certificate_unique" ON "students" ("school_id","birth_certificate_number");--> statement-breakpoint
CREATE UNIQUE INDEX "students_school_passport_unique" ON "students" ("school_id","passport_number");--> statement-breakpoint
CREATE UNIQUE INDEX "students_id_school_unique" ON "students" ("id","school_id");--> statement-breakpoint
CREATE UNIQUE INDEX "teachers_id_school_unique" ON "teachers" ("id","school_id");--> statement-breakpoint
CREATE UNIQUE INDEX "teachers_user_id_unique" ON "teachers" ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "teachers_employee_key_unique" ON "teachers" ("employee_key");--> statement-breakpoint
CREATE INDEX "teachers_school_id_idx" ON "teachers" ("school_id");--> statement-breakpoint
CREATE UNIQUE INDEX "teachers_school_nssf_unique" ON "teachers" ("school_id","nssf_number");--> statement-breakpoint
CREATE UNIQUE INDEX "teachers_school_kra_unique" ON "teachers" ("school_id","kra_pin");--> statement-breakpoint
CREATE UNIQUE INDEX "teachers_school_sha_unique" ON "teachers" ("school_id","sha_number");--> statement-breakpoint
CREATE UNIQUE INDEX "teachers_school_national_id_unique" ON "teachers" ("school_id","national_id_number");--> statement-breakpoint
CREATE UNIQUE INDEX "teachers_school_passport_unique" ON "teachers" ("school_id","passport_number");--> statement-breakpoint
CREATE INDEX "user_password_history_user_created_idx" ON "user_password_history" ("user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "users_id_school_unique" ON "users" ("id","school_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_unique" ON "users" ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "users_username_unique" ON "users" ("username");--> statement-breakpoint
CREATE UNIQUE INDEX "users_phone_unique" ON "users" ("phone");--> statement-breakpoint
CREATE UNIQUE INDEX "users_google_subject_unique" ON "users" ("google_subject");--> statement-breakpoint
CREATE INDEX "users_school_id_idx" ON "users" ("school_id");--> statement-breakpoint
ALTER TABLE "activation_tokens" ADD CONSTRAINT "activation_tokens_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "admission_application_sequences" ADD CONSTRAINT "admission_application_sequences_school_id_schools_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "admission_sequences" ADD CONSTRAINT "admission_sequences_school_id_schools_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_school_id_schools_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "auth_challenges" ADD CONSTRAINT "auth_challenges_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "employee_numbers" ADD CONSTRAINT "employee_numbers_school_id_schools_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "file_uploads" ADD CONSTRAINT "file_uploads_school_id_schools_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "job_groups" ADD CONSTRAINT "job_groups_school_id_schools_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "student_parents" ADD CONSTRAINT "student_parents_parent_id_parents_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "parents"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "student_parents" ADD CONSTRAINT "student_parents_student_id_students_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "parents" ADD CONSTRAINT "parents_school_id_schools_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "parents" ADD CONSTRAINT "parents_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "password_reset_otps" ADD CONSTRAINT "password_reset_otps_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "refresh_sessions" ADD CONSTRAINT "refresh_sessions_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "refresh_sessions" ADD CONSTRAINT "refresh_sessions_impersonated_user_id_users_id_fkey" FOREIGN KEY ("impersonated_user_id") REFERENCES "users"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "school_branches" ADD CONSTRAINT "school_branches_school_id_schools_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "school_documents" ADD CONSTRAINT "school_documents_school_id_schools_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "school_documents" ADD CONSTRAINT "school_documents_branch_school_fk" FOREIGN KEY ("branch_id","school_id") REFERENCES "school_branches"("id","school_id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "school_ownerships" ADD CONSTRAINT "school_ownerships_school_id_schools_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "school_settings" ADD CONSTRAINT "school_settings_school_id_schools_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "school_user_memberships" ADD CONSTRAINT "school_user_memberships_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "school_user_memberships" ADD CONSTRAINT "school_user_memberships_school_id_schools_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "staff" ADD CONSTRAINT "staff_school_id_schools_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "staff" ADD CONSTRAINT "staff_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "staff" ADD CONSTRAINT "staff_employee_key_employee_numbers_owner_key_fkey" FOREIGN KEY ("employee_key") REFERENCES "employee_numbers"("owner_key");--> statement-breakpoint
ALTER TABLE "staff" ADD CONSTRAINT "staff_job_group_id_job_groups_id_fkey" FOREIGN KEY ("job_group_id") REFERENCES "job_groups"("id");--> statement-breakpoint
ALTER TABLE "staff" ADD CONSTRAINT "staff_branch_school_fk" FOREIGN KEY ("branch_id","school_id") REFERENCES "school_branches"("id","school_id");--> statement-breakpoint
ALTER TABLE "staff" ADD CONSTRAINT "staff_user_school_fk" FOREIGN KEY ("user_id","school_id") REFERENCES "users"("id","school_id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "staff" ADD CONSTRAINT "staff_job_group_school_fk" FOREIGN KEY ("job_group_id","school_id") REFERENCES "job_groups"("id","school_id");--> statement-breakpoint
ALTER TABLE "staff_module_access" ADD CONSTRAINT "staff_module_access_school_id_schools_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "staff_module_access" ADD CONSTRAINT "staff_module_access_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "staff_module_access" ADD CONSTRAINT "staff_module_access_granted_by_id_users_id_fkey" FOREIGN KEY ("granted_by_id") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "students" ADD CONSTRAINT "students_school_id_schools_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "students" ADD CONSTRAINT "students_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "students" ADD CONSTRAINT "students_suspended_by_users_id_fkey" FOREIGN KEY ("suspended_by") REFERENCES "users"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "students" ADD CONSTRAINT "students_branch_school_fk" FOREIGN KEY ("branch_id","school_id") REFERENCES "school_branches"("id","school_id");--> statement-breakpoint
ALTER TABLE "teachers" ADD CONSTRAINT "teachers_school_id_schools_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "teachers" ADD CONSTRAINT "teachers_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "teachers" ADD CONSTRAINT "teachers_employee_key_employee_numbers_owner_key_fkey" FOREIGN KEY ("employee_key") REFERENCES "employee_numbers"("owner_key");--> statement-breakpoint
ALTER TABLE "teachers" ADD CONSTRAINT "teachers_job_group_id_job_groups_id_fkey" FOREIGN KEY ("job_group_id") REFERENCES "job_groups"("id");--> statement-breakpoint
ALTER TABLE "teachers" ADD CONSTRAINT "teachers_branch_school_fk" FOREIGN KEY ("branch_id","school_id") REFERENCES "school_branches"("id","school_id");--> statement-breakpoint
ALTER TABLE "teachers" ADD CONSTRAINT "teachers_user_school_fk" FOREIGN KEY ("user_id","school_id") REFERENCES "users"("id","school_id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "teachers" ADD CONSTRAINT "teachers_job_group_school_fk" FOREIGN KEY ("job_group_id","school_id") REFERENCES "job_groups"("id","school_id");--> statement-breakpoint
ALTER TABLE "user_password_history" ADD CONSTRAINT "user_password_history_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_school_id_schools_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_branch_school_fk" FOREIGN KEY ("branch_id","school_id") REFERENCES "school_branches"("id","school_id");