import { NextRequest, NextResponse } from "next/server";
import { getApiUser, requireApiAccess } from "@/lib/auth";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const denied = await requireApiAccess(request);
  if (denied) return denied;
  const user = await getApiUser(request);
  if (!user) {
    return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });
  }

  try {
    const filters = await prisma.savedFilter.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ data: filters });
  } catch (error) {
    console.error("Error in GET /api/saved-filters:", error);
    return NextResponse.json(
      { error: "Nao foi possivel carregar os filtros salvos." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const denied = await requireApiAccess(request);
  if (denied) return denied;
  const user = await getApiUser(request);
  if (!user) {
    return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });
  }

  try {
    const body = await request.json();
    const name = String(body?.name || "").trim();
    const query = String(body?.query || "").trim();
    const color = String(body?.color || "accent").trim() || "accent";

    if (!name) {
      return NextResponse.json({ error: "Informe um nome para o filtro." }, { status: 400 });
    }

    const filter = await prisma.savedFilter.create({
      data: { userId: user.id, name, query, color },
    });

    return NextResponse.json(filter, { status: 201 });
  } catch (error) {
    console.error("Error in POST /api/saved-filters:", error);
    return NextResponse.json(
      { error: "Nao foi possivel salvar o filtro." },
      { status: 500 }
    );
  }
}
