import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { getApiUser, requireApiAccess } from "@/lib/auth";
import { reportAccessWhere } from "@/lib/reports";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const denied = await requireApiAccess(request);
    if (denied) return denied;
    const user = await getApiUser(request);

    if (!user) {
      return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });
    }

    const activeReportWhere = { deletedAt: null, ...reportAccessWhere(user) };

    const [
      total,
      passed,
      failed,
      blocked,
      notExecuted,
      recentReports,
    ] = await Promise.all([
      prisma.testReport.count({ where: activeReportWhere }),
      prisma.testReport.count({
        where: { ...activeReportWhere, generalStatus: { in: ["Aprovado QA", "Passou"] } },
      }),
      prisma.testReport.count({
        where: { ...activeReportWhere, generalStatus: { in: ["Reprovado QA", "Falhou"] } },
      }),
      prisma.testReport.count({
        where: { ...activeReportWhere, generalStatus: "Bloqueado" },
      }),
      prisma.testReport.count({
        where: { ...activeReportWhere, generalStatus: { in: ["Não Executado", "Não executado"] } },
      }),
      prisma.testReport.findMany({
        where: activeReportWhere,
        take: 5,
        orderBy: {
          createdAt: "desc",
        },
        include: {
          steps: {
            orderBy: {
              stepNumber: "asc",
            },
          },
        },
      }),
    ]);

    return NextResponse.json({
      total,
      passed,
      failed,
      blocked,
      notExecuted,
      recentReports,
    });
  } catch (error: any) {
    console.error("Error in GET /api/dashboard:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
