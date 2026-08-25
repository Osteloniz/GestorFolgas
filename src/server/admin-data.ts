import "server-only";

import { asc, count, eq } from "drizzle-orm";

import { getDb } from "@/db";
import {
  auditLogs,
  campaignDateExceptions,
  campaignDepartments,
  campaignEmployeeEligibility,
  campaignHolidays,
  campaigns,
  campaignWeekdayRules,
  departments,
  employees,
  leaveChoices,
  leaveSubmissions,
} from "@/db/schema";

const statusLabels = {
  DRAFT: "Rascunho",
  SCHEDULED: "Agendada",
  OPEN: "Aberta",
  CLOSED: "Encerrada",
  CANCELLED: "Cancelada",
} as const;

const weekdayKeys = ["domingo", "segunda", "terca", "quarta", "quinta", "sexta", "sabado"];
const exceptionLabels = {
  BLOCK: "Bloquear data",
  ALLOW: "Liberar data",
  CAPACITY_OVERRIDE: "Alterar capacidade",
} as const;

function effectiveCampaignStatus(campaign: typeof campaigns.$inferSelect) {
  const now = new Date();
  if (campaign.status === "CANCELLED" || campaign.status === "DRAFT") return campaign.status;
  if (now < campaign.responseStartAt) return "SCHEDULED";
  if (now > campaign.responseEndAt) return "CLOSED";
  return "OPEN";
}

export async function getAdminBootstrapData() {
  const db = getDb();
  const [departmentRows, employeeRows, campaignRows, holidayRows, campaignDepartmentRows,
    ruleRows, exceptionRows, eligibilityRows, submissionRows, choiceRows, auditRows] = await Promise.all([
    db.select({
      id: departments.id,
      name: departments.name,
      code: departments.code,
      active: departments.active,
      employeeCount: count(employees.id),
    }).from(departments).leftJoin(employees, eq(employees.departmentId, departments.id))
      .groupBy(departments.id).orderBy(asc(departments.name)),
    db.select().from(employees).orderBy(asc(employees.name)),
    db.select().from(campaigns).orderBy(asc(campaigns.leaveStartDate)),
    db.select().from(campaignHolidays).orderBy(asc(campaignHolidays.holidayDate)),
    db.select().from(campaignDepartments),
    db.select().from(campaignWeekdayRules),
    db.select().from(campaignDateExceptions),
    db.select().from(campaignEmployeeEligibility),
    db.select().from(leaveSubmissions),
    db.select().from(leaveChoices).orderBy(asc(leaveChoices.leaveDate)),
    db.select().from(auditLogs).orderBy(asc(auditLogs.createdAt)),
  ]);

  const departmentData = departmentRows.map((row) => ({
    id: row.id,
    name: row.name,
    code: row.code ?? "",
    status: row.active ? "Ativo" : "Inativo",
    employeeCount: Number(row.employeeCount),
  }));

  const employeeData = employeeRows.map((row) => ({
    id: row.id,
    registration: row.registrationNumber,
    name: row.name,
    email: row.email,
    departmentId: row.departmentId,
    status: row.active ? "Ativo" : "Inativo",
  }));

  const campaignData = campaignRows.map((campaign) => {
    const departmentIds = campaignDepartmentRows
      .filter((row) => row.campaignId === campaign.id && row.active)
      .map((row) => row.departmentId);
    const rules = Object.fromEntries(departmentIds.map((departmentId) => [
      departmentId,
      Object.fromEntries(weekdayKeys.map((key) => [key, 0])),
    ]));
    for (const rule of ruleRows.filter((row) => row.campaignId === campaign.id)) {
      const key = weekdayKeys[rule.weekday];
      if (key && rules[rule.departmentId]) {
        rules[rule.departmentId][key] = rule.enabled ? (rule.capacity ?? 0) : 0;
      }
    }

    return {
      id: campaign.id,
      name: campaign.name,
      description: campaign.description ?? "",
      status: statusLabels[effectiveCampaignStatus(campaign)],
      holidays: holidayRows.filter((row) => row.campaignId === campaign.id)
        .map((row) => ({ date: row.holidayDate, name: row.name })),
      leaveDaysPerEmployee: campaign.maxChoicesPerEmployee,
      responsePeriod: {
        start: campaign.responseStartAt.toISOString(),
        end: campaign.responseEndAt.toISOString(),
      },
      leavePeriod: { start: campaign.leaveStartDate, end: campaign.leaveEndDate },
      departmentIds,
      rules,
      exceptions: exceptionRows.filter((row) => row.campaignId === campaign.id).map((row) => ({
        id: row.id,
        departmentId: row.departmentId,
        date: row.exceptionDate,
        type: exceptionLabels[row.type],
        capacity: row.capacityOverride ?? 0,
        note: row.reason,
      })),
      publicToken: campaign.publicToken,
    };
  });

  const choicesBySubmission = new Map<string, typeof choiceRows>();
  for (const choice of choiceRows) {
    const current = choicesBySubmission.get(choice.submissionId) ?? [];
    current.push(choice);
    choicesBySubmission.set(choice.submissionId, current);
  }
  const submissionData = submissionRows.map((row) => {
    const submissionChoices = choicesBySubmission.get(row.id) ?? [];
    const changedByAdmin = submissionChoices.some((choice) => choice.source !== "EMPLOYEE");
    return {
      id: row.id,
      campaignId: row.campaignId,
      employeeId: row.employeeId,
      dates: submissionChoices.map((choice) => choice.leaveDate),
      justification: row.justification ?? "",
      submittedAt: row.submittedAt.toISOString(),
      status: changedByAdmin ? "Alterado pelo gestor" : "Respondido",
    };
  });

  const campaignHistory: Record<string, Array<Record<string, string>>> = {};
  const recentActivity = auditRows.filter((row) => row.entityType !== "public_access").slice(-10).reverse().map((row) => ({
    id: row.id,
    text: row.action,
    time: row.createdAt.toISOString(),
    icon: row.entityType === "campaign" ? "calendar" : "edit",
  }));
  for (const row of auditRows) {
    if (!row.campaignId) continue;
    const history = campaignHistory[row.campaignId] ?? [];
    history.push({
      id: row.id,
      action: row.action,
      detail: row.reason ?? "",
      at: row.createdAt.toISOString(),
      admin: row.actorType === "ADMIN" ? "Administrador" : row.actorType,
    });
    campaignHistory[row.campaignId] = history;
  }

  return {
    departments: departmentData,
    employees: employeeData,
    campaigns: campaignData,
    submissions: submissionData,
    eligibility: eligibilityRows.map((row) => ({
      campaignId: row.campaignId,
      employeeId: row.employeeId,
      eligible: row.eligible,
    })),
    recentActivity,
    campaignHistory,
  };
}
