import { randomBytes } from "node:crypto";

import { inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAdmin, UnauthorizedError } from "@/auth/require-admin";
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
} from "@/db/schema";

const weekdayKeys = ["domingo", "segunda", "terca", "quarta", "quinta", "sexta", "sabado"] as const;
const exceptionTypes = {
  "Bloquear data": "BLOCK",
  "Liberar data": "ALLOW",
  "Alterar capacidade": "CAPACITY_OVERRIDE",
} as const;

const campaignSchema = z.object({
  name: z.string().trim().min(3).max(180),
  description: z.string().trim().max(3000).optional().default(""),
  departmentIds: z.array(z.string().uuid()).min(1),
  holidays: z.array(z.object({ date: z.iso.date(), name: z.string().trim().min(2).max(160) })).min(1),
  leaveDaysPerEmployee: z.number().int().min(1).max(31),
  responseStart: z.iso.date(),
  responseStartTime: z.string().regex(/^\d{2}:\d{2}$/),
  responseEnd: z.iso.date(),
  responseEndTime: z.string().regex(/^\d{2}:\d{2}$/),
  leaveStart: z.iso.date(),
  leaveEnd: z.iso.date(),
  rules: z.record(z.string(), z.record(z.string(), z.number().int().min(0).max(10000))),
  exceptions: z.array(z.object({
    departmentId: z.string().uuid(),
    date: z.iso.date(),
    type: z.enum(["Bloquear data", "Liberar data", "Alterar capacidade"]),
    capacity: z.number().int().min(0).optional().default(0),
    note: z.string().trim().max(500).optional().default(""),
  })).default([]),
  publish: z.boolean().default(false),
}).superRefine((data, context) => {
  const responseStart = new Date(`${data.responseStart}T${data.responseStartTime}:00-03:00`);
  const responseEnd = new Date(`${data.responseEnd}T${data.responseEndTime}:00-03:00`);
  if (responseStart >= responseEnd) context.addIssue({ code: "custom", path: ["responseEnd"], message: "Período de resposta inválido." });
  if (data.leaveStart > data.leaveEnd) context.addIssue({ code: "custom", path: ["leaveEnd"], message: "Período de folgas inválido." });
});

export async function POST(request: Request) {
  try {
    const { admin } = await requireAdmin();
    const data = campaignSchema.parse(await request.json());
    const db = getDb();
    const departmentRows = await db.select().from(departments)
      .where(inArray(departments.id, data.departmentIds));
    if (departmentRows.length !== new Set(data.departmentIds).size) {
      return NextResponse.json({ error: "Um ou mais departamentos não existem." }, { status: 400 });
    }
    const employeeRows = await db.select().from(employees)
      .where(inArray(employees.departmentId, data.departmentIds));
    const responseStartAt = new Date(`${data.responseStart}T${data.responseStartTime}:00-03:00`);
    const responseEndAt = new Date(`${data.responseEnd}T${data.responseEndTime}:00-03:00`);
    const now = new Date();
    const publishedStatus = responseStartAt > now ? "SCHEDULED" : responseEndAt > now ? "OPEN" : "CLOSED";
    const publicToken = randomBytes(24).toString("base64url");

    const campaignId = await db.transaction(async (tx) => {
      const [campaign] = await tx.insert(campaigns).values({
        name: data.name,
        description: data.description || null,
        publicToken,
        responseStartAt,
        responseEndAt,
        leaveStartDate: data.leaveStart,
        leaveEndDate: data.leaveEnd,
        maxChoicesPerEmployee: data.leaveDaysPerEmployee,
        status: data.publish ? publishedStatus : "DRAFT",
        createdBy: admin.id,
        publishedAt: data.publish ? now : null,
      }).returning({ id: campaigns.id });

      await tx.insert(campaignHolidays).values(data.holidays.map((holiday) => ({
        campaignId: campaign.id,
        holidayDate: holiday.date,
        name: holiday.name,
      })));
      await tx.insert(campaignDepartments).values(data.departmentIds.map((departmentId) => ({
        campaignId: campaign.id,
        departmentId,
      })));
      const weekdayValues = data.departmentIds.flatMap((departmentId) => weekdayKeys.map((key, weekday) => {
        const capacity = data.rules[departmentId]?.[key] ?? 0;
        return { campaignId: campaign.id, departmentId, weekday, enabled: capacity > 0, capacity: capacity > 0 ? capacity : null };
      }));
      await tx.insert(campaignWeekdayRules).values(weekdayValues);
      if (data.exceptions.length) {
        await tx.insert(campaignDateExceptions).values(data.exceptions.map((exception) => ({
          campaignId: campaign.id,
          departmentId: exception.departmentId,
          exceptionDate: exception.date,
          type: exceptionTypes[exception.type],
          capacityOverride: exception.type === "Alterar capacidade" ? exception.capacity : null,
          reason: exception.note || exception.type,
          createdBy: admin.id,
        })));
      }
      const activeEmployees = employeeRows.filter((employee) => employee.active);
      if (activeEmployees.length) {
        const departmentNames = new Map(departmentRows.map((department) => [department.id, department.name]));
        await tx.insert(campaignEmployeeEligibility).values(activeEmployees.map((employee) => ({
          campaignId: campaign.id,
          employeeId: employee.id,
          registrationNumberSnapshot: employee.registrationNumber,
          nameSnapshot: employee.name,
          emailSnapshot: employee.email,
          departmentIdSnapshot: employee.departmentId,
          departmentNameSnapshot: departmentNames.get(employee.departmentId) ?? "",
        })));
      }
      await tx.insert(auditLogs).values({
        actorUserId: admin.id,
        actorType: "ADMIN",
        action: data.publish ? "Campanha publicada" : "Campanha criada como rascunho",
        entityType: "campaign",
        entityId: campaign.id,
        campaignId: campaign.id,
        afterData: { name: data.name, status: data.publish ? publishedStatus : "DRAFT" },
      });
      return campaign.id;
    });

    return NextResponse.json({ id: campaignId, publicToken }, { status: 201 });
  } catch (error) {
    if (error instanceof UnauthorizedError) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues[0]?.message ?? "Dados da campanha inválidos." }, { status: 400 });
    console.error("Falha ao criar campanha.", error);
    return NextResponse.json({ error: "Não foi possível criar a campanha." }, { status: 500 });
  }
}
