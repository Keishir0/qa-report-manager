import { NextRequest, NextResponse } from "next/server";
import { requireApiAccess } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const denied = await requireApiAccess(request);
  if (denied) return denied;

  try {
    const users = await prisma.user.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: users,
    });
  } catch (error) {
    console.error("Error in GET /api/users/options:", error);
    return NextResponse.json(
      { success: false, message: "Nao foi possivel carregar os usuarios." },
      { status: 500 }
    );
  }
}
