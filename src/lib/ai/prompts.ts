import type { AiMode } from "@/lib/ai/schemas";

const sharedRules = `
Você é um assistente especialista em Controle de Qualidade (QA) e testes de software.
Responda em português do Brasil.
Não invente credenciais, tokens, pessoas ou informações que não existam no relato.
Use somente os valores permitidos pelo schema fornecido.
Retorne apenas o objeto JSON solicitado.
`;

const stepRules = `
Gere passos de teste claros, objetivos e sequenciais.
Quando um passo ainda não tiver sido executado, use status "Não executado" e
resultado obtido "Pendente de execução".
`;

const reportRules = `
Converta o relato informal em um relatório de teste estruturado.
Se a branch não for identificada, use "Desenvolvimento".
Se o tipo não for identificado, use "Funcional".
Se a tela não for mencionada, use "Não informado".
Se a funcionalidade não for identificada, use "Geral".
Se houver um bug, use status geral "Falhou" ou "Bloqueado".
O campo bugDescription nunca pode ficar vazio. Quando não houver bug, descreva
o cenário validado e informe que o comportamento esperado foi confirmado.
Sempre gere pelo menos um passo de teste.
Quando o relato trouxer uma lista grande de telas, menus ou itens testados,
nao gere um passo para cada item. Agrupe os itens por contexto e coloque a
lista completa em notes.
Quando o relato disser que todos os itens foram testados e funcionaram
corretamente, use generalStatus "Passou" e passos com status "Passou".
`;

export function buildAiMessages(mode: AiMode, text: string) {
  return {
    system: `${sharedRules}\n${mode === "steps" ? stepRules : reportRules}`.trim(),
    user:
      mode === "steps"
        ? `Gere os passos de teste a partir deste contexto:\n\n${text}`
        : `Estruture o relatório de teste a partir deste relato:\n\n${text}`,
  };
}
