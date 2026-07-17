import prisma from "@/lib/prisma";
import { createHash, randomUUID } from "crypto";
import { sanitizeSensitiveText } from "@/lib/serverLog";
import { AuthUser } from "@/lib/auth";
import { getSndeskTechnicianId } from "./sndeskTechnician";

export const SNDESK_CONFIG_KEYS = {
  baseUrl: "sndesk_base_url",
  token: "sndesk_api_token",
  defaultUserId: "sndesk_default_user_id",
  pendingStatusIds: "sndesk_pending_status_ids",
  approveStatusId: "sndesk_approve_status_id",
  rejectStatusId: "sndesk_reject_status_id",
  approveTemplate: "sndesk_approve_template",
  rejectTemplate: "sndesk_reject_template",
  visibleClient: "sndesk_visible_client",
  emailClient: "sndesk_email_client",
  emailTechnician: "sndesk_email_technician",
};

const DEFAULT_APPROVE_TEMPLATE =
  "Teste aprovado no QA Manager.\n\nChamado: {id_chamado}\nRelatorio: {codigo_teste}\nStatus geral: {status_geral}\n\nResumo:\n{resumo}\n\nPassos novos:\n{passos_novos}\n\nPassos alterados:\n{passos_alterados}";

const DEFAULT_REJECT_TEMPLATE =
  "Teste recusado no QA Manager.\n\nChamado: {id_chamado}\nRelatorio: {codigo_teste}\nStatus geral: {status_geral}\n\nResumo:\n{resumo}\n\nPassos novos:\n{passos_novos}\n\nPassos alterados:\n{passos_alterados}";

interface SettingRow {
  key: string;
  value: string;
}

export interface SndeskConfig {
  baseUrl: string;
  token: string;
  defaultUserId: string;
  pendingStatusIds: number[];
  approveStatusId: string;
  rejectStatusId: string;
  approveTemplate: string;
  rejectTemplate: string;
  visibleClient: boolean;
  emailClient: boolean;
  emailTechnician: boolean;
}

export interface SndeskStatus {
  chamado?: number;
  idstatus?: number;
  status?: string;
  cor?: string;
}

export interface PendingTicketRow {
  id: string;
  idChamado: string;
  statusId: number | null;
  statusDescricao: string | null;
  statusCor: string | null;
  chamadoSnapshot: any;
  reportId: string | null;
  reportCode: string | null;
  reportTesterId: string | null;
  state: string;
  lastError: string | null;
  createdAt: Date;
  updatedAt: Date;
  stepsCount?: number;
  pendingStepsCount?: number;
  newStepsCount?: number;
  changedStepsCount?: number;
}

interface SndeskStep {
  id: string;
  stepNumber: number;
  action: string;
  expectedResult: string;
  actualResult: string;
  status: string;
  sndeskSentAt?: Date | string | null;
  sndeskSentHash?: string | null;
}

type ClassifiedSndeskStep = SndeskStep & {
  currentSndeskHash: string;
};

export class SndeskDecisionValidationError extends Error {
  status = 400;
}

function getStatusId(status: SndeskStatus | null | undefined) {
  const statusId = Number(status?.idstatus);
  return Number.isInteger(statusId) ? statusId : null;
}

export function getUserSndeskStatusId(user?: AuthUser | null) {
  const rawStatusId = user?.sndeskStatusId?.trim();
  if (!rawStatusId) return null;

  const statusId = Number(rawStatusId);
  return Number.isInteger(statusId) ? statusId : null;
}

export function canUserAccessPendingTicket(
  user: AuthUser | null | undefined,
  ticket: Pick<PendingTicketRow, "statusId" | "chamadoSnapshot"> & { reportTesterId?: string | null }
) {
  if (!user) return false;
  if (user.role === "ADMIN") return true;
  if (user.role !== "QA") return false;

  const userStatusId = getUserSndeskStatusId(user);
  if (userStatusId !== null) {
    if (ticket.statusId !== userStatusId) {
      return false;
    }
  } else {
    const mySndeskId = user.sndeskUserId;
    if (!mySndeskId) return false;

    const techId = getSndeskTechnicianId(ticket.chamadoSnapshot);
    if (techId !== mySndeskId) {
      return false;
    }
  }

  if (ticket.reportTesterId) {
    return ticket.reportTesterId === user.id;
  }

  return true;
}

