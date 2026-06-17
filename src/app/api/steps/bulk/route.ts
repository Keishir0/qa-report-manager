import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireApiAccess, WRITE_ROLES } from "@/lib/auth";
import { recalculateReportGeneralStatus } from "@/lib/reports";
import { STEP_STATUS_OPTIONS } from "@/types";
import { logServerError } from "@/lib/serverLog";

const MAX_STEPS_PER_REQUEST = 30;
const MAX_FIELD_LENGTH = 5000;

interface StepCreateInput {
  reportId: string;
  stepNumber: number;
  action: string;
  expectedResult: string;
  actualResult: string;
  status: string;
}

export async function POST(request: NextRequest) {
  const denied = await requireApiAccess(request, WRITE_ROLES);
  if (denied) return denied;

  try {
    const body = await request.json();
    const reportId = String(body.reportId || "");
    const inputSteps = Array.isArray(body.steps) ? body.steps : [];

    if (
      !reportId ||
      inputSteps.length === 0 ||
      inputSteps.length > MAX_STEPS_PER_REQUEST
    ) {
      return NextResponse.json(
        { error: "Informe entre 1 e 30 passos válidos." },
        { status: 400 }
      );
    }

    const report = await prisma.testReport.findUnique({
      where: { id: reportId },
      select: {
        id: true,
        steps: {
          select: { stepNumber: true },
          orderBy: { stepNumber: "desc" },
          take: 1,
        },
      },
    });

    if (!report) {
      return NextResponse.json(
        { error: "Relatório associado não encontrado." },
        { status: 404 }
      );
    }

    const firstStepNumber = (report.steps[0]?.stepNumber || 0) + 1;
    const steps: StepCreateInput[] = inputSteps.map(
      (step: Record<string, unknown>, index: number) => {
        const action = String(step.action || "").trim();
        const expectedResult = String(step.expectedResult || "").trim();
        const actualResult = String(step.actualResult || "").trim();
        const status = String(step.status || "");

        if (
          !action ||
          !expectedResult ||
          !actualResult ||
          action.length > MAX_FIELD_LENGTH ||
          expectedResult.length > MAX_FIELD_LENGTH ||
          actualResult.length > MAX_FIELD_LENGTH ||
          !STEP_STATUS_OPTIONS.includes(
            status as (typeof STEP_STATUS_OPTIONS)[number]
          )
        ) {
          throw new Error("INVALID_STEP");
        }

        return {
          reportId,
          stepNumber: firstStepNumber + index,
          action,
          expectedResult,
          actualResult,
          status,
        };
      }
    );

    const created = await prisma.$transaction(
      steps.map((step) => prisma.testStep.create({ data: step }))
    );

    await recalculateReportGeneralStatus(reportId);

    return NextResponse.json(
      { success: true, data: created },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_STEP") {
      return NextResponse.json(
        { error: "Um ou mais passos gerados são inválidos." },
        { status: 400 }
      );
    }

    logServerError("Error in POST /api/steps/bulk", error);
    return NextResponse.json(
      { error: "Não foi possível salvar os passos." },
      { status: 500 }
    );
  }
}
