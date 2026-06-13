import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { requireApiAccess, WRITE_ROLES } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const denied = await requireApiAccess(request);
    if (denied) return denied;

    const { searchParams } = request.nextUrl;
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const branch = searchParams.get("branch");
    const status = searchParams.get("status");
    const testType = searchParams.get("testType");
    const system = searchParams.get("system");
    const search = searchParams.get("search");

    const where: any = {};

    if (dateFrom || dateTo) {
      where.testDate = {};
      if (dateFrom) {
        where.testDate.gte = new Date(dateFrom);
      }
      if (dateTo) {
        where.testDate.lte = new Date(dateTo);
      }
    }

    if (branch && branch.trim() !== "") {
      where.branch = branch;
    }

    if (status && status.trim() !== "") {
      where.generalStatus = status;
    }

    if (testType && testType.trim() !== "") {
      where.testType = testType;
    }

    if (system && system.trim() !== "") {
      where.systemName = { contains: system, mode: "insensitive" };
    }

    if (search && search.trim() !== "") {
      where.OR = [
        { code: { contains: search, mode: "insensitive" } },
        { screenPath: { contains: search, mode: "insensitive" } },
        { functionality: { contains: search, mode: "insensitive" } },
        { bugDescription: { contains: search, mode: "insensitive" } },
        { systemName: { contains: search, mode: "insensitive" } },
      ];
    }

    const reports = await prisma.testReport.findMany({
      where,
      include: {
        steps: {
          orderBy: {
            stepNumber: "asc",
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(reports);
  } catch (error: any) {
    console.error("Error in GET /api/reports:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const denied = await requireApiAccess(request, WRITE_ROLES);
    if (denied) return denied;

    const body = await request.json();
    const {
      testDate,
      systemName,
      branch,
      screenPath,
      functionality,
      bugDescription,
      testType,
      generalStatus,
      sndeskChamadoId,
      notes,
      steps,
    } = body;

    // Validação básica dos campos obrigatórios
    if (
      !testDate ||
      !systemName ||
      !branch ||
      !screenPath ||
      !functionality ||
      !bugDescription ||
      !testType ||
      !generalStatus
    ) {
      return NextResponse.json(
        { error: "Campos obrigatórios ausentes" },
        { status: 400 }
      );
    }

    // Gerar código automaticamente: QA-XXX (total de relatórios existentes + 1)
    const count = await prisma.testReport.count();
    const nextNumber = count + 1;
    const code = `QA-${String(nextNumber).padStart(3, "0")}`;

    const report = await prisma.testReport.create({
      data: {
        code,
        sndeskChamadoId: sndeskChamadoId ? String(sndeskChamadoId) : null,
        testDate: new Date(testDate),
        systemName,
        branch,
        screenPath,
        functionality,
        bugDescription,
        testType,
        generalStatus,
        notes,
        steps: steps && Array.isArray(steps) ? {
          create: steps.map((step: any) => ({
            stepNumber: Number(step.stepNumber),
            action: step.action,
            expectedResult: step.expectedResult,
            actualResult: step.actualResult,
            status: step.status,
          })),
        } : undefined,
      },
      include: {
        steps: {
          orderBy: {
            stepNumber: "asc",
          },
        },
      },
    });

    return NextResponse.json(report, { status: 201 });
  } catch (error: any) {
    console.error("Error in POST /api/reports:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
