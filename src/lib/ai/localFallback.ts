import type { AiMode, AiResult } from "@/lib/ai/schemas";
import { validateAiResult } from "@/lib/ai/schemas";

function firstMeaningfulLine(text: string) {
  return (
    text
      .split("\n")
      .map((line) => line.trim())
      .find((line) => line.length >= 12) || text.trim()
  );
}

function shortText(value: string, fallback: string, maxLength: number) {
  const normalized = value.replace(/\s+/g, " ").trim();
  return (normalized || fallback).slice(0, maxLength);
}

function detectSystem(text: string) {
  if (/sndesk/i.test(text)) return "SNDesk";
  if (/financeiro/i.test(text)) return "Financeiro";
  return "Nao identificado";
}

function detectStatus(text: string) {
  if (/(bloque|trav|impeditivo)/i.test(text)) return "Bloqueado";
  if (/(erro|falh|bug|nao funciona|não funciona|quebr)/i.test(text)) {
    return "Falhou";
  }
  return "Não executado";
}

function buildStep(text: string) {
  const summary = shortText(
    firstMeaningfulLine(text),
    "comportamento descrito no relato",
    220
  );

  return {
    stepNumber: 1,
    action: `Validar ${summary}`,
    expectedResult:
      "O sistema deve apresentar o comportamento esperado conforme o relato informado.",
    actualResult: "Pendente de execução",
    status: "Não executado",
  };
}

export function generateLocalFallback(mode: AiMode, text: string): AiResult {
  const step = buildStep(text);

  if (mode === "steps") {
    return validateAiResult(mode, { steps: [step] });
  }

  const summary = shortText(firstMeaningfulLine(text), "Geral", 500);

  return validateAiResult(mode, {
    systemName: detectSystem(text),
    branch: "Desenvolvimento",
    testType: "Funcional",
    generalStatus: detectStatus(text),
    screenPath: "Nao informado",
    functionality: summary,
    bugDescription: shortText(text, summary, 5000),
    notes:
      "Gerado em modo seguro local porque os provedores de IA nao responderam corretamente. Revise e ajuste antes de salvar.",
    steps: [step],
  });
}
