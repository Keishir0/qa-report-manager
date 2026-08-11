"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { format } from "date-fns";
import {
  BRANCH_OPTIONS,
  GENERAL_STATUS_OPTIONS,
  TEST_TYPE_OPTIONS,
  TestReportData,
} from "@/types";
import StatusBadge, { getStatusColorVar } from "@/components/ui/StatusBadge";
import { exportToExcel, exportToPDF } from "@/lib/export";
import Toast from "@/components/ui/Toast";
import PageHeader from "@/components/ui/PageHeader";
import DataTable from "@/components/ui/DataTable";
import EmptyState from "@/components/ui/EmptyState";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import MultiSelectCreatable from "@/components/ui/MultiSelectCreatable";
import Pagination from "@/components/ui/Pagination";
import { useAuthUser } from "@/components/auth/AuthProvider";
import ReportActionsMenu from "@/components/reports/ReportActionsMenu";

interface UserOption {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface PaginatedReportsResponse {
  data: TestReportData[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface SavedFilter {
  id: string;
  name: string;
  query: string;
  color: string;
}

const PAGE_SIZE = 10;
const SAVED_FILTER_COLORS = ["accent", "ok", "bad", "warn", "neutral"];

export default function ReportsListPage() {
  const user = useAuthUser();
  const canWrite = user?.role === "ADMIN" || user?.role === "QA";
  const [reports, setReports] = useState<TestReportData[]>([]);
  const [selectedReportsById, setSelectedReportsById] = useState<Record<string, TestReportData>>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [totalReports, setTotalReports] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [userOptions, setUserOptions] = useState<UserOption[]>([]);
  const requestId = useRef(0);
  const pageSelectionCheckboxRef = useRef<HTMLInputElement>(null);

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

  // Painel de filtros e filtros salvos
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([]);
  const [isSavingFilter, setIsSavingFilter] = useState(false);
  const [newFilterName, setNewFilterName] = useState("");
  const [newFilterColor, setNewFilterColor] = useState(SAVED_FILTER_COLORS[0]);
  const [isPersistingFilter, setIsPersistingFilter] = useState(false);

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

  useEffect(() => {
    let isMounted = true;

    async function loadSavedFilters() {
      try {
        const response = await fetch("/api/saved-filters", { cache: "no-store" });
        if (!response.ok) return;
        const result = await response.json();
        if (isMounted && Array.isArray(result.data)) {
          setSavedFilters(result.data);
        }
      } catch {
        if (isMounted) setSavedFilters([]);
      }
    }

    loadSavedFilters();

    return () => {
      isMounted = false;
    };
  }, []);

  // Capturar erro vindo do redirecionamento de 404 da página [id] de forma segura no browser
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const errorParam = params.get("error");
      const searchParam = params.get("search");
      if (errorParam) {
        setToast({ message: errorParam, type: "error" });
        const newUrl = window.location.pathname;
        window.history.replaceState({}, "", newUrl);
      }
      if (searchParam) {
        setSearch(searchParam);
        const newUrl = window.location.pathname;
        window.history.replaceState({}, "", newUrl);
      }
    }
  }, []);

  // Função para buscar relatórios
  const buildReportParams = useCallback(
    (page?: number) => {
      const params = new URLSearchParams();
      if (createdFrom) params.append("createdFrom", createdFrom);
      if (createdTo) params.append("createdTo", createdTo);
      if (testedFrom) params.append("testedFrom", testedFrom);
      if (testedTo) params.append("testedTo", testedTo);
      if (branch) params.append("branch", branch);
      if (status) params.append("status", status);
      if (testType) params.append("testType", testType);
      if (debouncedSystem) params.append("system", debouncedSystem);
      if (user?.role !== "QA" && debouncedTester) {
        params.append("tester", debouncedTester);
      }
      if (debouncedDev) params.append("dev", debouncedDev);
      if (debouncedSearch) params.append("search", debouncedSearch);

      if (page) {
        params.append("page", String(page));
        params.append("limit", String(PAGE_SIZE));
      }

      return params;
    },
    [
      createdFrom,
      createdTo,
      testedFrom,
      testedTo,
      branch,
      status,
      testType,
      debouncedSystem,
      debouncedTester,
      debouncedDev,
      debouncedSearch,
      user?.role,
    ]
  );

