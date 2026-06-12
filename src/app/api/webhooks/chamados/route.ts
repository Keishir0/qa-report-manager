import prisma from "@/lib/prisma";
import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";

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

async function getConfiguredSecret() {
  const [setting] = await prisma.$queryRaw<WebhookSettingRow[]>`
    SELECT "value"
    FROM "webhook_settings"
    WHERE "key" = ${WEBHOOK_SECRET_KEY}
    LIMIT 1
  `;

  return setting?.value || null;
}

export async function GET(request: NextRequest) {
  try {
    const limitParam = Number(request.nextUrl.searchParams.get("limit") || 50);
    const limit = Number.isFinite(limitParam)
      ? Math.min(Math.max(limitParam, 1), 200)
      : 50;

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
    `;

    return NextResponse.json({
      success: true,
      data: eventos,
    });
  } catch (error: any) {
    console.error("Error in GET /api/webhooks/chamados:", error);
    return jsonError("Internal Server Error", 500, error.message);
  }
}

export async function POST(request: NextRequest) {
  try {
    const secret = await getConfiguredSecret();

    if (!secret) {
      console.error("Secret da webhook nao configurado");
      return jsonError("Webhook nao configurado", 500);
    }

    const token = getBearerToken(request);

    if (token !== secret) {
      return jsonError("Token invalido ou ausente", 401);
    }

    let body: any;

    try {
      body = await request.json();
    } catch {
      return jsonError("JSON invalido", 400);
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

    return NextResponse.json(
      {
        success: true,
        data: evento,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error in POST /api/webhooks/chamados:", error);
    return jsonError("Internal Server Error", 500, error.message);
  }
}
