import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { requireApiAccess, WRITE_ROLES } from "@/lib/auth";
import { softDeleteReport } from "@/lib/reports";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const denied = await requireApiAccess(request);
    if (denied) return denied;

    const { id } = params;

    const report = await prisma.testReport.findFirst({
      where: { id, deletedAt: null },
      include: {
        steps: {
          orderBy: {
            stepNumber: "asc",
          },
        },
      },
    });

    if (!report) {
      return NextResponse.json(
        { error: "Relatório não encontrado" },
        { status: 404 }
      );
    }

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

    const { id } = params;
    const body = await request.json();

    // Desestruturação para remover campos que não devem ser modificados via API
    const {
      id: _id,
      code: _code,
      createdAt: _createdAt,
      updatedAt: _updatedAt,
      deletedAt: _deletedAt,
      steps: _steps,
      ...updateData
    } = body;

    // Converter testDate para Date se enviado na requisição
    if (updateData.testDate !== undefined && updateData.testDate !== null) {
      updateData.testDate = new Date(updateData.testDate);
    }

    if (Object.prototype.hasOwnProperty.call(updateData, "testerId")) {
      const nextTesterId = updateData.testerId ? String(updateData.testerId) : null;
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

    const exists = await prisma.testReport.findFirst({
      where: { id, deletedAt: null },
    });

    if (!exists) {
      return NextResponse.json(
        { error: "Relatório não encontrado" },
        { status: 404 }
      );
    }

    const updatedReport = await prisma.testReport.update({
      where: { id },
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

    const { id } = params;

    const deleted = await softDeleteReport(id);

    if (!deleted) {
      return NextResponse.json(
        { error: "Relatório não encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error(`Error in DELETE /api/reports/${params.id}:`, error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
