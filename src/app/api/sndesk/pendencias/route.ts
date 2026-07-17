import { requireQaOrAdmin } from "@/lib/adminAuth";
import prisma from "@/lib/prisma";
import {
  canUserAccessPendingTicket,
  getSndeskStepPendingCounts,
  PendingTicketRow,
} from "@/lib/sndesk";
import { NextRequest, NextResponse } from "next/server";
import { logServerError } from "@/lib/serverLog";
import { getApiUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

function jsonError(message: string, status: number, details?: unknown) {
  return NextResponse.json(
    { success: false, message, ...(details ? { details } : {}) },
    { status }
  );
}

async function enrichTicketsWithStepCounts(tickets: PendingTicketRow[]) {
  const reportIds = Array.from(
    new Set(tickets.map((ticket) => ticket.reportId).filter(Boolean))
  ) as string[];

  if (reportIds.length === 0) {
    return tickets.map((ticket) => ({
      ...ticket,
      stepsCount: 0,
      pendingStepsCount: 0,
      newStepsCount: 0,
      changedStepsCount: 0,
    }));
  }

  const steps = await prisma.testStep.findMany({
    where: {
      reportId: {
        in: reportIds,
      },
    },
    select: {
      id: true,
      reportId: true,
      stepNumber: true,
      action: true,
      expectedResult: true,
      actualResult: true,
      status: true,
      sndeskSentAt: true,
      sndeskSentHash: true,
    },
  });

  const stepsByReportId = new Map<string, typeof steps>();
  for (const step of steps) {
    const reportSteps = stepsByReportId.get(step.reportId) || [];
    reportSteps.push(step);
    stepsByReportId.set(step.reportId, reportSteps);
  }

  return tickets.map((ticket) => ({
    ...ticket,
    ...getSndeskStepPendingCounts(
      ticket.reportId ? stepsByReportId.get(ticket.reportId) || [] : []
    ),
  }));
}

export async function GET(request: NextRequest) {
  try {
    const unauthorized = await requireQaOrAdmin(request);
    if (unauthorized) return unauthorized;

    const user = await getApiUser(request);
    const reportId = request.nextUrl.searchParams.get("reportId");

    const tickets = reportId
      ? await prisma.$queryRaw<PendingTicketRow[]>`
          SELECT
            p."id",
            p."idChamado",
            p."statusId",
            p."statusDescricao",
            p."statusCor",
            p."chamadoSnapshot",
            p."reportId",
            r."code" AS "reportCode",
            r."tester_id" AS "reportTesterId",
            p."state",
            p."lastError",
            p."createdAt",
            p."updatedAt",
            COALESCE((SELECT COUNT(*)::int FROM "test_steps" s WHERE s."reportId" = p."reportId"), 0) AS "stepsCount"
          FROM "qa_pending_tickets" p
          LEFT JOIN "test_reports" r ON r."id" = p."reportId" AND r."deleted_at" IS NULL
          WHERE p."reportId" = ${reportId}
            AND p."state" <> 'encerrado'
          ORDER BY p."updatedAt" DESC
        `
      : await prisma.$queryRaw<PendingTicketRow[]>`
          SELECT
            p."id",
            p."idChamado",
            p."statusId",
            p."statusDescricao",
            p."statusCor",
            p."chamadoSnapshot",
            p."reportId",
            r."code" AS "reportCode",
            r."tester_id" AS "reportTesterId",
            p."state",
            p."lastError",
            p."createdAt",
            p."updatedAt",
            COALESCE((SELECT COUNT(*)::int FROM "test_steps" s WHERE s."reportId" = p."reportId"), 0) AS "stepsCount"
          FROM "qa_pending_tickets" p
          LEFT JOIN "test_reports" r ON r."id" = p."reportId" AND r."deleted_at" IS NULL
          WHERE p."state" <> 'encerrado'
          ORDER BY p."updatedAt" DESC
        `;

    let filteredTickets = tickets;
    if (user?.role === "QA") {
      filteredTickets = tickets.filter((ticket) =>
        canUserAccessPendingTicket(user, ticket)
      );
    }

    const enrichedTickets = await enrichTicketsWithStepCounts(filteredTickets);

    return NextResponse.json({
      success: true,
      data: enrichedTickets,
    });
  } catch (error: unknown) {
    logServerError("Error in GET /api/sndesk/pendencias", error);
    return jsonError("Internal Server Error", 500);
  }
}
