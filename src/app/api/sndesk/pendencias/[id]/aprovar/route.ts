import { requireQaOrAdmin } from "@/lib/adminAuth";
import {
  canUserAccessPendingTicket,
  getSndeskStepPendingCounts,
  markPendingError,
  SndeskDecisionValidationError,
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

async function getPendingStepsCount(reportId: string | null) {
  if (!reportId) return 0;

  const steps = await prisma.testStep.findMany({
    where: { reportId },
    select: {
      id: true,
      stepNumber: true,
      action: true,
      expectedResult: true,
      actualResult: true,
      status: true,
      sndeskSentAt: true,
      sndeskSentHash: true,
    },
  });

  return getSndeskStepPendingCounts(steps).pendingStepsCount;
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const unauthorized = await requireQaOrAdmin(request);
    if (unauthorized) return unauthorized;

    const activeUser = await getApiUser(request);
    const [pendingTicket] = await prisma.$queryRaw<
      {
        reportId: string | null;
        statusId: number | null;
        chamadoSnapshot: any;
        reportTesterId: string | null;
      }[]
    >`
      SELECT
        p."reportId",
        p."statusId",
        p."chamadoSnapshot",
        r."tester_id" AS "reportTesterId"
      FROM "qa_pending_tickets" p
      LEFT JOIN "test_reports" r ON r."id" = p."reportId" AND r."deleted_at" IS NULL
      WHERE p."id" = ${params.id}
      LIMIT 1
    `;

    if (!pendingTicket) {
      return jsonError("Pendencia nao encontrada.", 404);
    }

    if (!canUserAccessPendingTicket(activeUser, pendingTicket)) {
      return jsonError("Voce nao tem permissao para esta pendencia.", 403);
    }

    if (!pendingTicket.reportId) {
      return jsonError("Vincule um relatorio antes de enviar.", 400);
    }

    const pendingStepsCount = await getPendingStepsCount(pendingTicket.reportId);
    if (pendingStepsCount === 0) {
      return jsonError(
        "Nao e possivel aprovar sem passos novos ou alterados para enviar ao SNDesk.",
        400
      );
    }

    const ticket = await sendPendingDecision(params.id, "aprovar", activeUser);

    return NextResponse.json({
      success: true,
      data: ticket,
    });
  } catch (error: unknown) {
    if (error instanceof SndeskDecisionValidationError) {
      return jsonError(error.message, error.status);
    }

    await markPendingError(params.id, error).catch(() => {});
    logServerError(
      `Error in POST /api/sndesk/pendencias/${params.id}/aprovar`,
      error
    );
    return jsonError("Erro ao aprovar no SNDesk", 500);
  }
}
