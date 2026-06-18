import Link from "next/link";
import { format } from "date-fns";
import prisma from "@/lib/prisma";
import Button from "@/components/ui/Button";
import PageHeader from "@/components/ui/PageHeader";
import DashboardOverview from "@/components/dashboard/DashboardOverview";
import { requirePageUser, WRITE_ROLES } from "@/lib/auth";
import { reportAccessWhere } from "@/lib/reports";

export const revalidate = 0;

export default async function DashboardPage() {
  const user = await requirePageUser();
  const canWrite = WRITE_ROLES.includes(user.role);
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  sevenDaysAgo.setHours(0, 0, 0, 0);
  const activeReportWhere = { deletedAt: null, ...reportAccessWhere(user) };

  const [total, passed, failed, blocked, weeklyTests, recentReports] =
    await Promise.all([
      prisma.testReport.count({ where: activeReportWhere }),
      prisma.testReport.count({ where: { ...activeReportWhere, generalStatus: "Aprovado QA" } }),
      prisma.testReport.count({ where: { ...activeReportWhere, generalStatus: "Reprovado QA" } }),
      prisma.testReport.count({ where: { ...activeReportWhere, generalStatus: "Bloqueado" } }),
      prisma.testReport.count({
        where: {
          ...activeReportWhere,
          testDate: {
            gte: sevenDaysAgo,
          },
        },
      }),
      prisma.testReport.findMany({
        where: activeReportWhere,
        take: 5,
        orderBy: {
          createdAt: "desc",
        },
        include: {
          steps: true,
        },
      }),
    ]);

  const approvalRate = total > 0 ? (passed / total) * 100 : 0;
  const approvalTargetReached = approvalRate >= 80;

  return (
    <div className="mx-auto max-w-7xl space-y-6 animate-fade-in sm:space-y-8">
      <PageHeader
        title="Dashboard"
        description="Visão geral da qualidade, cobertura de testes e relatórios recentes."
      >
        {canWrite && (
          <Link href="/reports/new" passHref legacyBehavior>
            <Button
              variant="primary"
              icon={
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
              }
            >
              Novo Teste
            </Button>
          </Link>
        )}
      </PageHeader>

      <DashboardOverview
        metrics={{
          total,
          passed,
          failed,
          blocked,
          weeklyTests,
          approvalRate: `${approvalRate.toFixed(1)}%`,
          approvalTargetReached,
        }}
        recentReports={recentReports}
        weeklyDateFrom={format(sevenDaysAgo, "yyyy-MM-dd")}
        canWrite={canWrite}
      />
    </div>
  );
}
