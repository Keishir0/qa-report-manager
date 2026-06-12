import { requireQaAdmin } from "@/lib/adminAuth";
import { getSndeskConfig, saveSndeskConfig } from "@/lib/sndesk";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function jsonError(message: string, status: number, details?: unknown) {
  return NextResponse.json(
    { success: false, message, ...(details ? { details } : {}) },
    { status }
  );
}

function parseStatusIds(value: unknown) {
  if (Array.isArray(value)) {
    return value.map(Number).filter((item) => Number.isInteger(item));
  }

  return String(value || "")
    .split(",")
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isInteger(item));
}

function publicConfig(config: Awaited<ReturnType<typeof getSndeskConfig>>) {
  return {
    baseUrl: config.baseUrl,
    tokenConfigured: Boolean(config.token),
    defaultUserId: config.defaultUserId,
    pendingStatusIds: config.pendingStatusIds,
    approveStatusId: config.approveStatusId,
    rejectStatusId: config.rejectStatusId,
    approveTemplate: config.approveTemplate,
    rejectTemplate: config.rejectTemplate,
    visibleClient: config.visibleClient,
    emailClient: config.emailClient,
    emailTechnician: config.emailTechnician,
  };
}

export async function GET(request: NextRequest) {
  try {
    const unauthorized = requireQaAdmin(request);
    if (unauthorized) return unauthorized;

    const config = await getSndeskConfig();

    return NextResponse.json({
      success: true,
      data: publicConfig(config),
    });
  } catch (error: any) {
    console.error("Error in GET /api/sndesk/config:", error);
    return jsonError("Internal Server Error", 500, error.message);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const unauthorized = requireQaAdmin(request);
    if (unauthorized) return unauthorized;

    const body = await request.json();
    const token = String(body.token || "").trim();

    const config = await saveSndeskConfig({
      baseUrl: body.baseUrl,
      token: token || undefined,
      defaultUserId: body.defaultUserId,
      pendingStatusIds: parseStatusIds(body.pendingStatusIds),
      approveStatusId: body.approveStatusId,
      rejectStatusId: body.rejectStatusId,
      approveTemplate: body.approveTemplate,
      rejectTemplate: body.rejectTemplate,
      visibleClient: Boolean(body.visibleClient),
      emailClient: Boolean(body.emailClient),
      emailTechnician: Boolean(body.emailTechnician),
    });

    return NextResponse.json({
      success: true,
      data: publicConfig(config),
    });
  } catch (error: any) {
    console.error("Error in PUT /api/sndesk/config:", error);
    return jsonError("Internal Server Error", 500, error.message);
  }
}
