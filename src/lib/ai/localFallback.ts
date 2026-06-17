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

function detectBranch(text: string) {
  if (/master\s*\/\s*alfa|alfa\s*\/\s*master/i.test(text)) {
    return "Master / Alfa";
  }
  if (/\bmaster\b/i.test(text)) return "Master";
  if (/\balfa\b/i.test(text)) return "Alfa";
  if (/homologa/i.test(text)) return "Homologação";
  if (/produ[cç][aã]o/i.test(text)) return "Produção";
  return "Desenvolvimento";
}

function detectStatus(text: string) {
  if (
    /(funcionaram corretamente|funcionou corretamente|tudo ok|sem erro|sem falha|validado com sucesso|todas funcionaram|todos funcionaram)/i.test(
      text
    )
  ) {
    return "Passou";
  }
  if (/(bloque|trav|impeditivo)/i.test(text)) return "Bloqueado";
  if (/(erro|falh|bug|nao funciona|não funciona|quebr)/i.test(text)) {
    return "Falhou";
  }
  return "Não executado";
}

function detectTestType(text: string) {
  if (/reteste/i.test(text)) return "Reteste";
  if (/pwa|bot[oõ]es?|responsiv|visual|layout|tela/i.test(text)) {
    return "Funcional";
  }
  return "Funcional";
}

function extractCoverageItems(text: string) {
  const bulletItems = text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => /^[-*•]\s+/.test(line))
    .map((line) => line.replace(/^[-*•]\s+/, "").trim())
    .filter(Boolean);

  if (bulletItems.length > 0) return bulletItems;

  const compactMatch = text.match(
    /Itens\/telas testadas individualmente \(\d+\):([\s\S]+?)(?:\.\n|$)/i
  );
  if (!compactMatch?.[1]) return [];

  return compactMatch[1]
    .split(";")
    .map((item) => item.trim().replace(/\.$/, ""))
    .filter(Boolean);
}

function chunkItems(items: string[], size: number) {
  const chunks: string[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

function buildCoverageSteps(text: string) {
  const items = extractCoverageItems(text);
  if (items.length < 4) return [];

  const status = detectStatus(text);
  const stepStatus = status === "Passou" ? "Passou" : "Não executado";
  const actualResult =
    status === "Passou"
      ? "Os botões e fluxos validados funcionaram corretamente em todas as tentativas informadas."
      : "Pendente de execução";

  const chunks = chunkItems(items, 8).slice(0, 8);

  return [
    {
      stepNumber: 1,
      action: "Acessar o SNDesk na branch informada e abrir o PWA para validação.",
      expectedResult:
        "O ambiente deve carregar corretamente e permitir navegar pelas telas informadas.",
      actualResult,
      status: stepStatus,
    },
    ...chunks.map((chunk, index) => ({
      stepNumber: index + 2,
      action: `Validar os botões de voltar nas telas: ${chunk.join("; ")}.`,
      expectedResult:
        "Cada botão de voltar deve retornar para a tela anterior correta sem travar, fechar modal indevidamente ou perder o contexto.",
      actualResult,
      status: stepStatus,
    })),
  ];
}

function buildStep(text: string) {
  const summary = shortText(
    firstMeaningfulLine(text),
    "comportamento descrito no relato",
    220
  );
  const status = detectStatus(text);

  return {
    stepNumber: 1,
    action: `Validar ${summary}`,
    expectedResult:
      "O sistema deve apresentar o comportamento esperado conforme o relato informado.",
    actualResult:
      status === "Passou"
        ? "Comportamento validado com sucesso conforme o relato informado."
        : "Pendente de execução",
    status,
  };
}

export function generateLocalFallback(mode: AiMode, text: string): AiResult {
  const coverageSteps = buildCoverageSteps(text);
  const fallbackStep = buildStep(text);
  const steps = coverageSteps.length > 0 ? coverageSteps : [fallbackStep];

  if (mode === "steps") {
    return validateAiResult(mode, { steps });
  }

  const summary = shortText(firstMeaningfulLine(text), "Geral", 500);
  const coverageItems = extractCoverageItems(text);
  const isCoverageReport = coverageItems.length >= 4;
  const status = detectStatus(text);
  const functionality = isCoverageReport
    ? "Validação dos botões de voltar do PWA"
    : summary;

  return validateAiResult(mode, {
    systemName: detectSystem(text),
    branch: detectBranch(text),
    testType: detectTestType(text),
    generalStatus: status,
    screenPath: isCoverageReport ? "PWA > Botões de voltar" : "Nao informado",
    functionality,
    bugDescription: isCoverageReport
      ? shortText(
          `Foram testados os botões de voltar do PWA nas telas informadas. ${
            status === "Passou"
              ? "Todos funcionaram corretamente conforme o relato."
              : "Revise os resultados antes de salvar."
          }`,
          summary,
          5000
        )
      : shortText(text, summary, 5000),
    notes: isCoverageReport
      ? shortText(
          `Itens testados: ${coverageItems.join("; ")}. Relato processado em modo seguro local para manter a geração estável.`,
          "",
          5000
        )
      : "Gerado em modo seguro local porque os provedores de IA nao responderam corretamente. Revise e ajuste antes de salvar.",
    steps,
  });
}
