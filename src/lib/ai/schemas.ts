import { z } from "zod";

export const AI_MODES = ["report", "steps"] as const;
export type AiMode = (typeof AI_MODES)[number];

const branchValues = [
  "Master",
  "Alfa",
  "Master / Alfa",
  "Homologação",
  "Produção",
  "Desenvolvimento",
] as const;

const testTypeValues = [
  "Funcional",
  "Regressão",
  "Reteste",
  "Exploratório",
  "Interface / Visual",
  "Validação de campos",
  "Integração",
  "Permissão / Acesso",
  "Compatibilidade",
] as const;

const statusValues = [
  "Passou",
  "Falhou",
  "Bloqueado",
  "Não executado",
] as const;

export const aiStepSchema = z
  .object({
    stepNumber: z.number().int().positive(),
    action: z.string().trim().min(1).max(5000),
    expectedResult: z.string().trim().min(1).max(5000),
    actualResult: z.string().trim().min(1).max(5000),
    status: z.enum(statusValues),
  })
  .strict();

export const aiStepsSchema = z
  .object({
    steps: z.array(aiStepSchema).min(1).max(30),
  })
  .strict();

export const aiReportSchema = z
  .object({
    systemName: z.string().trim().min(1).max(200),
    branch: z.enum(branchValues),
    testType: z.enum(testTypeValues),
    generalStatus: z.enum(statusValues),
    screenPath: z.string().trim().min(1).max(500),
    functionality: z.string().trim().min(1).max(500),
    bugDescription: z.string().trim().min(1).max(5000),
    notes: z.string().trim().max(5000),
    steps: z.array(aiStepSchema).min(1).max(30),
  })
  .strict();

export const aiRequestSchema = z
  .object({
    mode: z.enum(AI_MODES),
    text: z.string().trim().min(1).max(12000),
  })
  .strict();

export type AiReportResult = z.infer<typeof aiReportSchema>;
export type AiStepsResult = z.infer<typeof aiStepsSchema>;
export type AiResult = AiReportResult | AiStepsResult;

const stepJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    stepNumber: { type: "integer", minimum: 1 },
    action: { type: "string" },
    expectedResult: { type: "string" },
    actualResult: { type: "string" },
    status: { type: "string", enum: statusValues },
  },
  required: [
    "stepNumber",
    "action",
    "expectedResult",
    "actualResult",
    "status",
  ],
} as const;

export const aiJsonSchemas = {
  steps: {
    type: "object",
    additionalProperties: false,
    properties: {
      steps: {
        type: "array",
        minItems: 1,
        maxItems: 30,
        items: stepJsonSchema,
      },
    },
    required: ["steps"],
  },
  report: {
    type: "object",
    additionalProperties: false,
    properties: {
      systemName: { type: "string", minLength: 1 },
      branch: { type: "string", enum: branchValues },
      testType: { type: "string", enum: testTypeValues },
      generalStatus: { type: "string", enum: statusValues },
      screenPath: { type: "string", minLength: 1 },
      functionality: { type: "string", minLength: 1 },
      bugDescription: { type: "string", minLength: 1 },
      notes: { type: "string" },
      steps: {
        type: "array",
        minItems: 1,
        maxItems: 30,
        items: stepJsonSchema,
      },
    },
    required: [
      "systemName",
      "branch",
      "testType",
      "generalStatus",
      "screenPath",
      "functionality",
      "bugDescription",
      "notes",
      "steps",
    ],
  },
} as const;

export function validateAiResult(mode: AiMode, value: unknown): AiResult {
  return mode === "steps"
    ? aiStepsSchema.parse(value)
    : aiReportSchema.parse(value);
}

function stringValue(value: unknown, fallback: string, maximum: number) {
  const normalized = typeof value === "string" ? value.trim() : "";
  return (normalized || fallback).slice(0, maximum);
}

function enumValue<T extends readonly string[]>(
  value: unknown,
  options: T,
  fallback: T[number]
) {
  return options.includes(value as T[number]) ? (value as T[number]) : fallback;
}

export function normalizeOpenRouterResult(
  mode: AiMode,
  value: unknown,
  fallbackText: string
): AiResult {
  if (!value || typeof value !== "object") {
    return validateAiResult(mode, value);
  }

  const input = value as Record<string, unknown>;
  const rawSteps = Array.isArray(input.steps) ? input.steps : [];
  const normalizedSteps = rawSteps
    .slice(0, 30)
    .map((rawStep, index) => {
      const step =
        rawStep && typeof rawStep === "object"
          ? (rawStep as Record<string, unknown>)
          : {};

      return {
        stepNumber: index + 1,
        action: stringValue(step.action, "", 5000),
        expectedResult: stringValue(step.expectedResult, "", 5000),
        actualResult: stringValue(
          step.actualResult,
          "Pendente de execução",
          5000
        ),
        status: enumValue(
          step.status,
          statusValues,
          "Não executado"
        ),
      };
    })
    .filter((step) => step.action && step.expectedResult);

  if (mode === "steps") {
    return aiStepsSchema.parse({ steps: normalizedSteps });
  }

  const functionality = stringValue(input.functionality, "Geral", 500);
  const steps =
    normalizedSteps.length > 0
      ? normalizedSteps
      : [
          {
            stepNumber: 1,
            action: `Validar ${functionality}`,
            expectedResult:
              "A funcionalidade deve apresentar o comportamento esperado.",
            actualResult: "Pendente de execução",
            status: "Não executado" as const,
          },
        ];

  return aiReportSchema.parse({
    systemName: stringValue(input.systemName, "Não identificado", 200),
    branch: enumValue(input.branch, branchValues, "Desenvolvimento"),
    testType: enumValue(input.testType, testTypeValues, "Funcional"),
    generalStatus: enumValue(
      input.generalStatus,
      statusValues,
      "Não executado"
    ),
    screenPath: stringValue(input.screenPath, "Não informado", 500),
    functionality,
    bugDescription: stringValue(input.bugDescription, fallbackText, 5000),
    notes: stringValue(input.notes, "", 5000),
    steps,
  });
}
