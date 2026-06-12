import Link from "next/link";
import prisma from "@/lib/prisma";
import { format } from "date-fns";
import StatusBadge from "@/components/ui/StatusBadge";
import MetricCard from "@/components/ui/MetricCard";
import PageHeader from "@/components/ui/PageHeader";
import DataTable from "@/components/ui/DataTable";
import EmptyState from "@/components/ui/EmptyState";
import Button from "@/components/ui/Button";

// Garantir que a página seja renderizada dinamicamente para sempre buscar os dados mais atualizados do banco
export const revalidate = 0;

export default async function DashboardPage() {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  // Buscar métricas e relatórios recentes diretamente do banco (Server Component)
  const [total, passed, failed, blocked, weeklyTests, recentReports] = await Promise.all([
    prisma.testReport.count(),
    prisma.testReport.count({ where: { generalStatus: "Passou" } }),
    prisma.testReport.count({ where: { generalStatus: "Falhou" } }),
    prisma.testReport.count({ where: { generalStatus: "Bloqueado" } }),
    prisma.testReport.count({
      where: {
        testDate: {
          gte: sevenDaysAgo,
        },
      },
    }),
    prisma.testReport.findMany({
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
  const approvalRateStr = `${approvalRate.toFixed(1)}%`;
  const isPositiveTrend = approvalRate >= 80;

  return (
    <div className="mx-auto max-w-7xl space-y-6 animate-fade-in sm:space-y-8">
      {/* Header */}
      <PageHeader
        title="Dashboard"
        description="Visão geral da qualidade, cobertura de testes e relatórios recentes."
      >
        <Link href="/reports/new" passHref legacyBehavior>
          <Button
            variant="primary"
            icon={
              <svg
                className="w-4 h-4"
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
      </PageHeader>

      {/* Cards de Métricas */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 xl:grid-cols-6">
        {/* Total */}
        <MetricCard
          title="Total de Testes"
          value={total}
          statusColor="brand"
          icon={
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          }
        />

        {/* Passou */}
        <MetricCard
          title="Passaram"
          value={passed}
          statusColor="green"
          icon={
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          }
        />

        {/* Falharam */}
        <MetricCard
          title="Falharam"
          value={failed}
          statusColor="red"
          icon={
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          }
        />

        {/* Bloqueados */}
        <MetricCard
          title="Bloqueados"
          value={blocked}
          statusColor="amber"
          icon={
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.2}
                d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
              />
            </svg>
          }
        />

        {/* Taxa de Aprovação */}
        <MetricCard
          title="Taxa de Aprovação"
          value={approvalRateStr}
          statusColor={isPositiveTrend ? "green" : "red"}
          trend={{
            value: isPositiveTrend ? "Meta atingida" : "Abaixo da meta",
            label: "(>= 80%)",
            isPositive: isPositiveTrend,
          }}
          icon={
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.2}
                d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
              />
            </svg>
          }
        />

        {/* Testes da Semana */}
        <MetricCard
          title="Testes da Semana"
          value={weeklyTests}
          statusColor="slate"
          trend={{
            value: `Últimos 7 dias`,
            label: "",
          }}
          icon={
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          }
        />
      </div>

      {/* Recentes */}
      <div className="space-y-4">
        <div className="flex flex-col gap-2 px-1 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-extrabold text-slate-800">Testes Recentes</h2>
          {recentReports.length > 0 && (
            <Link
              href="/reports"
              className="text-xs font-bold text-indigo-600 hover:text-indigo-700 transition-colors flex items-center gap-1"
            >
              Ver todos relatórios
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          )}
        </div>

        <DataTable
          headers={[
            "Código",
            "Data",
            "Sistema",
            "Branch",
            "Funcionalidade",
            "Passos",
            "Status Geral",
            "Ação",
          ]}
          isEmpty={recentReports.length === 0}
          emptyState={
            <EmptyState
              title="Nenhum relatório recente"
              description="Comece a documentar seus testes e acompanhe a qualidade do seu software."
              action={
                <Link href="/reports/new" passHref legacyBehavior>
                  <Button variant="primary">Criar Primeiro Relatório</Button>
                </Link>
              }
            />
          }
        >
          {recentReports.map((report) => {
            const isFailed = report.generalStatus === "Falhou";
            const isBlocked = report.generalStatus === "Bloqueado";
            const rowHighlightClass = isFailed
              ? "bg-rose-50/20 hover:bg-rose-50/40 border-l-4 border-l-red-500"
              : isBlocked
              ? "bg-amber-50/20 hover:bg-amber-50/40 border-l-4 border-l-amber-500"
              : "hover:bg-slate-50/50 border-l-4 border-l-transparent";

            return (
              <tr
                key={report.id}
                className={`transition-colors text-sm border-b border-slate-100 ${rowHighlightClass}`}
              >
                <td className="p-4 font-mono font-bold text-slate-900">{report.code}</td>
                <td className="p-4 text-slate-500 whitespace-nowrap">
                  {format(new Date(report.testDate), "dd/MM/yyyy")}
                </td>
                <td className="p-4 font-semibold text-slate-800">{report.systemName}</td>
                <td className="p-4 text-slate-600">{report.branch}</td>
                <td className="p-4 text-slate-600 truncate max-w-[240px]" title={report.functionality}>
                  {report.functionality}
                </td>
                <td className="p-4 text-slate-500 font-medium">
                  {report.steps.length} {report.steps.length === 1 ? "passo" : "passos"}
                </td>
                <td className="p-4">
                  <StatusBadge status={report.generalStatus} />
                </td>
                <td className="p-4">
                  <Link
                    href={`/reports/${report.id}`}
                    className="text-indigo-600 hover:text-indigo-700 font-bold text-xs transition-colors"
                  >
                    Visualizar &rarr;
                  </Link>
                </td>
              </tr>
            );
          })}
        </DataTable>
      </div>
    </div>
  );
}
