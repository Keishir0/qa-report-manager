"use client";

import { useCallback, useEffect, useState } from "react";
import Button from "@/components/ui/Button";
import PageHeader from "@/components/ui/PageHeader";
import Toast from "@/components/ui/Toast";

interface LogLine {
  text: string;
  level: "INFO" | "WARNING" | "ERROR" | "RAW";
}

export default function LogsClient() {
  const [logsText, setLogsText] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isClearing, setIsClearing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [levelFilter, setLevelFilter] = useState<"ALL" | "INFO" | "WARNING" | "ERROR">("ALL");
  const [limit, setLimit] = useState(200);
  const [showConfirmClear, setShowConfirmClear] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/admin/logs?limit=${limit}`, {
        cache: "no-store",
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Erro ao buscar logs do servidor.");
      }

      setLogsText(data.logs || "");
    } catch (error) {
      setToast({
        message:
          error instanceof Error
            ? error.message
            : "Erro ao buscar logs do servidor.",
        type: "error",
      });
    } finally {
      setIsLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleDownload = () => {
    window.open("/api/admin/logs?action=download", "_blank");
  };

  const handleClearLogs = async () => {
    setIsClearing(true);
    setShowConfirmClear(false);
    try {
      const response = await fetch("/api/admin/logs", {
        method: "DELETE",
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Erro ao limpar logs.");
      }

      setToast({
        message: "Arquivo de log limpo com sucesso.",
        type: "success",
      });
      setLogsText("");
    } catch (error) {
      setToast({
        message: error instanceof Error ? error.message : "Erro ao limpar logs.",
        type: "error",
      });
    } finally {
      setIsClearing(false);
    }
  };

  // Parsing logs line-by-line to maintain context and levels for stack traces
  const parseLogs = (): LogLine[] => {
    if (!logsText) return [];

    const lines = logsText.split("\n");
    const parsedLines: LogLine[] = [];
    let currentLevel: "INFO" | "WARNING" | "ERROR" | "RAW" = "RAW";

    lines.forEach((line) => {
      // Basic check for level indicators in our log format
      if (line.includes("] [ERROR] [")) {
        currentLevel = "ERROR";
      } else if (line.includes("] [WARNING] [")) {
        currentLevel = "WARNING";
      } else if (line.includes("] [INFO] [")) {
        currentLevel = "INFO";
      } else if (line.match(/^\[\d{4}-\d{2}-\d{2}T/)) {
        // New log entry with unspecified or different level structure
        currentLevel = "RAW";
      }

      parsedLines.push({
        text: line,
        level: currentLevel,
      });
    });

    return parsedLines;
  };

  const getFilteredLines = (parsedLines: LogLine[]): LogLine[] => {
    return parsedLines.filter((line) => {
      const matchesSearch =
        searchQuery === "" ||
        line.text.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesLevel =
        levelFilter === "ALL" ||
        line.level === levelFilter;

      return matchesSearch && matchesLevel;
    });
  };

  const allParsedLines = parseLogs();
  const filteredLines = getFilteredLines(allParsedLines);

  const getLineColor = (level: "INFO" | "WARNING" | "ERROR" | "RAW") => {
    switch (level) {
      case "ERROR":
        return "text-red-400";
      case "WARNING":
        return "text-yellow-400 font-medium";
      case "INFO":
        return "text-cyan-400";
      default:
        return "text-slate-300";
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Logs do Sistema"
        description="Monitore erros do servidor e logs de execução em tempo real para depuração."
      >
        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={fetchLogs}
            isLoading={isLoading}
            icon={
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7.89M9 11l3-3m0 0l3 3m-3-3v8"
                />
              </svg>
            }
          >
            Atualizar
          </Button>
          <Button
            variant="secondary"
            onClick={handleDownload}
            icon={
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
            }
          >
            Baixar Completo
          </Button>
          <Button
            variant="danger"
            onClick={() => setShowConfirmClear(true)}
            isLoading={isClearing}
            icon={
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            }
          >
            Limpar
          </Button>
        </div>
      </PageHeader>

      {/* Control Panel / Filters */}
      <div className="grid grid-cols-1 gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-3">
        {/* Search */}
        <div className="relative">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
            Buscar no Log
          </label>
          <div className="relative">
            <input
              type="text"
              placeholder="Ex: error, api/reports, etc..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-semibold"
              >
                Limpar
              </button>
            )}
          </div>
        </div>

        {/* Nível */}
        <div>
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
            Filtrar por Nível
          </label>
          <select
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value as any)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="ALL">Todos os Níveis</option>
            <option value="INFO">Informação (INFO)</option>
            <option value="WARNING">Alerta (WARNING)</option>
            <option value="ERROR">Erro (ERROR)</option>
          </select>
        </div>

        {/* Limite de Linhas */}
        <div>
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
            Linhas para carregar
          </label>
          <select
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value={50}>Últimas 50 linhas</option>
            <option value={100}>Últimas 100 linhas</option>
            <option value={200}>Últimas 200 linhas</option>
            <option value={500}>Últimas 500 linhas</option>
            <option value={1000}>Últimas 1000 linhas</option>
          </select>
        </div>
      </div>

      {/* Terminal View */}
      <div className="rounded-xl border border-slate-900 bg-slate-950 p-1.5 shadow-xl md:p-3 relative overflow-hidden">
        {/* Terminal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-2.5 px-3">
          <div className="flex gap-1.5">
            <span className="h-3 w-3 rounded-full bg-red-500/80 inline-block" />
            <span className="h-3 w-3 rounded-full bg-yellow-500/80 inline-block" />
            <span className="h-3 w-3 rounded-full bg-green-500/80 inline-block" />
          </div>
          <span className="text-[10px] font-mono text-slate-500 tracking-wider">
            logs/app.log ({filteredLines.length} de {allParsedLines.length} linhas)
          </span>
        </div>

        {/* Terminal Content */}
        <div className="max-h-[550px] min-h-[300px] overflow-y-auto p-4 font-mono text-xs leading-relaxed space-y-0.5 selection:bg-indigo-500 selection:text-white">
          {isLoading ? (
            <div className="flex h-[280px] items-center justify-center text-slate-400">
              <svg className="animate-spin h-5 w-5 mr-3 text-indigo-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span>Carregando arquivo de log...</span>
            </div>
          ) : filteredLines.length === 0 ? (
            <div className="flex h-[280px] flex-col items-center justify-center text-slate-500 space-y-2">
              <svg className="h-8 w-8 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Nenhum log encontrado correspondendo aos filtros.</span>
            </div>
          ) : (
            filteredLines.map((line, idx) => (
              <div
                key={idx}
                className={`whitespace-pre-wrap break-all transition-colors hover:bg-slate-900/50 px-1 py-0.5 rounded ${getLineColor(
                  line.level
                )}`}
              >
                {line.text}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmClear && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs"
            onClick={() => setShowConfirmClear(false)}
          />
          {/* Card */}
          <div className="relative w-full max-w-md rounded-xl bg-white p-6 shadow-xl border border-slate-100">
            <h3 className="text-lg font-bold text-slate-900">Limpar logs do sistema?</h3>
            <p className="mt-2 text-sm text-slate-500">
              Esta ação irá esvaziar permanentemente o arquivo <code className="bg-slate-100 px-1.5 py-0.5 rounded font-mono text-xs text-red-600">logs/app.log</code>.
              Isso não pode ser desfeito.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setShowConfirmClear(false)}>
                Cancelar
              </Button>
              <Button variant="danger" onClick={handleClearLogs}>
                Confirmar e Limpar
              </Button>
            </div>
          </div>
        </div>
      )}

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