  const fetchReports = useCallback(async (page = currentPage) => {
    const currentRequest = requestId.current + 1;
    requestId.current = currentRequest;
    setIsLoading(true);
    setError("");
    try {
      const params = buildReportParams(page);

      const response = await fetch(`/api/reports?${params.toString()}`);
      if (!response.ok) {
        throw new Error("Erro ao buscar relatórios.");
      }
      const result = (await response.json()) as PaginatedReportsResponse;
      if (requestId.current === currentRequest) {
        setReports(result.data);
        setCurrentPage(result.pagination.page);
        setTotalReports(result.pagination.total);
      }
    } catch (err: any) {
      if (requestId.current === currentRequest) {
        setError(err.message || "Erro ao carregar dados.");
      }
    } finally {
      if (requestId.current === currentRequest) {
        setIsLoading(false);
      }
    }
  }, [buildReportParams, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
    setSelectedReportsById({});
  }, [
    createdFrom,
    createdTo,
    testedFrom,
    testedTo,
    branch,
    status,
    testType,
    debouncedSystem,
    debouncedTester,
    debouncedDev,
    debouncedSearch,
    user?.role,
  ]);

  useEffect(() => {
    fetchReports(currentPage);
  }, [fetchReports, currentPage]);

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

  const applySavedFilter = (filter: SavedFilter) => {
    const params = new URLSearchParams(filter.query);
    setCreatedFrom(params.get("createdFrom") || "");
    setCreatedTo(params.get("createdTo") || "");
    setTestedFrom(params.get("testedFrom") || "");
    setTestedTo(params.get("testedTo") || "");
    setBranch(params.get("branch") || "");
    setStatus(params.get("status") || "");
    setTestType(params.get("testType") || "");
    setSystem(params.get("system") || "");
    setTester(params.get("tester") || "");
    setDev(params.get("dev") || "");
    setSearch(params.get("search") || "");
  };

