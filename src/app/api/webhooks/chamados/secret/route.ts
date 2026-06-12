import prisma from "@/lib/prisma";
import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

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

interface WebhookSettingRow {
  id: string;
  key: string;
  value: string;
  createdAt: Date;
  updatedAt: Date;
}

export async function GET() {
  try {
    const [setting] = await prisma.$queryRaw<WebhookSettingRow[]>`
      SELECT "id", "key", "value", "createdAt", "updatedAt"
      FROM "webhook_settings"
      WHERE "key" = ${WEBHOOK_SECRET_KEY}
      LIMIT 1
    `;

    return NextResponse.json({
      success: true,
      data: {
        configured: Boolean(setting?.value),
        updatedAt: setting?.updatedAt ?? null,
      },
    });
  } catch (error: any) {
    console.error("Error in GET /api/webhooks/chamados/secret:", error);
    return jsonError("Internal Server Error", 500, error.message);
  }
}

export async function PUT(request: NextRequest) {
  try {
    let body: any;

    try {
      body = await request.json();
    } catch {
      return jsonError("JSON invalido", 400);
    }

    const secret = String(body.secret || "").trim();

    if (!secret) {
      return jsonError("Secret obrigatorio", 400);
    }

    const [setting] = await prisma.$queryRaw<WebhookSettingRow[]>`
      INSERT INTO "webhook_settings" ("id", "key", "value", "updatedAt")
      VALUES (${randomUUID()}, ${WEBHOOK_SECRET_KEY}, ${secret}, CURRENT_TIMESTAMP)
      ON CONFLICT ("key")
      DO UPDATE SET "value" = EXCLUDED."value", "updatedAt" = CURRENT_TIMESTAMP
      RETURNING "id", "key", "value", "createdAt", "updatedAt"
    `;

    return NextResponse.json({
      success: true,
      data: {
        configured: true,
        updatedAt: setting.updatedAt,
      },
    });
  } catch (error: any) {
    console.error("Error in PUT /api/webhooks/chamados/secret:", error);
    return jsonError("Internal Server Error", 500, error.message);
  }
}