export async function getActivePendingStatusIds(config: SndeskConfig) {
  const activeUserStatuses = await prisma.user.findMany({
    where: {
      active: true,
      sndeskStatusId: { not: null },
    },
    select: {
      sndeskStatusId: true,
    },
  });

  const customStatusIds = activeUserStatuses
    .map((user) => Number(user.sndeskStatusId))
    .filter((id) => Number.isInteger(id));

  return new Set([...config.pendingStatusIds, ...customStatusIds]);
}

export function isActivePendingStatus(
  status: SndeskStatus | null | undefined,
  activeStatusIds: Set<number>
) {
  const statusId = getStatusId(status);
  return statusId !== null && activeStatusIds.has(statusId);
}

async function syncLinkedReportTesterWithStatus(ticket: PendingTicketRow) {
  if (!ticket.reportId || ticket.statusId === null) return ticket;

  const assignedQa = await prisma.user.findFirst({
    where: {
      active: true,
      role: "QA",
      sndeskStatusId: String(ticket.statusId),
    },
    select: {
      id: true,
      name: true,
    },
  });

  if (!assignedQa) return ticket;

  await prisma.testReport.updateMany({
    where: {
      id: ticket.reportId,
      deletedAt: null,
    },
    data: {
      testerId: assignedQa.id,
      testerName: assignedQa.name,
    },
  });

  return {
    ...ticket,
    reportTesterId: assignedQa.id,
  };
}

export function getSndeskStepHash(step: Pick<
  SndeskStep,
  "stepNumber" | "action" | "expectedResult" | "actualResult" | "status"
>) {
  return createHash("sha256")
    .update(
      JSON.stringify({
        stepNumber: Number(step.stepNumber),
        action: String(step.action || ""),
        expectedResult: String(step.expectedResult || ""),
        actualResult: String(step.actualResult || ""),
        status: String(step.status || ""),
      })
    )
    .digest("hex");
}

export function classifySndeskSteps(steps: SndeskStep[]) {
  const newSteps: ClassifiedSndeskStep[] = [];
  const changedSteps: ClassifiedSndeskStep[] = [];

  for (const step of steps) {
    const currentSndeskHash = getSndeskStepHash(step);
    const classifiedStep = { ...step, currentSndeskHash };

    if (!step.sndeskSentAt) {
      newSteps.push(classifiedStep);
      continue;
    }

    if (step.sndeskSentHash !== currentSndeskHash) {
      changedSteps.push(classifiedStep);
    }
  }

  return {
    newSteps,
    changedSteps,
    pendingSteps: [...newSteps, ...changedSteps],
  };
}

export function getSndeskStepPendingCounts(steps: SndeskStep[]) {
  const { newSteps, changedSteps, pendingSteps } = classifySndeskSteps(steps);

  return {
    stepsCount: steps.length,
    pendingStepsCount: pendingSteps.length,
    newStepsCount: newSteps.length,
    changedStepsCount: changedSteps.length,
  };
}

function normalizeBaseUrl(value: string) {
  return value.trim().replace(/\/+$/, "");
}

function parseIntegerList(value: string | null | undefined) {
  if (!value) return [];

  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed
        .map((item) => Number(item))
        .filter((item) => Number.isInteger(item));
    }
  } catch {
    // Mantem compatibilidade com entrada "1,2,3".
  }

  return value
    .split(",")
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isInteger(item));
}

function parseBoolean(value: string | null | undefined, fallback: boolean) {
  if (value === undefined || value === null || value === "") return fallback;
  return ["1", "s", "sim", "true", "yes"].includes(value.toLowerCase());
}

function envOrSetting(settings: Map<string, string>, key: string, envName: string) {
  return settings.get(key) || process.env[envName] || "";
}

