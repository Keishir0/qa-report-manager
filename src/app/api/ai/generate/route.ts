import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { requireApiAccess, WRITE_ROLES } from "@/lib/auth";
import { logServerError } from "@/lib/serverLog";

export async function POST(request: NextRequest) {
  try {
    const denied = await requireApiAccess(request, WRITE_ROLES);
    if (denied) return denied;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          error: "Recurso de IA indisponível.",
        },
        { status: 503 }
      );
    }

    const { text } = await request.json();
    if (!text || text.trim() === "") {
      return NextResponse.json(
        { error: "Entrada inválida", details: "Por favor, forneça uma descrição em texto do teste ou bug." },
        { status: 400 }
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-flash-latest",
      generationConfig: {
        responseMimeType: "application/json",
      },
    });

    const systemInstruction = `
Você é um assistente especialista em Controle de Qualidade (QA) e teste de software.
Sua tarefa é analisar uma descrição informal ou relato de bug fornecido pelo usuário e convertê-lo em um JSON estruturado para preencher um formulário de relatório de testes.

Você deve extrair ou deduzir as seguintes informações:
1. systemName: O nome do sistema sob teste (ex: "SNDesk"). Se não conseguir identificar, use "Não identificado".
2. branch: Um dos seguintes valores exatos: "Master", "Alfa", "Master / Alfa", "Homologação", "Produção", "Desenvolvimento". Se não for mencionado, deduza com base no contexto ou use "Desenvolvimento".
3. testType: Um dos seguintes valores exatos: "Funcional", "Regressão", "Reteste", "Exploratório", "Interface / Visual", "Validação de campos", "Integração", "Permissão / Acesso", "Compatibilidade". Se não puder identificar, use "Funcional".
4. generalStatus: Um dos seguintes valores exatos: "Passou", "Falhou", "Bloqueado", "Não executado". Se houver um bug mencionado, use "Falhou" ou "Bloqueado".
5. screenPath: O caminho da tela ou menu (ex: "Configurações > Usuários"). Se não mencionado, use "Não informado".
6. functionality: A funcionalidade sendo testada (ex: "Cadastro de novo usuário"). Se não mencionado, use "Geral".
7. bugDescription: Descrição detalhada do bug ou cenário observado.
8. notes: Observações ou notas adicionais de teste. Se não houver nada relevante, deixe como string vazia.
9. steps: Um array de passos executados para reproduzir ou validar o teste. Cada passo deve conter:
   - stepNumber: O número sequencial do passo (1, 2, 3, ...).
   - action: A ação executada (ex: "Acessar a tela X").
   - expectedResult: O resultado esperado (ex: "A tela deve carregar").
   - actualResult: O resultado obtido (ex: "A tela exibiu erro 500").
   - status: O status do passo (um dos valores exatos: "Passou", "Falhou", "Bloqueado", "Não executado").

Retorne APENAS o JSON no formato abaixo:
{
  "systemName": string,
  "branch": string,
  "testType": string,
  "generalStatus": string,
  "screenPath": string,
  "functionality": string,
  "bugDescription": string,
  "notes": string,
  "steps": [
    {
      "stepNumber": number,
      "action": string,
      "expectedResult": string,
      "actualResult": string,
      "status": string
    }
  ]
}
`;

    const prompt = `Analise o relato abaixo e monte a estrutura de teste correspondente:\n\n"${text}"`;

    const result = await model.generateContent([
      { text: systemInstruction },
      { text: prompt },
    ]);

    const responseText = result.response.text();
    if (!responseText) {
      throw new Error("A IA gerou uma resposta vazia.");
    }

    // Limpar markdown code fences se estiverem presentes
    let cleanedText = responseText.trim();
    if (cleanedText.startsWith("```")) {
      cleanedText = cleanedText.replace(/^```[a-zA-Z]*\s*/, "").replace(/\s*```$/, "");
    }

    // Tentar fazer o parse do JSON retornado
    const parsedData = JSON.parse(cleanedText.trim());

    return NextResponse.json(parsedData);
  } catch (error: unknown) {
    logServerError("Error in POST /api/ai/generate", error);
    return NextResponse.json(
      {
        error: "Falha na geração com IA",
      },
      { status: 500 }
    );
  }
}
