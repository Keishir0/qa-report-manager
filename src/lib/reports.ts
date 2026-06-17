import prisma from "@/lib/prisma";

type NextReportCodeRow = {
  nextNumber: number | bigint;
};

export async function generateNextReportCode() {
  const [row] = await prisma.$queryRaw<NextReportCodeRow[]>`
    SELECT COALESCE(MAX(CAST(SUBSTRING("code" FROM 4) AS INTEGER)), 0) + 1 AS "nextNumber"
    FROM "test_reports"
    WHERE "code" ~ '^QA-[0-9]+$'
  `;

  const nextNumber = Number(row?.nextNumber || 1);
  return `QA-${String(nextNumber).padStart(3, "0")}`;
}

export async function softDeleteReport(reportId: string) {
  const report = await prisma.testReport.findFirst({
    where: {
      id: reportId,
      deletedAt: null,
    },
    select: {
      id: true,
    },
  });

  if (!report) return null;

  const deletedAt = new Date();

  await prisma.$transaction([
    prisma.qaPendingTicket.updateMany({
      where: { reportId },
      data: {
        reportId: null,
        state: "pendente",
        lastError: null,
      },
    }),
    prisma.testReport.update({
      where: { id: reportId },
      data: {
        deletedAt,
        sndeskChamadoId: null,
      },
    }),
  ]);

  return { id: reportId, deletedAt };
}

export async function recalculateReportGeneralStatus(reportId: string, tx?: any) {
  const db = tx || prisma;

  const steps = await db.testStep.findMany({
    where: { reportId },
    select: { status: true },
  });

  if (steps.length === 0) {
    await db.testReport.update({
      where: { id: reportId },
      data: { generalStatus: "Não executado" },
    });
    return;
  }

  const statuses = steps.map((s: any) => s.status);

  let nextStatus = "Passou";
  if (statuses.includes("Falhou")) {
    nextStatus = "Falhou";
  } else if (statuses.includes("Bloqueado")) {
    nextStatus = "Bloqueado";
  } else if (statuses.includes("Não executado")) {
    nextStatus = "Não executado";
  }

  await db.testReport.update({
    where: { id: reportId },
    data: { generalStatus: nextStatus },
  });
}
