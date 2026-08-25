import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { requireAdmin, UnauthorizedError } from "@/auth/require-admin";
import { getDb } from "@/db";
import { auditLogs, employees } from "@/db/schema";

const updateSchema = z.object({
  name: z.string().trim().min(2).max(160),
  email: z.string().trim().email().max(254),
  departmentId: z.string().uuid(),
  active: z.boolean(),
});

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { admin } = await requireAdmin();
    const { id } = await context.params;
    const data = updateSchema.parse(await request.json());
    const [before] = await getDb().select().from(employees).where(eq(employees.id, id)).limit(1);
    if (!before) return NextResponse.json({ error: "Colaborador não encontrado." }, { status: 404 });
    const [after] = await getDb().update(employees).set({
      name: data.name,
      email: data.email.toLowerCase(),
      departmentId: data.departmentId,
      active: data.active,
      updatedAt: new Date(),
    }).where(eq(employees.id, id)).returning();
    await getDb().insert(auditLogs).values({
      actorUserId: admin.id,
      actorType: "ADMIN",
      action: "Colaborador atualizado",
      entityType: "employee",
      entityId: id,
      employeeId: id,
      beforeData: { name: before.name, email: before.email, departmentId: before.departmentId, active: before.active },
      afterData: { name: after.name, email: after.email, departmentId: after.departmentId, active: after.active },
    });
    return NextResponse.json({ id });
  } catch (error) {
    if (error instanceof UnauthorizedError) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Dados do colaborador inválidos." }, { status: 400 });
    console.error("Falha ao atualizar colaborador.", error);
    return NextResponse.json({ error: "Não foi possível atualizar o colaborador." }, { status: 500 });
  }
}