export async function getSndeskConfig(): Promise<SndeskConfig> {
  const rows = await prisma.$queryRaw<SettingRow[]>`
    SELECT "key", "value"
    FROM "webhook_settings"
    WHERE "key" IN (
      ${SNDESK_CONFIG_KEYS.baseUrl},
      ${SNDESK_CONFIG_KEYS.token},
      ${SNDESK_CONFIG_KEYS.defaultUserId},
      ${SNDESK_CONFIG_KEYS.pendingStatusIds},
      ${SNDESK_CONFIG_KEYS.approveStatusId},
      ${SNDESK_CONFIG_KEYS.rejectStatusId},
      ${SNDESK_CONFIG_KEYS.approveTemplate},
      ${SNDESK_CONFIG_KEYS.rejectTemplate},
      ${SNDESK_CONFIG_KEYS.visibleClient},
      ${SNDESK_CONFIG_KEYS.emailClient},
      ${SNDESK_CONFIG_KEYS.emailTechnician}
    )
  `;

  const settings = new Map(rows.map((row) => [row.key, row.value]));

  return {
    baseUrl: normalizeBaseUrl(
      settings.get(SNDESK_CONFIG_KEYS.baseUrl) ||
        process.env.SNDESK_BASE_URL ||
        ""
    ),
    token:
      settings.get(SNDESK_CONFIG_KEYS.token) ||
      process.env.SNDESK_API_TOKEN ||
      "",
    defaultUserId: envOrSetting(
      settings,
      SNDESK_CONFIG_KEYS.defaultUserId,
      "SNDESK_DEFAULT_USER_ID"
    ),
    pendingStatusIds: parseIntegerList(
      envOrSetting(
        settings,
        SNDESK_CONFIG_KEYS.pendingStatusIds,
        "SNDESK_PENDING_STATUS_IDS"
      )
    ),
    approveStatusId: envOrSetting(
      settings,
      SNDESK_CONFIG_KEYS.approveStatusId,
      "SNDESK_APPROVE_STATUS_ID"
    ),
    rejectStatusId: envOrSetting(
      settings,
      SNDESK_CONFIG_KEYS.rejectStatusId,
      "SNDESK_REJECT_STATUS_ID"
    ),
    approveTemplate:
      envOrSetting(
        settings,
        SNDESK_CONFIG_KEYS.approveTemplate,
        "SNDESK_APPROVE_TEMPLATE"
      ) ||
      DEFAULT_APPROVE_TEMPLATE,
    rejectTemplate:
      envOrSetting(
        settings,
        SNDESK_CONFIG_KEYS.rejectTemplate,
        "SNDESK_REJECT_TEMPLATE"
      ) || DEFAULT_REJECT_TEMPLATE,
    visibleClient: parseBoolean(
      envOrSetting(
        settings,
        SNDESK_CONFIG_KEYS.visibleClient,
        "SNDESK_VISIBLE_CLIENT"
      ),
      true
    ),
    emailClient: parseBoolean(
      envOrSetting(
        settings,
        SNDESK_CONFIG_KEYS.emailClient,
        "SNDESK_EMAIL_CLIENT"
      ),
      false
    ),
    emailTechnician: parseBoolean(
      envOrSetting(
        settings,
        SNDESK_CONFIG_KEYS.emailTechnician,
        "SNDESK_EMAIL_TECHNICIAN"
      ),
      false
    ),
  };
}

