import { NextRequest, NextResponse } from "next/server";
import { ADMIN_ROLES, requireApiAccess } from "@/lib/auth";

export async function requireQaAdmin(request: NextRequest) {
  const denied = await requireApiAccess(request, ADMIN_ROLES);

  if (!denied) return null;

  return NextResponse.json(
    {
      success: false,
      message:
        denied.status === 401
          ? "Nao autenticado."
          : "Acesso restrito a administradores.",
    },
    { status: denied.status }
  );
}
