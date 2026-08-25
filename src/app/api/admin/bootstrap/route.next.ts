import { NextResponse } from "next/server";

import { requireAdmin, UnauthorizedError } from "@/auth/require-admin";
import { getAdminBootstrapData } from "@/server/admin-data";

export async function GET() {
  try {
    await requireAdmin();
    return NextResponse.json(await getAdminBootstrapData());
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
    }
    console.error("Falha ao carregar dados administrativos.", error);
    return NextResponse.json({ error: "Não foi possível carregar os dados." }, { status: 500 });
  }
}
