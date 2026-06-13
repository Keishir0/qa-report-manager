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

export default function ReportsListPage() {
  const user = useAuthUser();
  const canWrite = user?.role === "ADMIN" || user?.role === "QA";
  const [reports, setReports] = useState<TestReportData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Estados dos filtros
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [branch, setBranch] = useState("");
  const [status, setStatus] = useState("");
  const [testType, setTestType] = useState("");
  const [system, setSystem] = useState("");
  const [search, setSearch] = useState("");

  // Debounces locais
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [debouncedSystem, setDebouncedSystem] = useState("");

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
      if (dateFrom) params.append("dateFrom", dateFrom);
      if (dateTo) params.append("dateTo", dateTo);
      if (branch) params.append("branch", branch);
      if (status) params.append("status", status);
      if (testType) params.append("testType", testType);
      if (debouncedSystem) params.append("system", debouncedSystem);
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
  }, [dateFrom, dateTo, branch, status, testType, debouncedSystem, debouncedSearch]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  // Função para limpar os filtros
  const handleClearFilters = () => {
    setDateFrom("");
    setDateTo("");
    setBranch("");
    setStatus("");
    setTestType("");
    setSystem("");
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
        `Deseja realmente excluir o relatório de testes ${code}? Todos os passos vinculados a ele serão deletados permanentemente em cascata.`
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
        message: `Relatório ${code} excluído com sucesso!`,
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
      <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-xs sm:p-5">
        <div className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-end">
          <div className="w-full lg:max-w-md">
            <Input
              label="Busca Rápida"
              id="searchQuick"
              placeholder="Buscar por código, tela, funcionalidade ou descrição..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full"
            />
          </div>
          <div className="w-full lg:max-w-xs">
            <Input
              label="Filtrar por Sistema"
              id="filterSystem"
              placeholder="Nome do sistema..."
              value={system}
              onChange={(e) => setSystem(e.target.value)}
              className="w-full"
            />
          </div>
        </div>

        <div className="border-t border-slate-100 pt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Data De */}
          <div>
            <Input
              label="Data de início"
              id="filterFrom"
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>

          {/* Data Até */}
          <div>
            <Input
              label="Data de término"
              id="filterTo"
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
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
          <div>
            <Select
              label="Tipo do Teste"
              id="filterType"
              value={testType}
              onChange={(e) => setTestType(e.target.value)}
              options={TEST_TYPE_OPTIONS}
            />
          </div>
        </div>

        {(dateFrom || dateTo || branch || status || testType || system || search) && (
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
        headers={[
          "Código",
          "Data",
          "Sistema",
          "Branch",
          "Tela / Menu",
          "Funcionalidade",
          "Tipo",
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
        {reports.map((report) => {
          const isFailed = report.generalStatus === "Falhou";
          const isBlocked = report.generalStatus === "Bloqueado";
          const rowHighlightClass = isFailed
            ? "bg-rose-50/20 hover:bg-rose-50/40 border-l-4 border-l-red-500"
            : isBlocked
            ? "bg-amber-50/20 hover:bg-amber-50/40 border-l-4 border-l-amber-500"
            : "hover:bg-slate-50/50 border-l-4 border-l-transparent";

          const stepsCount = report.steps?.length || 0;

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
              <td className="p-4 text-slate-600 truncate max-w-[150px]" title={report.screenPath}>
                {report.screenPath}
              </td>
              <td className="p-4 text-slate-600 truncate max-w-[150px]" title={report.functionality}>
                {report.functionality}
              </td>
              <td className="p-4 text-slate-600 whitespace-nowrap">{report.testType}</td>
              <td className="p-4 text-slate-500 font-medium">
                {stepsCount} {stepsCount === 1 ? "passo" : "passos"}
              </td>
              <td className="p-4 whitespace-nowrap">
                <StatusBadge status={report.generalStatus} />
              </td>
              <td className="p-4 whitespace-nowrap text-right">
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
