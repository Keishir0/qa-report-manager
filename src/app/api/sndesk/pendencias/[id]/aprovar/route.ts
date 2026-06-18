import { requireQaOrAdmin } from "@/lib/adminAuth";
import {
  canUserAccessPendingTicket,
  markPendingError,
  sendPendingDecision,
} from "@/lib/sndesk";
import { getApiUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { logServerError } from "@/lib/serverLog";

export const dynamic = "force-dynamic";

function jsonError(message: string, status: number, details?: unknown) {
  return NextResponse.json(
    { success: false, message, ...(details ? { details } : {}) },
    { status }
  );
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const unauthorized = await requireQaOrAdmin(request);
    if (unauthorized) return unauthorized;

    const activeUser = await getApiUser(request);
    const [pendingTicket] = await prisma.$queryRaw<{ statusId: number | null }[]>`
      SELECT "statusId"
      FROM "qa_pending_tickets"
      WHERE "id" = ${params.id}
      LIMIT 1
    `;

    if (!pendingTicket) {
      return jsonError("Pendencia nao encontrada.", 404);
    }

    if (!canUserAccessPendingTicket(activeUser, pendingTicket)) {
      return jsonError("Voce nao tem permissao para esta pendencia.", 403);
    }

    const ticket = await sendPendingDecision(params.id, "aprovar", activeUser);

    return NextResponse.json({
      success: true,
      data: ticket,
    });
  } catch (error: unknown) {
    await markPendingError(params.id, error).catch(() => {});
    logServerError(
      `Error in POST /api/sndesk/pendencias/${params.id}/aprovar`,
      error
    );
    return jsonError("Erro ao aprovar no SNDesk", 500);
  }
}
