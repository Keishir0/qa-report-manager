import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { getApiUser, requireApiAccess, WRITE_ROLES } from "@/lib/auth";
import { generateNextReportCode } from "@/lib/reports";

export async function GET(request: NextRequest) {
  try {
    const denied = await requireApiAccess(request);
    if (denied) return denied;

    const { searchParams } = request.nextUrl;
    const testedFrom = searchParams.get("testedFrom") || searchParams.get("dateFrom");
    const testedTo = searchParams.get("testedTo") || searchParams.get("dateTo");
    const createdFrom = searchParams.get("createdFrom");
    const createdTo = searchParams.get("createdTo");
    const branch = searchParams.get("branch");
    const status = searchParams.get("status");
    const testType = searchParams.get("testType");
    const system = searchParams.get("system");
    const tester = searchParams.get("tester");
    const dev = searchParams.get("dev");
    const search = searchParams.get("search");

    const where: any = { deletedAt: null };
    const andFilters: any[] = [];

    if (testedFrom || testedTo) {
      where.testDate = {};
      if (testedFrom) {
        where.testDate.gte = new Date(testedFrom);
      }
      if (testedTo) {
        const endDate = new Date(testedTo);
        endDate.setHours(23, 59, 59, 999);
        where.testDate.lte = endDate;
      }
    }

    if (createdFrom || createdTo) {
      where.createdAt = {};
      if (createdFrom) {
        where.createdAt.gte = new Date(createdFrom);
      }
      if (createdTo) {
        const endDate = new Date(createdTo);
        endDate.setHours(23, 59, 59, 999);
        where.createdAt.lte = endDate;
      }
    }

    if (branch && branch.trim() !== "") {
      const branches = branch.split(",").map((b) => b.trim()).filter(Boolean);
      if (branches.length > 0) {
        andFilters.push({
          OR: branches.map((b) => ({
            branch: { contains: b, mode: "insensitive" },
          })),
        });
      }
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

    if (tester && tester.trim() !== "") {
      andFilters.push({
        testerId: tester,
      });
    }

    if (dev && dev.trim() !== "") {
      andFilters.push({
        sndeskTechnicianName: { contains: dev, mode: "insensitive" },
      });
    }

    if (search && search.trim() !== "") {
      andFilters.push({
        OR: [
          { code: { contains: search, mode: "insensitive" } },
          { screenPath: { contains: search, mode: "insensitive" } },
          { functionality: { contains: search, mode: "insensitive" } },
          { bugDescription: { contains: search, mode: "insensitive" } },
          { systemName: { contains: search, mode: "insensitive" } },
          { testerName: { contains: search, mode: "insensitive" } },
          { sndeskTechnicianName: { contains: search, mode: "insensitive" } },
        ],
      });
    }

    if (andFilters.length > 0) {
      where.AND = andFilters;
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
    const user = await getApiUser(request);

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
      testerId,
      sndeskTechnicianName,
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
    const code = await generateNextReportCode();
    const tester = testerId
      ? await prisma.user.findFirst({
          where: { id: String(testerId), active: true },
          select: { id: true, name: true },
        })
      : user;

    if (testerId && !tester) {
      return NextResponse.json(
        { error: "Usuario testador nao encontrado." },
        { status: 400 }
      );
    }

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
        testerId: tester?.id || user?.id || null,
        testerName: tester?.name || user?.name || null,
        sndeskTechnicianName: sndeskTechnicianName
          ? String(sndeskTechnicianName).trim()
          : null,
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
