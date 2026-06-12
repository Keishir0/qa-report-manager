"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { TestReportData, TestStepData } from "@/types";
import StatusBadge from "@/components/ui/StatusBadge";
import ReportForm from "@/components/reports/ReportForm";
import StepRow from "@/components/reports/StepRow";
import StepForm from "@/components/reports/StepForm";
import { exportToExcel, exportToPDF } from "@/lib/export";
import Toast from "@/components/ui/Toast";
import Button from "@/components/ui/Button";
import PageHeader from "@/components/ui/PageHeader";

interface ReportDetailPageProps {
  params: {
    id: string;
  };
}

export default function ReportDetailPage({ params }: ReportDetailPageProps) {
  const { id } = params;
  const router = useRouter();

  const [report, setReport] = useState<TestReportData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showAddStep, setShowAddStep] = useState(false);
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Buscar detalhes do relatório
  const fetchReport = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/reports/${id}`);
      if (!response.ok) {
        if (response.status === 404) {
          router.push("/reports?error=Relatório não encontrado.");
          return;
        }
        throw new Error("Erro ao carregar detalhes do relatório.");
      }
      const data = await response.json();
      setReport(data);
    } catch (err: any) {
      setError(err.message || "Erro de rede.");
    } finally {
      setIsLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  // Capturar parâmetro de query "edit" para abrir em modo de edição
  useEffect(() => {
    if (report && typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get("edit") === "true") {
        setIsEditing(true);
      }
    }
  }, [report]);

  // Excluir relatório
  const handleDeleteReport = async () => {
    if (
      !report ||
      !window.confirm(
        `Deseja realmente excluir o relatório de testes ${report.code}? Todos os passos associados serão perdidos permanentemente.`
      )
    ) {
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(`/api/reports/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Erro ao excluir o relatório.");
      }

      setToast({ message: "Relatório de teste excluído com sucesso!", type: "success" });
      setTimeout(() => {
        router.push("/reports");
      }, 1500);
    } catch (err: any) {
      setToast({ message: err.message || "Erro ao excluir relatório.", type: "error" });
      setIsSaving(false);
    }
  };

  // Salvar edições do relatório
  const handleUpdateReport = async (formData: any) => {
    setIsSaving(true);
    setError("");

    try {
      const response = await fetch(`/api/reports/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Erro ao atualizar o relatório.");
      }

      const updated = await response.json();
      setReport(updated);
      setToast({ message: "Relatório de teste atualizado com sucesso!", type: "success" });
      handleCancelEditing();
    } catch (err: any) {
      setToast({ message: err.message || "Erro ao salvar alterações.", type: "error" });
    } finally {
      setIsSaving(false);
    }
  };

  // Duplicar relatório
  const handleDuplicateReport = async () => {
    if (!report) return;
    setIsSaving(true);
    try {
      const {
        id: _id,
        code: _code,
        createdAt: _createdAt,
        updatedAt: _updatedAt,
        steps,
        ...duplicateData
      } = report;

      const cleanedSteps = steps?.map((step: any) => ({
        stepNumber: step.stepNumber,
        action: step.action,
        expectedResult: step.expectedResult,
        actualResult: step.actualResult,
        status: step.status,
      })) || [];

      const response = await fetch("/api/reports", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...duplicateData,
          steps: cleanedSteps,
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Erro ao duplicar o relatório.");
      }

      const created = await response.json();
      setToast({
        message: `Relatório duplicado com sucesso como ${created.code}!`,
        type: "success",
      });

      setTimeout(() => {
        router.push(`/reports/${created.id}`);
      }, 1500);
    } catch (err: any) {
      setToast({
        message: err.message || "Erro ao duplicar relatório.",
        type: "error",
      });
      setIsSaving(false);
    }
  };

  const handleCancelEditing = () => {
    setIsEditing(false);
    if (typeof window !== "undefined") {
      const newUrl = window.location.pathname;
      window.history.replaceState({}, "", newUrl);
    }
  };

  // Funções de manipulação de passos
  const handleStepDelete = (stepId: string) => {
    if (report) {
      setReport({
        ...report,
        steps: report.steps?.filter((s) => s.id !== stepId) || [],
      });
      setToast({ message: "Passo de teste removido com sucesso!", type: "success" });
    }
  };

  const handleStepUpdate = (updatedStep: TestStepData) => {
    if (report) {
      setReport({
        ...report,
        steps:
          report.steps?.map((s) =>
            s.id === updatedStep.id ? updatedStep : s
          ) || [],
      });
      setToast({ message: "Passo de teste atualizado!", type: "success" });
    }
  };

  const handleStepCreateSuccess = () => {
    fetchReport();
    setToast({ message: "Passo de teste adicionado com sucesso!", type: "success" });
    setShowAddStep(false);
  };

  // Exportar Excel
  const handleExportExcel = () => {
    if (!report) return;
    setIsExportingExcel(true);
    try {
      const filename = `qa-${report.code}-${format(new Date(), "yyyy-MM-dd")}`;
      exportToExcel([report], filename);
      setToast({ message: "Excel individual gerado com sucesso!", type: "success" });
    } catch (err) {
      console.error("Erro ao exportar Excel:", err);
      setToast({ message: "Erro ao gerar arquivo Excel.", type: "error" });
    } finally {
      setIsExportingExcel(false);
    }
  };

  // Exportar PDF
  const handleExportPDF = () => {
    if (!report) return;
    setIsExportingPDF(true);
    try {
      const filename = `qa-${report.code}-${format(new Date(), "yyyy-MM-dd")}`;
      exportToPDF([report], filename);
      setToast({ message: "PDF individual gerado com sucesso!", type: "success" });
    } catch (err) {
      console.error("Erro ao exportar PDF:", err);
      setToast({ message: "Erro ao gerar arquivo PDF.", type: "error" });
    } finally {
      setIsExportingPDF(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-slate-500 gap-2 h-96">
        <svg
          className="animate-spin h-8 w-8 text-indigo-600"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
        <span>Carregando relatório...</span>
      </div>
    );
  }

  if (error && !report) {
    return (
      <div className="bg-red-50 border border-red-200 p-12 text-center rounded-xl max-w-lg mx-auto mt-12 shadow-xs">
        <h3 className="text-lg font-bold text-red-700 mb-2">Erro</h3>
        <p className="text-sm text-slate-750 mb-6 font-medium">{error}</p>
        <Link href="/reports" passHref legacyBehavior>
          <Button variant="primary">Voltar para Lista</Button>
        </Link>
      </div>
    );
  }

  if (!report) return null;

  const sortedSteps = report.steps
    ? [...report.steps].sort((a, b) => a.stepNumber - b.stepNumber)
    : [];

  const nextStepNumber =
    sortedSteps.length > 0
      ? Math.max(...sortedSteps.map((s) => s.stepNumber)) + 1
      : 1;

  return (
    <div className="space-y-8 max-w-6xl mx-auto animate-fade-in">
      {/* Breadcrumb e Ações Principais */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <Link
          href="/reports"
          className="text-xs font-bold text-slate-500 hover:text-slate-905 transition-colors flex items-center gap-1"
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
              strokeWidth={2.5}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Voltar para lista
        </Link>

        <div className="flex gap-2.5 w-full sm:w-auto">
          <Button
            variant="secondary"
            onClick={handleExportExcel}
            disabled={isExportingExcel || isSaving}
            icon={
              <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            }
          >
            Excel
          </Button>
          <Button
            variant="secondary"
            onClick={handleExportPDF}
            disabled={isExportingPDF || isSaving}
            icon={
              <svg className="w-4 h-4 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            }
          >
            PDF
          </Button>
          <Button
            variant="secondary"
            onClick={handleDuplicateReport}
            disabled={isSaving}
            icon={
              <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
              </svg>
            }
          >
            Duplicar Teste
          </Button>
        </div>
      </div>

      {/* Seção Principal: Card de Detalhes ou Formulário de Edição */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
        {isEditing ? (
          <div>
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-800">
                Editar Relatório: {report.code}
              </h2>
              <button
                onClick={handleCancelEditing}
                className="text-xs text-slate-500 hover:text-slate-700 font-bold"
              >
                Cancelar Edição
              </button>
            </div>
            {error && (
              <div className="mb-4 bg-red-50 text-red-700 text-xs p-3 rounded-lg border border-red-100 font-medium">
                {error}
              </div>
            )}
            <ReportForm
              initialData={report}
              onSubmit={handleUpdateReport}
              isLoading={isSaving}
            />
          </div>
        ) : (
          <div>
            {/* Cabeçalho do Relatório */}
            <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-100 pb-6 mb-6 gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xl font-bold bg-slate-100 text-slate-800 px-2.5 py-1 rounded-lg border border-slate-200">
                    {report.code}
                  </span>
                  <StatusBadge status={report.generalStatus} />
                </div>
                <h1 className="text-xl font-extrabold text-slate-900 mt-4 leading-tight">
                  {report.functionality}
                </h1>
                <p className="text-sm text-slate-500 font-semibold mt-1">
                  {report.systemName} &bull; {report.screenPath}
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  onClick={() => setIsEditing(true)}
                  disabled={isSaving}
                  icon={
                    <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  }
                >
                  Editar
                </Button>
                <Button
                  variant="danger"
                  onClick={handleDeleteReport}
                  disabled={isSaving}
                  icon={
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  }
                >
                  Excluir
                </Button>
              </div>
            </div>

            {/* Grid de Metadados Estilizados */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-slate-50/50 border border-slate-100 rounded-xl p-4">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Data do Teste
                </span>
                <span className="text-sm font-extrabold text-slate-800">
                  {format(new Date(report.testDate), "dd/MM/yyyy")}
                </span>
              </div>
              <div className="bg-slate-50/50 border border-slate-100 rounded-xl p-4">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Branch / Ambiente
                </span>
                <span className="text-sm font-extrabold text-slate-800">
                  {report.branch}
                </span>
              </div>
              <div className="bg-slate-50/50 border border-slate-100 rounded-xl p-4">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Tipo de Teste
                </span>
                <span className="text-sm font-extrabold text-slate-800">
                  {report.testType}
                </span>
              </div>
              <div className="bg-slate-50/50 border border-slate-100 rounded-xl p-4">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Criado em
                </span>
                <span className="text-sm font-extrabold text-slate-800">
                  {report.createdAt
                    ? format(new Date(report.createdAt), "dd/MM/yyyy HH:mm")
                    : "-"}
                </span>
              </div>
            </div>

            {/* Descrição do Bug */}
            <div className="space-y-2 mb-6">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Descrição do Bug / Comportamento Incorreto
              </span>
              <div className="bg-rose-50/10 text-sm text-slate-700 p-4 rounded-xl border border-rose-100/50 break-words whitespace-pre-line leading-relaxed font-medium">
                {report.bugDescription}
              </div>
            </div>

            {/* Observações */}
            {report.notes && (
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Observações / Notas Adicionais
                </span>
                <div className="bg-slate-50/70 text-sm text-slate-600 p-4 rounded-xl border border-slate-200 break-words whitespace-pre-line leading-relaxed font-medium">
                  {report.notes}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Seção de Passos do Teste */}
      <div className="space-y-4">
        <div className="flex justify-between items-center px-1">
          <div>
            <h2 className="text-lg font-extrabold text-slate-800">Passos do Teste ({sortedSteps.length})</h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Etapas detalhadas e validadas durante a execução deste caso.
            </p>
          </div>
          {!showAddStep && (
            <Button
              variant="primary"
              onClick={() => setShowAddStep(true)}
              icon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              }
            >
              Adicionar Passo
            </Button>
          )}
        </div>

        {/* Tabela de Passos */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
          {sortedSteps.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <p className="font-bold text-sm text-slate-700">
                Nenhum passo cadastrado ainda.
              </p>
              <p className="text-xs mt-1 mb-5 font-medium">
                Adicione os passos de validação executados para completar este relatório.
              </p>
              {!showAddStep && (
                <Button
                  variant="primary"
                  onClick={() => setShowAddStep(true)}
                >
                  Adicionar Passo
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 font-bold text-[10px] border-b border-slate-200 uppercase tracking-wider">
                    <th className="p-4 w-16 text-center">#</th>
                    <th className="p-4">Ação / Passo</th>
                    <th className="p-4">Resultado Esperado</th>
                    <th className="p-4">Resultado Obtido</th>
                    <th className="p-4 w-32">Status</th>
                    <th className="p-4 w-32 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sortedSteps.map((step) => (
                    <StepRow
                      key={step.id}
                      step={step}
                      onDelete={handleStepDelete}
                      onUpdate={handleStepUpdate}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Formulário de Adição de Passo */}
        {showAddStep && (
          <div className="animate-fade-in">
            <StepForm
              reportId={id}
              stepNumber={nextStepNumber}
              existingStepNumbers={sortedSteps.map((s) => s.stepNumber)}
              onSuccess={handleStepCreateSuccess}
              onCancel={() => setShowAddStep(false)}
            />
          </div>
        )}
      </div>

      {/* Renderização de Toast */}
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
