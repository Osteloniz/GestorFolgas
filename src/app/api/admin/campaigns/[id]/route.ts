import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { requireAdmin, UnauthorizedError } from "@/auth/require-admin";
import { getDb } from "@/db";
import { auditLogs, campaigns } from "@/db/schema";

const actionSchema = z.object({
  action: z.literal("cancel"),
  reason: z.string().trim().min(3).max(500),
});

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { admin } = await requireAdmin();
    const { id } = await context.params;
    const data = actionSchema.parse(await request.json());
    const [campaign] = await getDb().select().from(campaigns).where(eq(campaigns.id, id)).limit(1);
    if (!campaign) return NextResponse.json({ error: "Campanha não encontrada." }, { status: 404 });
    if (campaign.status === "CANCELLED") return NextResponse.json({ id });
    await getDb().transaction(async (tx) => {
      await tx.update(campaigns).set({ status: "CANCELLED", cancelledAt: new Date(), updatedAt: new Date() })
        .where(eq(campaigns.id, id));
      await tx.insert(auditLogs).values({
        actorUserId: admin.id,
        actorType: "ADMIN",
        action: "Campanha cancelada",
        entityType: "campaign",
        entityId: id,
        campaignId: id,
        reason: data.reason,
        beforeData: { status: campaign.status },
        afterData: { status: "CANCELLED" },
      });
    });
    return NextResponse.json({ id });
  } catch (error) {
    if (error instanceof UnauthorizedError) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Informe o motivo do cancelamento." }, { status: 400 });
    console.error("Falha ao cancelar campanha.", error);
    return NextResponse.json({ error: "Não foi possível cancelar a campanha." }, { status: 500 });
  }
}
