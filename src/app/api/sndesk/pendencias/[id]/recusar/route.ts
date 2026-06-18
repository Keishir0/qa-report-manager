import { requireQaAdmin } from "@/lib/adminAuth";
import { markPendingError, sendPendingDecision } from "@/lib/sndesk";
import { getApiUser } from "@/lib/auth";
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
    const unauthorized = await requireQaAdmin(request);
    if (unauthorized) return unauthorized;

    const activeUser = await getApiUser(request);
    const ticket = await sendPendingDecision(params.id, "recusar", activeUser);

    return NextResponse.json({
      success: true,
      data: ticket,
    });
  } catch (error: unknown) {
    await markPendingError(params.id, error).catch(() => {});
    logServerError(
      `Error in POST /api/sndesk/pendencias/${params.id}/recusar`,
      error
    );
    return jsonError("Erro ao recusar no SNDesk", 500);
  }
}
