import { createHmac, timingSafeEqual } from "node:crypto";

import { and, count, eq, gte, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

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
  emailDeliveries,
  employees,
  leaveChoices,
  leaveSubmissions,
} from "@/db/schema";
import { deliverSubmissionConfirmation } from "@/server/email/submission-confirmation";

const statusLabels = { DRAFT: "Rascunho", SCHEDULED: "Agendada", OPEN: "Aberta", CLOSED: "Encerrada", CANCELLED: "Cancelada" } as const;
const weekdayKeys = ["domingo", "segunda", "terca", "quarta", "quinta", "sexta", "sabado"];

function effectiveStatus(campaign: typeof campaigns.$inferSelect) {
  const now = new Date();
  if (campaign.status === "CANCELLED") return "CANCELLED";
  if (campaign.status === "DRAFT") return "DRAFT";
  if (now < campaign.responseStartAt) return "SCHEDULED";
  if (now > campaign.responseEndAt) return "CLOSED";
  return "OPEN";
}

function getClientIp(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")
    || "127.0.0.1";
}

function getSigningSecret() {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret) throw new Error("BETTER_AUTH_SECRET não configurado.");
  return secret;
}

function signPublicSession(payload: { campaignId: string; employeeId: string; eligibilityId: string; exp: number }) {
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", getSigningSecret()).update(encoded).digest("base64url");
  return `${encoded}.${signature}`;
}

function verifyPublicSession(token: string) {
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return null;
  const expected = createHmac("sha256", getSigningSecret()).update(encoded).digest();
  const received = Buffer.from(signature, "base64url");
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) return null;
  const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as {
    campaignId: string;
    employeeId: string;
    eligibilityId: string;
    exp: number;
  };
  return payload.exp > Date.now() ? payload : null;
}

function maskEmail(email: string) {
  const [name, domain] = email.split("@");
  if (!domain) return "";
  return `${name.slice(0, 2)}${"*".repeat(Math.max(2, name.length - 2))}@${domain}`;
}

async function loadPublicCampaign(token: string) {
  const db = getDb();
  const [campaign] = await db.select().from(campaigns).where(eq(campaigns.publicToken, token)).limit(1);
  if (!campaign) return null;
  const [holidays, departmentLinks, departmentRows, rules, exceptions] = await Promise.all([
    db.select().from(campaignHolidays).where(eq(campaignHolidays.campaignId, campaign.id)),
    db.select().from(campaignDepartments).where(eq(campaignDepartments.campaignId, campaign.id)),
    db.select().from(departments),
    db.select().from(campaignWeekdayRules).where(eq(campaignWeekdayRules.campaignId, campaign.id)),
    db.select().from(campaignDateExceptions).where(eq(campaignDateExceptions.campaignId, campaign.id)),
  ]);
  const participatingIds = departmentLinks.filter((row) => row.active).map((row) => row.departmentId);
  const ruleMap = Object.fromEntries(participatingIds.map((departmentId) => [departmentId, Object.fromEntries(weekdayKeys.map((key) => [key, 0]))]));
  for (const rule of rules) {
    const key = weekdayKeys[rule.weekday];
    if (key && ruleMap[rule.departmentId]) ruleMap[rule.departmentId][key] = rule.enabled ? (rule.capacity ?? 0) : 0;
  }
  return {
    row: campaign,
    payload: {
      id: campaign.id,
      name: campaign.name,
      description: campaign.description ?? "",
      status: statusLabels[effectiveStatus(campaign)],
      holidays: holidays.map((holiday) => ({ date: holiday.holidayDate, name: holiday.name })),
      leaveDaysPerEmployee: campaign.maxChoicesPerEmployee,
      responsePeriod: { start: campaign.responseStartAt.toISOString(), end: campaign.responseEndAt.toISOString() },
      leavePeriod: { start: campaign.leaveStartDate, end: campaign.leaveEndDate },
      departmentIds: participatingIds,
      departments: departmentRows.filter((department) => participatingIds.includes(department.id)).map((department) => ({ id: department.id, name: department.name })),
      rules: ruleMap,
      exceptions: exceptions.map((exception) => ({
        id: exception.id,
        departmentId: exception.departmentId,
        date: exception.exceptionDate,
        type: exception.type === "BLOCK" ? "Bloquear data" : exception.type === "ALLOW" ? "Liberar data" : "Alterar capacidade",
        capacity: exception.capacityOverride ?? 0,
        note: exception.reason,
      })),
      publicToken: campaign.publicToken,
    },
  };
}

