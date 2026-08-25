import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  index,
  inet,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { user } from "./auth-schema";

export * from "./auth-schema";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
};

export const campaignStatusEnum = pgEnum("campaign_status", [
  "DRAFT",
  "SCHEDULED",
  "OPEN",
  "CLOSED",
  "CANCELLED",
]);
export const dateExceptionTypeEnum = pgEnum("date_exception_type", [
  "BLOCK",
  "ALLOW",
  "CAPACITY_OVERRIDE",
]);
export const leaveChoiceSourceEnum = pgEnum("leave_choice_source", [
  "EMPLOYEE",
  "ADMIN",
  "ADMIN_ADJUSTMENT",
]);
export const actorTypeEnum = pgEnum("audit_actor_type", ["ADMIN", "EMPLOYEE", "SYSTEM"]);
export const emailDeliveryStatusEnum = pgEnum("email_delivery_status", [
  "PENDING",
  "SENT",
  "FAILED",
]);

export const adminUsers = pgTable(
  "admin_users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    authUserId: text("auth_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    email: text("email").notNull(),
    active: boolean("active").notNull().default(true),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("admin_users_auth_user_id_uidx").on(table.authUserId),
    uniqueIndex("admin_users_email_uidx").on(table.email),
  ],
);

export const departments = pgTable(
  "departments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    code: text("code"),
    active: boolean("active").notNull().default(true),
    ...timestamps,
  },
  (table) => [uniqueIndex("departments_code_uidx").on(table.code)],
);

export const employees = pgTable(
  "employees",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    registrationNumber: text("registration_number").notNull(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    departmentId: uuid("department_id")
      .notNull()
      .references(() => departments.id, { onDelete: "restrict" }),
    active: boolean("active").notNull().default(true),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("employees_registration_number_uidx").on(table.registrationNumber),
    index("employees_department_id_idx").on(table.departmentId),
  ],
);

export const campaigns = pgTable(
  "campaigns",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    description: text("description"),
    publicToken: text("public_token").notNull(),
    responseStartAt: timestamp("response_start_at", { withTimezone: true }).notNull(),
    responseEndAt: timestamp("response_end_at", { withTimezone: true }).notNull(),
    leaveStartDate: date("leave_start_date", { mode: "string" }).notNull(),
    leaveEndDate: date("leave_end_date", { mode: "string" }).notNull(),
    maxChoicesPerEmployee: integer("max_choices_per_employee").notNull(),
    status: campaignStatusEnum("status").notNull().default("DRAFT"),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => adminUsers.id, { onDelete: "restrict" }),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("campaigns_public_token_uidx").on(table.publicToken),
    index("campaigns_response_start_at_idx").on(table.responseStartAt),
    index("campaigns_response_end_at_idx").on(table.responseEndAt),
    check("campaigns_response_period_check", sql`${table.responseStartAt} < ${table.responseEndAt}`),
    check("campaigns_leave_period_check", sql`${table.leaveStartDate} <= ${table.leaveEndDate}`),
    check("campaigns_max_choices_check", sql`${table.maxChoicesPerEmployee} > 0`),
  ],
);

export const campaignHolidays = pgTable(
  "campaign_holidays",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    campaignId: uuid("campaign_id")
      .notNull()
      .references(() => campaigns.id, { onDelete: "cascade" }),
    holidayDate: date("holiday_date", { mode: "string" }).notNull(),
    name: text("name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("campaign_holidays_campaign_date_uidx").on(table.campaignId, table.holidayDate)],
);

export const campaignDepartments = pgTable(
  "campaign_departments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    campaignId: uuid("campaign_id")
      .notNull()
      .references(() => campaigns.id, { onDelete: "cascade" }),
    departmentId: uuid("department_id")
      .notNull()
      .references(() => departments.id, { onDelete: "restrict" }),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("campaign_departments_campaign_department_uidx").on(
      table.campaignId,
      table.departmentId,
    ),
  ],
);

export const campaignWeekdayRules = pgTable(
  "campaign_weekday_rules",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    campaignId: uuid("campaign_id")
      .notNull()
      .references(() => campaigns.id, { onDelete: "cascade" }),
    departmentId: uuid("department_id")
      .notNull()
      .references(() => departments.id, { onDelete: "restrict" }),
    weekday: integer("weekday").notNull(),
    enabled: boolean("enabled").notNull().default(false),
    capacity: integer("capacity"),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("campaign_weekday_rules_key_uidx").on(
      table.campaignId,
      table.departmentId,
      table.weekday,
    ),
    check("campaign_weekday_rules_weekday_check", sql`${table.weekday} between 0 and 6`),
    check(
      "campaign_weekday_rules_capacity_check",
      sql`(${table.enabled} = false and (${table.capacity} is null or ${table.capacity} = 0)) or (${table.enabled} = true and ${table.capacity} > 0)`,
    ),
  ],
);

