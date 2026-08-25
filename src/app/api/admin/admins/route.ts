import { asc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth/auth";
import { requireAdmin, UnauthorizedError } from "@/auth/require-admin";
import { getDb } from "@/db";
import { adminUsers, auditLogs, user } from "@/db/schema";
import { createAdminSchema } from "@/features/admins/domain/admin-account";

export async function GET() {
  try {
    await requireAdmin();
    const rows = await getDb().select({
      id: adminUsers.id,
      name: adminUsers.name,
      email: adminUsers.email,
      active: adminUsers.active,
      twoFactorEnabled: user.twoFactorEnabled,
      createdAt: adminUsers.createdAt,
    }).from(adminUsers).innerJoin(user, eq(user.id, adminUsers.authUserId))
      .orderBy(asc(adminUsers.name));
    return NextResponse.json({
      admins: rows.map((row) => ({ ...row, createdAt: row.createdAt.toISOString() })),
    });
  } catch (error) {
    if (error instanceof UnauthorizedError) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
    console.error("Falha ao listar administradores.", error);
    return NextResponse.json({ error: "Não foi possível carregar os administradores." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { admin } = await requireAdmin();
    const data = createAdminSchema.parse(await request.json());
    const [existing] = await getDb().select({ id: user.id }).from(user).where(eq(user.email, data.email)).limit(1);
    if (existing) return NextResponse.json({ error: "Já existe uma conta com esse e-mail." }, { status: 409 });

    const created = await auth.api.createUser({
      body: {
        email: data.email,
        password: data.temporaryPassword,
        name: data.name,
        role: "admin",
      },
    });

    try {
      const [newAdmin] = await getDb().transaction(async (tx) => {
        const inserted = await tx.insert(adminUsers).values({
          authUserId: created.user.id,
          email: data.email,
          name: data.name,
          active: true,
        }).returning();
        await tx.insert(auditLogs).values({
          actorUserId: admin.id,
          actorType: "ADMIN",
          action: "ADMIN_CREATED",
          entityType: "admin_user",
          entityId: inserted[0].id,
          afterData: { name: data.name, email: data.email, mfaRequired: true },
        });
        return inserted;
      });
      return NextResponse.json({ id: newAdmin.id }, { status: 201 });
    } catch (error) {
      await getDb().delete(user).where(eq(user.id, created.user.id));
      throw error;
    }
  } catch (error) {
    if (error instanceof UnauthorizedError) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || "Dados do administrador inválidos." }, { status: 400 });
    }
    if ((error as { code?: string }).code === "23505") return NextResponse.json({ error: "Já existe uma conta com esse e-mail." }, { status: 409 });
    console.error("Falha ao criar administrador.");
    return NextResponse.json({ error: "Não foi possível criar o administrador." }, { status: 500 });
  }
}
