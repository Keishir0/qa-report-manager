import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { getApiUser, requireApiAccess, WRITE_ROLES } from "@/lib/auth";
import { recalculateReportGeneralStatus, reportAccessWhere } from "@/lib/reports";

export async function POST(request: NextRequest) {
  try {
    const denied = await requireApiAccess(request, WRITE_ROLES);
    if (denied) return denied;
    const user = await getApiUser(request);

    if (!user) {
      return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });
    }

    const body = await request.json();
    const {
      reportId,
      stepNumber,
      action,
      expectedResult,
      actualResult,
      status,
    } = body;

    // Validação básica dos campos obrigatórios
    if (
      !reportId ||
      stepNumber === undefined ||
      !action ||
      !expectedResult ||
      !actualResult ||
      !status
    ) {
      return NextResponse.json(
        { error: "Campos obrigatórios ausentes" },
        { status: 400 }
      );
    }

    // Verificar se o relatório correspondente existe
    const reportExists = await prisma.testReport.findFirst({
      where: { id: reportId, deletedAt: null, ...reportAccessWhere(user) },
    });

    if (!reportExists) {
      return NextResponse.json(
        { error: "Relatório associado não encontrado" },
        { status: 404 }
      );
    }

    const step = await prisma.testStep.create({
      data: {
        reportId,
        stepNumber: Number(stepNumber),
        action,
        expectedResult,
        actualResult,
        status,
      },
    });

    await recalculateReportGeneralStatus(reportId);

    return NextResponse.json(step, { status: 201 });
  } catch (error: any) {
    console.error("Error in POST /api/steps:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
