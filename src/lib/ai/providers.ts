import {
  GoogleGenerativeAI,
  type Schema,
} from "@google/generative-ai";
import { ZodError } from "zod";
import {
  AiMode,
  AiResult,
  aiJsonSchemas,
  normalizeOpenRouterResult,
  validateAiResult,
} from "@/lib/ai/schemas";
import { buildAiMessages } from "@/lib/ai/prompts";

export type AiProviderName = "gemini" | "openrouter" | "local";

export interface AiProviderResult {
  data: AiResult;
  provider: AiProviderName;
  model: string;
}

export class AiProviderError extends Error {
  constructor(
    message: string,
    public readonly retriable: boolean,
    public readonly status?: number
  ) {
    super(message);
    this.name = "AiProviderError";
  }
}

function parseJsonResponse(text: string) {
  const trimmed = text.trim();
  const withoutFence = trimmed.startsWith("```")
    ? trimmed.replace(/^```[a-zA-Z]*\s*/, "").replace(/\s*```$/, "")
    : trimmed;
  return JSON.parse(withoutFence);
}

function toGeminiSchema(mode: AiMode) {
  return JSON.parse(
    JSON.stringify(aiJsonSchemas[mode], (key, value) =>
      [
        "additionalProperties",
        "minimum",
        "minItems",
        "maxItems",
      ].includes(key)
        ? undefined
        : value
    )
  ) as Schema;
}

function toOpenRouterSchema(mode: AiMode) {
  return JSON.parse(
    JSON.stringify(aiJsonSchemas[mode], (key, value) =>
      [
        "minimum",
        "maximum",
        "minItems",
        "maxItems",
        "minLength",
        "maxLength",
      ].includes(key)
        ? undefined
        : value
    )
  );
}

function errorStatus(error: unknown) {
  if (!error || typeof error !== "object") return undefined;
  const value = error as {
    status?: unknown;
    statusCode?: unknown;
    message?: unknown;
  };
  const status = Number(value.status ?? value.statusCode);
  if (Number.isFinite(status)) return status;

  const message = typeof value.message === "string" ? value.message : "";
  const match = message.match(/\[(\d{3})\b/);
  return match ? Number(match[1]) : undefined;
}

function isRetriableStatus(status?: number) {
  return (
    status === undefined ||
    status === 429 ||
    status === 500 ||
    status === 503 ||
    status === 504
  );
}

async function withTimeout<T>(
  operation: Promise<T>,
  timeoutMs: number
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new AiProviderError("Tempo limite excedido.", true, 504)),
      timeoutMs
    );
  });

  try {
    return await Promise.race([operation, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function generateWithGemini(
  mode: AiMode,
  text: string,
  timeoutMs: number
): Promise<AiProviderResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new AiProviderError("Gemini não configurado.", true, 503);
  }

  const modelName = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const messages = buildAiMessages(mode, text);

  try {
    const client = new GoogleGenerativeAI(apiKey);
    const model = client.getGenerativeModel(
      {
        model: modelName,
        systemInstruction: messages.system,
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: toGeminiSchema(mode),
          temperature: 0.2,
        },
      },
      { timeout: timeoutMs }
    );

    const result = await withTimeout(
      model.generateContent(messages.user),
      timeoutMs
    );
    const responseText = result.response.text();
    if (!responseText) {
      throw new AiProviderError("Resposta vazia do Gemini.", true);
    }

    const parsed = parseJsonResponse(responseText);
    return {
      data: normalizeOpenRouterResult(mode, parsed, text),
      provider: "gemini",
      model: modelName,
    };
  } catch (error) {
    if (error instanceof AiProviderError) throw error;
    if (error instanceof SyntaxError || error instanceof ZodError) {
      throw new AiProviderError("Resposta inválida do Gemini.", true);
    }

    const status = errorStatus(error);
    throw new AiProviderError(
      "Falha na geração pelo Gemini.",
      isRetriableStatus(status),
      status
    );
  }
}

export async function generateWithOpenRouter(
  mode: AiMode,
  text: string,
  timeoutMs: number,
  modelOverride?: string
): Promise<AiProviderResult> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new AiProviderError("OpenRouter não configurado.", false, 503);
  }

  const modelName = modelOverride || "openai/gpt-oss-120b:free";
  const messages = buildAiMessages(mode, text);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": process.env.APP_URL || "http://localhost:3000",
          "X-OpenRouter-Title": "QA Report Manager",
        },
        body: JSON.stringify({
          model: modelName,
          messages: [
            { role: "system", content: messages.system },
            { role: "user", content: messages.user },
          ],
          temperature: 0.2,
          max_tokens: mode === "steps" ? 2500 : 4000,
          reasoning: {
            effort: "minimal",
            exclude: true,
          },
          response_format: {
            type: "json_schema",
            json_schema: {
              name: `qa_${mode}`,
              strict: true,
              schema: toOpenRouterSchema(mode),
            },
          },
        }),
        signal: controller.signal,
      }
    );

    if (!response.ok) {
      const errorPayload = (await response.json().catch(() => null)) as {
        error?: { message?: string };
      } | null;
      throw new AiProviderError(
        errorPayload?.error?.message || "Falha na geração pelo OpenRouter.",
        false,
        response.status
      );
    }

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string | null } }>;
    };
    const responseText = payload.choices?.[0]?.message?.content;
    if (!responseText) {
      throw new AiProviderError("Resposta vazia do OpenRouter.", false);
    }

    const parsed = parseJsonResponse(responseText);
    return {
      data: normalizeOpenRouterResult(mode, parsed, text),
      provider: "openrouter",
      model: modelName,
    };
  } catch (error) {
    if (error instanceof AiProviderError) throw error;
    if (
      error instanceof Error &&
      (error.name === "AbortError" ||
        error instanceof SyntaxError ||
        error instanceof ZodError)
    ) {
      throw new AiProviderError(
        error.name === "AbortError"
          ? "Tempo limite do OpenRouter excedido."
          : "Resposta inválida do OpenRouter.",
        false,
        error.name === "AbortError" ? 504 : undefined
      );
    }

    throw new AiProviderError("Falha na geração pelo OpenRouter.", false);
  } finally {
    clearTimeout(timer);
  }
}
