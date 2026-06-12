import { requireQaAdmin } from "@/lib/adminAuth";
import { markPendingError, sendPendingDecision } from "@/lib/sndesk";
import { NextRequest, NextResponse } from "next/server";

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
    const unauthorized = requireQaAdmin(request);
    if (unauthorized) return unauthorized;

    const ticket = await sendPendingDecision(params.id, "aprovar");

    return NextResponse.json({
      success: true,
      data: ticket,
    });
  } catch (error: any) {
    await markPendingError(params.id, error).catch(() => {});
    console.error(`Error in POST /api/sndesk/pendencias/${params.id}/aprovar:`, error);
    return jsonError("Erro ao aprovar no SNDesk", 500, error.message);
  }
}
