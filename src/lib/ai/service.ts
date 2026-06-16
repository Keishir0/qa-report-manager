import type { AiMode } from "@/lib/ai/schemas";
import {
  AiProviderResult,
  generateWithGemini,
  generateWithOpenRouter,
} from "@/lib/ai/providers";
import { generateLocalFallback } from "@/lib/ai/localFallback";
import { preprocessAiInput } from "@/lib/ai/preprocess";

export interface AiGenerationResult extends AiProviderResult {
  fallbackUsed: boolean;
  localFallbackUsed: boolean;
  inputReduced: boolean;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function retryDelay() {
  return 500 + Math.floor(Math.random() * 501);
}

function openRouterTimeout() {
  const configured = Number(process.env.OPENROUTER_TIMEOUT_MS || 45000);
  return Number.isFinite(configured)
    ? Math.min(Math.max(Math.trunc(configured), 15000), 50000)
    : 45000;
}

function paidOpenRouterModel() {
  return process.env.OPENROUTER_PAID_MODEL || "openai/gpt-4.1-mini";
}

function freeOpenRouterModel() {
  return process.env.OPENROUTER_FREE_MODEL || "openai/gpt-oss-120b:free";
}

function geminiTimeouts(text: string) {
  const length = text.trim().length;

  if (length >= 8000) {
    return { first: 18000, retry: 12000 };
  }

  if (length >= 4000) {
    return { first: 12000, retry: 8000 };
  }

  return { first: 7000, retry: 5000 };
}

export async function generateAiContent(
  mode: AiMode,
  text: string
): Promise<AiGenerationResult> {
  const processed = preprocessAiInput(text);
  const providerText = processed.text;
  const gemini = geminiTimeouts(providerText);

  try {
    const result = await generateWithGemini(mode, providerText, gemini.first);
    return {
      ...result,
      fallbackUsed: false,
      localFallbackUsed: false,
      inputReduced: processed.wasReduced,
    };
  } catch {
    // Falhas do provedor principal ainda podem ser recuperadas pelo retry
    // ou pelo provedor alternativo.
  }

  await sleep(retryDelay());

  try {
    const result = await generateWithGemini(mode, providerText, gemini.retry);
    return {
      ...result,
      fallbackUsed: false,
      localFallbackUsed: false,
      inputReduced: processed.wasReduced,
    };
  } catch {
    // Continua para o fallback externo.
  }

  try {
    const paidFallback = await generateWithOpenRouter(
      mode,
      providerText,
      openRouterTimeout(),
      paidOpenRouterModel()
    );
    return {
      ...paidFallback,
      fallbackUsed: true,
      localFallbackUsed: false,
      inputReduced: processed.wasReduced,
    };
  } catch {
    // Continua para o fallback gratuito.
  }

  try {
    const freeFallback = await generateWithOpenRouter(
      mode,
      providerText,
      openRouterTimeout(),
      freeOpenRouterModel()
    );
    return {
      ...freeFallback,
      fallbackUsed: true,
      localFallbackUsed: false,
      inputReduced: processed.wasReduced,
    };
  } catch {
    return {
      data: generateLocalFallback(mode, providerText),
      provider: "local",
      model: "local-template",
      fallbackUsed: true,
      localFallbackUsed: true,
      inputReduced: processed.wasReduced,
    };
  }
}
