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
    : "Não Executado";
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
      `Siga rigorosamente as regras de status e resultado obtido com base no Status geral do relatório: se for "Aprovado QA", todos os passos devem ter status "Aprovado QA" e o resultado obtido correspondente de sucesso preenchido detalhadamente. Se for "Reprovado QA", os passos devem refletir o fluxo até a falha. Se for "Não Executado", use "Não Executado" nos passos pendentes.`,
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
        .slice(0, 50)
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
          `A geração foi concluída por um modelo alternativo: ${result.meta.model}.`
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
    <div className="rounded-[14px] border border-accent/35 bg-[linear-gradient(180deg,rgb(var(--panel-2)),rgb(var(--panel)))] p-4 sm:p-5">
      <div className="flex flex-col gap-3 border-b border-accent/20 pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-[13px] font-bold text-fg">
            Assistente de passos com IA
          </h3>
          <p className="mt-1 text-[12px] font-medium text-muted">
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
          className="text-[12px] font-bold text-muted transition-colors hover:text-fg2"
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
          className="bg-panel"
        />

        {error && (
          <div className="rounded-[9px] border border-bad/30 bg-bad/8 px-3 py-2 text-[12px] font-semibold text-bad">
            {error}
          </div>
        )}

        {providerNotice && (
          <div className="rounded-[9px] border border-warn/30 bg-warn/8 px-3 py-2 text-[12px] font-semibold text-warn">
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
          <div className="space-y-3 border-t border-accent/20 pt-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h4 className="text-[13px] font-bold text-fg">
                  Prévia das sugestões
                </h4>
                <p className="text-[12px] font-medium text-muted">
                  {suggestedSteps.length}{" "}
                  {suggestedSteps.length === 1 ? "passo gerado" : "passos gerados"}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              {suggestedSteps.map((step, index) => (
                <div
                  key={`${step.stepNumber}-${index}`}
                  className="rounded-[10px] border border-line bg-panel p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-[12px] font-bold text-accent">
                          #{step.stepNumber}
                        </span>
                        <StatusBadge status={step.status} size="sm" />
                      </div>
                      <p className="mt-2 text-[13px] font-bold text-fg">
                        {step.action}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveStep(index)}
                      className="shrink-0 text-[12px] font-bold text-bad hover:opacity-80"
                    >
                      Remover
                    </button>
                  </div>
                  <div className="mt-3 grid gap-3 text-[12px] sm:grid-cols-2">
                    <div>
                      <span className="font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-faint">
                        Esperado
                      </span>
                      <p className="mt-1 font-medium text-fg2">
                        {step.expectedResult}
                      </p>
                    </div>
                    <div>
                      <span className="font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-faint">
                        Obtido
                      </span>
                      <p className="mt-1 font-medium text-fg2">
                        {step.actualResult}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-2 border-t border-accent/20 pt-4 sm:flex-row sm:justify-end">
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