export async function saveSndeskConfig(input: Partial<SndeskConfig>) {
  const values: Record<string, string> = {
    [SNDESK_CONFIG_KEYS.baseUrl]: normalizeBaseUrl(input.baseUrl || ""),
    [SNDESK_CONFIG_KEYS.defaultUserId]: String(input.defaultUserId || "").trim(),
    [SNDESK_CONFIG_KEYS.pendingStatusIds]: JSON.stringify(
      input.pendingStatusIds || []
    ),
    [SNDESK_CONFIG_KEYS.approveStatusId]: String(input.approveStatusId || "").trim(),
    [SNDESK_CONFIG_KEYS.rejectStatusId]: String(input.rejectStatusId || "").trim(),
    [SNDESK_CONFIG_KEYS.approveTemplate]:
      input.approveTemplate || DEFAULT_APPROVE_TEMPLATE,
    [SNDESK_CONFIG_KEYS.rejectTemplate]:
      input.rejectTemplate || DEFAULT_REJECT_TEMPLATE,
    [SNDESK_CONFIG_KEYS.visibleClient]: input.visibleClient ? "S" : "N",
    [SNDESK_CONFIG_KEYS.emailClient]: input.emailClient ? "S" : "N",
    [SNDESK_CONFIG_KEYS.emailTechnician]: input.emailTechnician ? "S" : "N",
  };

  if (input.token !== undefined) {
    values[SNDESK_CONFIG_KEYS.token] = String(input.token || "").trim();
  }

  for (const [key, value] of Object.entries(values)) {
    await prisma.$executeRaw`
      INSERT INTO "webhook_settings" ("id", "key", "value", "updatedAt")
      VALUES (${randomUUID()}, ${key}, ${value}, CURRENT_TIMESTAMP)
      ON CONFLICT ("key")
      DO UPDATE SET "value" = EXCLUDED."value", "updatedAt" = CURRENT_TIMESTAMP
    `;
  }

  return getSndeskConfig();
}

export function assertSndeskConfig(config: SndeskConfig) {
  if (!config.baseUrl || !config.token) {
    throw new Error("Configure o dominio e o token da API SNDesk.");
  }
}

async function callSndesk<T>(
  config: SndeskConfig,
  path: string,
  init: RequestInit = {}
): Promise<T> {
  assertSndeskConfig(config);

  const response = await fetch(`${config.baseUrl}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${config.token}`,
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(init.headers || {}),
    },
    cache: "no-store",
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const message =
      data?.message ||
      data?.erro ||
      data?.error ||
      data?.errors?.token ||
      "Falha ao consultar a API SNDesk.";
    throw new Error(message);
  }

  return data as T;
}

export async function getSndeskStatus(
  config: SndeskConfig,
  idChamado: string
) {
  const data = await callSndesk<SndeskStatus[] | SndeskStatus>(
    config,
    `/api/status/${encodeURIComponent(idChamado)}`
  );

  return Array.isArray(data) ? data[0] : data;
}

export async function getSndeskChamado(
  config: SndeskConfig,
  idChamado: string
) {
  const data = await callSndesk<any>(
    config,
    `/api/chamado/${encodeURIComponent(idChamado)}`
  );

  return data?.data || data;
}

export async function upsertPendingTicketFromSndesk(
  idChamado: string,
  status: SndeskStatus,
  chamado: any
) {
  const snapshot = JSON.stringify(chamado || {});
  const statusId = status?.idstatus ? Number(status.idstatus) : null;
  const statusDescricao = status?.status || chamado?.status?.descricao || null;
  const statusCor = status?.cor || chamado?.status?.cor || null;

  const [ticket] = await prisma.$queryRaw<PendingTicketRow[]>`
    INSERT INTO "qa_pending_tickets" (
      "id",
      "idChamado",
      "statusId",
      "statusDescricao",
      "statusCor",
      "chamadoSnapshot",
      "state",
      "updatedAt"
    )
    VALUES (
      ${randomUUID()},
      ${idChamado},
      ${statusId},
      ${statusDescricao},
      ${statusCor},
      ${snapshot}::jsonb,
      'pendente',
      CURRENT_TIMESTAMP
    )
    ON CONFLICT ("idChamado")
    DO UPDATE SET
      "statusId" = EXCLUDED."statusId",
      "statusDescricao" = EXCLUDED."statusDescricao",
      "statusCor" = EXCLUDED."statusCor",
      "chamadoSnapshot" = EXCLUDED."chamadoSnapshot",
      "state" = 'pendente',
      "lastError" = NULL,
      "updatedAt" = CURRENT_TIMESTAMP
    RETURNING
      "id",
      "idChamado",
      "statusId",
      "statusDescricao",
      "statusCor",
      "chamadoSnapshot",
      "reportId",
      NULL::text AS "reportCode",
      NULL::text AS "reportTesterId",
      "state",
      "lastError",
      "createdAt",
      "updatedAt"
  `;

  return syncLinkedReportTesterWithStatus(ticket);
}