async function getCapacity(executor: ReturnType<typeof getDb>, campaignId: string, departmentId: string, leaveDate: string) {
  const [exception] = await executor.select().from(campaignDateExceptions).where(and(
    eq(campaignDateExceptions.campaignId, campaignId),
    eq(campaignDateExceptions.departmentId, departmentId),
    eq(campaignDateExceptions.exceptionDate, leaveDate),
  )).limit(1);
  const weekday = new Date(`${leaveDate}T12:00:00Z`).getUTCDay();
  const [rule] = await executor.select().from(campaignWeekdayRules).where(and(
    eq(campaignWeekdayRules.campaignId, campaignId),
    eq(campaignWeekdayRules.departmentId, departmentId),
    eq(campaignWeekdayRules.weekday, weekday),
  )).limit(1);
  const baseCapacity = rule?.enabled ? (rule.capacity ?? 0) : 0;
  if (exception?.type === "BLOCK") return 0;
  if (exception?.type === "CAPACITY_OVERRIDE") return exception.capacityOverride ?? 0;
  if (exception?.type === "ALLOW") return Math.max(1, baseCapacity);
  return baseCapacity;
}

async function buildCalendar(campaign: typeof campaigns.$inferSelect, departmentId: string) {
  const db = getDb();
  const calendar: Record<string, { used: number; capacity: number; status: string; registrations: never[] }> = {};
  for (let date = new Date(`${campaign.leaveStartDate}T12:00:00Z`); date <= new Date(`${campaign.leaveEndDate}T12:00:00Z`); date.setUTCDate(date.getUTCDate() + 1)) {
    const leaveDate = date.toISOString().slice(0, 10);
    const capacity = await getCapacity(db, campaign.id, departmentId, leaveDate);
    const [usage] = await db.select({ value: count(leaveChoices.id) }).from(leaveChoices).where(and(
      eq(leaveChoices.campaignId, campaign.id),
      eq(leaveChoices.departmentIdSnapshot, departmentId),
      eq(leaveChoices.leaveDate, leaveDate),
    ));
    const used = Number(usage.value);
    const status = capacity === 0 ? "Indisponível" : used >= capacity ? "Lotado" : used >= capacity * 0.7 ? "Quase lotado" : "Disponível";
    calendar[leaveDate] = { used, capacity, status, registrations: [] };
  }
  return calendar;
}

export async function GET(_request: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  const campaign = await loadPublicCampaign(token);
  if (!campaign) return NextResponse.json({ error: "Campanha não encontrada." }, { status: 404 });
  return NextResponse.json(campaign.payload);
}

const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("validate"), registration: z.string().trim().min(1).max(50) }),
  z.object({
    action: z.literal("submit"),
    publicSession: z.string().min(20),
    dates: z.array(z.iso.date()).min(1).max(31),
    justification: z.string().trim().max(2000).optional().default(""),
  }),
]);

