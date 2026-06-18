"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { format } from "date-fns";
import {
  BRANCH_OPTIONS,
  GENERAL_STATUS_OPTIONS,
  TEST_TYPE_OPTIONS,
  TestReportData,
} from "@/types";
import StatusBadge from "@/components/ui/StatusBadge";
import { exportToExcel, exportToPDF } from "@/lib/export";
import Toast from "@/components/ui/Toast";
import PageHeader from "@/components/ui/PageHeader";
import DataTable from "@/components/ui/DataTable";
import EmptyState from "@/components/ui/EmptyState";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import { useAuthUser } from "@/components/auth/AuthProvider";
import ReportActionsMenu from "@/components/reports/ReportActionsMenu";

interface UserOption {
  id: string;
  name: string;
  email: string;
  role: string;
}

export default function ReportsListPage() {
  const user = useAuthUser();
  const canWrite = user?.role === "ADMIN" || user?.role === "QA";
  const [reports, setReports] = useState<TestReportData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [userOptions, setUserOptions] = useState<UserOption[]>([]);

  // Estados dos filtros
  const [createdFrom, setCreatedFrom] = useState("");
  const [createdTo, setCreatedTo] = useState("");
  const [testedFrom, setTestedFrom] = useState("");
  const [testedTo, setTestedTo] = useState("");
  const [branch, setBranch] = useState("");
  const [status, setStatus] = useState("");
  const [testType, setTestType] = useState("");
  const [system, setSystem] = useState("");
  const [tester, setTester] = useState("");
  const [dev, setDev] = useState("");
  const [search, setSearch] = useState("");

  // Debounces locais
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [debouncedSystem, setDebouncedSystem] = useState("");
  const [debouncedTester, setDebouncedTester] = useState("");
  const [debouncedDev, setDebouncedDev] = useState("");

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 350);
    return () => clearTimeout(handler);
  }, [search]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSystem(system);
    }, 350);
    return () => clearTimeout(handler);
  }, [system]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedTester(tester);
    }, 350);
    return () => clearTimeout(handler);
  }, [tester]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedDev(dev);
    }, 350);
    return () => clearTimeout(handler);
  }, [dev]);

  useEffect(() => {
    let isMounted = true;

    async function loadUserOptions() {
      try {
        const response = await fetch("/api/users/options", { cache: "no-store" });
        if (!response.ok) return;

        const result = await response.json();
        if (isMounted && Array.isArray(result.data)) {
          setUserOptions(result.data);
        }
      } catch {
        if (isMounted) setUserOptions([]);
      }
    }

    loadUserOptions();

    return () => {
      isMounted = false;
    };
  }, []);

  // Capturar erro vindo do redirecionamento de 404 da página [id] de forma segura no browser
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const errorParam = params.get("error");
      if (errorParam) {
        setToast({ message: errorParam, type: "error" });
        const newUrl = window.location.pathname;
        window.history.replaceState({}, "", newUrl);
      }
    }
  }, []);

  // Função para buscar relatórios
  const fetchReports = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (createdFrom) params.append("createdFrom", createdFrom);
      if (createdTo) params.append("createdTo", createdTo);
      if (testedFrom) params.append("testedFrom", testedFrom);
      if (testedTo) params.append("testedTo", testedTo);
      if (branch) params.append("branch", branch);
      if (status) params.append("status", status);
      if (testType) params.append("testType", testType);
      if (debouncedSystem) params.append("system", debouncedSystem);
      if (debouncedTester) params.append("tester", debouncedTester);
      if (debouncedDev) params.append("dev", debouncedDev);
      if (debouncedSearch) params.append("search", debouncedSearch);

      const response = await fetch(`/api/reports?${params.toString()}`);
      if (!response.ok) {
        throw new Error("Erro ao buscar relatórios.");
      }
      const data = await response.json();
      setReports(data);
    } catch (err: any) {
      setError(err.message || "Erro ao carregar dados.");
    } finally {
      setIsLoading(false);
    }
  }, [createdFrom, createdTo, testedFrom, testedTo, branch, status, testType, debouncedSystem, debouncedTester, debouncedDev, debouncedSearch]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  // Função para limpar os filtros
  const handleClearFilters = () => {
    setCreatedFrom("");
    setCreatedTo("");
    setTestedFrom("");
    setTestedTo("");
    setBranch("");
    setStatus("");
    setTestType("");
    setSystem("");
    setTester("");
    setDev("");
    setSearch("");
  };

  // Handler para exportar Excel
  const handleExportExcel = () => {
    if (reports.length === 0) {
      setToast({ message: "Não há relatórios para exportar.", type: "error" });
      return;
    }
    setIsExportingExcel(true);
    try {
      const filename = `qa-report-${format(new Date(), "yyyy-MM-dd")}`;
      exportToExcel(reports, filename);
      setToast({ message: "Excel gerado com sucesso!", type: "success" });
    } catch (err) {
      console.error("Erro ao exportar para Excel:", err);
      setToast({ message: "Falha ao exportar para Excel.", type: "error" });
    } finally {
      setIsExportingExcel(false);
    }
  };

  // Handler para exportar PDF
  const handleExportPDF = () => {
    if (reports.length === 0) {
      setToast({ message: "Não há relatórios para exportar.", type: "error" });
      return;
    }
    setIsExportingPDF(true);
    try {
      const filename = `qa-report-${format(new Date(), "yyyy-MM-dd")}`;
      exportToPDF(reports, filename);
      setToast({ message: "PDF gerado com sucesso!", type: "success" });
    } catch (err) {
      console.error("Erro ao exportar para PDF:", err);
      setToast({ message: "Falha ao exportar para PDF.", type: "error" });
    } finally {
      setIsExportingPDF(false);
    }
  };

  // Função para deletar relatório
  const handleDeleteReport = async (id: string, code: string) => {
    if (
      !window.confirm(
        `Deseja excluir o relatório de testes ${code}? Ele será ocultado das listas, mas continuará salvo no banco.`
      )
    ) {
      return;
    }

    try {
      const response = await fetch(`/api/reports/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Erro ao excluir o relatório.");
      }

      // Atualizar lista local
      setReports((prev) => prev.filter((r) => r.id !== id));
      setToast({
        message: `Relatório ${code} excluído da lista com sucesso!`,
        type: "success",
      });
    } catch (err: any) {
      setToast({
        message: err.message || "Não foi possível excluir o relatório.",
        type: "error",
      });
    }
  };

  // Função de duplicação
  const handleDuplicateReport = async (id: string, code: string) => {
    setIsLoading(true);
    try {
      const getResponse = await fetch(`/api/reports/${id}`);
      if (!getResponse.ok) {
        throw new Error("Erro ao buscar detalhes do relatório original.");
      }
      const original = await getResponse.json();

      const {
        id: _id,
        code: _code,
        createdAt: _createdAt,
        updatedAt: _updatedAt,
        steps,
        ...duplicateData
      } = original;

      const cleanedSteps = steps?.map((step: any) => ({
        stepNumber: step.stepNumber,
        action: step.action,
        expectedResult: step.expectedResult,
        actualResult: step.actualResult,
        status: step.status,
      })) || [];

      const postResponse = await fetch("/api/reports", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...duplicateData,
          steps: cleanedSteps,
        }),
      });

      if (!postResponse.ok) {
        const errData = await postResponse.json();
        throw new Error(errData.error || "Erro ao criar relatório duplicado.");
      }

      const created = await postResponse.json();
      setToast({
        message: `Relatório ${code} duplicado com sucesso como ${created.code}!`,
        type: "success",
      });
      fetchReports();
    } catch (err: any) {
      setToast({
        message: err.message || "Erro ao duplicar relatório.",
        type: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Header */}
      <PageHeader
        title="Relatórios de Testes"
        description="Gerencie, filtre, duplique e exporte os testes realizados no sistema."
      >
        <Button
          variant="secondary"
          onClick={handleExportExcel}
          disabled={isExportingExcel || isLoading}
          icon={
            <svg
              className="w-4 h-4 text-emerald-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          }
        >
          {isExportingExcel ? "Exportando..." : "Exportar Excel"}
        </Button>
        <Button
          variant="secondary"
          onClick={handleExportPDF}
          disabled={isExportingPDF || isLoading}
          icon={
            <svg
              className="w-4 h-4 text-rose-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
              />
            </svg>
          }
        >
          {isExportingPDF ? "Exportando..." : "Exportar PDF"}
        </Button>
        {canWrite && <Link href="/reports/new" passHref legacyBehavior>
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
        </Link>}
      </PageHeader>

      {/* Painel de Filtros e Busca */}
      <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-3 shadow-xs sm:space-y-4 sm:p-4 lg:p-5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div>
            <Input
              label="Busca Rápida"
              id="searchQuick"
              placeholder="Buscar por código, tela, funcionalidade ou descrição..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full"
            />
          </div>
          <div>
            <Input
              label="Filtrar por Sistema"
              id="filterSystem"
              placeholder="Nome do sistema..."
              value={system}
              onChange={(e) => setSystem(e.target.value)}
              className="w-full"
            />
          </div>
          <div>
            <Select
              label="Filtrar por QA"
              id="filterTester"
              value={tester}
              onChange={(e) => setTester(e.target.value)}
            >
              <option value="">Todos os QAs</option>
              {userOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Input
              label="Filtrar por Dev"
              id="filterDev"
              placeholder="Dev ou técnico SNDesk..."
              value={dev}
              onChange={(e) => setDev(e.target.value)}
              className="w-full"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 border-t border-slate-100 pt-3 lg:grid-cols-3 xl:grid-cols-7">
          {/* Data De */}
          <div>
            <Input
              label="Criado de"
              id="filterCreatedFrom"
              type="date"
              value={createdFrom}
              onChange={(e) => setCreatedFrom(e.target.value)}
            />
          </div>

          {/* Data Até */}
          <div>
            <Input
              label="Criado ate"
              id="filterCreatedTo"
              type="date"
              value={createdTo}
              onChange={(e) => setCreatedTo(e.target.value)}
            />
          </div>

          <div>
            <Input
              label="Testado de"
              id="filterTestedFrom"
              type="date"
              value={testedFrom}
              onChange={(e) => setTestedFrom(e.target.value)}
            />
          </div>

          <div>
            <Input
              label="Testado ate"
              id="filterTestedTo"
              type="date"
              value={testedTo}
              onChange={(e) => setTestedTo(e.target.value)}
            />
          </div>

          {/* Branch */}
          <div>
            <Select
              label="Branch / Ambiente"
              id="filterBranch"
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              options={BRANCH_OPTIONS}
            />
          </div>

          {/* Status Geral */}
          <div>
            <Select
              label="Status Geral"
              id="filterStatus"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              options={GENERAL_STATUS_OPTIONS}
            />
          </div>

          {/* Tipo do Teste */}
          <div className="col-span-2 sm:col-span-1">
            <Select
              label="Tipo do Teste"
              id="filterType"
              value={testType}
              onChange={(e) => setTestType(e.target.value)}
              options={TEST_TYPE_OPTIONS}
            />
          </div>
        </div>

        {(createdFrom || createdTo || testedFrom || testedTo || branch || status || testType || system || tester || dev || search) && (
          <div className="flex justify-end">
            <button
              onClick={handleClearFilters}
              className="text-xs text-red-500 hover:text-red-700 font-bold transition-colors flex items-center gap-1"
            >
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
              Limpar Filtros
            </button>
          </div>
        )}
      </div>

      {/* Tabela de Relatórios */}
      <DataTable
        tableClassName="w-full min-w-0 table-fixed text-left border-collapse"
        headerCellClassName="px-3 py-3"
        headerClassNames={[
          "w-[7%]",
          "w-[9%]",
          "w-[9%]",
          "w-[12%]",
          "w-[15%]",
          "w-[8%]",
          "w-[11%]",
          "w-[11%]",
          "w-[7%]",
          "w-[9%]",
          "w-[8%] text-right",
        ]}
        headers={[
          "Código",
          "Data",
          "Branch",
          "Tela / Menu",
          "Funcionalidade",
          "Tipo",
          "Testado por",
          "Dev",
          "Passos",
          "Status",
          "Ações",
        ]}
        isLoading={isLoading}
        isEmpty={reports.length === 0}
        emptyState={
          <EmptyState
            title="Nenhum teste encontrado"
            description="Nenhum relatório corresponde aos critérios selecionados. Redefina seus filtros ou registre um novo relatório."
            action={canWrite ? (
              <Link href="/reports/new" passHref legacyBehavior>
                <Button variant="primary">Novo Teste</Button>
              </Link>
            ) : undefined}
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
              key={report.id}
              className={`transition-colors text-sm border-b border-slate-100 ${rowHighlightClass}`}
            >
              <td className="px-3 py-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                {report.code}
              </td>
              <td className="px-3 py-4 text-slate-500 whitespace-nowrap">
                {format(new Date(report.testDate), "dd/MM/yyyy")}
              </td>
              <td className="px-3 py-4 text-slate-600 truncate" title={report.branch}>
                {report.branch}
              </td>
              <td className="px-3 py-4 text-slate-600 truncate" title={report.screenPath}>
                {report.screenPath}
              </td>
              <td className="px-3 py-4 text-slate-600 truncate" title={report.functionality}>
                {report.functionality}
              </td>
              <td className="px-3 py-4 text-slate-600 truncate" title={report.testType}>
                {report.testType}
              </td>
              <td className="px-3 py-4 font-semibold text-slate-800 truncate" title={report.testerName || "Nao informado"}>
                {report.testerName || "Nao informado"}
              </td>
              <td className="px-3 py-4 text-slate-600 truncate" title={report.sndeskTechnicianName || "Nao informado"}>
                {report.sndeskTechnicianName || "Nao informado"}
              </td>
              <td className="px-3 py-4 text-center font-medium text-slate-500 whitespace-nowrap">
                {stepsCount} {stepsCount === 1 ? "passo" : "passos"}
              </td>
              <td className="px-3 py-4 whitespace-nowrap">
                <StatusBadge status={report.generalStatus} />
              </td>
              <td className="px-3 py-4 whitespace-nowrap text-right">
                <ReportActionsMenu
                  reportId={report.id!}
                  reportCode={report.code}
                  canWrite={canWrite}
                  onDuplicate={handleDuplicateReport}
                  onDelete={handleDeleteReport}
                />
              </td>
            </tr>
          );
        })}
      </DataTable>

      {/* Renderização do Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