export async function archivePendingTicketFromSndesk(
  idChamado: string,
  status: SndeskStatus | null | undefined,
  chamado: any
) {
  const snapshot = JSON.stringify(chamado || {});
  const statusId = getStatusId(status);
  const statusDescricao = status?.status || chamado?.status?.descricao || null;
  const statusCor = status?.cor || chamado?.status?.cor || null;

  const [ticket] = await prisma.$queryRaw<PendingTicketRow[]>`
    UPDATE "qa_pending_tickets"
    SET
      "statusId" = ${statusId},
      "statusDescricao" = ${statusDescricao},
      "statusCor" = ${statusCor},
      "chamadoSnapshot" = ${snapshot}::jsonb,
      "state" = 'encerrado',
      "lastError" = NULL,
      "updatedAt" = CURRENT_TIMESTAMP
    WHERE "idChamado" = ${idChamado}
    RETURNING
      "id",
      "idChamado",
      "statusId",
      "statusDescricao",
      "statusCor",
      "chamadoSnapshot",
      "reportId",
      NULL::text AS "reportCode",
      NULL::text AS "reportTesterId",
      "state",
      "lastError",
      "createdAt",
      "updatedAt"
  `;

  return ticket || null;
}

export async function refreshPendingTicket(id: string) {
  const [ticket] = await prisma.$queryRaw<PendingTicketRow[]>`
    SELECT
      p."id",
      p."idChamado",
      p."statusId",
      p."statusDescricao",
      p."statusCor",
      p."chamadoSnapshot",
      p."reportId",
      r."code" AS "reportCode",
      r."tester_id" AS "reportTesterId",
      p."state",
      p."lastError",
      p."createdAt",
      p."updatedAt"
    FROM "qa_pending_tickets" p
    LEFT JOIN "test_reports" r ON r."id" = p."reportId"
    WHERE p."id" = ${id}
    LIMIT 1
  `;

  if (!ticket) throw new Error("Pendencia nao encontrada.");

  const config = await getSndeskConfig();
  const status = await getSndeskStatus(config, ticket.idChamado);
  const chamado = await getSndeskChamado(config, ticket.idChamado);
  const activeStatusIds = await getActivePendingStatusIds(config);

  if (!isActivePendingStatus(status, activeStatusIds)) {
    const archivedTicket = await archivePendingTicketFromSndesk(
      ticket.idChamado,
      status,
      chamado
    );
    if (archivedTicket) return archivedTicket;
  }

  return upsertPendingTicketFromSndesk(ticket.idChamado, status, chamado);
}

function formatSteps(steps: SndeskStep[], emptyMessage = "Nenhum passo cadastrado.") {
  if (!steps.length) return emptyMessage;

  return steps
    .sort((a, b) => Number(a.stepNumber) - Number(b.stepNumber))
    .map((step) => {
      return [
        `${step.stepNumber}. ${step.action}`,
        `Esperado: ${step.expectedResult}`,
        `Obtido: ${step.actualResult}`,
        `Status: ${step.status}`,
      ].join("\n");
    })
    .join("\n\n");
}

function formatGroupedSteps(newSteps: SndeskStep[], changedSteps: SndeskStep[]) {
  const passosNovos = formatSteps(newSteps, "Nenhum passo novo.");
  const passosAlterados = formatSteps(changedSteps, "Nenhum passo alterado.");

  return {
    passosNovos,
    passosAlterados,
    passos: [
      "Passos novos:",
      passosNovos,
      "",
      "Passos alterados:",
      passosAlterados,
    ].join("\n"),
  };
}

