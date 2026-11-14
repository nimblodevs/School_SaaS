CREATE TABLE "school_branch_curriculums" (
	"id" uuid PRIMARY KEY,
	"school_id" uuid NOT NULL,
	"branch_id" uuid NOT NULL,
	"school_curriculum_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "school_curriculums" (
	"id" uuid PRIMARY KEY,
	"school_id" uuid NOT NULL,
	"curriculum" "Curriculum" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "school_user_branch_curriculums" (
	"id" uuid PRIMARY KEY,
	"membership_id" uuid NOT NULL,
	"school_id" uuid NOT NULL,
	"branch_id" uuid NOT NULL,
	"school_curriculum_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "auth_sessions" ADD COLUMN "school_id" uuid;--> statement-breakpoint
ALTER TABLE "auth_sessions" ADD COLUMN "refresh_session_id" uuid;--> statement-breakpoint
ALTER TABLE "refresh_sessions" ADD COLUMN "school_id" uuid;--> statement-breakpoint
ALTER TABLE "school_user_memberships" ADD COLUMN "role" "Role" DEFAULT 'STAFF'::"Role" NOT NULL;--> statement-breakpoint
ALTER TABLE "school_user_memberships" ADD COLUMN "is_active" boolean DEFAULT true NOT NULL;--> statement-breakpoint
UPDATE "school_user_memberships" AS membership
SET "role" = app_user."role", "is_active" = app_user."is_active"
FROM "users" AS app_user
WHERE membership."user_id" = app_user."id";--> statement-breakpoint
INSERT INTO "school_user_memberships" (
	"id", "user_id", "school_id", "role", "is_active", "created_at"
)
SELECT
	gen_random_uuid(), app_user."id", app_user."school_id",
	app_user."role", app_user."is_active", now()
FROM "users" AS app_user
WHERE app_user."school_id" IS NOT NULL
	AND NOT EXISTS (
		SELECT 1
		FROM "school_user_memberships" AS membership
		WHERE membership."user_id" = app_user."id"
			AND membership."school_id" = app_user."school_id"
	);--> statement-breakpoint
CREATE UNIQUE INDEX "school_branch_curriculums_unique" ON "school_branch_curriculums" ("branch_id","school_curriculum_id");--> statement-breakpoint
CREATE UNIQUE INDEX "school_branch_curriculums_scope_fk_unique" ON "school_branch_curriculums" ("branch_id","school_curriculum_id","school_id");--> statement-breakpoint
CREATE INDEX "school_branch_curriculums_school_id_idx" ON "school_branch_curriculums" ("school_id");--> statement-breakpoint
CREATE UNIQUE INDEX "school_curriculums_id_school_unique" ON "school_curriculums" ("id","school_id");--> statement-breakpoint
CREATE UNIQUE INDEX "school_curriculums_school_curriculum_unique" ON "school_curriculums" ("school_id","curriculum");--> statement-breakpoint
CREATE UNIQUE INDEX "school_user_branch_curriculums_unique" ON "school_user_branch_curriculums" ("membership_id","branch_id","school_curriculum_id");--> statement-breakpoint
CREATE INDEX "school_user_branch_curriculums_school_id_idx" ON "school_user_branch_curriculums" ("school_id");--> statement-breakpoint
CREATE UNIQUE INDEX "school_user_memberships_id_school_unique" ON "school_user_memberships" ("id","school_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_normalized_unique" ON "users" (lower(btrim("email")));--> statement-breakpoint
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_school_id_schools_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "refresh_sessions" ADD CONSTRAINT "refresh_sessions_school_id_schools_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "school_branch_curriculums" ADD CONSTRAINT "school_branch_curriculums_branch_school_fk" FOREIGN KEY ("branch_id","school_id") REFERENCES "school_branches"("id","school_id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "school_branch_curriculums" ADD CONSTRAINT "school_branch_curriculums_curriculum_school_fk" FOREIGN KEY ("school_curriculum_id","school_id") REFERENCES "school_curriculums"("id","school_id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "school_curriculums" ADD CONSTRAINT "school_curriculums_school_id_schools_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "school_user_branch_curriculums" ADD CONSTRAINT "school_user_branch_curriculums_membership_school_fk" FOREIGN KEY ("membership_id","school_id") REFERENCES "school_user_memberships"("id","school_id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "school_user_branch_curriculums" ADD CONSTRAINT "school_user_branch_curriculums_branch_curriculum_school_fk" FOREIGN KEY ("branch_id","school_curriculum_id","school_id") REFERENCES "school_branch_curriculums"("branch_id","school_curriculum_id","school_id") ON DELETE CASCADE;