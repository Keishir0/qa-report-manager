import prisma from "@/lib/prisma";
import {
  archivePendingTicketFromSndesk,
  getActivePendingStatusIds,
  getSndeskChamado,
  getSndeskConfig,
  getSndeskStatus,
  isActivePendingStatus,
  upsertPendingTicketFromSndesk,
} from "@/lib/sndesk";
import { createHmac, randomUUID, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { ADMIN_ROLES, requireApiAccess } from "@/lib/auth";
import { logServerError } from "@/lib/serverLog";

export const dynamic = "force-dynamic";

const ALLOWED_EVENTS = new Set([
  "insert_chamado",
  "insert_interacao",
  "setstatus",
  "update_chamado",
]);
const WEBHOOK_SECRET_KEY = "chamados_secret";

function jsonError(message: string, status: number, details?: unknown) {
  return NextResponse.json(
    {
      success: false,
      message,
      ...(details ? { details } : {}),
    },
    { status }
  );
}

function hasValue(value: unknown) {
  return value !== undefined && value !== null && String(value).trim() !== "";
}

function getBearerToken(request: NextRequest) {
  const authorization = request.headers.get("authorization") || "";
  const [type, token] = authorization.split(" ");

  if (type.toLowerCase() !== "bearer" || !token) {
    return null;
  }

  return token;
}

function safeCompare(value: string | null, expected: string) {
  if (!value) return false;

  const valueBuffer = Buffer.from(value);
  const expectedBuffer = Buffer.from(expected);

  if (valueBuffer.length !== expectedBuffer.length) return false;

  return timingSafeEqual(valueBuffer, expectedBuffer);
}

function validateSignature(request: NextRequest, rawBody: string, secret: string) {
  const signature = request.headers.get("x-signature");
  const localSignature = createHmac("sha256", secret).update(rawBody).digest("hex");

  return safeCompare(signature, localSignature);
}

interface ExternalWebhookEventRow {
  id: string;
  event: string;
  idChamado: string;
  idRef: string;
  customJson: unknown;
  rawPayload: unknown;
  sourceIp: string | null;
  userAgent: string | null;
  status: string;
  receivedAt: Date;
}

interface WebhookSettingRow {
  value: string;
}

interface CountRow {
  count: number;
}

async function getConfiguredSecret() {
  const [setting] = await prisma.$queryRaw<WebhookSettingRow[]>`
    SELECT "value"
    FROM "webhook_settings"
    WHERE "key" = ${WEBHOOK_SECRET_KEY}
    LIMIT 1
  `;

  return setting?.value || null;
}

async function updateEventStatus(id: string, status: string) {
  await prisma.$executeRaw`
    UPDATE "external_webhook_events"
    SET "status" = ${status}
    WHERE "id" = ${id}
  `;
}

async function processTicketPendingEvent(evento: ExternalWebhookEventRow) {
  if (evento.event !== "setstatus") {
    await updateEventStatus(evento.id, "recebido");
    return;
  }

  const config = await getSndeskConfig();
  const statusId = Number(evento.idRef);

  if (!Number.isInteger(statusId)) {
    await updateEventStatus(evento.id, "ignorado");
    return;
  }

  const activeStatusIds = await getActivePendingStatusIds(config);

  const status = await getSndeskStatus(config, evento.idChamado);
  const chamado = await getSndeskChamado(config, evento.idChamado);

  if (!activeStatusIds.has(statusId) || !isActivePendingStatus(status, activeStatusIds)) {
    const archivedTicket = await archivePendingTicketFromSndesk(
      evento.idChamado,
      status,
      chamado
    );
    await updateEventStatus(
      evento.id,
      archivedTicket ? "pendencia_arquivada" : "ignorado"
    );
    return;
  }

  await upsertPendingTicketFromSndesk(evento.idChamado, status, chamado);
  await updateEventStatus(evento.id, "pendencia_criada");
}

export async function GET(request: NextRequest) {
  try {
    const denied = await requireApiAccess(request, ADMIN_ROLES);
    if (denied) return denied;

    const limitParam = Number(request.nextUrl.searchParams.get("limit") || 10);
    const pageParam = Number(request.nextUrl.searchParams.get("page") || 1);
    const limit = Number.isFinite(limitParam)
      ? Math.min(Math.max(Math.trunc(limitParam), 1), 50)
      : 10;
    const page = Number.isFinite(pageParam)
      ? Math.max(Math.trunc(pageParam), 1)
      : 1;
    const offset = (page - 1) * limit;

    const [totalRow] = await prisma.$queryRaw<CountRow[]>`
      SELECT COUNT(*)::int AS "count"
      FROM "external_webhook_events"
    `;

    const eventos = await prisma.$queryRaw<ExternalWebhookEventRow[]>`
      SELECT
        "id",
        "event",
        "idChamado",
        "idRef",
        "json" AS "customJson",
        "rawPayload",
        "sourceIp",
        "userAgent",
        "status",
        "receivedAt"
      FROM "external_webhook_events"
      ORDER BY "receivedAt" DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `;

    const total = totalRow?.count || 0;
    const totalPages = Math.max(Math.ceil(total / limit), 1);

    return NextResponse.json({
      success: true,
      data: eventos,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    });
  } catch (error: unknown) {
    logServerError("Error in GET /api/webhooks/chamados", error);
    return jsonError("Internal Server Error", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const secret = await getConfiguredSecret();

    if (!secret) {
      console.error("Secret da webhook nao configurado");
      return jsonError("Webhook nao configurado", 500);
    }

    let body: any;
    let rawBody: string;

    try {
      rawBody = await request.text();
      body = JSON.parse(rawBody);
    } catch {
      return jsonError("JSON invalido", 400);
    }

    const token = getBearerToken(request);
    const hasValidBearer = safeCompare(token, secret);
    const hasValidSignature = validateSignature(request, rawBody, secret);

    if (!hasValidBearer && !hasValidSignature) {
      return jsonError("Token ou assinatura invalida", 401);
    }

    const { event, idchamado, idref } = body;

    if (!hasValue(event) || !hasValue(idchamado) || !hasValue(idref)) {
      return jsonError("Payload invalido", 400, {
        required: ["event", "idchamado", "idref"],
      });
    }

    if (!ALLOWED_EVENTS.has(String(event))) {
      return jsonError("Evento nao suportado", 400, {
        allowedEvents: Array.from(ALLOWED_EVENTS),
      });
    }

    const sourceIp =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      null;

    const eventoId = randomUUID();
    const customJson = body.json === undefined ? null : JSON.stringify(body.json);
    const rawPayload = JSON.stringify(body);
    const userAgent = request.headers.get("user-agent");

    const [evento] = await prisma.$queryRaw<ExternalWebhookEventRow[]>`
      INSERT INTO "external_webhook_events" (
        "id",
        "event",
        "idChamado",
        "idRef",
        "json",
        "rawPayload",
        "sourceIp",
        "userAgent",
        "status"
      )
      VALUES (
        ${eventoId},
        ${String(event)},
        ${String(idchamado)},
        ${String(idref)},
        ${customJson}::jsonb,
        ${rawPayload}::jsonb,
        ${sourceIp},
        ${userAgent},
        'recebido'
      )
      RETURNING
        "id",
        "event",
        "idChamado",
        "idRef",
        "json" AS "customJson",
        "rawPayload",
        "sourceIp",
        "userAgent",
        "status",
        "receivedAt"
    `;

    console.log("Webhook de chamado recebido:", {
      event: evento.event,
      idChamado: evento.idChamado,
      idRef: evento.idRef,
      receivedAt: evento.receivedAt,
    });

    try {
      await processTicketPendingEvent(evento);
    } catch (processingError: unknown) {
      logServerError("Erro ao processar pendencia de chamado", processingError);
      await updateEventStatus(evento.id, "erro").catch(() => {});
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          id: evento.id,
          event: evento.event,
          idChamado: evento.idChamado,
          status: evento.status,
          receivedAt: evento.receivedAt,
        },
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    logServerError("Error in POST /api/webhooks/chamados", error);
    return jsonError("Internal Server Error", 500);
  }
}
