import { requireQaOrAdmin } from "@/lib/adminAuth";
import prisma from "@/lib/prisma";
import { canUserAccessPendingTicket, PendingTicketRow } from "@/lib/sndesk";
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
            p."state",
            p."lastError",
            p."createdAt",
            p."updatedAt"
          FROM "qa_pending_tickets" p
          LEFT JOIN "test_reports" r ON r."id" = p."reportId" AND r."deleted_at" IS NULL
          WHERE p."reportId" = ${reportId}
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
            p."state",
            p."lastError",
            p."createdAt",
            p."updatedAt"
          FROM "qa_pending_tickets" p
          LEFT JOIN "test_reports" r ON r."id" = p."reportId" AND r."deleted_at" IS NULL
          ORDER BY p."updatedAt" DESC
        `;

    let filteredTickets = tickets;
    if (user?.role === "QA") {
      filteredTickets = tickets.filter((ticket) =>
        canUserAccessPendingTicket(user, ticket)
      );
    }

    return NextResponse.json({
      success: true,
      data: filteredTickets,
    });
  } catch (error: unknown) {
    logServerError("Error in GET /api/sndesk/pendencias", error);
    return jsonError("Internal Server Error", 500);
  }
}
