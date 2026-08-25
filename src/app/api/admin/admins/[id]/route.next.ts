import { and, count, eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAdmin, UnauthorizedError } from "@/auth/require-admin";
import { getDb } from "@/db";
import { adminUsers, auditLogs, session } from "@/db/schema";
import { getAdminStatusChangeError } from "@/features/admins/domain/admin-account";

const statusSchema = z.object({ active: z.boolean() });

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { admin } = await requireAdmin();
    const { id } = await context.params;
    const data = statusSchema.parse(await request.json());
    const db = getDb();
    const result = await db.transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext('admin-status-change'))`);
      const [target] = await tx.select().from(adminUsers).where(eq(adminUsers.id, id)).limit(1);
      if (!target) return { error: "Administrador não encontrado.", status: 404 } as const;
      if (target.active === data.active) return { id: target.id } as const;
      const [activeCount] = await tx.select({ value: count(adminUsers.id) }).from(adminUsers)
        .where(eq(adminUsers.active, true));
      const ruleError = getAdminStatusChangeError({
        targetAdminId: target.id,
        currentAdminId: admin.id,
        nextActive: data.active,
        activeAdminCount: Number(activeCount.value),
      });
      if (ruleError) return { error: ruleError, status: 409 } as const;

      await tx.update(adminUsers).set({ active: data.active, updatedAt: new Date() })
        .where(and(eq(adminUsers.id, id), eq(adminUsers.active, !data.active)));
      if (!data.active) await tx.delete(session).where(eq(session.userId, target.authUserId));
      await tx.insert(auditLogs).values({
        actorUserId: admin.id,
        actorType: "ADMIN",
        action: data.active ? "ADMIN_ACTIVATED" : "ADMIN_DEACTIVATED",
        entityType: "admin_user",
        entityId: target.id,
        beforeData: { active: target.active },
        afterData: { active: data.active },
      });
      return { id: target.id } as const;
    });
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof UnauthorizedError) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Status inválido." }, { status: 400 });
    console.error("Falha ao alterar administrador.", error);
    return NextResponse.json({ error: "Não foi possível alterar o administrador." }, { status: 500 });
  }
}
