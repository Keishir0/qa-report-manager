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

function openRouterModelChain() {
  const configured = process.env.OPENROUTER_MODEL_CHAIN;
  if (configured) {
    return configured
      .split(",")
      .map((model) => model.trim())
      .filter(Boolean);
  }

  return [
    "google/gemma-4-31b-it:free",
    "google/gemma-4-26b-a4b-it:free",
    "openai/gpt-oss-120b:free",
  ];
}

export async function generateAiContent(
  mode: AiMode,
  text: string
): Promise<AiGenerationResult> {
  const processed = preprocessAiInput(text, mode);
  const providerText = processed.text;

  // 1. Tenta Gemini diretamente se a chave estiver configurada
  if (process.env.GEMINI_API_KEY) {
    try {
      const result = await generateWithGemini(
        mode,
        providerText,
        openRouterTimeout()
      );
      return {
        ...result,
        fallbackUsed: false,
        localFallbackUsed: false,
        inputReduced: processed.wasReduced,
      };
    } catch (err) {
      console.warn("Gemini generation failed, trying OpenRouter...", err);
    }
  }

  // 2. Tenta a cadeia de modelos do OpenRouter
  const modelChain = openRouterModelChain();
  for (let index = 0; index < modelChain.length; index += 1) {
    const model = modelChain[index];
    try {
      const result = await generateWithOpenRouter(
        mode,
        providerText,
        openRouterTimeout(),
        model
      );
      return {
        ...result,
        fallbackUsed: index > 0 || !!process.env.GEMINI_API_KEY,
        localFallbackUsed: false,
        inputReduced: processed.wasReduced,
      };
    } catch {
      if (index < modelChain.length - 1) {
        await sleep(retryDelay());
      }
    }
  }

  return {
    data: generateLocalFallback(mode, providerText),
    provider: "local",
    model: "local-template",
    fallbackUsed: true,
    localFallbackUsed: true,
    inputReduced: processed.wasReduced,
  };
}
