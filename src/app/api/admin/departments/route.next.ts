import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAdmin, UnauthorizedError } from "@/auth/require-admin";
import { getDb } from "@/db";
import { auditLogs, departments } from "@/db/schema";

const departmentSchema = z.object({
  name: z.string().trim().min(2).max(120),
  code: z.string().trim().max(30).optional().default(""),
  active: z.boolean().default(true),
});

export async function POST(request: Request) {
  try {
    const { admin } = await requireAdmin();
    const data = departmentSchema.parse(await request.json());
    const [department] = await getDb().insert(departments).values({
      name: data.name,
      code: data.code || null,
      active: data.active,
    }).returning();
    await getDb().insert(auditLogs).values({
      actorUserId: admin.id,
      actorType: "ADMIN",
      action: "Departamento criado",
      entityType: "department",
      entityId: department.id,
      afterData: { name: department.name, code: department.code, active: department.active },
    });
    return NextResponse.json({ id: department.id }, { status: 201 });
  } catch (error) {
    if (error instanceof UnauthorizedError) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Dados do departamento inválidos." }, { status: 400 });
    if ((error as { code?: string }).code === "23505") return NextResponse.json({ error: "Já existe um departamento com esse código." }, { status: 409 });
    console.error("Falha ao criar departamento.", error);
    return NextResponse.json({ error: "Não foi possível criar o departamento." }, { status: 500 });
  }
}
