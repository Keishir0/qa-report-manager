"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import Button from "@/components/ui/Button";
import DataTable from "@/components/ui/DataTable";
import EmptyState from "@/components/ui/EmptyState";
import MetricCard from "@/components/ui/MetricCard";
import StatusBadge from "@/components/ui/StatusBadge";

type DashboardFilter =
  | "total"
  | "passed"
  | "failed"
  | "blocked"
  | "approval"
  | "week";

interface DashboardReport {
  id?: string;
  code: string;
  testDate: Date | string;
  systemName: string;
  branch: string;
  functionality: string;
  generalStatus: string;
  steps?: unknown[];
}

interface DashboardOverviewProps {
  metrics: {
    total: number;
    passed: number;
    failed: number;
    blocked: number;
    weeklyTests: number;
    approvalRate: string;
    approvalTargetReached: boolean;
  };
  recentReports: DashboardReport[];
  weeklyDateFrom: string;
  canWrite: boolean;
}

const filterTitles: Record<DashboardFilter, string> = {
  total: "Todos os Testes",
  passed: "Testes que Passaram",
  failed: "Testes que Falharam",
  blocked: "Testes Bloqueados",
  approval: "Testes Aprovados",
  week: "Testes dos Últimos 7 Dias",
};

export default function DashboardOverview({
  metrics,
  recentReports,
  weeklyDateFrom,
  canWrite,
}: DashboardOverviewProps) {
  const [activeFilter, setActiveFilter] = useState<DashboardFilter | null>(null);
  const [reports, setReports] = useState(recentReports);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const requestId = useRef(0);

  const clearFilter = () => {
    requestId.current += 1;
    setActiveFilter(null);
    setReports(recentReports);
    setIsLoading(false);
    setError("");
  };

  const applyFilter = async (filter: DashboardFilter, query = "") => {
    if (activeFilter === filter) {
      clearFilter();
      return;
    }

    const currentRequest = requestId.current + 1;
    requestId.current = currentRequest;
    setActiveFilter(filter);
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/reports${query ? `?${query}` : ""}`);
      if (!response.ok) {
        throw new Error("Não foi possível filtrar os relatórios.");
      }

      const filteredReports = (await response.json()) as DashboardReport[];
      if (requestId.current === currentRequest) {
        setReports(filteredReports);
      }
    } catch (filterError) {
      if (requestId.current === currentRequest) {
        setActiveFilter(null);
        setReports(recentReports);
        setError(
          filterError instanceof Error
            ? filterError.message
            : "Não foi possível filtrar os relatórios."
        );
      }
    } finally {
      if (requestId.current === currentRequest) {
        setIsLoading(false);
      }
    }
  };

  const tableTitle = activeFilter
    ? filterTitles[activeFilter]
    : "Testes Recentes";

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 xl:grid-cols-6">
        <MetricCard
          title="Total de Testes"
          value={metrics.total}
          onClick={() => applyFilter("total")}
          isActive={activeFilter === "total"}
          statusColor="brand"
          icon={
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          }
        />

        <MetricCard
          title="Passaram"
          value={metrics.passed}
          onClick={() => applyFilter("passed", "status=Passou")}
          isActive={activeFilter === "passed"}
          statusColor="green"
          icon={
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />

        <MetricCard
          title="Falharam"
          value={metrics.failed}
          onClick={() => applyFilter("failed", "status=Falhou")}
          isActive={activeFilter === "failed"}
          statusColor="red"
          icon={
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />

        <MetricCard
          title="Bloqueados"
          value={metrics.blocked}
          onClick={() => applyFilter("blocked", "status=Bloqueado")}
          isActive={activeFilter === "blocked"}
          statusColor="amber"
          icon={
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
          }
        />

        <MetricCard
          title="Taxa de Aprovação"
          value={metrics.approvalRate}
          onClick={() => applyFilter("approval", "status=Passou")}
          isActive={activeFilter === "approval"}
          statusColor={metrics.approvalTargetReached ? "green" : "red"}
          trend={{
            value: metrics.approvalTargetReached
              ? "Meta atingida"
              : "Abaixo da meta",
            label: "(>= 80%)",
            isPositive: metrics.approvalTargetReached,
          }}
          icon={
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          }
        />

        <MetricCard
          title="Testes da Semana"
          value={metrics.weeklyTests}
          onClick={() => applyFilter("week", `dateFrom=${weeklyDateFrom}`)}
          isActive={activeFilter === "week"}
          statusColor="slate"
          trend={{
            value: "Últimos 7 dias",
            label: "",
          }}
          icon={
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          }
        />
      </div>

      <div className="space-y-4">
        <div className="flex flex-col gap-2 px-1 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-extrabold text-slate-800">{tableTitle}</h2>
            {!isLoading && (
              <span className="inline-flex items-center rounded-full border border-indigo-100 bg-indigo-50 px-2.5 py-1 text-xs font-bold tabular-nums text-indigo-700">
                {reports.length} {reports.length === 1}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            {activeFilter && (
              <button
                type="button"
                onClick={clearFilter}
                className="text-xs font-bold text-red-500 transition-colors hover:text-red-700"
              >
                Limpar filtro
              </button>
            )}
            <Link
              href="/reports"
              className="flex items-center gap-1 text-xs font-bold text-indigo-600 transition-colors hover:text-indigo-700"
            >
              Ver todos relatórios
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>

        {error && (
          <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        <DataTable
          headers={[
            "Código",
            "Data",
            "Branch",
            "Funcionalidade",
            "Passos",
            "Status Geral",
            "Ação",
          ]}
          isLoading={isLoading}
          isEmpty={reports.length === 0}
          emptyState={
            <EmptyState
              title={
                activeFilter
                  ? "Nenhum teste encontrado"
                  : "Nenhum relatório recente"
              }
              description={
                activeFilter
                  ? "Não existem relatórios que correspondam a este indicador."
                  : "Comece a documentar seus testes e acompanhe a qualidade do seu software."
              }
              action={
                activeFilter ? (
                  <Button variant="secondary" onClick={clearFilter}>
                    Limpar filtro
                  </Button>
                ) : canWrite ? (
                  <Link href="/reports/new" passHref legacyBehavior>
                    <Button variant="primary">Criar Primeiro Relatório</Button>
                  </Link>
                ) : undefined
              }
            />
          }
        >
          {reports.map((report, index) => {
            const isAlternateRow = index % 2 === 1;
            const rowHighlightClass = isAlternateRow
              ? "bg-slate-50/80 hover:bg-slate-100"
              : "bg-white hover:bg-slate-50";
            const stepsCount = report.steps?.length || 0;

            return (
              <tr
                key={report.id || report.code}
                className={`border-b border-slate-100 text-sm transition-colors ${rowHighlightClass}`}
              >
                <td className="p-4 font-mono font-bold text-slate-900">{report.code}</td>
                <td className="whitespace-nowrap p-4 text-slate-500">
                  {format(new Date(report.testDate), "dd/MM/yyyy")}
                </td>
                <td className="p-4 text-slate-600">{report.branch}</td>
                <td className="max-w-[240px] truncate p-4 text-slate-600" title={report.functionality}>
                  {report.functionality}
                </td>
                <td className="p-4 font-medium text-slate-500">
                  {stepsCount} {stepsCount === 1 ? "passo" : "passos"}
                </td>
                <td className="p-4">
                  <StatusBadge status={report.generalStatus} />
                </td>
                <td className="p-4">
                  <Link
                    href={`/reports/${report.id}`}
                    className="flex items-center gap-1 text-xs font-bold text-indigo-600 transition-colors hover:text-indigo-850"
                    title="Visualizar Detalhes"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    Ver
                  </Link>
                </td>
              </tr>
            );
          })}
        </DataTable>
      </div>
    </>
  );
}
