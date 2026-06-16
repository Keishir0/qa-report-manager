"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import StatusBadge from "@/components/ui/StatusBadge";
import Textarea from "@/components/ui/Textarea";
import {
  STEP_STATUS_OPTIONS,
  StepStatus,
  TestReportData,
} from "@/types";

interface SuggestedStep {
  stepNumber: number;
  action: string;
  expectedResult: string;
  actualResult: string;
  status: StepStatus;
}

interface AiStepAssistantProps {
  report: TestReportData;
  nextStepNumber: number;
  onSaved: () => void;
  onClose: () => void;
}

function normalizeStatus(value: unknown): StepStatus {
  return STEP_STATUS_OPTIONS.includes(value as StepStatus)
    ? (value as StepStatus)
    : "Não executado";
}

export default function AiStepAssistant({
  report,
  nextStepNumber,
  onSaved,
  onClose,
}: AiStepAssistantProps) {
  const [instructions, setInstructions] = useState("");
  const [suggestedSteps, setSuggestedSteps] = useState<SuggestedStep[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [providerNotice, setProviderNotice] = useState("");

  const renumberSteps = (steps: SuggestedStep[]) =>
    steps.map((step, index) => ({
      ...step,
      stepNumber: nextStepNumber + index,
    }));

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError("");
    setProviderNotice("");

    const context = [
      "Gere passos de teste claros, objetivos e sequenciais para o relatório abaixo.",
      "Use os dados existentes como fonte principal.",
      "Não invente credenciais, nomes de pessoas ou informações não fornecidas.",
      "Quando o passo ainda não tiver sido executado, use status \"Não executado\" e resultado obtido \"Pendente de execução\".",
      `Sistema: ${report.systemName}`,
      `Branch: ${report.branch}`,
      `Tela ou menu: ${report.screenPath}`,
      `Funcionalidade: ${report.functionality}`,
      `Tipo de teste: ${report.testType}`,
      `Status geral: ${report.generalStatus}`,
      `Descrição: ${report.bugDescription}`,
      report.notes ? `Observações: ${report.notes}` : "",
      instructions.trim()
        ? `Instruções adicionais do usuário: ${instructions.trim()}`
        : "",
    ]
      .filter(Boolean)
      .join("\n");

    try {
      const response = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "steps", text: context }),
      });
      const result = await response
        .json()
        .catch(() => ({
          error:
            "O assistente demorou mais que o esperado ou retornou uma resposta invalida. Tente novamente.",
        }));

      if (!response.ok) {
        throw new Error(result.error || "Não foi possível gerar os passos.");
      }

      const generated = result.data;
      if (!Array.isArray(generated?.steps) || generated.steps.length === 0) {
        throw new Error("A IA não retornou passos válidos para este relatório.");
      }

      const normalized = generated.steps
        .slice(0, 30)
        .map((step: Record<string, unknown>, index: number) => ({
          stepNumber: nextStepNumber + index,
          action: String(step.action || "").trim(),
          expectedResult: String(step.expectedResult || "").trim(),
          actualResult:
            String(step.actualResult || "").trim() || "Pendente de execução",
          status: normalizeStatus(step.status),
        }))
        .filter(
          (step: SuggestedStep) =>
            step.action.length > 0 && step.expectedResult.length > 0
        );

      if (normalized.length === 0) {
        throw new Error("A IA retornou passos incompletos. Tente novamente.");
      }

      setSuggestedSteps(normalized);
      if (!result.meta?.fallbackUsed && result.meta?.inputReduced) {
        setProviderNotice(
          "O contexto foi reduzido automaticamente para melhorar a estabilidade da geracao."
        );
      }
      if (result.meta?.localFallbackUsed) {
        setProviderNotice(
          "Os provedores de IA nao responderam. Gere uma sugestao minima local para voce revisar e complementar."
        );
      } else if (result.meta?.fallbackUsed) {
        setProviderNotice(
          "O Gemini estava indisponível. A geração foi concluída pelo modelo alternativo GPT-OSS."
        );
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Não foi possível gerar os passos."
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRemoveStep = (index: number) => {
    setSuggestedSteps((current) =>
      renumberSteps(current.filter((_, currentIndex) => currentIndex !== index))
    );
  };

  const handleSave = async () => {
    if (suggestedSteps.length === 0) return;

    setIsSaving(true);
    setError("");

    try {
      const response = await fetch("/api/steps/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportId: report.id,
          steps: suggestedSteps,
        }),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Não foi possível salvar os passos.");
      }

      setSuggestedSteps([]);
      setInstructions("");
      onSaved();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Não foi possível salvar os passos."
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="rounded-xl border border-indigo-200 bg-indigo-50/30 p-4 shadow-xs sm:p-5">
      <div className="flex flex-col gap-3 border-b border-indigo-100 pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-sm font-extrabold text-indigo-900">
            Assistente de passos com IA
          </h3>
          <p className="mt-1 text-xs font-medium text-indigo-700">
            O relatório atual será usado como contexto. Revise as sugestões antes
            de salvar.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setError("");
            onClose();
          }}
          className="text-xs font-bold text-slate-500 transition-colors hover:text-slate-800"
        >
          Fechar
        </button>
      </div>

      <div className="mt-4 space-y-4">
        <Textarea
          id="ai-step-instructions"
          label="Instruções adicionais (opcional)"
          rows={3}
          value={instructions}
          onChange={(event) => setInstructions(event.target.value)}
          placeholder="Ex: crie passos para validar o parâmetro desativado e ativado, incluindo abertura e interação do chamado."
          className="bg-white"
        />

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
            {error}
          </div>
        )}

        {providerNotice && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
            {providerNotice}
          </div>
        )}

        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="secondary"
            onClick={handleGenerate}
            isLoading={isGenerating}
            disabled={isSaving}
          >
            {suggestedSteps.length > 0 ? "Gerar novamente" : "Gerar passos"}
          </Button>
        </div>

        {suggestedSteps.length > 0 && (
          <div className="space-y-3 border-t border-indigo-100 pt-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h4 className="text-sm font-extrabold text-slate-800">
                  Prévia das sugestões
                </h4>
                <p className="text-xs font-medium text-slate-500">
                  {suggestedSteps.length}{" "}
                  {suggestedSteps.length === 1 ? "passo gerado" : "passos gerados"}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              {suggestedSteps.map((step, index) => (
                <div
                  key={`${step.stepNumber}-${index}`}
                  className="rounded-lg border border-slate-200 bg-white p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-bold text-indigo-700">
                          #{step.stepNumber}
                        </span>
                        <StatusBadge status={step.status} size="sm" />
                      </div>
                      <p className="mt-2 text-sm font-bold text-slate-800">
                        {step.action}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveStep(index)}
                      className="shrink-0 text-xs font-bold text-red-500 hover:text-red-700"
                    >
                      Remover
                    </button>
                  </div>
                  <div className="mt-3 grid gap-3 text-xs sm:grid-cols-2">
                    <div>
                      <span className="font-bold uppercase tracking-wider text-slate-400">
                        Esperado
                      </span>
                      <p className="mt-1 font-medium text-slate-600">
                        {step.expectedResult}
                      </p>
                    </div>
                    <div>
                      <span className="font-bold uppercase tracking-wider text-slate-400">
                        Obtido
                      </span>
                      <p className="mt-1 font-medium text-slate-600">
                        {step.actualResult}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-2 border-t border-indigo-100 pt-4 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="primary"
                onClick={handleSave}
                isLoading={isSaving}
                disabled={isGenerating}
              >
                Salvar {suggestedSteps.length}{" "}
                {suggestedSteps.length === 1 ? "passo" : "passos"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
