import { requireQaAdmin } from "@/lib/adminAuth";
import prisma from "@/lib/prisma";
import { refreshPendingTicket } from "@/lib/sndesk";
import { NextRequest, NextResponse } from "next/server";
import { logServerError } from "@/lib/serverLog";

export const dynamic = "force-dynamic";

function jsonError(message: string, status: number, details?: unknown) {
  return NextResponse.json(
    { success: false, message, ...(details ? { details } : {}) },
    { status }
  );
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const unauthorized = await requireQaAdmin(request);
    if (unauthorized) return unauthorized;

    const body = await request.json();

    if (body.action === "refresh") {
      const ticket = await refreshPendingTicket(params.id);

      return NextResponse.json({
        success: true,
        data: ticket,
      });
    }

    const reportId = body.reportId ? String(body.reportId) : null;

    if (reportId) {
      const [report] = await prisma.$queryRaw<{ id: string }[]>`
        SELECT "id"
        FROM "test_reports"
        WHERE "id" = ${reportId}
        LIMIT 1
      `;

      if (!report) return jsonError("Relatorio nao encontrado.", 404);
    }

    const [ticket] = await prisma.$queryRaw<any[]>`
      UPDATE "qa_pending_tickets"
      SET "reportId" = ${reportId}, "updatedAt" = CURRENT_TIMESTAMP
      WHERE "id" = ${params.id}
      RETURNING "id", "idChamado", "reportId", "state", "updatedAt"
    `;

    if (!ticket) return jsonError("Pendencia nao encontrada.", 404);

    await prisma.$executeRaw`
      UPDATE "test_reports"
      SET "sndesk_chamado_id" = NULL
      WHERE "sndesk_chamado_id" = ${ticket.idChamado}
    `;

    if (reportId) {
      await prisma.$executeRaw`
        UPDATE "test_reports"
        SET "sndesk_chamado_id" = ${ticket.idChamado}
        WHERE "id" = ${reportId}
      `;
    }

    return NextResponse.json({
      success: true,
      data: ticket,
    });
  } catch (error: unknown) {
    logServerError(`Error in PATCH /api/sndesk/pendencias/${params.id}`, error);
    return jsonError("Internal Server Error", 500);
  }
}
