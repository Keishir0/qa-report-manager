import { requireQaAdmin } from "@/lib/adminAuth";
import { getApiUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { logServerError } from "@/lib/serverLog";
import { getSndeskTechnicianName } from "@/lib/sndeskTechnician";
import { generateNextReportCode, softDeleteReport } from "@/lib/reports";

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
    const user = await getApiUser(request);

    const [ticket] = await prisma.$queryRaw<any[]>`
      SELECT *
      FROM "qa_pending_tickets"
      WHERE "id" = ${params.id}
      LIMIT 1
    `;

    if (!ticket) return jsonError("Pendencia nao encontrada.", 404);

    if (ticket.reportId) {
      const report = await prisma.testReport.findUnique({
        where: { id: ticket.reportId },
      });

      if (report && !report.deletedAt) {
        return NextResponse.json({
          success: true,
          data: report,
        });
      }

      await prisma.qaPendingTicket.update({
        where: { id: params.id },
        data: { reportId: null },
      });
    }

    const snapshot = ticket.chamadoSnapshot || {};
    const clienteNome = snapshot?.cliente?.nome || snapshot?.nome || "Nao informado";
    const assunto = snapshot?.assunto || `Chamado ${ticket.idChamado}`;
    const sndeskTechnicianName = getSndeskTechnicianName(snapshot);
    const code = await generateNextReportCode();

    const report = await prisma.testReport.create({
      data: {
        code,
        sndeskChamadoId: ticket.idChamado,
        testDate: new Date(),
        systemName: "SNDesk",
        branch: "Alfa",
        screenPath: "Chamado",
        functionality: assunto,
        bugDescription:
          snapshot?.descricao ||
          `Validacao pendente do chamado ${ticket.idChamado} (${clienteNome}).`,
        testType: "Reteste",
        generalStatus: "Não executado",
        testerId: user?.id || null,
        testerName: user?.name || null,
        sndeskTechnicianName,
        notes: `Pendencia criada a partir do chamado SNDesk ${ticket.idChamado}.`,
      },
    });

    await prisma.$executeRaw`
      UPDATE "qa_pending_tickets"
      SET "reportId" = ${report.id}, "updatedAt" = CURRENT_TIMESTAMP
      WHERE "id" = ${params.id}
    `;

    return NextResponse.json({
      success: true,
      data: report,
    });
  } catch (error: unknown) {
    logServerError(
      `Error in POST /api/sndesk/pendencias/${params.id}/relatorio`,
      error
    );
    return jsonError("Internal Server Error", 500);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const unauthorized = await requireQaAdmin(request);
    if (unauthorized) return unauthorized;

    const ticket = await prisma.qaPendingTicket.findUnique({
      where: { id: params.id },
      select: { reportId: true },
    });

    if (!ticket) return jsonError("Pendencia nao encontrada.", 404);
    if (!ticket.reportId) return jsonError("Pendencia sem relatorio vinculado.", 400);

    const deleted = await softDeleteReport(ticket.reportId);
    if (!deleted) return jsonError("Relatorio nao encontrado.", 404);

    return NextResponse.json({
      success: true,
      data: deleted,
    });
  } catch (error: unknown) {
    logServerError(
      `Error in DELETE /api/sndesk/pendencias/${params.id}/relatorio`,
      error
    );
    return jsonError("Internal Server Error", 500);
  }
}
