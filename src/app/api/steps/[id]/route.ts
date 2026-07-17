import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { getApiUser, requireApiAccess, WRITE_ROLES } from "@/lib/auth";
import { canUserAccessReport, recalculateReportGeneralStatus } from "@/lib/reports";

function unauthenticatedResponse() {
  return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });
}

function notFoundResponse() {
  return NextResponse.json(
    { error: "Passo de teste nao encontrado" },
    { status: 404 }
  );
}

async function getAccessibleStep(stepId: string, request: NextRequest) {
  const user = await getApiUser(request);
  if (!user) return { user: null, step: null };

  const step = await prisma.testStep.findUnique({
    where: { id: stepId },
    include: {
      report: {
        select: {
          testerId: true,
          deletedAt: true,
          pendingTicket: {
            select: {
              statusId: true,
            },
          },
        },
      },
    },
  });

  if (
    !step ||
    step.report.deletedAt ||
    !canUserAccessReport(user, step.report)
  ) {
    return { user, step: null };
  }

  return { user, step };
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const denied = await requireApiAccess(request, WRITE_ROLES);
    if (denied) return denied;

    const { user, step } = await getAccessibleStep(params.id, request);
    if (!user) return unauthenticatedResponse();
    if (!step) return notFoundResponse();

    const body = await request.json();
    const {
      id: _id,
      reportId: _reportId,
      createdAt: _createdAt,
      updatedAt: _updatedAt,
      sndeskSentAt: _sndeskSentAt,
      sndeskSentAction: _sndeskSentAction,
      sndeskSentHash: _sndeskSentHash,
      ...updateData
    } = body;

    if (updateData.stepNumber !== undefined && updateData.stepNumber !== null) {
      updateData.stepNumber = Number(updateData.stepNumber);
    }

    const updatedStep = await prisma.testStep.update({
      where: { id: params.id },
      data: updateData,
    });

    await recalculateReportGeneralStatus(step.reportId);

    return NextResponse.json(updatedStep);
  } catch (error: any) {
    console.error(`Error in PUT /api/steps/${params.id}:`, error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const denied = await requireApiAccess(request, WRITE_ROLES);
    if (denied) return denied;

    const { user, step } = await getAccessibleStep(params.id, request);
    if (!user) return unauthenticatedResponse();
    if (!step) return notFoundResponse();

    await prisma.testStep.delete({
      where: { id: params.id },
    });

    await recalculateReportGeneralStatus(step.reportId);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error(`Error in DELETE /api/steps/${params.id}:`, error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
