import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const [
      total,
      passed,
      failed,
      blocked,
      notExecuted,
      recentReports,
    ] = await Promise.all([
      prisma.testReport.count(),
      prisma.testReport.count({ where: { generalStatus: "Passou" } }),
      prisma.testReport.count({ where: { generalStatus: "Falhou" } }),
      prisma.testReport.count({ where: { generalStatus: "Bloqueado" } }),
      prisma.testReport.count({ where: { generalStatus: "Não executado" } }),
      prisma.testReport.findMany({
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
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}
