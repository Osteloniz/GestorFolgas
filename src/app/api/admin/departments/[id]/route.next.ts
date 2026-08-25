import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { requireAdmin, UnauthorizedError } from "@/auth/require-admin";
import { getDb } from "@/db";
import { auditLogs, departments } from "@/db/schema";

const updateSchema = z.object({
  name: z.string().trim().min(2).max(120),
  code: z.string().trim().max(30).optional().default(""),
  active: z.boolean(),
});

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { admin } = await requireAdmin();
    const { id } = await context.params;
    const data = updateSchema.parse(await request.json());
    const [before] = await getDb().select().from(departments).where(eq(departments.id, id)).limit(1);
    if (!before) return NextResponse.json({ error: "Departamento não encontrado." }, { status: 404 });
    const [after] = await getDb().update(departments).set({
      name: data.name,
      code: data.code || null,
      active: data.active,
      updatedAt: new Date(),
    }).where(eq(departments.id, id)).returning();
    await getDb().insert(auditLogs).values({
      actorUserId: admin.id,
      actorType: "ADMIN",
      action: "Departamento atualizado",
      entityType: "department",
      entityId: id,
      beforeData: { name: before.name, code: before.code, active: before.active },
      afterData: { name: after.name, code: after.code, active: after.active },
    });
    return NextResponse.json({ id });
  } catch (error) {
    if (error instanceof UnauthorizedError) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Dados do departamento inválidos." }, { status: 400 });
    if ((error as { code?: string }).code === "23505") return NextResponse.json({ error: "Já existe um departamento com esse código." }, { status: 409 });
    console.error("Falha ao atualizar departamento.", error);
    return NextResponse.json({ error: "Não foi possível atualizar o departamento." }, { status: 500 });
  }
}
