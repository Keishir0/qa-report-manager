import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { getApiUser, requireApiAccess, WRITE_ROLES } from "@/lib/auth";
import { reportAccessWhere, softDeleteReport } from "@/lib/reports";

function unauthenticatedResponse() {
  return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });
}

function notFoundResponse() {
  return NextResponse.json(
    { error: "Relatorio nao encontrado" },
    { status: 404 }
  );
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const denied = await requireApiAccess(request);
    if (denied) return denied;

    const user = await getApiUser(request);
    if (!user) return unauthenticatedResponse();

    const report = await prisma.testReport.findFirst({
      where: { id: params.id, deletedAt: null, ...reportAccessWhere(user) },
      include: {
        steps: {
          orderBy: {
            stepNumber: "asc",
          },
        },
      },
    });

    if (!report) return notFoundResponse();

    return NextResponse.json(report);
  } catch (error: any) {
    console.error(`Error in GET /api/reports/${params.id}:`, error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const denied = await requireApiAccess(request, WRITE_ROLES);
    if (denied) return denied;

    const user = await getApiUser(request);
    if (!user) return unauthenticatedResponse();

    const exists = await prisma.testReport.findFirst({
      where: { id: params.id, deletedAt: null, ...reportAccessWhere(user) },
      select: { id: true },
    });

    if (!exists) return notFoundResponse();

    const body = await request.json();
    const {
      id: _id,
      code: _code,
      createdAt: _createdAt,
      updatedAt: _updatedAt,
      deletedAt: _deletedAt,
      steps: _steps,
      ...updateData
    } = body;

    if (user.role === "QA") {
      delete updateData.testerId;
      delete updateData.testerName;
    }

    if (updateData.testDate !== undefined && updateData.testDate !== null) {
      updateData.testDate = new Date(updateData.testDate);
    }

    if (
      user.role === "ADMIN" &&
      Object.prototype.hasOwnProperty.call(updateData, "testerId")
    ) {
      const nextTesterId = updateData.testerId
        ? String(updateData.testerId)
        : null;

      if (nextTesterId) {
        const tester = await prisma.user.findFirst({
          where: { id: nextTesterId, active: true },
          select: { id: true, name: true },
        });

        if (!tester) {
          return NextResponse.json(
            { error: "Usuario testador nao encontrado." },
            { status: 400 }
          );
        }

        updateData.testerId = tester.id;
        updateData.testerName = tester.name;
      } else {
        updateData.testerId = null;
        updateData.testerName = null;
      }
    }

    if (Object.prototype.hasOwnProperty.call(updateData, "sndeskTechnicianName")) {
      updateData.sndeskTechnicianName = updateData.sndeskTechnicianName
        ? String(updateData.sndeskTechnicianName).trim()
        : null;
    }

    const updatedReport = await prisma.testReport.update({
      where: { id: params.id },
      data: updateData,
      include: {
        steps: {
          orderBy: {
            stepNumber: "asc",
          },
        },
      },
    });

    return NextResponse.json(updatedReport);
  } catch (error: any) {
    console.error(`Error in PUT /api/reports/${params.id}:`, error);
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

    const user = await getApiUser(request);
    if (!user) return unauthenticatedResponse();

    const exists = await prisma.testReport.findFirst({
      where: { id: params.id, deletedAt: null, ...reportAccessWhere(user) },
      select: { id: true },
    });

    if (!exists) return notFoundResponse();

    const deleted = await softDeleteReport(params.id);

    if (!deleted) return notFoundResponse();

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error(`Error in DELETE /api/reports/${params.id}:`, error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
