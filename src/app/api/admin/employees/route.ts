import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAdmin, UnauthorizedError } from "@/auth/require-admin";
import { getDb } from "@/db";
import { auditLogs, departments, employees } from "@/db/schema";
import { eq } from "drizzle-orm";

const employeeSchema = z.object({
  registration: z.string().trim().min(1).max(50),
  name: z.string().trim().min(2).max(160),
  email: z.string().trim().email().max(254),
  departmentId: z.string().uuid(),
  active: z.boolean().default(true),
});

export async function POST(request: Request) {
  try {
    const { admin } = await requireAdmin();
    const data = employeeSchema.parse(await request.json());
    const [department] = await getDb().select({ id: departments.id }).from(departments)
      .where(eq(departments.id, data.departmentId)).limit(1);
    if (!department) return NextResponse.json({ error: "Departamento não encontrado." }, { status: 400 });
    const [employee] = await getDb().insert(employees).values({
      registrationNumber: data.registration,
      name: data.name,
      email: data.email.toLowerCase(),
      departmentId: data.departmentId,
      active: data.active,
    }).returning();
    await getDb().insert(auditLogs).values({
      actorUserId: admin.id,
      actorType: "ADMIN",
      action: "Colaborador criado",
      entityType: "employee",
      entityId: employee.id,
      employeeId: employee.id,
      afterData: { registration: employee.registrationNumber, name: employee.name, email: employee.email },
    });
    return NextResponse.json({ id: employee.id }, { status: 201 });
  } catch (error) {
    if (error instanceof UnauthorizedError) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Dados do colaborador inválidos." }, { status: 400 });
    if ((error as { code?: string }).code === "23505") return NextResponse.json({ error: "Já existe um colaborador com essa matrícula." }, { status: 409 });
    console.error("Falha ao criar colaborador.", error);
    return NextResponse.json({ error: "Não foi possível criar o colaborador." }, { status: 500 });
  }
}
