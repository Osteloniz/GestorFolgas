CREATE TYPE "public"."audit_actor_type" AS ENUM('ADMIN', 'EMPLOYEE', 'SYSTEM');--> statement-breakpoint
CREATE TYPE "public"."campaign_status" AS ENUM('DRAFT', 'SCHEDULED', 'OPEN', 'CLOSED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."date_exception_type" AS ENUM('BLOCK', 'ALLOW', 'CAPACITY_OVERRIDE');--> statement-breakpoint
CREATE TYPE "public"."email_delivery_status" AS ENUM('PENDING', 'SENT', 'FAILED');--> statement-breakpoint
CREATE TYPE "public"."leave_choice_source" AS ENUM('EMPLOYEE', 'ADMIN', 'ADMIN_ADJUSTMENT');--> statement-breakpoint
CREATE TABLE "admin_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"auth_user_id" text NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_user_id" uuid,
	"actor_type" "audit_actor_type" NOT NULL,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" uuid,
	"campaign_id" uuid,
	"employee_id" uuid,
	"reason" text,
	"before_data" jsonb,
	"after_data" jsonb,
	"ip_address" "inet",
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "campaign_date_exceptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid NOT NULL,
	"department_id" uuid NOT NULL,
	"exception_date" date NOT NULL,
	"type" date_exception_type NOT NULL,
	"capacity_override" integer,
	"reason" text NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "campaign_date_exceptions_capacity_check" CHECK (("campaign_date_exceptions"."type" = 'CAPACITY_OVERRIDE' and "campaign_date_exceptions"."capacity_override" > 0) or ("campaign_date_exceptions"."type" <> 'CAPACITY_OVERRIDE' and "campaign_date_exceptions"."capacity_override" is null))
);
--> statement-breakpoint
CREATE TABLE "campaign_departments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid NOT NULL,
	"department_id" uuid NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "campaign_employee_eligibility" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"registration_number_snapshot" text NOT NULL,
	"name_snapshot" text NOT NULL,
	"email_snapshot" text NOT NULL,
	"department_id_snapshot" uuid NOT NULL,
	"department_name_snapshot" text NOT NULL,
	"eligible" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "campaign_holidays" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid NOT NULL,
	"holiday_date" date NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "campaign_weekday_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid NOT NULL,
	"department_id" uuid NOT NULL,
	"weekday" integer NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"capacity" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "campaign_weekday_rules_weekday_check" CHECK ("campaign_weekday_rules"."weekday" between 0 and 6),
	CONSTRAINT "campaign_weekday_rules_capacity_check" CHECK (("campaign_weekday_rules"."enabled" = false and ("campaign_weekday_rules"."capacity" is null or "campaign_weekday_rules"."capacity" = 0)) or ("campaign_weekday_rules"."enabled" = true and "campaign_weekday_rules"."capacity" > 0))
);
--> statement-breakpoint
CREATE TABLE "campaigns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"public_token" text NOT NULL,
	"response_start_at" timestamp with time zone NOT NULL,
	"response_end_at" timestamp with time zone NOT NULL,
	"leave_start_date" date NOT NULL,
	"leave_end_date" date NOT NULL,
	"max_choices_per_employee" integer NOT NULL,
	"status" "campaign_status" DEFAULT 'DRAFT' NOT NULL,
	"created_by" uuid NOT NULL,
	"published_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "campaigns_response_period_check" CHECK ("campaigns"."response_start_at" < "campaigns"."response_end_at"),
	CONSTRAINT "campaigns_leave_period_check" CHECK ("campaigns"."leave_start_date" <= "campaigns"."leave_end_date"),
	CONSTRAINT "campaigns_max_choices_check" CHECK ("campaigns"."max_choices_per_employee" > 0)
);
--> statement-breakpoint
CREATE TABLE "departments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"code" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_deliveries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"submission_id" uuid NOT NULL,
	"recipient" text NOT NULL,
	"type" text NOT NULL,
	"provider" text NOT NULL,
	"provider_message_id" text,
	"status" "email_delivery_status" DEFAULT 'PENDING' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "email_deliveries_attempts_check" CHECK ("email_deliveries"."attempts" >= 0)
);
--> statement-breakpoint
CREATE TABLE "employees" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"registration_number" text NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"department_id" uuid NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leave_choices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"submission_id" uuid NOT NULL,
	"campaign_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"department_id_snapshot" uuid NOT NULL,
	"leave_date" date NOT NULL,
	"source" "leave_choice_source" NOT NULL,
	"created_by_admin_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "leave_choices_admin_source_check" CHECK (("leave_choices"."source" = 'EMPLOYEE' and "leave_choices"."created_by_admin_id" is null) or ("leave_choices"."source" <> 'EMPLOYEE' and "leave_choices"."created_by_admin_id" is not null))
);
--> statement-breakpoint
CREATE TABLE "leave_submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"eligibility_id" uuid NOT NULL,
	"registration_number_snapshot" text NOT NULL,
	"name_snapshot" text NOT NULL,
	"email_snapshot" text NOT NULL,
	"department_id_snapshot" uuid NOT NULL,
	"department_name_snapshot" text NOT NULL,
	"justification" text,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_user_id_admin_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."admin_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_date_exceptions" ADD CONSTRAINT "campaign_date_exceptions_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_date_exceptions" ADD CONSTRAINT "campaign_date_exceptions_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_date_exceptions" ADD CONSTRAINT "campaign_date_exceptions_created_by_admin_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."admin_users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_departments" ADD CONSTRAINT "campaign_departments_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_departments" ADD CONSTRAINT "campaign_departments_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_employee_eligibility" ADD CONSTRAINT "campaign_employee_eligibility_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_employee_eligibility" ADD CONSTRAINT "campaign_employee_eligibility_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_holidays" ADD CONSTRAINT "campaign_holidays_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_weekday_rules" ADD CONSTRAINT "campaign_weekday_rules_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_weekday_rules" ADD CONSTRAINT "campaign_weekday_rules_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_created_by_admin_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."admin_users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_deliveries" ADD CONSTRAINT "email_deliveries_submission_id_leave_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."leave_submissions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_choices" ADD CONSTRAINT "leave_choices_submission_id_leave_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."leave_submissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_choices" ADD CONSTRAINT "leave_choices_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_choices" ADD CONSTRAINT "leave_choices_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_choices" ADD CONSTRAINT "leave_choices_created_by_admin_id_admin_users_id_fk" FOREIGN KEY ("created_by_admin_id") REFERENCES "public"."admin_users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_submissions" ADD CONSTRAINT "leave_submissions_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_submissions" ADD CONSTRAINT "leave_submissions_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_submissions" ADD CONSTRAINT "leave_submissions_eligibility_id_campaign_employee_eligibility_id_fk" FOREIGN KEY ("eligibility_id") REFERENCES "public"."campaign_employee_eligibility"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "admin_users_auth_user_id_uidx" ON "admin_users" USING btree ("auth_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "admin_users_email_uidx" ON "admin_users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "audit_logs_campaign_id_idx" ON "audit_logs" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX "audit_logs_employee_id_idx" ON "audit_logs" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "campaign_date_exceptions_key_uidx" ON "campaign_date_exceptions" USING btree ("campaign_id","department_id","exception_date");--> statement-breakpoint
CREATE UNIQUE INDEX "campaign_departments_campaign_department_uidx" ON "campaign_departments" USING btree ("campaign_id","department_id");--> statement-breakpoint
CREATE UNIQUE INDEX "campaign_employee_eligibility_key_uidx" ON "campaign_employee_eligibility" USING btree ("campaign_id","employee_id");--> statement-breakpoint
CREATE INDEX "campaign_employee_eligibility_department_idx" ON "campaign_employee_eligibility" USING btree ("campaign_id","department_id_snapshot");--> statement-breakpoint
CREATE UNIQUE INDEX "campaign_holidays_campaign_date_uidx" ON "campaign_holidays" USING btree ("campaign_id","holiday_date");--> statement-breakpoint
CREATE UNIQUE INDEX "campaign_weekday_rules_key_uidx" ON "campaign_weekday_rules" USING btree ("campaign_id","department_id","weekday");--> statement-breakpoint
CREATE UNIQUE INDEX "campaigns_public_token_uidx" ON "campaigns" USING btree ("public_token");--> statement-breakpoint
CREATE INDEX "campaigns_response_start_at_idx" ON "campaigns" USING btree ("response_start_at");--> statement-breakpoint
CREATE INDEX "campaigns_response_end_at_idx" ON "campaigns" USING btree ("response_end_at");--> statement-breakpoint
CREATE UNIQUE INDEX "departments_code_uidx" ON "departments" USING btree ("code");--> statement-breakpoint
CREATE INDEX "email_deliveries_submission_id_idx" ON "email_deliveries" USING btree ("submission_id");--> statement-breakpoint
CREATE UNIQUE INDEX "employees_registration_number_uidx" ON "employees" USING btree ("registration_number");--> statement-breakpoint
CREATE INDEX "employees_department_id_idx" ON "employees" USING btree ("department_id");--> statement-breakpoint
CREATE UNIQUE INDEX "leave_choices_submission_date_uidx" ON "leave_choices" USING btree ("submission_id","leave_date");--> statement-breakpoint
CREATE INDEX "leave_choices_capacity_idx" ON "leave_choices" USING btree ("campaign_id","leave_date","department_id_snapshot");--> statement-breakpoint
CREATE UNIQUE INDEX "leave_submissions_campaign_employee_uidx" ON "leave_submissions" USING btree ("campaign_id","employee_id");--> statement-breakpoint
CREATE INDEX "leave_submissions_campaign_id_idx" ON "leave_submissions" USING btree ("campaign_id");