function renderTemplate(template: string, context: Record<string, string>) {
  return template.replace(/\{([a-z_]+)\}/g, (_, key: string) => {
    return context[key] ?? "";
  });
}

export async function sendPendingDecision(
  id: string,
  action: "aprovar" | "recusar",
  activeUser?: AuthUser | null
) {
  const [ticket] = await prisma.$queryRaw<PendingTicketRow[]>`
    SELECT
      p."id",
      p."idChamado",
      p."statusId",
      p."statusDescricao",
      p."statusCor",
      p."chamadoSnapshot",
      p."reportId",
      r."code" AS "reportCode",
      r."tester_id" AS "reportTesterId",
      p."state",
      p."lastError",
      p."createdAt",
      p."updatedAt"
    FROM "qa_pending_tickets" p
    LEFT JOIN "test_reports" r ON r."id" = p."reportId"
    WHERE p."id" = ${id}
    LIMIT 1
  `;

  if (!ticket) throw new Error("Pendencia nao encontrada.");
  if (!ticket.reportId) throw new Error("Vincule um relatorio antes de enviar.");

  const report = await prisma.testReport.findUnique({
    where: { id: ticket.reportId },
    include: {
      steps: {
        orderBy: {
          stepNumber: "asc",
        },
      },
    },
  });

  if (!report) throw new Error("Relatorio vinculado nao encontrado.");

  const { newSteps, changedSteps, pendingSteps } = classifySndeskSteps(
    report.steps || []
  );

  if (!pendingSteps.length) {
    throw new SndeskDecisionValidationError(
      "Nao ha passos novos ou alterados para enviar ao SNDesk."
    );
  }

  const config = await getSndeskConfig();
  assertSndeskConfig(config);

  const statusId =
    action === "aprovar" ? config.approveStatusId : config.rejectStatusId;
  const template =
    action === "aprovar" ? config.approveTemplate : config.rejectTemplate;

  const sndeskUserId = activeUser?.sndeskUserId || config.defaultUserId;

  if (!sndeskUserId || !statusId) {
    throw new Error("Configure o ID do tecnico no seu perfil ou defina o usuario padrao nas configuracoes.");
  }

  const groupedSteps = formatGroupedSteps(newSteps, changedSteps);

  const descricao = renderTemplate(template, {
    codigo_teste: report.code,
    id_chamado: ticket.idChamado,
    status_geral: report.generalStatus,
    resumo: report.bugDescription || report.notes || "",
    passos: groupedSteps.passos,
    passos_novos: groupedSteps.passosNovos,
    passos_alterados: groupedSteps.passosAlterados,
  });

  await callSndesk(config, "/api/chamado/interacao", {
    method: "POST",
    body: JSON.stringify({
      iduser: Number(sndeskUserId),
      idchamado: Number(ticket.idChamado),
      descricao,
      interacao_status: Number(statusId),
      solucao: action === "aprovar",
      visivelcliente: config.visibleClient,
      enviaemailcliente: config.emailClient,
      enviaemailtecnico: config.emailTechnician,
      enviainteracoesos: true,
    }),
  });

  const nextState = action === "aprovar" ? "aprovado" : "recusado";
  const sentAt = new Date();

  await prisma.$transaction([
    ...pendingSteps.map((step) =>
      prisma.testStep.update({
        where: { id: step.id },
        data: {
          sndeskSentAt: sentAt,
          sndeskSentAction: action,
          sndeskSentHash: step.currentSndeskHash,
        },
      })
    ),
    prisma.qaPendingTicket.update({
      where: { id },
      data: {
        state: nextState,
        lastError: null,
      },
    }),
  ]);

  return refreshPendingTicket(id);
}

export async function markPendingError(id: string, error: unknown) {
  const message = sanitizeSensitiveText(
    error instanceof Error ? error.message : "Erro desconhecido."
  );

  await prisma.$executeRaw`
    UPDATE "qa_pending_tickets"
    SET "state" = 'erro', "lastError" = ${message}, "updatedAt" = CURRENT_TIMESTAMP
    WHERE "id" = ${id}
  `;
}
