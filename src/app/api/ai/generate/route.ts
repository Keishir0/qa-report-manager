import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { getApiUser, WRITE_ROLES } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { aiRequestSchema } from "@/lib/ai/schemas";
import { findSensitiveContent } from "@/lib/ai/sensitive";
import { generateAiContent } from "@/lib/ai/service";
import { logServerError } from "@/lib/serverLog";

export const maxDuration = 60;

function boundedInteger(
  value: string | undefined,
  fallback: number,
  minimum: number,
  maximum: number
) {
  const parsed = Number(value);
  return Number.isFinite(parsed)
    ? Math.min(Math.max(Math.trunc(parsed), minimum), maximum)
    : fallback;
}

const cooldownSeconds = () =>
  boundedInteger(process.env.AI_COOLDOWN_SECONDS, 10, 0, 300);

const dailyLimit = () =>
  boundedInteger(process.env.AI_DAILY_LIMIT, 30, 1, 1000);

function startOfUtcDay() {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );
}

export async function POST(request: NextRequest) {
  const user = await getApiUser(request);

  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  if (!WRITE_ROLES.includes(user.role)) {
    return NextResponse.json(
      { error: "Você não tem permissão para esta ação." },
      { status: 403 }
    );
  }

  try {
    const input = aiRequestSchema.parse(await request.json());
    const sensitiveType = findSensitiveContent(input.text);

    if (sensitiveType) {
      return NextResponse.json(
        {
          error: `O texto parece conter ${sensitiveType}. Remova ou masque esse dado antes de usar a IA.`,
          code: "SENSITIVE_CONTENT",
        },
        { status: 422 }
      );
    }

    const [lastGeneration, generationsToday] = await Promise.all([
      prisma.aiGenerationLog.findFirst({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      }),
      prisma.aiGenerationLog.count({
        where: {
          userId: user.id,
          createdAt: { gte: startOfUtcDay() },
        },
      }),
    ]);

    const cooldownMs = cooldownSeconds() * 1000;
    if (
      lastGeneration &&
      Date.now() - lastGeneration.createdAt.getTime() < cooldownMs
    ) {
      const retryAfter = Math.max(
        1,
        Math.ceil(
          (cooldownMs -
            (Date.now() - lastGeneration.createdAt.getTime())) /
            1000
        )
      );

      return NextResponse.json(
        {
          error: `Aguarde ${retryAfter}s antes de gerar novamente.`,
          code: "AI_COOLDOWN",
          retryAfter,
        },
        {
          status: 429,
          headers: { "Retry-After": String(retryAfter) },
        }
      );
    }

    if (generationsToday >= dailyLimit()) {
      return NextResponse.json(
        {
          error:
            "Seu limite diário de gerações com IA foi atingido. Tente novamente amanhã.",
          code: "AI_DAILY_LIMIT",
        },
        { status: 429 }
      );
    }

    const startedAt = Date.now();

    try {
      const result = await generateAiContent(input.mode, input.text);
      const latencyMs = Date.now() - startedAt;

      await prisma.aiGenerationLog.create({
        data: {
          userId: user.id,
          mode: input.mode,
          provider: result.provider,
          model: result.model,
          status: "success",
          latencyMs,
        },
      });

      return NextResponse.json({
        data: result.data,
        meta: {
          provider: result.provider,
          model: result.model,
          fallbackUsed: result.fallbackUsed,
          localFallbackUsed: result.localFallbackUsed,
          inputReduced: result.inputReduced,
          latencyMs,
        },
      });
    } catch (error) {
      const latencyMs = Date.now() - startedAt;

      await prisma.aiGenerationLog
        .create({
          data: {
            userId: user.id,
            mode: input.mode,
            provider: "unavailable",
            model:
              process.env.OPENROUTER_MODEL_CHAIN ||
              "google/gemma-4-31b-it:free,google/gemma-4-26b-a4b-it:free,openai/gpt-oss-120b:free",
            status: "failed",
            latencyMs,
          },
        })
        .catch((logError) =>
          logServerError("Error recording failed AI generation", logError)
        );

      logServerError("All AI providers failed", error);
      return NextResponse.json(
        {
          error:
            "Os serviços de IA estão indisponíveis no momento. Tente novamente em alguns instantes.",
          code: "AI_PROVIDERS_UNAVAILABLE",
          retryable: true,
        },
        { status: 503 }
      );
    }
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error:
            "Informe um texto válido de até 12.000 caracteres e o tipo de geração.",
          code: "INVALID_AI_REQUEST",
        },
        { status: 400 }
      );
    }

    logServerError("Error in POST /api/ai/generate", error);
    return NextResponse.json(
      { error: "Não foi possível processar a solicitação de IA." },
      { status: 500 }
    );
  }
}