export async function POST(request: Request, context: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await context.params;
    const data = actionSchema.parse(await request.json());
    const loaded = await loadPublicCampaign(token);
    if (!loaded || effectiveStatus(loaded.row) !== "OPEN") {
      return NextResponse.json({ error: "Esta campanha não está aberta para respostas." }, { status: 409 });
    }
    const db = getDb();
    if (data.action === "validate") {
      const ipAddress = getClientIp(request);
      const since = new Date(Date.now() - 15 * 60 * 1000);
      const [attempts] = await db.select({ value: count(auditLogs.id) }).from(auditLogs).where(and(
        eq(auditLogs.action, "Validação de matrícula pública"),
        eq(auditLogs.ipAddress, ipAddress),
        gte(auditLogs.createdAt, since),
      ));
      if (Number(attempts.value) >= 10) return NextResponse.json({ error: "Muitas tentativas. Aguarde alguns minutos." }, { status: 429 });
      const [employee] = await db.select().from(employees).where(eq(employees.registrationNumber, data.registration)).limit(1);
      const [eligibility] = employee ? await db.select().from(campaignEmployeeEligibility).where(and(
        eq(campaignEmployeeEligibility.campaignId, loaded.row.id),
        eq(campaignEmployeeEligibility.employeeId, employee.id),
        eq(campaignEmployeeEligibility.eligible, true),
      )).limit(1) : [];
      await db.insert(auditLogs).values({
        actorType: "SYSTEM",
        action: "Validação de matrícula pública",
        entityType: "public_access",
        campaignId: loaded.row.id,
        ipAddress,
      });
      if (!employee || !eligibility) {
        return NextResponse.json({ error: "Matrícula não encontrada ou não elegível para esta campanha." }, { status: 404 });
      }
      const publicSession = signPublicSession({
        campaignId: loaded.row.id,
        employeeId: employee.id,
        eligibilityId: eligibility.id,
        exp: Date.now() + 15 * 60 * 1000,
      });
      return NextResponse.json({
        publicSession,
        employee: {
          id: employee.id,
          registration: eligibility.registrationNumberSnapshot,
          name: eligibility.nameSnapshot,
          email: maskEmail(eligibility.emailSnapshot),
          departmentId: eligibility.departmentIdSnapshot,
          departmentName: eligibility.departmentNameSnapshot,
        },
        calendar: await buildCalendar(loaded.row, eligibility.departmentIdSnapshot),
      });
    }

    const publicSession = verifyPublicSession(data.publicSession);
    if (!publicSession || publicSession.campaignId !== loaded.row.id) {
      return NextResponse.json({ error: "Sua validação expirou. Informe a matrícula novamente." }, { status: 401 });
    }
    const uniqueDates = [...new Set(data.dates)].sort();
    if (uniqueDates.length !== loaded.row.maxChoicesPerEmployee) {
      return NextResponse.json({ error: `Selecione exatamente ${loaded.row.maxChoicesPerEmployee} data(s).` }, { status: 400 });
    }
    if (uniqueDates.some((date) => date < loaded.row.leaveStartDate || date > loaded.row.leaveEndDate)) {
      return NextResponse.json({ error: "Uma das datas está fora do período permitido." }, { status: 400 });
    }

    const result = await db.transaction(async (tx) => {
      const [eligibility] = await tx.select().from(campaignEmployeeEligibility).where(and(
        eq(campaignEmployeeEligibility.id, publicSession.eligibilityId),
        eq(campaignEmployeeEligibility.campaignId, loaded.row.id),
        eq(campaignEmployeeEligibility.employeeId, publicSession.employeeId),
        eq(campaignEmployeeEligibility.eligible, true),
      )).limit(1);
      if (!eligibility) throw new Error("NOT_ELIGIBLE");
      for (const leaveDate of uniqueDates) {
        const lockKey = `${loaded.row.id}:${eligibility.departmentIdSnapshot}:${leaveDate}`;
        await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${lockKey}, 0))`);
      }
      for (const leaveDate of uniqueDates) {
        const capacity = await getCapacity(tx as ReturnType<typeof getDb>, loaded.row.id, eligibility.departmentIdSnapshot, leaveDate);
        const [usage] = await tx.select({ value: count(leaveChoices.id) }).from(leaveChoices).where(and(
          eq(leaveChoices.campaignId, loaded.row.id),
          eq(leaveChoices.departmentIdSnapshot, eligibility.departmentIdSnapshot),
          eq(leaveChoices.leaveDate, leaveDate),
        ));
        if (capacity <= 0 || Number(usage.value) >= capacity) throw new Error(`CAPACITY:${leaveDate}`);
      }
      const [submission] = await tx.insert(leaveSubmissions).values({
        campaignId: loaded.row.id,
        employeeId: eligibility.employeeId,
        eligibilityId: eligibility.id,
        registrationNumberSnapshot: eligibility.registrationNumberSnapshot,
        nameSnapshot: eligibility.nameSnapshot,
        emailSnapshot: eligibility.emailSnapshot,
        departmentIdSnapshot: eligibility.departmentIdSnapshot,
        departmentNameSnapshot: eligibility.departmentNameSnapshot,
        justification: data.justification || null,
      }).returning({ id: leaveSubmissions.id, submittedAt: leaveSubmissions.submittedAt });
      await tx.insert(leaveChoices).values(uniqueDates.map((leaveDate) => ({
        submissionId: submission.id,
        campaignId: loaded.row.id,
        employeeId: eligibility.employeeId,
        departmentIdSnapshot: eligibility.departmentIdSnapshot,
        leaveDate,
        source: "EMPLOYEE" as const,
      })));
      await tx.insert(auditLogs).values({
        actorType: "EMPLOYEE",
        action: "Escolha de folgas registrada",
        entityType: "submission",
        entityId: submission.id,
        campaignId: loaded.row.id,
        employeeId: eligibility.employeeId,
      });
      const [delivery] = await tx.insert(emailDeliveries).values({
        submissionId: submission.id,
        recipient: eligibility.emailSnapshot,
        type: "LEAVE_SUBMISSION_CONFIRMATION",
        provider: "RESEND",
      }).returning({ id: emailDeliveries.id });
      return {
        ...submission,
        deliveryId: delivery.id,
        recipient: eligibility.emailSnapshot,
        registration: eligibility.registrationNumberSnapshot,
        employeeName: eligibility.nameSnapshot,
        departmentName: eligibility.departmentNameSnapshot,
      };
    });
    try {
      await deliverSubmissionConfirmation({
        deliveryId: result.deliveryId,
        submissionId: result.id,
        recipient: result.recipient,
        campaignName: loaded.row.name,
        registration: result.registration,
        employeeName: result.employeeName,
        departmentName: result.departmentName,
        leaveDates: uniqueDates,
        submittedAt: result.submittedAt,
      });
    } catch {
      console.error("A submissão foi persistida, mas não foi possível atualizar o registro de entrega do e-mail.", { submissionId: result.id });
    }
    return NextResponse.json({ submittedAt: result.submittedAt.toISOString() }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Dados enviados são inválidos." }, { status: 400 });
    const message = error instanceof Error ? error.message : "";
    if (message.startsWith("CAPACITY:")) return NextResponse.json({ error: "Uma das vagas acabou de ser preenchida. Revise as datas selecionadas.", conflictDate: message.slice(9) }, { status: 409 });
    if (message === "NOT_ELIGIBLE") return NextResponse.json({ error: "Acesso não elegível." }, { status: 403 });
    if ((error as { code?: string }).code === "23505") return NextResponse.json({ error: "Já existe uma resposta para esta matrícula nesta campanha." }, { status: 409 });
    console.error("Falha no formulário público.", error);
    return NextResponse.json({ error: "Não foi possível concluir a operação." }, { status: 500 });
  }
}
