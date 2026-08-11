"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import Button from "@/components/ui/Button";
import DataTable from "@/components/ui/DataTable";
import EmptyState from "@/components/ui/EmptyState";
import MetricCard from "@/components/ui/MetricCard";
import StatusBadge, { getStatusColorVar } from "@/components/ui/StatusBadge";
import Pagination from "@/components/ui/Pagination";

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

interface PaginatedReportsResponse {
  data: DashboardReport[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface ActivityItem {
  id: string;
  label: string;
  status: string;
  timestamp: string;
}

const PAGE_SIZE = 10;

const filterTitles: Record<DashboardFilter, string> = {
  total: "Todos os Testes",
  passed: "Testes Aprovados",
  failed: "Testes Reprovados",
  blocked: "Testes Não Executados",
  approval: "Testes Aprovados",
  week: "Testes dos Últimos 7 Dias",
};

export function DashboardSearch() {
  const router = useRouter();
  const [value, setValue] = useState("");

  return (
    <form
      className="relative w-full sm:w-64"
      onSubmit={(event) => {
        event.preventDefault();
        const params = value.trim() ? `?search=${encodeURIComponent(value.trim())}` : "";
        router.push(`/reports${params}`);
      }}
    >
      <svg
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z"
        />
      </svg>
      <input
        type="search"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Buscar relatórios..."
        className="input w-full pl-9 pr-12"
      />
      <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 rounded-[5px] border border-line px-1.5 py-0.5 font-mono text-[10px] text-faint">
        ⌘K
      </span>
    </form>
  );
}

function DistributionPanel({
  metrics,
}: {
  metrics: DashboardOverviewProps["metrics"];
}) {
  const total = metrics.total || 0;
  const passedPct = total > 0 ? (metrics.passed / total) * 100 : 0;
  const failedPct = total > 0 ? (metrics.failed / total) * 100 : 0;
  const blockedPct = total > 0 ? (metrics.blocked / total) * 100 : 0;

  return (
    <div className="flex min-h-[125px] flex-col justify-between rounded-[14px] border border-line bg-panel p-[18px]">
      <span className="font-mono text-[10px] tracking-[0.14em] uppercase text-faint">
        Distribuição por status
      </span>

      <div className="mt-2">
        <span className="block text-[40px] font-extrabold leading-none tracking-[-0.03em] text-fg">
          {metrics.approvalRate}
        </span>
        <span className="mt-1 block text-[11.5px] text-faint">taxa de aprovação</span>
      </div>

      <div className="mt-4">
        <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-panel2">
          {total > 0 ? (
            <>
              <div className="bg-ok" style={{ width: `${passedPct}%` }} />
              <div className="bg-bad" style={{ width: `${failedPct}%` }} />
              <div className="bg-neutral" style={{ width: `${blockedPct}%` }} />
            </>
          ) : (
            <div className="w-full bg-panel2" />
          )}
        </div>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
          <span className="flex items-center gap-1.5 text-[11px] text-fg2">
            <span className="h-1.5 w-1.5 rounded-full bg-ok" />
            Aprovado <span className="font-mono text-faint">{metrics.passed}</span>
          </span>
          <span className="flex items-center gap-1.5 text-[11px] text-fg2">
            <span className="h-1.5 w-1.5 rounded-full bg-bad" />
            Reprovado <span className="font-mono text-faint">{metrics.failed}</span>
          </span>
          <span className="flex items-center gap-1.5 text-[11px] text-fg2">
            <span className="h-1.5 w-1.5 rounded-full bg-neutral" />
            Não executado <span className="font-mono text-faint">{metrics.blocked}</span>
          </span>
        </div>
      </div>
    </div>
  );
}

function ActivityPanel() {
  const [items, setItems] = useState<ActivityItem[] | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/activity")
      .then((response) => (response.ok ? response.json() : { items: [] }))
      .then((result: { items: ActivityItem[] }) => {
        if (!cancelled) setItems(result.items || []);
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="rounded-[14px] border border-line bg-panel p-[18px]">
      <span className="font-mono text-[10px] tracking-[0.14em] uppercase text-faint">
        Atividade
      </span>

      {items === null ? (
        <p className="mt-4 text-[12.5px] text-muted">Carregando...</p>
      ) : items.length === 0 ? (
        <p className="mt-4 text-[12.5px] text-muted">Nenhuma atividade recente.</p>
      ) : (
        <ul className="mt-4 space-y-4">
          {items.map((item) => (
            <li key={item.id} className="flex items-start gap-2.5">
              <span
                className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
                style={{ backgroundColor: getStatusColorVar(item.status) }}
              />
              <div className="min-w-0">
                <p className="text-[12.5px] leading-snug text-fg2">{item.label}</p>
                <p className="mt-0.5 font-mono text-[10.5px] text-faint">
                  {format(new Date(item.timestamp), "dd/MM HH:mm")}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function DashboardOverview({
  metrics,
  recentReports,
  weeklyDateFrom,
  canWrite,
}: DashboardOverviewProps) {
  const [activeFilter, setActiveFilter] = useState<DashboardFilter | null>(null);
  const [reports, setReports] = useState(recentReports);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalReports, setTotalReports] = useState(metrics.total);
  const [activeQuery, setActiveQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const requestId = useRef(0);

  const fetchReportsPage = async (
    page: number,
    query: string,
    currentRequest: number
  ) => {
    const params = new URLSearchParams(query);
    params.set("page", String(page));
    params.set("limit", String(PAGE_SIZE));

    const response = await fetch(`/api/reports?${params.toString()}`);
    if (!response.ok) {
      throw new Error("Não foi possível carregar os relatórios.");
    }

    const result = (await response.json()) as PaginatedReportsResponse;
    if (requestId.current === currentRequest) {
      setReports(result.data);
      setCurrentPage(result.pagination.page);
      setTotalReports(result.pagination.total);
    }
  };

  const clearFilter = () => {
    requestId.current += 1;
    setActiveFilter(null);
    setActiveQuery("");
    setCurrentPage(1);
    setTotalReports(metrics.total);
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
    setActiveQuery(query);
    setCurrentPage(1);
    setIsLoading(true);
    setError("");

    try {
      await fetchReportsPage(1, query, currentRequest);
    } catch (filterError) {
      if (requestId.current === currentRequest) {
        setActiveFilter(null);
        setActiveQuery("");
        setCurrentPage(1);
        setTotalReports(metrics.total);
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

  const goToPage = async (page: number) => {
    const totalPages = Math.max(Math.ceil(totalReports / PAGE_SIZE), 1);
    const nextPage = Math.min(Math.max(page, 1), totalPages);
    if (nextPage === currentPage || isLoading) return;

    const currentRequest = requestId.current + 1;
    requestId.current = currentRequest;
    setIsLoading(true);
    setError("");

    try {
      await fetchReportsPage(nextPage, activeQuery, currentRequest);
    } catch (pageError) {
      if (requestId.current === currentRequest) {
        setError(
          pageError instanceof Error
            ? pageError.message
            : "Não foi possível carregar os relatórios."
        );
      }
    } finally {
      if (requestId.current === currentRequest) {
        setIsLoading(false);
      }
    }
  };

  const tableTitle = activeFilter ? filterTitles[activeFilter] : "Testes Recentes";
  const totalPages = Math.max(Math.ceil(totalReports / PAGE_SIZE), 1);

  return (
    <>
      <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-[1.35fr_1fr_1fr_1fr]">
        <DistributionPanel metrics={metrics} />

        <MetricCard
          title="Total de Testes"
          value={metrics.total}
          onClick={() => applyFilter("total")}
          isActive={activeFilter === "total"}
          statusColor="brand"
        />

        <MetricCard
          title="Taxa de Aprovação"
          value={metrics.approvalRate}
          onClick={() => applyFilter("approval", "status=Aprovado QA")}
          isActive={activeFilter === "approval"}
          statusColor={metrics.approvalTargetReached ? "green" : "red"}
          trend={{
            value: metrics.approvalTargetReached ? "Meta atingida" : "Abaixo da meta",
            label: "(>= 80%)",
          }}
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
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-[1fr_316px]">
        <div className="space-y-4">
          <div className="flex flex-col gap-2 px-1 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-[15px] font-bold text-fg">{tableTitle}</h2>
              {!isLoading && (
                <span className="rounded-full border border-line bg-panel2 px-2 py-0.5 font-mono text-[11px] font-bold text-fg2">
                  {totalReports}
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              {activeFilter && (
                <button
                  type="button"
                  onClick={clearFilter}
                  className="text-[12px] font-bold text-bad transition-colors hover:opacity-80"
                >
                  Limpar filtro
                </button>
              )}
              <Link
                href="/reports"
                className="flex items-center gap-1 text-[12px] font-bold text-accent transition-colors hover:opacity-80"
              >
                Ver todos relatórios
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>

          {error && (
            <div
              role="alert"
              className="rounded-[9px] border border-bad/30 bg-bad/8 px-4 py-3 text-[13px] font-semibold text-bad"
            >
              {error}
            </div>
          )}

          <DataTable
            headers={["Código", "Data", "Branch", "Funcionalidade", "Passos", "Status Geral", "Ação"]}
            isLoading={isLoading}
            isEmpty={reports.length === 0}
            footer={
              totalPages > 1 ? (
                <Pagination
                  page={currentPage}
                  totalPages={totalPages}
                  totalItems={totalReports}
                  itemLabel="relatórios"
                  onPageChange={goToPage}
                  isLoading={isLoading}
                />
              ) : undefined
            }
            emptyState={
              <EmptyState
                title={activeFilter ? "Nenhum teste encontrado" : "Nenhum relatório recente"}
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
            {reports.map((report) => {
              const stepsCount = report.steps?.length || 0;

              return (
                <tr
                  key={report.id || report.code}
                  data-row-accent={getStatusColorVar(report.generalStatus)}
                  className="text-[13px] transition-colors hover:bg-panel2"
                >
                  <td className="px-2 py-3.5 font-mono font-bold text-fg">{report.code}</td>
                  <td className="whitespace-nowrap px-2 py-3.5 font-mono text-faint">
                    {format(new Date(report.testDate), "dd/MM/yyyy")}
                  </td>
                  <td className="px-2 py-3.5 font-mono text-fg2">{report.branch}</td>
                  <td className="max-w-[240px] truncate px-2 py-3.5 text-fg2" title={report.functionality}>
                    {report.functionality}
                  </td>
                  <td className="px-2 py-3.5 font-mono text-faint">
                    {stepsCount} {stepsCount === 1 ? "passo" : "passos"}
                  </td>
                  <td className="px-2 py-3.5">
                    <StatusBadge status={report.generalStatus} size="sm" />
                  </td>
                  <td className="px-2 py-3.5">
                    <Link
                      href={`/reports/${report.id}`}
                      className="flex items-center gap-1 text-[12px] font-bold text-accent transition-colors hover:opacity-80"
                      title="Visualizar Detalhes"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2.2}
                          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                        />
                      </svg>
                      Ver
                    </Link>
                  </td>
                </tr>
              );
            })}
          </DataTable>
        </div>

        <ActivityPanel />
      </div>
    </>
  );
}
