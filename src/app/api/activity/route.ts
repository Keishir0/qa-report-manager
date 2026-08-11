import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { getApiUser, requireApiAccess } from "@/lib/auth";
import { reportAccessWhere } from "@/lib/reports";

export const dynamic = "force-dynamic";

const LIMIT = 8;

export async function GET(request: NextRequest) {
  try {
    const denied = await requireApiAccess(request);
    if (denied) return denied;
    const user = await getApiUser(request);

    if (!user) {
      return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });
    }

    const activeReportWhere = { deletedAt: null, ...reportAccessWhere(user) };

    const [reports, steps] = await Promise.all([
      prisma.testReport.findMany({
        where: activeReportWhere,
        orderBy: { updatedAt: "desc" },
        take: LIMIT,
        select: {
          id: true,
          code: true,
          generalStatus: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.testStep.findMany({
        where: { report: activeReportWhere },
        orderBy: { updatedAt: "desc" },
        take: LIMIT,
        select: {
          id: true,
          stepNumber: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          report: { select: { code: true } },
        },
      }),
    ]);

    const reportItems = reports.map((report) => {
      const isNew = report.updatedAt.getTime() === report.createdAt.getTime();
      return {
        id: `report-${report.id}`,
        label: `${report.code} ${isNew ? "criado" : "atualizado"}`,
        status: report.generalStatus,
        timestamp: report.updatedAt.toISOString(),
      };
    });

    const stepItems = steps.map((step) => {
      const isNew = step.updatedAt.getTime() === step.createdAt.getTime();
      return {
        id: `step-${step.id}`,
        label: `Passo ${step.stepNumber} de ${step.report.code} ${
          isNew ? "adicionado" : "atualizado"
        }`,
        status: step.status,
        timestamp: step.updatedAt.toISOString(),
      };
    });

    const items = [...reportItems, ...stepItems]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, LIMIT);

    return NextResponse.json({ items });
  } catch (error: any) {
    console.error("Error in GET /api/activity:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
