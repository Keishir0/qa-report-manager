import prisma from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import type { AuthUser } from "@/lib/auth";

type NextReportCodeRow = {
  nextNumber: number | bigint;
};

export function reportAccessWhere(
  user: AuthUser | null | undefined
): Prisma.TestReportWhereInput {
  if (user?.role === "QA") {
    return { testerId: user.id };
  }

  return {};
}

export function canUserAccessReport(
  user: AuthUser | null | undefined,
  report: { testerId: string | null }
) {
  if (!user) return false;
  if (user.role === "ADMIN" || user.role === "VIEWER") return true;
  if (user.role === "QA") return report.testerId === user.id;
  return false;
}

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
      data: { generalStatus: "Não Executado" },
    });
    return;
  }

  const statuses = steps.map((s: any) => s.status);

  let nextStatus = "Aprovado QA";
  if (
    statuses.includes("Reprovado QA") ||
    statuses.includes("Falhou") ||
    statuses.includes("Bloqueado")
  ) {
    nextStatus = "Reprovado QA";
  } else if (
    statuses.includes("Não Executado") ||
    statuses.includes("Não executado")
  ) {
    nextStatus = "Não Executado";
  }

  await db.testReport.update({
    where: { id: reportId },
    data: { generalStatus: nextStatus },
  });
}
