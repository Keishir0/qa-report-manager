import { NextRequest, NextResponse } from "next/server";
import { getApiUser, requireApiAccess } from "@/lib/auth";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const denied = await requireApiAccess(request);
  if (denied) return denied;
  const user = await getApiUser(request);
  if (!user) {
    return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });
  }

  try {
    const filter = await prisma.savedFilter.findUnique({ where: { id: params.id } });
    if (!filter || filter.userId !== user.id) {
      return NextResponse.json({ error: "Filtro nao encontrado." }, { status: 404 });
    }

    await prisma.savedFilter.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in DELETE /api/saved-filters/[id]:", error);
    return NextResponse.json(
      { error: "Nao foi possivel remover o filtro." },
      { status: 500 }
    );
  }
}
