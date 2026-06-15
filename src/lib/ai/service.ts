import type { AiMode } from "@/lib/ai/schemas";
import {
  AiProviderError,
  AiProviderResult,
  generateWithGemini,
  generateWithOpenRouter,
} from "@/lib/ai/providers";

export interface AiGenerationResult extends AiProviderResult {
  fallbackUsed: boolean;
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

export async function generateAiContent(
  mode: AiMode,
  text: string
): Promise<AiGenerationResult> {
  try {
    const result = await generateWithGemini(mode, text, 7000);
    return { ...result, fallbackUsed: false };
  } catch (firstError) {
    const shouldRetry =
      firstError instanceof AiProviderError && firstError.retriable;
    if (!shouldRetry) throw firstError;
  }

  await sleep(retryDelay());

  try {
    const result = await generateWithGemini(mode, text, 5000);
    return { ...result, fallbackUsed: false };
  } catch (secondError) {
    const shouldFallback =
      secondError instanceof AiProviderError && secondError.retriable;
    if (!shouldFallback) throw secondError;
  }

  const fallback = await generateWithOpenRouter(
    mode,
    text,
    openRouterTimeout()
  );
  return { ...fallback, fallbackUsed: true };
}
