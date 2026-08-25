import "server-only";

import { headers } from "next/headers";
import { and, eq } from "drizzle-orm";

import { getDb } from "@/db";
import { adminUsers } from "@/db/schema";

import { auth } from "./auth";

export class UnauthorizedError extends Error {
  readonly code = "UNAUTHORIZED";

  constructor() {
    super("Acesso não autorizado.");
    this.name = "UnauthorizedError";
  }
}

export async function requireAdmin() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id || session.user.twoFactorEnabled !== true) throw new UnauthorizedError();

  const [admin] = await getDb()
    .select({ id: adminUsers.id, email: adminUsers.email, name: adminUsers.name })
    .from(adminUsers)
    .where(and(eq(adminUsers.authUserId, session.user.id), eq(adminUsers.active, true)))
    .limit(1);

  if (!admin) throw new UnauthorizedError();
  return { session, admin };
}