  const handleSaveCurrentFilter = async () => {
    const name = newFilterName.trim();
    if (!name) return;

    setIsPersistingFilter(true);
    try {
      const query = buildReportParams().toString();
      const response = await fetch("/api/saved-filters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, query, color: newFilterColor }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Erro ao salvar filtro.");
      }

      const created = await response.json();
      setSavedFilters((current) => [created, ...current]);
      setNewFilterName("");
      setNewFilterColor(SAVED_FILTER_COLORS[0]);
      setIsSavingFilter(false);
      setToast({ message: `Filtro "${name}" salvo com sucesso!`, type: "success" });
    } catch (err: any) {
      setToast({ message: err.message || "Erro ao salvar filtro.", type: "error" });
    } finally {
      setIsPersistingFilter(false);
    }
  };

  const handleDeleteSavedFilter = async (id: string) => {
    try {
      const response = await fetch(`/api/saved-filters/${id}`, { method: "DELETE" });
      if (!response.ok) {
        throw new Error("Erro ao remover filtro.");
      }
      setSavedFilters((current) => current.filter((filter) => filter.id !== id));
    } catch (err: any) {
      setToast({ message: err.message || "Erro ao remover filtro.", type: "error" });
    }
  };

  const fetchReportsForExport = async () => {
    const params = buildReportParams();
    const response = await fetch(`/api/reports?${params.toString()}`);
    if (!response.ok) {
      throw new Error("Erro ao buscar relatorios para exportacao.");
    }

    return (await response.json()) as TestReportData[];
  };

  const selectedReports = Object.values(selectedReportsById);
  const visibleSelectableReports = reports.filter((report) => report.id);
  const selectedCount = selectedReports.length;
  const selectedVisibleCount = visibleSelectableReports.filter(
    (report) => report.id && selectedReportsById[report.id]
  ).length;
  const areAllVisibleReportsSelected =
    visibleSelectableReports.length > 0 &&
    selectedVisibleCount === visibleSelectableReports.length;
  const hasReportsToExport = selectedCount > 0 || totalReports > 0;

  useEffect(() => {
    if (pageSelectionCheckboxRef.current) {
      pageSelectionCheckboxRef.current.indeterminate =
        selectedVisibleCount > 0 && !areAllVisibleReportsSelected;
    }
  }, [areAllVisibleReportsSelected, selectedVisibleCount]);

  const clearReportSelection = () => {
    setSelectedReportsById({});
  };

  const getReportsForExport = async () => {
    if (selectedReports.length > 0) {
      return selectedReports;
    }

    return fetchReportsForExport();
  };

  const toggleReportSelection = (report: TestReportData) => {
    if (!report.id) return;

    setSelectedReportsById((current) => {
      const next = { ...current };

      if (next[report.id!]) {
        delete next[report.id!];
      } else {
        next[report.id!] = report;
      }

      return next;
    });
  };

  const toggleVisibleReportsSelection = () => {
    setSelectedReportsById((current) => {
      const next = { ...current };

      if (areAllVisibleReportsSelected) {
        visibleSelectableReports.forEach((report) => {
          if (report.id) delete next[report.id];
        });
      } else {
        visibleSelectableReports.forEach((report) => {
          if (report.id) next[report.id] = report;
        });
      }

      return next;
    });
  };

  // Handler para exportar Excel
  const handleExportExcel = async () => {
    if (!hasReportsToExport) {
      setToast({ message: "Não há relatórios para exportar.", type: "error" });
      return;
    }
    setIsExportingExcel(true);
    try {
      const exportReports = await getReportsForExport();
      if (exportReports.length === 0) {
        setToast({ message: "Nao ha relatorios para exportar.", type: "error" });
        return;
      }

      const filename = selectedCount > 0
        ? `qa-report-selecionados-${format(new Date(), "yyyy-MM-dd")}`
        : `qa-report-${format(new Date(), "yyyy-MM-dd")}`;
      exportToExcel(exportReports, filename);
      setToast({ message: "Excel gerado com sucesso!", type: "success" });
    } catch (err) {
      console.error("Erro ao exportar para Excel:", err);
      setToast({ message: "Falha ao exportar para Excel.", type: "error" });
    } finally {
      setIsExportingExcel(false);
    }
  };

  // Handler para exportar PDF
  const handleExportPDF = async () => {
    if (!hasReportsToExport) {
      setToast({ message: "Não há relatórios para exportar.", type: "error" });
      return;
    }
    setIsExportingPDF(true);
    try {
      const exportReports = await getReportsForExport();
      if (exportReports.length === 0) {
        setToast({ message: "Nao ha relatorios para exportar.", type: "error" });
        return;
      }

      const filename = selectedCount > 0
        ? `qa-report-selecionados-${format(new Date(), "yyyy-MM-dd")}`
        : `qa-report-${format(new Date(), "yyyy-MM-dd")}`;
      exportToPDF(exportReports, filename);
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

      await fetchReports(reports.length === 1 && currentPage > 1 ? currentPage - 1 : currentPage);
      setSelectedReportsById((current) => {
        const next = { ...current };
        delete next[id];
        return next;
      });
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

  const totalPages = Math.max(Math.ceil(totalReports / PAGE_SIZE), 1);

  const goToPage = (page: number) => {
    const nextPage = Math.min(Math.max(page, 1), totalPages);
    if (nextPage === currentPage || isLoading) return;
    setCurrentPage(nextPage);
  };

  const testerName = tester ? userOptions.find((option) => option.id === tester)?.name || tester : "";

  const activeChips: { key: string; label: string; onRemove: () => void }[] = [
    search && { key: "search", label: `busca: ${search}`, onRemove: () => setSearch("") },
    system && { key: "system", label: `sistema: ${system}`, onRemove: () => setSystem("") },
    testerName && { key: "tester", label: `qa: ${testerName}`, onRemove: () => setTester("") },
    dev && { key: "dev", label: `dev: ${dev}`, onRemove: () => setDev("") },
    branch && { key: "branch", label: `branch: ${branch}`, onRemove: () => setBranch("") },
    status && { key: "status", label: `status: ${status}`, onRemove: () => setStatus("") },
    testType && { key: "testType", label: `tipo: ${testType}`, onRemove: () => setTestType("") },
    createdFrom && {
      key: "createdFrom",
      label: `criado de: ${format(new Date(`${createdFrom}T00:00:00`), "dd/MM/yyyy")}`,
      onRemove: () => setCreatedFrom(""),
    },
    createdTo && {
      key: "createdTo",
      label: `criado ate: ${format(new Date(`${createdTo}T00:00:00`), "dd/MM/yyyy")}`,
      onRemove: () => setCreatedTo(""),
    },
    testedFrom && {
      key: "testedFrom",
      label: `testado de: ${format(new Date(`${testedFrom}T00:00:00`), "dd/MM/yyyy")}`,
      onRemove: () => setTestedFrom(""),
    },
    testedTo && {
      key: "testedTo",
      label: `testado ate: ${format(new Date(`${testedTo}T00:00:00`), "dd/MM/yyyy")}`,
      onRemove: () => setTestedTo(""),
    },
  ].filter(Boolean) as { key: string; label: string; onRemove: () => void }[];

  const hasActiveFilters = activeChips.length > 0;

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
          disabled={isExportingExcel || isLoading || !hasReportsToExport}
          icon={
            <svg className="w-4 h-4 text-ok" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
          disabled={isExportingPDF || isLoading || !hasReportsToExport}
          icon={
            <svg className="w-4 h-4 text-bad" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
        {canWrite && (
          <Link href="/reports/new" passHref legacyBehavior>
            <Button
              variant="primary"
              icon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              }
            >
              Novo Teste
            </Button>
          </Link>
        )}
      </PageHeader>

      {/* Busca + chips de filtros ativos */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          <div className="relative w-full sm:w-72">
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
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por código, tela, funcionalidade..."
              className="input w-full pl-9"
            />
          </div>

          {activeChips.map((chip) => (
            <span
              key={chip.key}
              className="inline-flex items-center gap-1.5 rounded-full border border-line bg-panel2 px-2.5 py-1 font-mono text-[11px] text-fg2"
            >
              {chip.label}
              <button
                type="button"
                onClick={chip.onRemove}
                aria-label={`Remover filtro ${chip.key}`}
                className="text-faint transition-colors hover:text-bad"
              >
                &times;
              </button>
            </span>
          ))}
        </div>

        <div className="flex shrink-0 items-center gap-3">
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleClearFilters}
              className="text-[12px] font-bold text-bad transition-colors hover:opacity-80"
            >
              Limpar filtros
            </button>
          )}
          <Button
            variant="secondary"
            onClick={() => setIsFilterPanelOpen(true)}
            icon={
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 4h18M6 12h12M10 20h4"
                />
              </svg>
            }
          >
            Filtros{hasActiveFilters ? ` (${activeChips.length})` : ""}
          </Button>
        </div>
      </div>

      {/* Painel lateral de filtros */}
      {isFilterPanelOpen && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[1px]"
            onClick={() => setIsFilterPanelOpen(false)}
            aria-label="Fechar filtros"
          />
          <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[380px] flex-col overflow-y-auto border-l border-line bg-surface p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-[15px] font-bold text-fg">Filtros</h2>
              <button
                type="button"
                onClick={() => setIsFilterPanelOpen(false)}
                className="rounded-[8px] p-1.5 text-faint hover:bg-panel2 hover:text-fg2"
                aria-label="Fechar filtros"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Filtros salvos */}
            <div className="mb-5 border-b border-hairline pb-5">
              <span className="label">Filtros salvos</span>
              {savedFilters.length === 0 ? (
                <p className="text-[12.5px] text-muted">Nenhum filtro salvo ainda.</p>
              ) : (
                <ul className="space-y-1.5">
                  {savedFilters.map((filter) => (
                    <li key={filter.id} className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => applySavedFilter(filter)}
                        className="flex flex-1 items-center gap-2 rounded-[8px] border border-line px-2.5 py-1.5 text-left text-[12.5px] text-fg2 transition-colors hover:bg-panel2"
                      >
                        <span
                          className="h-1.5 w-1.5 shrink-0 rounded-full"
                          style={{ backgroundColor: `rgb(var(--${filter.color}))` }}
                        />
                        <span className="truncate">{filter.name}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteSavedFilter(filter.id)}
                        aria-label={`Remover filtro salvo ${filter.name}`}
                        className="rounded-[8px] p-1.5 text-faint transition-colors hover:bg-bad/10 hover:text-bad"
                      >
                        &times;
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {isSavingFilter ? (
                <div className="mt-2.5 space-y-2">
                  <input
                    type="text"
                    value={newFilterName}
                    onChange={(e) => setNewFilterName(e.target.value)}
                    placeholder="Nome do filtro"
                    className="input w-full"
                    autoFocus
                  />
                  <div className="flex items-center gap-1.5">
                    {SAVED_FILTER_COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setNewFilterColor(color)}
                        aria-label={`Cor ${color}`}
                        className={`h-5 w-5 rounded-full transition-transform ${
                          newFilterColor === color ? "scale-110 shadow-[0_0_0_2px_rgb(var(--surface)),0_0_0_3.5px_rgb(var(--line))]" : ""
                        }`}
                        style={{ backgroundColor: `rgb(var(--${color}))` }}
                      />
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="primary"
                      className="flex-1"
                      onClick={handleSaveCurrentFilter}
                      disabled={!newFilterName.trim() || isPersistingFilter}
                    >
                      {isPersistingFilter ? "Salvando..." : "Salvar"}
                    </Button>
                    <Button variant="secondary" onClick={() => setIsSavingFilter(false)}>
                      Cancelar
                    </Button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsSavingFilter(true)}
                  disabled={!hasActiveFilters}
                  className="mt-2.5 text-[12px] font-bold text-accent transition-colors hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  + Salvar filtros atuais
                </button>
              )}
            </div>

            {/* Campos de filtro */}
            <div className="space-y-4">
              <Input
                label="Filtrar por Sistema"
                id="filterSystem"
                placeholder="Nome do sistema..."
                value={system}
                onChange={(e) => setSystem(e.target.value)}
              />

              {user?.role !== "QA" && (
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
              )}

              <Input
                label="Filtrar por Dev"
                id="filterDev"
                placeholder="Dev ou técnico SNDesk..."
                value={dev}
                onChange={(e) => setDev(e.target.value)}
              />

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Criado de"
                  id="filterCreatedFrom"
                  type="date"
                  value={createdFrom}
                  onChange={(e) => setCreatedFrom(e.target.value)}
                />
                <Input
                  label="Criado ate"
                  id="filterCreatedTo"
                  type="date"
                  value={createdTo}
                  onChange={(e) => setCreatedTo(e.target.value)}
                />
                <Input
                  label="Testado de"
                  id="filterTestedFrom"
                  type="date"
                  value={testedFrom}
                  onChange={(e) => setTestedFrom(e.target.value)}
                />
                <Input
                  label="Testado ate"
                  id="filterTestedTo"
                  type="date"
                  value={testedTo}
                  onChange={(e) => setTestedTo(e.target.value)}
                />
              </div>

              <MultiSelectCreatable
                label="Branch / Ambiente"
                id="filterBranch"
                placeholder="Filtrar por branch..."
                options={BRANCH_OPTIONS}
                value={branch}
                onChange={setBranch}
              />

              <Select
                label="Status Geral"
                id="filterStatus"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                options={GENERAL_STATUS_OPTIONS}
              />

              <Select
                label="Tipo do Teste"
                id="filterType"
                value={testType}
                onChange={(e) => setTestType(e.target.value)}
                options={TEST_TYPE_OPTIONS}
              />
            </div>

            <div className="mt-6 flex gap-2">
              {hasActiveFilters && (
                <Button variant="secondary" className="flex-1" onClick={handleClearFilters}>
                  Limpar filtros
                </Button>
              )}
              <Button variant="primary" className="flex-1" onClick={() => setIsFilterPanelOpen(false)}>
                Aplicar
              </Button>
            </div>
          </aside>
        </>
      )}

      {reports.length > 0 && (
        <div className="flex items-center justify-between gap-2 lg:hidden">
          <span className="text-[12px] font-semibold text-muted">
            {selectedCount > 0
              ? `${selectedCount} selecionado${selectedCount === 1 ? "" : "s"}`
              : "Nenhum selecionado"}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleVisibleReportsSelection}
              disabled={isLoading || visibleSelectableReports.length === 0}
              className="rounded-[8px] border border-line bg-panel px-2.5 py-1.5 text-[12px] font-semibold text-fg2 transition-colors hover:bg-panel2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {areAllVisibleReportsSelected ? "Desmarcar pagina" : "Pagina"}
            </button>
            {selectedCount > 0 && (
              <button
                type="button"
                onClick={clearReportSelection}
                className="rounded-[8px] border border-line bg-panel px-2.5 py-1.5 text-[12px] font-semibold text-fg2 transition-colors hover:bg-panel2"
              >
                Limpar
              </button>
            )}
          </div>
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="rounded-[9px] border border-bad/30 bg-bad/8 px-4 py-3 text-[13px] font-semibold text-bad"
        >
          {error}
        </div>
      )}

      {/* Tabela de Relatórios */}
      <DataTable
        tableClassName="w-full min-w-[1080px] table-fixed text-left border-collapse"
        headerClassNames={[
          "w-[40px]",
          "w-[112px]",
          "w-[84px]",
          "w-[104px]",
          "w-[126px]",
          "w-[154px]",
          "w-[84px]",
          "w-[116px]",
          "w-[100px]",
          "w-[74px]",
          "w-[122px]",
          "w-[48px] text-right",
        ]}
        headers={[
          <div
            key="selection"
            data-label="Seleção"
            className="flex items-center justify-center gap-1 normal-case tracking-normal"
          >
            <input
              ref={pageSelectionCheckboxRef}
              type="checkbox"
              checked={areAllVisibleReportsSelected}
              onChange={toggleVisibleReportsSelection}
              disabled={isLoading || visibleSelectableReports.length === 0}
              aria-label="Selecionar pagina atual"
              title="Selecionar pagina atual"
              className="h-4 w-4 rounded border-line text-accent focus:ring-accent disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>,
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
          const stepsCount = report.steps?.length || 0;
          const isSelected = Boolean(report.id && selectedReportsById[report.id]);

          return (
            <tr
              key={report.id}
              data-row-accent={getStatusColorVar(report.generalStatus)}
              className={`text-[13px] transition-colors ${isSelected ? "bg-accent/8" : "hover:bg-panel2"}`}
            >
              <td className="px-2 py-3 text-center">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleReportSelection(report)}
                  aria-label={`Selecionar relatorio ${report.code}`}
                  className="h-4 w-4 rounded border-line text-accent focus:ring-accent"
                />
              </td>
              <td className="whitespace-nowrap px-2 py-3 font-mono font-bold text-fg">{report.code}</td>
              <td className="whitespace-nowrap px-2 py-3 font-mono text-faint">
                {format(new Date(report.testDate), "dd/MM/yyyy")}
              </td>
              <td className="max-w-0 truncate px-2 py-3 font-mono text-fg2" title={report.branch}>
                {report.branch}
              </td>
              <td className="max-w-0 truncate px-2 py-3 text-fg2" title={report.screenPath}>
                {report.screenPath}
              </td>
              <td className="max-w-0 truncate px-2 py-3 text-fg2" title={report.functionality}>
                {report.functionality}
              </td>
              <td className="max-w-0 truncate px-2 py-3 text-fg2" title={report.testType}>
                {report.testType}
              </td>
              <td className="max-w-0 truncate px-2 py-3 font-semibold text-fg2" title={report.testerName || "Nao informado"}>
                {report.testerName || "Nao informado"}
              </td>
              <td className="max-w-0 truncate px-2 py-3 text-fg2" title={report.sndeskTechnicianName || "Nao informado"}>
                {report.sndeskTechnicianName || "Nao informado"}
              </td>
              <td className="whitespace-nowrap px-2 py-3 text-center font-mono text-faint">
                {stepsCount} {stepsCount === 1 ? "passo" : "passos"}
              </td>
              <td className="whitespace-nowrap px-2 py-3">
                <StatusBadge status={report.generalStatus} size="sm" />
              </td>
              <td className="whitespace-nowrap px-2 py-3 text-right">
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