export const campaignDateExceptions = pgTable(
  "campaign_date_exceptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    campaignId: uuid("campaign_id")
      .notNull()
      .references(() => campaigns.id, { onDelete: "cascade" }),
    departmentId: uuid("department_id")
      .notNull()
      .references(() => departments.id, { onDelete: "restrict" }),
    exceptionDate: date("exception_date", { mode: "string" }).notNull(),
    type: dateExceptionTypeEnum("type").notNull(),
    capacityOverride: integer("capacity_override"),
    reason: text("reason").notNull(),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => adminUsers.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("campaign_date_exceptions_key_uidx").on(
      table.campaignId,
      table.departmentId,
      table.exceptionDate,
    ),
    check(
      "campaign_date_exceptions_capacity_check",
      sql`(${table.type} = 'CAPACITY_OVERRIDE' and ${table.capacityOverride} > 0) or (${table.type} <> 'CAPACITY_OVERRIDE' and ${table.capacityOverride} is null)`,
    ),
  ],
);

export const campaignEmployeeEligibility = pgTable(
  "campaign_employee_eligibility",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    campaignId: uuid("campaign_id")
      .notNull()
      .references(() => campaigns.id, { onDelete: "cascade" }),
    employeeId: uuid("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "restrict" }),
    registrationNumberSnapshot: text("registration_number_snapshot").notNull(),
    nameSnapshot: text("name_snapshot").notNull(),
    emailSnapshot: text("email_snapshot").notNull(),
    departmentIdSnapshot: uuid("department_id_snapshot").notNull(),
    departmentNameSnapshot: text("department_name_snapshot").notNull(),
    eligible: boolean("eligible").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("campaign_employee_eligibility_key_uidx").on(table.campaignId, table.employeeId),
    index("campaign_employee_eligibility_department_idx").on(
      table.campaignId,
      table.departmentIdSnapshot,
    ),
  ],
);

export const leaveSubmissions = pgTable(
  "leave_submissions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    campaignId: uuid("campaign_id")
      .notNull()
      .references(() => campaigns.id, { onDelete: "restrict" }),
    employeeId: uuid("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "restrict" }),
    eligibilityId: uuid("eligibility_id")
      .notNull()
      .references(() => campaignEmployeeEligibility.id, { onDelete: "restrict" }),
    registrationNumberSnapshot: text("registration_number_snapshot").notNull(),
    nameSnapshot: text("name_snapshot").notNull(),
    emailSnapshot: text("email_snapshot").notNull(),
    departmentIdSnapshot: uuid("department_id_snapshot").notNull(),
    departmentNameSnapshot: text("department_name_snapshot").notNull(),
    justification: text("justification"),
    submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("leave_submissions_campaign_employee_uidx").on(table.campaignId, table.employeeId),
    index("leave_submissions_campaign_id_idx").on(table.campaignId),
  ],
);

export const leaveChoices = pgTable(
  "leave_choices",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    submissionId: uuid("submission_id")
      .notNull()
      .references(() => leaveSubmissions.id, { onDelete: "cascade" }),
    campaignId: uuid("campaign_id")
      .notNull()
      .references(() => campaigns.id, { onDelete: "restrict" }),
    employeeId: uuid("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "restrict" }),
    departmentIdSnapshot: uuid("department_id_snapshot").notNull(),
    leaveDate: date("leave_date", { mode: "string" }).notNull(),
    source: leaveChoiceSourceEnum("source").notNull(),
    createdByAdminId: uuid("created_by_admin_id").references(() => adminUsers.id, {
      onDelete: "restrict",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("leave_choices_submission_date_uidx").on(table.submissionId, table.leaveDate),
    index("leave_choices_capacity_idx").on(
      table.campaignId,
      table.leaveDate,
      table.departmentIdSnapshot,
    ),
    check(
      "leave_choices_admin_source_check",
      sql`(${table.source} = 'EMPLOYEE' and ${table.createdByAdminId} is null) or (${table.source} <> 'EMPLOYEE' and ${table.createdByAdminId} is not null)`,
    ),
  ],
);

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actorUserId: uuid("actor_user_id").references(() => adminUsers.id, { onDelete: "set null" }),
    actorType: actorTypeEnum("actor_type").notNull(),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: uuid("entity_id"),
    campaignId: uuid("campaign_id").references(() => campaigns.id, { onDelete: "restrict" }),
    employeeId: uuid("employee_id").references(() => employees.id, { onDelete: "restrict" }),
    reason: text("reason"),
    beforeData: jsonb("before_data"),
    afterData: jsonb("after_data"),
    ipAddress: inet("ip_address"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("audit_logs_campaign_id_idx").on(table.campaignId),
    index("audit_logs_employee_id_idx").on(table.employeeId),
    index("audit_logs_created_at_idx").on(table.createdAt),
  ],
);

export const emailDeliveries = pgTable(
  "email_deliveries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    submissionId: uuid("submission_id")
      .notNull()
      .references(() => leaveSubmissions.id, { onDelete: "restrict" }),
    recipient: text("recipient").notNull(),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerMessageId: text("provider_message_id"),
    status: emailDeliveryStatusEnum("status").notNull().default("PENDING"),
    attempts: integer("attempts").notNull().default(0),
    lastError: text("last_error"),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    index("email_deliveries_submission_id_idx").on(table.submissionId),
    check("email_deliveries_attempts_check", sql`${table.attempts} >= 0`),
  ],
);
