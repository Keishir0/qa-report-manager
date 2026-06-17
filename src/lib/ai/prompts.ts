import type { AiMode } from "@/lib/ai/schemas";

const sharedRules = `
Você é um assistente especialista em Controle de Qualidade (QA) e testes de software.
Responda em português do Brasil.
Não invente credenciais, tokens, pessoas ou informações que não existam no relato.
Use somente os valores permitidos pelo schema fornecido.
Retorne apenas o objeto JSON solicitado.
`;

const stepRules = `
Gere passos de teste altamente descritivos, detalhados e sequenciais.
Para cada passo:
1. 'action': Descreva minuciosamente a ação física no sistema (ex: os botões exatos a clicar, os dados a preencher, a tela a acessar). Evite frases curtas e genéricas.
2. 'expectedResult': Descreva detalhadamente o comportamento correto esperado do sistema.
3. 'actualResult':
   - Se o passo passou (status "Passou"): Descreva detalhadamente a confirmação do sucesso (ex: "O redirecionamento ocorreu com sucesso e a tela anterior foi exibida perfeitamente"). Nunca deixe em branco ou genérico.
   - Se o passo falhou ou bloqueou (status "Falhou" ou "Bloqueado"): Descreva detalhadamente o erro ou quebra observada no relato (ex: "O reprodutor de áudio quebrou o layout da tela e a reprodução falhou").
   - Se o passo não foi executado (status "Não executado"): Use "Pendente de execução".
`;

const reportRules = `
Converta o relato informal em um relatório de teste estruturado e detalhado.
Regras de campos:
1. Se a branch não for identificada, use "Desenvolvimento".
2. Se o tipo de teste não for identificado, use "Funcional".
3. Se a tela não for mencionada, use "Não informado".
4. Se a funcionalidade não for identificada, use "Geral".
5. Se houver um bug ou erro relatado, use status geral "Falhou" ou "Bloqueado".
6. O campo 'bugDescription' é obrigatório e nunca pode ficar vazio. Se não houver bug, descreva o cenário validado.
7. Para a lista de passos ('steps'), siga rigorosamente as mesmas instruções de detalhamento de ações, resultados esperados e resultados obtidos descritos acima.
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
